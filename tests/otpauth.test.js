import { test } from 'node:test';
import assert from 'node:assert/strict';

import { dedupeKey, displayLabel, isOtpAuthUri, parseOtpAuthUri } from '../src/lib/otpauth.js';

test('phân tích URI TOTP đầy đủ tham số', () => {
    const result = parseOtpAuthUri(
        'otpauth://totp/GitHub:dev%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA256&digits=8&period=60',
    );

    assert.deepEqual(result, {
        type: 'totp',
        issuer: 'GitHub',
        account: 'dev@example.com',
        secret: 'JBSWY3DPEHPK3PXP',
        digits: 8,
        period: 60,
        algorithm: 'SHA-256',
        counter: 0,
    });
});

test('thiếu tham số thì dùng mặc định RFC', () => {
    const result = parseOtpAuthUri('otpauth://totp/Acme?secret=jbswy3dpehpk3pxp');
    assert.equal(result.digits, 6);
    assert.equal(result.period, 30);
    assert.equal(result.algorithm, 'SHA-1');
    assert.equal(result.secret, 'JBSWY3DPEHPK3PXP');
    assert.equal(result.account, 'Acme');
});

test('issuer trong path và trong query cùng có thì query thắng', () => {
    const result = parseOtpAuthUri('otpauth://totp/Old:user?secret=JBSWY3DPEHPK3PXP&issuer=New');
    assert.equal(result.issuer, 'New');
    assert.equal(result.account, 'user');
});

test('HOTP giữ counter', () => {
    const result = parseOtpAuthUri('otpauth://hotp/Bank:me?secret=JBSWY3DPEHPK3PXP&counter=12');
    assert.equal(result.type, 'hotp');
    assert.equal(result.counter, 12);
});

test('từ chối URI sai', () => {
    assert.equal(isOtpAuthUri('https://example.com'), false);
    assert.throws(() => parseOtpAuthUri('https://example.com'), { code: 'error.otpNotOtpauth' });
    assert.throws(() => parseOtpAuthUri('otpauth://totp/X'), { code: 'error.otpNoSecret' });
    assert.throws(() => parseOtpAuthUri('otpauth://totp/X?secret=0011'), {
        code: 'error.otpSecretNotBase32',
    });
    assert.throws(() => parseOtpAuthUri('otpauth://yubikey/X?secret=JBSWY3DPEHPK3PXP'), {
        code: 'error.otpTypeUnsupported',
    });
    assert.throws(() => parseOtpAuthUri('otpauth://totp/X?secret=JBSWY3DPEHPK3PXP&digits=99'), {
        code: 'error.otpDigitsInvalid',
    });
    assert.throws(() => parseOtpAuthUri('otpauth://totp/X?secret=JBSWY3DPEHPK3PXP&period=0'), {
        code: 'error.otpPeriodInvalid',
    });
});

test('nhãn hiển thị ghép issuer và account', () => {
    assert.equal(displayLabel({ issuer: 'GitHub', account: 'me@x.com' }), 'GitHub (me@x.com)');
    assert.equal(displayLabel({ issuer: 'GitHub', account: '' }), 'GitHub');
    assert.equal(displayLabel({ issuer: '', account: 'me@x.com' }), 'me@x.com');
    // Chuỗi thay thế do chỗ gọi truyền vào vì lib không biết ngôn ngữ đang dùng.
    assert.equal(displayLabel({ issuer: '', account: '' }, 'Untitled'), 'Untitled');
});

test('khoá so trùng bỏ qua hoa thường và khoảng trắng trong secret', () => {
    const a = { type: 'totp', issuer: 'GitHub', account: 'Me@X.com', secret: 'jbswy3dp ehpk3pxp' };
    const b = { type: 'totp', issuer: 'github', account: 'me@x.com', secret: 'JBSWY3DPEHPK3PXP' };
    assert.equal(dedupeKey(a), dedupeKey(b));

    const different = { ...b, secret: 'JBSWY3DPEHPK3PXQ' };
    assert.notEqual(dedupeKey(b), dedupeKey(different));
});
