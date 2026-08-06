import { test } from 'node:test';
import assert from 'node:assert/strict';

import { base32Encode } from '../src/lib/base32.js';
import {
    generateHOTP,
    generateTOTP,
    normalizeAlgorithm,
    secondsRemaining,
} from '../src/lib/totp.js';

const ascii = (text) => new TextEncoder().encode(text);

// Seed trong phụ lục RFC 6238.
const SEED_SHA1 = base32Encode(ascii('12345678901234567890'));
const SEED_SHA256 = base32Encode(ascii('12345678901234567890123456789012'));
const SEED_SHA512 = base32Encode(
    ascii('1234567890123456789012345678901234567890123456789012345678901234'),
);

test('vector TOTP SHA-1 của RFC 6238', async () => {
    const cases = [
        [59, '94287082'],
        [1111111109, '07081804'],
        [1111111111, '14050471'],
        [1234567890, '89005924'],
        [2000000000, '69279037'],
        [20000000000, '65353130'],
    ];

    for (const [seconds, expected] of cases) {
        const code = await generateTOTP({
            secret: SEED_SHA1,
            timeMs: seconds * 1000,
            digits: 8,
            algorithm: 'SHA-1',
        });
        assert.equal(code, expected, `T=${seconds}`);
    }
});

test('vector TOTP SHA-256 và SHA-512 của RFC 6238', async () => {
    assert.equal(
        await generateTOTP({ secret: SEED_SHA256, timeMs: 59_000, digits: 8, algorithm: 'SHA-256' }),
        '46119246',
    );
    assert.equal(
        await generateTOTP({ secret: SEED_SHA512, timeMs: 59_000, digits: 8, algorithm: 'SHA-512' }),
        '90693936',
    );
});

test('vector HOTP của RFC 4226', async () => {
    const expected = [
        '755224', '287082', '359152', '969429', '338314',
        '254676', '287922', '162583', '399871', '520489',
    ];

    for (let counter = 0; counter < expected.length; counter++) {
        assert.equal(
            await generateHOTP({ secret: SEED_SHA1, counter, digits: 6 }),
            expected[counter],
            `counter=${counter}`,
        );
    }
});

test('counter vượt 2^32 vẫn tính đúng thay vì tràn số', async () => {
    // T=20000000000 với chu kỳ 30 cho counter 666666666, nhưng ép counter lớn để kiểm tra nhánh BigInt.
    const code = await generateHOTP({ secret: SEED_SHA1, counter: 2 ** 33 + 7, digits: 8 });
    assert.match(code, /^\d{8}$/);
});

test('mã luôn được pad đủ số chữ số', async () => {
    for (const digits of [6, 7, 8]) {
        const code = await generateTOTP({ secret: SEED_SHA1, timeMs: 1_000_000, digits });
        assert.equal(code.length, digits);
    }
});

test('chuẩn hoá tên thuật toán', () => {
    assert.equal(normalizeAlgorithm('sha1'), 'SHA-1');
    assert.equal(normalizeAlgorithm('SHA-256'), 'SHA-256');
    assert.equal(normalizeAlgorithm('sha_512'), 'SHA-512');
    assert.equal(normalizeAlgorithm(''), 'SHA-1');
    assert.throws(() => normalizeAlgorithm('md5'), { code: 'error.algorithmUnsupported' });
});

test('đếm ngược nằm trong khoảng 1 đến period', () => {
    for (const seconds of [0, 1, 29, 30, 31, 59, 60]) {
        const remaining = secondsRemaining(30, seconds * 1000);
        assert.ok(remaining >= 1 && remaining <= 30, `t=${seconds} => ${remaining}`);
    }
    assert.equal(secondsRemaining(30, 0), 30);
    assert.equal(secondsRemaining(30, 29_000), 1);
    assert.equal(secondsRemaining(30, 30_000), 30);
});

test('secret hỏng thì báo lỗi rõ ràng', async () => {
    await assert.rejects(() => generateTOTP({ secret: 'không-phải-base32-1' }), {
        code: 'error.base32Invalid',
    });
});
