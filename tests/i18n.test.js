import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { en } from '../src/lib/locales/en.js';
import { vi } from '../src/lib/locales/vi.js';

const SRC = new URL('../src/', import.meta.url).pathname;

function walk(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...walk(full));
        else out.push(full);
    }
    return out;
}

const files = walk(SRC);

test('hai bảng dịch phủ đúng một bộ khoá', () => {
    const enKeys = Object.keys(en).sort();
    const viKeys = Object.keys(vi).sort();

    const missingInVi = enKeys.filter((key) => !Object.hasOwn(vi, key));
    const missingInEn = viKeys.filter((key) => !Object.hasOwn(en, key));

    assert.deepEqual(missingInVi, [], 'khoá có trong en nhưng thiếu ở vi');
    assert.deepEqual(missingInEn, [], 'khoá có trong vi nhưng thiếu ở en');
});

test('không có câu dịch nào bị bỏ trống', () => {
    for (const [code, catalog] of Object.entries({ en, vi })) {
        for (const [key, value] of Object.entries(catalog)) {
            assert.equal(typeof value, 'string', `${code}.${key} phải là chuỗi`);
            assert.ok(value.trim().length > 0, `${code}.${key} đang rỗng`);
        }
    }
});

test('chỗ chèn {tên} giống nhau giữa hai ngôn ngữ', () => {
    // Lệch placeholder nghĩa là một ngôn ngữ sẽ hiện "{count}" trần ra màn hình.
    const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

    for (const key of Object.keys(en)) {
        assert.deepEqual(
            placeholders(vi[key]),
            placeholders(en[key]),
            `khoá "${key}" có chỗ chèn khác nhau giữa en và vi`,
        );
    }
});

test('mọi khoá dùng trong HTML đều tồn tại', () => {
    const missing = [];

    for (const file of files.filter((path) => path.endsWith('.html'))) {
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(/data-i18n(?:-[a-z]+)?="([^"]+)"/g)) {
            if (!Object.hasOwn(en, match[1])) missing.push(`${relative(SRC, file)}: ${match[1]}`);
        }
    }

    assert.deepEqual(missing, []);
});

test('mọi khoá dùng trong JS đều tồn tại', () => {
    const missing = [];

    for (const file of files.filter((path) => path.endsWith('.js'))) {
        const rel = relative(SRC, file);
        if (rel.startsWith('lib/locales')) continue;

        const source = readFileSync(file, 'utf8');
        for (const pattern of [/\bt\(\s*'([^']+)'/g, /\bfail\(\s*'([^']+)'/g, /\bkey:\s*'([^']+)'/g]) {
            for (const match of source.matchAll(pattern)) {
                if (!Object.hasOwn(en, match[1])) missing.push(`${rel}: ${match[1]}`);
            }
        }
    }

    assert.deepEqual(missing, []);
});

test('không còn chuỗi tiếng Việt cứng trong tầng UI', () => {
    // Dấu tiếng Việt trong chuỗi ký tự ở popup/unlock/import/options nghĩa là quên dịch.
    const vietnamese = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
    const offenders = [];

    for (const file of files.filter((path) => path.endsWith('.js'))) {
        const rel = relative(SRC, file);
        if (!/^(popup|unlock|import|options)\//.test(rel)) continue;

        readFileSync(file, 'utf8')
            .split('\n')
            .forEach((line, index) => {
                const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
                for (const match of code.matchAll(/'([^']*)'/g)) {
                    if (vietnamese.test(match[1])) offenders.push(`${rel}:${index + 1} => ${match[1]}`);
                }
            });
    }

    assert.deepEqual(offenders, []);
});
