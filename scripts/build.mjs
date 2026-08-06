#!/usr/bin/env node
/**
 * Đóng gói thư mục src/ thành zip để nộp Chrome Web Store.
 *
 * Trước khi nén có vài bước kiểm tra bắt buộc, vì một extension giữ seed 2FA mà lọt
 * quyền thừa hoặc file rác lên store là chuyện không sửa lại được sau khi user đã cài.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

const ALLOWED_PERMISSIONS = new Set(['storage', 'alarms', 'offscreen', 'clipboardWrite']);
const BANNED_FILES = [/\.DS_Store$/, /\.map$/, /^\.idea/, /\.log$/];

function fail(message) {
    console.error(`\x1b[31mLỗi:\x1b[0m ${message}`);
    process.exit(1);
}

function walk(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...walk(full));
        else out.push(full);
    }
    return out;
}

// ------------------------------------------------------------- kiểm tra

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(SRC, 'manifest.json'), 'utf8'));

if (manifest.version !== pkg.version) {
    fail(`version lệch nhau: manifest.json ${manifest.version} vs package.json ${pkg.version}`);
}

if (manifest.manifest_version !== 3) {
    fail('Chrome Web Store chỉ nhận Manifest V3.');
}

for (const permission of manifest.permissions ?? []) {
    if (!ALLOWED_PERMISSIONS.has(permission)) {
        fail(`quyền "${permission}" không nằm trong danh sách cho phép. Nếu thật sự cần, cập nhật SECURITY.md và ALLOWED_PERMISSIONS.`);
    }
}

if (manifest.host_permissions?.length) {
    fail('extension này không được phép có host_permissions.');
}

if (manifest.content_scripts?.length) {
    fail('extension này không được phép có content script.');
}

if (!manifest.content_security_policy?.extension_pages?.includes("script-src 'self'")) {
    fail('CSP extension_pages phải giới hạn script-src về self.');
}

const files = walk(SRC);

for (const file of files) {
    const rel = relative(SRC, file);
    if (BANNED_FILES.some((pattern) => pattern.test(rel))) {
        fail(`file rác lọt vào bản đóng gói: ${rel}. Xoá rồi build lại.`);
    }
}

// ------------------------------------------------------- kiểm tra i18n

const { en } = await import(new URL('../src/lib/locales/en.js', import.meta.url));
const { vi } = await import(new URL('../src/lib/locales/vi.js', import.meta.url));

const CATALOGS = { en, vi };

if (!manifest.default_locale) {
    fail('manifest thiếu default_locale trong khi thư mục _locales đang tồn tại.');
}

for (const locale of Object.keys(CATALOGS)) {
    const messagesPath = join(SRC, '_locales', locale, 'messages.json');
    try {
        const messages = JSON.parse(readFileSync(messagesPath, 'utf8'));
        for (const key of ['appName', 'appDescription']) {
            if (!messages[key]?.message) fail(`_locales/${locale}/messages.json thiếu khoá "${key}".`);
        }
    } catch (error) {
        if (error.code === 'ENOENT') fail(`thiếu file _locales/${locale}/messages.json`);
        throw error;
    }
}

// Hai bảng dịch phải phủ đúng một bộ khoá, nếu không sẽ có chỗ hiện tiếng Anh lẫn trong tiếng Việt.
const enKeys = new Set(Object.keys(en));
const viKeys = new Set(Object.keys(vi));

const missingInVi = [...enKeys].filter((key) => !viKeys.has(key));
const missingInEn = [...viKeys].filter((key) => !enKeys.has(key));

if (missingInVi.length > 0) fail(`bảng dịch "vi" thiếu ${missingInVi.length} khoá: ${missingInVi.join(', ')}`);
if (missingInEn.length > 0) fail(`bảng dịch "en" thiếu ${missingInEn.length} khoá: ${missingInEn.join(', ')}`);

// Mọi khoá được dùng trong HTML và JS phải tồn tại thật, tránh giao diện hiện ra tên khoá.
const usedKeys = new Map();

const noteKey = (key, file) => {
    if (!usedKeys.has(key)) usedKeys.set(key, file);
};

for (const file of walk(SRC)) {
    const rel = relative(SRC, file);

    if (file.endsWith('.html')) {
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(/data-i18n(?:-[a-z]+)?="([^"]+)"/g)) noteKey(match[1], rel);
    } else if (file.endsWith('.js') && !rel.startsWith('lib/locales')) {
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(/\bt\(\s*'([^']+)'/g)) noteKey(match[1], rel);
        for (const match of source.matchAll(/\bfail\(\s*'([^']+)'/g)) noteKey(match[1], rel);
        for (const match of source.matchAll(/\bkey:\s*'([^']+)'/g)) noteKey(match[1], rel);
    }
}

const unknownKeys = [...usedKeys].filter(([key]) => !enKeys.has(key));
if (unknownKeys.length > 0) {
    fail(
        `dùng ${unknownKeys.length} khoá dịch không tồn tại:\n` +
            unknownKeys.map(([key, file]) => `         ${key}  (${file})`).join('\n'),
    );
}

// Bắt các lời gọi mạng sót lại. Cách kiểm thô nhưng đủ để chặn nhầm lẫn rõ ràng.
const NETWORK_PATTERNS = [/\bfetch\s*\(/, /XMLHttpRequest/, /new\s+WebSocket/, /importScripts\s*\(/];
for (const file of files.filter((path) => path.endsWith('.js'))) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of NETWORK_PATTERNS) {
        if (pattern.test(source)) {
            fail(`${relative(ROOT, file)} có lời gọi mạng (${pattern}). Extension này phải chạy hoàn toàn offline.`);
        }
    }
}

// -------------------------------------------------------------- đóng gói

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const zipName = `m2-authenticator-${manifest.version}.zip`;
const zipPath = join(DIST, zipName);

try {
    execFileSync('zip', ['-r', '-q', '-X', zipPath, '.', '-x', '.*'], { cwd: SRC, stdio: 'inherit' });
} catch (error) {
    fail(`không chạy được lệnh zip: ${error.message}. Trên macOS/Linux lệnh này có sẵn, trên Windows hãy dùng WSL hoặc nén thủ công thư mục src/.`);
}

const sizeKb = (statSync(zipPath).size / 1024).toFixed(1);

console.log(`\x1b[32mĐã đóng gói\x1b[0m ${relative(ROOT, zipPath)} (${sizeKb} KB, ${files.length} file)`);
console.log(
    'Kiểm tra đã qua: version khớp, quyền tối thiểu, không host permission, không content script,\n' +
        `không lời gọi mạng, ${enKeys.size} khoá dịch phủ đủ ${Object.keys(CATALOGS).length} ngôn ngữ.`,
);
console.log('\nBước tiếp theo: tải file zip lên Chrome Web Store Developer Dashboard.');
