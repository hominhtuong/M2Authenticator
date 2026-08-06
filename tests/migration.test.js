import { test } from 'node:test';
import assert from 'node:assert/strict';

import { decodeMessage, firstString, firstVarint } from '../src/lib/protobuf.js';
import { isMigrationUri, parseMigrationUri } from '../src/lib/migration.js';
import { base32Decode } from '../src/lib/base32.js';

// ------------------------------------------------- bộ mã hoá protobuf cho test

function varint(value) {
    const out = [];
    let n = BigInt(value);
    do {
        let byte = Number(n & 0x7fn);
        n >>= 7n;
        if (n > 0n) byte |= 0x80;
        out.push(byte);
    } while (n > 0n);
    return out;
}

function tag(fieldNumber, wireType) {
    return varint((BigInt(fieldNumber) << 3n) | BigInt(wireType));
}

function lengthField(fieldNumber, bytes) {
    return [...tag(fieldNumber, 2), ...varint(bytes.length), ...bytes];
}

function varintField(fieldNumber, value) {
    return [...tag(fieldNumber, 0), ...varint(value)];
}

const ascii = (text) => Array.from(new TextEncoder().encode(text));

function otpParameters({ secret, name, issuer, algorithm = 1, digits = 1, type = 2, counter = 0 }) {
    return [
        ...lengthField(1, Array.from(secret)),
        ...lengthField(2, ascii(name)),
        ...lengthField(3, ascii(issuer)),
        ...varintField(4, algorithm),
        ...varintField(5, digits),
        ...varintField(6, type),
        ...(counter ? varintField(7, counter) : []),
    ];
}

function migrationUri(entries, batch = { size: 1, index: 0, id: 42 }) {
    const payload = [
        ...entries.flatMap((entry) => lengthField(1, otpParameters(entry))),
        ...varintField(2, 1),
        ...varintField(3, batch.size),
        ...varintField(4, batch.index),
        ...varintField(5, batch.id),
    ];
    const base64 = Buffer.from(Uint8Array.from(payload)).toString('base64');
    return `otpauth-migration://offline?data=${encodeURIComponent(base64)}`;
}

// ------------------------------------------------------------------- tests

test('nhận diện đúng loại URI', () => {
    assert.equal(isMigrationUri('otpauth-migration://offline?data=AAAA'), true);
    assert.equal(isMigrationUri('OTPAUTH-MIGRATION://offline?data=AAAA'), true);
    assert.equal(isMigrationUri('otpauth://totp/GitHub?secret=AAAA'), false);
    assert.equal(isMigrationUri(''), false);
});

test('giải mã nhiều account trong một QR export', () => {
    const secretA = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xde, 0xad, 0xbe, 0xef]);
    const secretB = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const uri = migrationUri([
        { secret: secretA, name: 'GitHub:dev@example.com', issuer: 'GitHub' },
        { secret: secretB, name: 'AWS:root', issuer: 'AWS', algorithm: 2, digits: 2 },
    ]);

    const result = parseMigrationUri(uri);

    assert.equal(result.accounts.length, 2);

    assert.deepEqual(result.accounts[0], {
        type: 'totp',
        issuer: 'GitHub',
        account: 'dev@example.com',
        secret: result.accounts[0].secret,
        digits: 6,
        period: 30,
        algorithm: 'SHA-1',
        counter: 0,
    });
    assert.deepEqual(base32Decode(result.accounts[0].secret), secretA);

    assert.equal(result.accounts[1].algorithm, 'SHA-256');
    assert.equal(result.accounts[1].digits, 8);
    assert.deepEqual(base32Decode(result.accounts[1].secret), secretB);
});

test('giữ nguyên counter cho HOTP và ép về 0 cho TOTP', () => {
    const secret = new Uint8Array([9, 9, 9, 9, 9]);

    const hotp = parseMigrationUri(
        migrationUri([{ secret, name: 'Bank:me', issuer: 'Bank', type: 1, counter: 137 }]),
    );
    assert.equal(hotp.accounts[0].type, 'hotp');
    assert.equal(hotp.accounts[0].counter, 137);

    const totp = parseMigrationUri(
        migrationUri([{ secret, name: 'Bank:me', issuer: 'Bank', type: 2, counter: 137 }]),
    );
    assert.equal(totp.accounts[0].type, 'totp');
    assert.equal(totp.accounts[0].counter, 0);
});

test('đọc được thông tin batch khi export bị chia nhiều QR', () => {
    const uri = migrationUri(
        [{ secret: new Uint8Array([1, 2, 3]), name: 'A:a', issuer: 'A' }],
        { size: 3, index: 1, id: 987 },
    );
    const result = parseMigrationUri(uri);
    assert.deepEqual(result.batch, { size: 3, index: 1, id: 987 });
});

test('name không có dấu hai chấm thì lấy nguyên làm tên tài khoản', () => {
    const uri = migrationUri([{ secret: new Uint8Array([1, 2, 3]), name: 'chỉ-tên', issuer: '' }]);
    const result = parseMigrationUri(uri);
    assert.equal(result.accounts[0].issuer, '');
    assert.equal(result.accounts[0].account, 'chỉ-tên');
});

test('từ chối payload hỏng hoặc không phải migration', () => {
    assert.throws(() => parseMigrationUri('otpauth://totp/X?secret=AA'), {
        code: 'error.migrationNotMigrationUri',
    });
    assert.throws(() => parseMigrationUri('otpauth-migration://offline'), {
        code: 'error.migrationNoData',
    });
    assert.throws(() => parseMigrationUri('otpauth-migration://offline?data=%25%25%25'), {
        code: 'error.migrationBadBase64',
    });
});

test('từ chối thuật toán MD5', () => {
    const uri = migrationUri([
        { secret: new Uint8Array([1, 2, 3]), name: 'X:y', issuer: 'X', algorithm: 4 },
    ]);
    assert.throws(() => parseMigrationUri(uri), { code: 'error.migrationAlgorithmUnsupported' });
});

test('protobuf: varint bị cắt cụt thì báo lỗi thay vì trả rác', () => {
    assert.throws(() => decodeMessage(Uint8Array.from([0x08, 0x80])), {
        code: 'error.protobufTruncatedVarint',
    });
    assert.throws(() => decodeMessage(Uint8Array.from([0x0a, 0x05, 0x01])), {
        code: 'error.protobufOverrun',
    });
});

test('protobuf: bỏ qua field không biết mà không vỡ', () => {
    const bytes = Uint8Array.from([
        ...varintField(2, 7),
        ...tag(9, 5), 1, 2, 3, 4, // fixed32 lạ
        ...tag(10, 1), 1, 2, 3, 4, 5, 6, 7, 8, // fixed64 lạ
        ...lengthField(3, ascii('xin chào')),
    ]);
    const fields = decodeMessage(bytes);
    assert.equal(firstVarint(fields, 2), 7n);
    assert.equal(firstString(fields, 3), 'xin chào');
});
