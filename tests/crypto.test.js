import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    aadFor,
    aesGcmDecrypt,
    aesGcmEncrypt,
    assessPassword,
    deriveKeyFromPassword,
    deriveKeyFromPrf,
    fromBase64,
    fromUtf8,
    generateDekBytes,
    importDek,
    randomBytes,
    toBase64,
    utf8,
} from '../src/lib/crypto.js';

// PBKDF2 600k vòng chạy chậm, test dùng số vòng nhỏ cho các trường hợp không đo hiệu năng.
const FAST_ITERATIONS = 1_000;

test('base64 đi và về không đổi byte', () => {
    for (const length of [0, 1, 2, 3, 16, 32, 255]) {
        const bytes = randomBytes(length);
        assert.deepEqual(fromBase64(toBase64(bytes)), bytes);
    }
});

test('AES-GCM giải mã ra đúng bản rõ', async () => {
    const dekBytes = generateDekBytes();
    assert.equal(dekBytes.length, 32);

    const key = await importDek(dekBytes);
    const aad = aadFor('vault-data', 2);
    const plaintext = utf8(JSON.stringify({ accounts: [{ secret: 'JBSWY3DPEHPK3PXP' }] }));

    const envelope = await aesGcmEncrypt(key, plaintext, aad);
    assert.ok(envelope.iv && envelope.ct);

    const decrypted = await aesGcmDecrypt(key, envelope, aad);
    assert.deepEqual(JSON.parse(fromUtf8(decrypted)), { accounts: [{ secret: 'JBSWY3DPEHPK3PXP' }] });
});

test('mỗi lần mã hoá dùng IV khác nhau', async () => {
    const key = await importDek(generateDekBytes());
    const aad = aadFor('vault-data', 2);
    const a = await aesGcmEncrypt(key, utf8('cùng một nội dung'), aad);
    const b = await aesGcmEncrypt(key, utf8('cùng một nội dung'), aad);

    assert.notEqual(a.iv, b.iv);
    assert.notEqual(a.ct, b.ct);
});

test('AAD sai thì không giải mã được', async () => {
    const key = await importDek(generateDekBytes());
    const envelope = await aesGcmEncrypt(key, utf8('bí mật'), aadFor('dek-wrap', 2));

    await assert.rejects(() => aesGcmDecrypt(key, envelope, aadFor('vault-data', 2)));
    await assert.rejects(() => aesGcmDecrypt(key, envelope, aadFor('dek-wrap', 3)));
});

test('ciphertext bị sửa một bit thì bị từ chối', async () => {
    const key = await importDek(generateDekBytes());
    const aad = aadFor('vault-data', 2);
    const envelope = await aesGcmEncrypt(key, utf8('dữ liệu quan trọng'), aad);

    const tampered = fromBase64(envelope.ct);
    tampered[0] ^= 0x01;

    await assert.rejects(() => aesGcmDecrypt(key, { iv: envelope.iv, ct: toBase64(tampered) }, aad));
});

test('cùng password và salt cho ra cùng khoá, khác salt thì khác khoá', async () => {
    const salt = randomBytes(16);
    const otherSalt = randomBytes(16);
    const aad = aadFor('dek-wrap', 2);
    const dekBytes = generateDekBytes();

    const key1 = await deriveKeyFromPassword('Mật khẩu Rất Dài 123', salt, FAST_ITERATIONS);
    const key2 = await deriveKeyFromPassword('Mật khẩu Rất Dài 123', salt, FAST_ITERATIONS);
    const key3 = await deriveKeyFromPassword('Mật khẩu Rất Dài 123', otherSalt, FAST_ITERATIONS);

    const wrapped = await aesGcmEncrypt(key1, dekBytes, aad);
    assert.deepEqual(await aesGcmDecrypt(key2, wrapped, aad), dekBytes);
    await assert.rejects(() => aesGcmDecrypt(key3, wrapped, aad));
});

test('password sai thì không mở được bản bọc DEK', async () => {
    const salt = randomBytes(16);
    const aad = aadFor('dek-wrap', 2);
    const dekBytes = generateDekBytes();

    const good = await deriveKeyFromPassword('Đúng mật khẩu 99', salt, FAST_ITERATIONS);
    const bad = await deriveKeyFromPassword('Sai mật khẩu 99', salt, FAST_ITERATIONS);

    const wrapped = await aesGcmEncrypt(good, dekBytes, aad);
    await assert.rejects(() => aesGcmDecrypt(bad, wrapped, aad));
});

test('mật khẩu được NFKC hoá nên gõ tổ hợp dấu kiểu nào cũng ra cùng khoá', async () => {
    const salt = randomBytes(16);
    const aad = aadFor('dek-wrap', 2);
    const dekBytes = generateDekBytes();

    const composed = 'Mậtkhẩu123A'.normalize('NFC');
    const decomposed = 'Mậtkhẩu123A'.normalize('NFD');
    assert.notEqual(composed, decomposed);

    const key1 = await deriveKeyFromPassword(composed, salt, FAST_ITERATIONS);
    const key2 = await deriveKeyFromPassword(decomposed, salt, FAST_ITERATIONS);

    const wrapped = await aesGcmEncrypt(key1, dekBytes, aad);
    assert.deepEqual(await aesGcmDecrypt(key2, wrapped, aad), dekBytes);
});

test('khoá từ PRF mở được đúng bản bọc sinh trắc', async () => {
    const prfOutput = randomBytes(32);
    const hkdfSalt = randomBytes(16);
    const aad = aadFor('dek-wrap-bio', 2);
    const dekBytes = generateDekBytes();

    const bek = await deriveKeyFromPrf(prfOutput, hkdfSalt);
    const wrapped = await aesGcmEncrypt(bek, dekBytes, aad);

    const again = await deriveKeyFromPrf(prfOutput, hkdfSalt);
    assert.deepEqual(await aesGcmDecrypt(again, wrapped, aad), dekBytes);

    const wrongPrf = await deriveKeyFromPrf(randomBytes(32), hkdfSalt);
    await assert.rejects(() => aesGcmDecrypt(wrongPrf, wrapped, aad));

    const wrongSalt = await deriveKeyFromPrf(prfOutput, randomBytes(16));
    await assert.rejects(() => aesGcmDecrypt(wrongSalt, wrapped, aad));
});

test('hai đường mở khoá cùng trỏ về một DEK', async () => {
    const dekBytes = generateDekBytes();
    const passwordKey = await deriveKeyFromPassword('Mật khẩu tốt 2026', randomBytes(16), FAST_ITERATIONS);
    const prfKey = await deriveKeyFromPrf(randomBytes(32), randomBytes(16));

    const viaPassword = await aesGcmEncrypt(passwordKey, dekBytes, aadFor('dek-wrap', 2));
    const viaPrf = await aesGcmEncrypt(prfKey, dekBytes, aadFor('dek-wrap-bio', 2));

    assert.deepEqual(await aesGcmDecrypt(passwordKey, viaPassword, aadFor('dek-wrap', 2)), dekBytes);
    assert.deepEqual(await aesGcmDecrypt(prfKey, viaPrf, aadFor('dek-wrap-bio', 2)), dekBytes);
});

test('đánh giá mật khẩu chặn được mật khẩu rác', () => {
    for (const bad of [
        '',                     // rỗng
        '123456',               // quá ngắn
        'Ngan1',                // quá ngắn
        'password',             // nằm trong blocklist
        'password123',          // blocklist
        'matkhau12345',         // blocklist theo tiền tố
        'aaaaaaaaaaaa',         // quá ít ký tự khác nhau
        'abababababababab',     // đoạn lặp
        'chomeocho',            // 9 ký tự, thiếu một ký tự nữa
        'thecatsat',            // dưới 10 ký tự
        'meomeomeo1',           // 10 ký tự nhưng chỉ 2 nhóm ký tự
    ]) {
        assert.equal(assessPassword(bad).ok, false, `phải từ chối: "${bad}"`);
    }
});

test('passphrase dài được chấp nhận mà không cần chữ hoa hay ký tự đặc biệt', () => {
    // Luật thành phần ký tự đẩy user tới "Matkhau1!"; NIST SP 800-63B khuyên bỏ luật đó.
    const passphrase = assessPassword('con mèo trèo cây cau 2026');
    assert.equal(passphrase.ok, true);
    assert.ok(passphrase.score >= 4, `score = ${passphrase.score}`);
    assert.equal(passphrase.labelKey, `password.strength.${passphrase.score}`);

    const noDigits = assessPassword('bốn con ngựa chạy qua cánh đồng');
    assert.equal(noDigits.ok, true);
});

test('mật khẩu ngắn hơn 16 ký tự vẫn qua được nếu trộn đủ 3 nhóm ký tự', () => {
    const mixed = assessPassword('Chim Bay 2026');
    assert.equal(mixed.ok, true);

    const twoClassesOnly = assessPassword('chimbay2026');
    assert.equal(twoClassesOnly.ok, false);
});

test('mật khẩu bị từ chối thì điểm không bao giờ vượt mức yếu', () => {
    // Chặn UI hiện "Rất mạnh" cho một chuỗi mà hệ thống sẽ từ chối.
    const longButBlocked = assessPassword('password' + 'x'.repeat(40));
    assert.equal(longButBlocked.ok, false);
    assert.ok(longButBlocked.score <= 1, `score = ${longButBlocked.score}`);
});
