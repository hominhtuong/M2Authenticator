#!/usr/bin/env node
/**
 * Đẩy bản đóng gói lên Chrome Web Store qua API.
 *
 * Script này nằm ngoài thư mục src/ nên được phép gọi mạng. Bản thân extension thì tuyệt đối không,
 * và scripts/build.mjs sẽ chặn nếu có lời gọi mạng lọt vào src/.
 *
 * Dùng:
 *   npm run publish:store              upload rồi publish luôn
 *   npm run publish:store -- --draft   chỉ upload, để nguyên bản nháp trên dashboard
 *   npm run publish:store -- --dry-run kiểm tra cấu hình, không gọi mạng
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const UPLOAD_URL = 'https://www.googleapis.com/upload/chromewebstore/v1.1/items';
const ITEMS_URL = 'https://www.googleapis.com/chromewebstore/v1.1/items';

const args = new Set(process.argv.slice(2));
const draftOnly = args.has('--draft');
const dryRun = args.has('--dry-run');

function fail(message, hint) {
    console.error(`\x1b[31mLỗi:\x1b[0m ${message}`);
    if (hint) console.error(`       ${hint}`);
    process.exit(1);
}

function info(message) {
    console.log(`  ${message}`);
}

/** Đọc .env thủ công để không phải phụ thuộc phiên bản Node hay thư viện ngoài. */
function loadEnv() {
    const path = join(ROOT, '.env');
    if (!existsSync(path)) {
        fail('không tìm thấy .env', 'Chạy: cp .env.example .env rồi điền giá trị. Hướng dẫn ở RELEASING.md.');
    }

    const env = {};
    for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const separator = line.indexOf('=');
        if (separator < 0) continue;

        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (value) env[key] = value;
    }
    return env;
}

/** Che bớt giá trị nhạy cảm khi in ra log. */
function mask(value) {
    if (!value) return '(trống)';
    if (value.length <= 8) return '*'.repeat(value.length);
    return `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`;
}

async function getAccessToken({ clientId, clientSecret, refreshToken }) {
    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        fail(
            `không lấy được access token (HTTP ${response.status}): ${payload.error_description ?? payload.error ?? 'không rõ'}`,
            'Refresh token có thể đã hết hạn hoặc bị thu hồi. Tạo lại theo RELEASING.md.',
        );
    }
    return payload.access_token;
}

async function uploadPackage({ token, extensionId, zipBytes }) {
    const response = await fetch(`${UPLOAD_URL}/${extensionId}?uploadType=media`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'x-goog-api-version': '2',
            'Content-Type': 'application/zip',
        },
        body: zipBytes,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.uploadState === 'FAILURE') {
        const detail = payload.itemError?.map((item) => item.error_detail).join(' | ') ?? `HTTP ${response.status}`;
        fail(`upload thất bại: ${detail}`);
    }
    return payload;
}

async function publishItem({ token, extensionId, target }) {
    const response = await fetch(`${ITEMS_URL}/${extensionId}/publish?publishTarget=${target}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'x-goog-api-version': '2',
            'Content-Length': '0',
        },
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const detail = payload.error?.message ?? `HTTP ${response.status}`;
        fail(`publish thất bại: ${detail}`);
    }
    return payload;
}

// --------------------------------------------------------------------- chạy

const env = loadEnv();
const manifest = JSON.parse(readFileSync(join(ROOT, 'src', 'manifest.json'), 'utf8'));

const config = {
    extensionId: env.CWS_EXTENSION_ID,
    clientId: env.CWS_CLIENT_ID,
    clientSecret: env.CWS_CLIENT_SECRET,
    refreshToken: env.CWS_REFRESH_TOKEN,
    target: env.CWS_PUBLISH_TARGET || 'default',
};

const missing = Object.entries({
    CWS_EXTENSION_ID: config.extensionId,
    CWS_CLIENT_ID: config.clientId,
    CWS_CLIENT_SECRET: config.clientSecret,
    CWS_REFRESH_TOKEN: config.refreshToken,
})
    .filter(([, value]) => !value)
    .map(([key]) => key);

if (missing.length > 0) {
    fail(`thiếu biến trong .env: ${missing.join(', ')}`, 'Cách lấy từng giá trị nằm trong RELEASING.md.');
}

const zipPath = join(ROOT, 'dist', `m2-authenticator-${manifest.version}.zip`);
if (!existsSync(zipPath)) {
    fail(`không tìm thấy ${relative(ROOT, zipPath)}`, 'Chạy `npm run build` trước.');
}

console.log('\nM2 Authenticator - phát hành lên Chrome Web Store\n');
info(`Phiên bản      ${manifest.version}`);
info(`Gói            ${relative(ROOT, zipPath)} (${(statSync(zipPath).size / 1024).toFixed(1)} KB)`);
info(`Extension ID   ${config.extensionId}`);
info(`Client ID      ${mask(config.clientId)}`);
info(`Refresh token  ${mask(config.refreshToken)}`);
info(`Kênh           ${config.target}`);
info(`Chế độ         ${dryRun ? 'dry run' : draftOnly ? 'chỉ upload, giữ bản nháp' : 'upload rồi publish'}`);

if (dryRun) {
    console.log('\n\x1b[33mDry run:\x1b[0m cấu hình hợp lệ, chưa gọi mạng.\n');
    process.exit(0);
}

console.log('');

const token = await getAccessToken(config);
info('Đã lấy access token');

const zipBytes = readFileSync(zipPath);
const upload = await uploadPackage({ token, extensionId: config.extensionId, zipBytes });
info(`Đã upload, trạng thái: ${upload.uploadState ?? 'không rõ'}`);

if (draftOnly) {
    console.log('\n\x1b[32mXong.\x1b[0m Bản mới đang ở dạng nháp trên dashboard, tự bấm gửi duyệt khi sẵn sàng.\n');
    process.exit(0);
}

const published = await publishItem({ token, extensionId: config.extensionId, target: config.target });
info(`Đã gửi publish, trạng thái: ${(published.status ?? []).join(', ') || 'không rõ'}`);

if (published.statusDetail?.length) {
    for (const detail of published.statusDetail) info(`  ${detail}`);
}

console.log('\n\x1b[32mXong.\x1b[0m Google thường mất vài giờ tới vài ngày để duyệt.\n');
