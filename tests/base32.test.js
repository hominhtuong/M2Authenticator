import { test } from 'node:test';
import assert from 'node:assert/strict';

import { base32Decode, base32Encode, isValidBase32, normalizeBase32 } from '../src/lib/base32.js';

const ascii = (text) => new TextEncoder().encode(text);

test('vector RFC 4648', () => {
    assert.equal(base32Encode(ascii('')), '');
    assert.equal(base32Encode(ascii('f')), 'MY');
    assert.equal(base32Encode(ascii('fo')), 'MZXQ');
    assert.equal(base32Encode(ascii('foo')), 'MZXW6');
    assert.equal(base32Encode(ascii('foob')), 'MZXW6YQ');
    assert.equal(base32Encode(ascii('fooba')), 'MZXW6YTB');
    assert.equal(base32Encode(ascii('foobar')), 'MZXW6YTBOI');
});

test('decode nghịch đảo encode', () => {
    for (const sample of ['f', 'fo', 'foo', 'foob', 'fooba', 'foobar', 'secret key 123']) {
        const encoded = base32Encode(ascii(sample));
        assert.deepEqual(base32Decode(encoded), ascii(sample));
    }
});

test('chuẩn hoá bỏ khoảng trắng, gạch nối, padding và chữ thường', () => {
    assert.equal(normalizeBase32('mzxw 6ytb-oi==='), 'MZXW6YTBOI');
    assert.deepEqual(base32Decode('mzxw 6ytb-oi==='), ascii('foobar'));
});

test('ký tự ngoài bảng chữ cái bị từ chối', () => {
    assert.throws(() => base32Decode('MZXW6YTB1'), { code: 'error.base32Invalid' });
    assert.throws(() => base32Decode('AB=CD'), { code: 'error.base32Invalid' });
    assert.throws(() => base32Decode(''), { code: 'error.base32Empty' });
    assert.equal(isValidBase32('JBSWY3DPEHPK3PXP'), true);
    assert.equal(isValidBase32('0189'), false);
});

test('encode 32 byte ngẫu nhiên rồi decode ra đúng byte gốc', () => {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 7 + 13) % 256;
    assert.deepEqual(base32Decode(base32Encode(bytes)), bytes);
});
