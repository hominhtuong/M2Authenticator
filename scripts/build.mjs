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
console.log('Kiểm tra đã qua: version khớp, quyền tối thiểu, không host permission, không content script, không lời gọi mạng.');
console.log('\nBước tiếp theo: tải file zip lên Chrome Web Store Developer Dashboard.');
