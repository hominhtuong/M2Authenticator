#!/usr/bin/env node
/**
 * Dựng bản harness để chụp màn hình: chép src/ ra dist/harness/ rồi chèn mock chrome.* và
 * script nạp dữ liệu mẫu vào mỗi trang HTML.
 *
 * Giao diện, CSS và toàn bộ logic là code thật, không phải bản dựng lại cho đẹp: ảnh chụp
 * ra đúng thứ người dùng sẽ thấy.
 *
 * Dùng:
 *   node tools/screenshots/build-harness.mjs
 *   npx --yes http-server dist/harness -p 4173      (hoặc python3 -m http.server)
 */

import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'dist', 'harness');

function walk(dir) {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full));
        else out.push(full);
    }
    return out;
}

// ------------------------------------------------ dữ liệu QR migration mẫu

/** Bộ mã hoá protobuf tối giản, chỉ để dựng payload mẫu cho ảnh chụp. */
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

const tag = (field, wire) => varint((BigInt(field) << 3n) | BigInt(wire));
const lengthField = (field, bytes) => [...tag(field, 2), ...varint(bytes.length), ...bytes];
const varintField = (field, value) => [...tag(field, 0), ...varint(value)];
const ascii = (text) => Array.from(new TextEncoder().encode(text));

function otpParameters({ secret, name, issuer, algorithm = 1, digits = 1, type = 2 }) {
    return [
        ...lengthField(1, ascii(secret)),
        ...lengthField(2, ascii(name)),
        ...lengthField(3, ascii(issuer)),
        ...varintField(4, algorithm),
        ...varintField(5, digits),
        ...varintField(6, type),
    ];
}

// Tên bịa hoàn toàn: ảnh chụp sẽ được đăng công khai.
const DEMO_ENTRIES = [
    { secret: 'demo-seed-github', name: 'GitHub:alex@example.com', issuer: 'GitHub' },
    { secret: 'demo-seed-google', name: 'Google:alex.morgan@example.com', issuer: 'Google' },
    { secret: 'demo-seed-aws-ro', name: 'AWS:root-billing', issuer: 'AWS' },
    { secret: 'demo-seed-cloudf', name: 'Cloudflare:alex@example.com', issuer: 'Cloudflare' },
    { secret: 'demo-seed-dropbx', name: 'Dropbox:alex@example.com', issuer: 'Dropbox', digits: 2 },
    { secret: 'demo-seed-notion', name: 'Notion:alex@example.com', issuer: 'Notion', algorithm: 2 },
    { secret: 'demo-seed-figman', name: 'Figma:alex@example.com', issuer: 'Figma' },
    { secret: 'demo-seed-linear', name: 'Linear:alex@example.com', issuer: 'Linear' },
];

const payload = [
    ...DEMO_ENTRIES.flatMap((entry) => lengthField(1, otpParameters(entry))),
    ...varintField(2, 1),
    ...varintField(3, 1),
    ...varintField(4, 0),
    ...varintField(5, 7331),
];

const migrationUri = `otpauth-migration://offline?data=${encodeURIComponent(
    Buffer.from(Uint8Array.from(payload)).toString('base64'),
)}`;

// --------------------------------------------------------------- dựng bản

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

cpSync(SRC, OUT, { recursive: true, filter: (source) => !/\/\.[^/]+$/.test(source) });

for (const name of ['mock-chrome.js', 'seed.js', 'seeder.html', 'showcase.html', 'showcase.css', 'showcase.js']) {
    cpSync(join(HERE, name), join(OUT, name));
}

// Mock phải trả về đúng version đang dựng, nếu không màn "Có gì mới" và nhãn phiên bản sẽ sai.
const harnessVersion = JSON.parse(readFileSync(join(SRC, 'manifest.json'), 'utf8')).version;
const mockPath = join(OUT, 'mock-chrome.js');
writeFileSync(mockPath, readFileSync(mockPath, 'utf8').replace('__HARNESS_VERSION__', harnessVersion));

writeFileSync(
    join(OUT, 'demo-data.js'),
    `// Sinh tự động bởi tools/screenshots/build-harness.mjs. Đừng sửa tay.\n` +
        `export const MIGRATION_URI = ${JSON.stringify(migrationUri)};\n` +
        `globalThis.__DEMO_MIGRATION_URI__ = MIGRATION_URI;\n`,
);

// Chèn mock vào mỗi trang thật.
//
// mock-chrome.js là script thường nên chạy ngay lúc phân tích tài liệu, trước mọi module,
// và nạp dữ liệu từ localStorage một cách đồng bộ. Việc gieo dữ liệu do seeder.html làm
// từ trước, nên ở đây không cần chờ gì cả.
const INJECT =
    '\n    <script src="/mock-chrome.js"></script>' +
    '\n    <script type="module" src="/demo-data.js"></script>';

let patched = 0;
for (const file of walk(OUT).filter((path) => path.endsWith('.html'))) {
    if (file.endsWith('showcase.html') || file.endsWith('seeder.html')) continue;

    const source = readFileSync(file, 'utf8');
    if (!source.includes('<head>')) continue;

    writeFileSync(file, source.replace('<head>', `<head>${INJECT}`));
    patched += 1;
}

console.log(`Harness dựng tại ${relative(ROOT, OUT)}/  (${patched} trang đã chèn mock)`);
console.log(`QR migration mẫu: ${DEMO_ENTRIES.length} account`);
console.log('\nChạy server rồi mở trang:');
console.log(`  python3 -m http.server 4173 --directory ${relative(ROOT, OUT)}`);
console.log('  http://localhost:4173/seeder.html          <- gieo dữ liệu trước');
console.log('  http://localhost:4173/popup/popup.html     <- rồi mở trang thật');
