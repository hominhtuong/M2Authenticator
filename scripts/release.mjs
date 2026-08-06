#!/usr/bin/env node
/**
 * Tạo GitHub release cho version hiện tại và đính kèm file zip.
 *
 * Ưu tiên dùng GitHub CLI vì nó giữ token trong keychain của hệ điều hành. Chỉ khi không có `gh`
 * mới rơi về GITHUB_TOKEN trong .env.
 *
 * Dùng:
 *   npm run release:github
 *   npm run release:github -- --dry-run
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

function fail(message, hint) {
    console.error(`\x1b[31mLỗi:\x1b[0m ${message}`);
    if (hint) console.error(`       ${hint}`);
    process.exit(1);
}

function run(command, commandArgs, options = {}) {
    return execFileSync(command, commandArgs, { encoding: 'utf8', cwd: ROOT, ...options }).trim();
}

function has(command) {
    try {
        run('which', [command]);
        return true;
    } catch {
        return false;
    }
}

const manifest = JSON.parse(readFileSync(join(ROOT, 'src', 'manifest.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

if (manifest.version !== pkg.version) {
    fail(`version lệch nhau: manifest ${manifest.version} vs package.json ${pkg.version}`);
}

const version = manifest.version;
const tag = `v${version}`;
const zipPath = join(ROOT, 'dist', `m2-authenticator-${version}.zip`);

if (!existsSync(zipPath)) fail(`không tìm thấy ${relative(ROOT, zipPath)}`, 'Chạy `npm run build` trước.');
if (!has('gh')) fail('không tìm thấy GitHub CLI', 'Cài bằng `brew install gh` rồi `gh auth login`.');

const dirty = run('git', ['status', '--porcelain']);
if (dirty) {
    fail('cây làm việc còn thay đổi chưa commit', 'Commit hoặc stash trước khi phát hành.');
}

let exists = false;
try {
    run('git', ['rev-parse', tag]);
    exists = true;
} catch {
    /* chưa có tag, đúng như mong đợi */
}
if (exists) fail(`tag ${tag} đã tồn tại`, 'Tăng version, hoặc xoá tag cũ nếu đây là lần thử.');

console.log(`\nPhát hành ${tag}`);
console.log(`  Gói  ${relative(ROOT, zipPath)}`);

if (dryRun) {
    console.log('\n\x1b[33mDry run:\x1b[0m mọi kiểm tra đã qua, chưa tạo gì.\n');
    process.exit(0);
}

const notes = [
    `Bản phát hành ${version} của M2 Authenticator.`,
    '',
    'Cài đặt: tải file zip bên dưới, giải nén, mở `chrome://extensions`, bật Developer mode,',
    'bấm Load unpacked và trỏ vào thư mục vừa giải nén. Cần Chrome 116 trở lên.',
    '',
    'Hướng dẫn sử dụng và mô tả cơ chế bảo mật nằm trong README.',
].join('\n');

run('git', ['tag', '-a', tag, '-m', `M2 Authenticator ${version}`]);
run('git', ['push', 'origin', tag]);

execFileSync('gh', ['release', 'create', tag, zipPath, '--title', `M2 Authenticator ${version}`, '--notes', notes], {
    cwd: ROOT,
    stdio: 'inherit',
});

console.log('\n\x1b[32mXong.\x1b[0m\n');
