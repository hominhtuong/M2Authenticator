/**
 * Gieo dữ liệu mẫu vào vault. Chạy ở trang seeder.html, không chạy trong các trang thật.
 *
 * Toàn bộ đường ghi đi qua vault.js thật: PBKDF2 600.000 vòng, AES-256-GCM, đúng schema.
 * Dữ liệu đọng lại trong localStorage nên các trang mở sau đó thấy ngay, không phải chờ.
 *
 * Secret dưới đây là chuỗi bịa để chụp ảnh. Không dùng secret thật: ảnh chụp sẽ được đăng
 * công khai lên Chrome Web Store.
 */

import * as vault from '/lib/vault.js';

const DEMO_PASSPHRASE = 'the quick brown fox jumps 2026';

const DEMO_ACCOUNTS = [
    { type: 'totp', issuer: 'GitHub', account: 'alex@example.com', secret: 'JBSWY3DPEHPK3PXP' },
    { type: 'totp', issuer: 'Google', account: 'alex.morgan@example.com', secret: 'KRSXG5CTMVRXEZLU' },
    { type: 'totp', issuer: 'AWS', account: 'root-billing', secret: 'MZXW6YTBOI' },
    { type: 'totp', issuer: 'Cloudflare', account: 'alex@example.com', secret: 'NBSWY3DPFQQHO33S' },
    { type: 'totp', issuer: 'Dropbox', account: 'alex@example.com', secret: 'ONSWG4TFOQ', digits: 8 },
    { type: 'hotp', issuer: 'Fastmail', account: 'alex@example.com', secret: 'PB2WY5DFMFZA', counter: 42 },
];

const params = new URLSearchParams(location.search);
const log = document.getElementById('log');

try {
    await chrome.storage.local.clear();
    await chrome.storage.session.clear();

    await vault.saveSettings({ language: params.get('lang') || 'en' });
    await vault.initialize(DEMO_PASSPHRASE);
    await vault.addAccounts(DEMO_ACCOUNTS);

    // Đăng ký giả một credential sinh trắc để nút "mở khoá bằng vân tay" hiện ra trong ảnh.
    if (params.has('biometric')) {
        const stored = await chrome.storage.local.get('vault_v2');
        stored.vault_v2.biometric = {
            credentialId: 'ZGVtby1jcmVkZW50aWFs',
            prfSalt: 'ZGVtby1zYWx0',
            hkdfSalt: 'ZGVtby1oa2Rm',
            wrap: { iv: 'ZGVtbw==', ct: 'ZGVtbw==' },
            enrolledAt: Date.now(),
        };
        await chrome.storage.local.set({ vault_v2: stored.vault_v2 });
    }

    if (params.get('state') === 'locked') await vault.lock();

    const accounts = params.get('state') === 'locked' ? [] : await vault.listAccounts();
    log.textContent = `ok: ${DEMO_ACCOUNTS.length} accounts seeded, ${accounts.length} readable`;
    document.body.dataset.seeded = 'true';
} catch (error) {
    log.textContent = `FAILED: ${error.code ?? ''} ${error.message}`;
    document.body.dataset.seeded = 'false';
}
