import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RELEASE_NOTES, compareVersions, notesSince } from '../src/lib/release-notes.js';

test('so sánh version theo từng số, không so chuỗi', () => {
    assert.ok(compareVersions('1.2.0', '1.10.0') < 0);
    assert.ok(compareVersions('1.2.0', '1.1.9') > 0);
    assert.equal(compareVersions('1.2.0', '1.2.0'), 0);
    assert.ok(compareVersions('2.0.0', '1.9.9') > 0);
    assert.equal(compareVersions('1.2', '1.2.0'), 0);
});

test('đầu vào rác thì coi như 0', () => {
    assert.ok(compareVersions('', '0.0.1') < 0);
    assert.equal(compareVersions(undefined, ''), 0);
    assert.ok(compareVersions('1.x.0', '1.0.0') === 0);
});

test('chưa biết đã xem tới đâu thì chỉ hiện đúng bản đang chạy', () => {
    const notes = notesSince('', '1.2.0');
    assert.equal(notes.length, 1);
    assert.equal(notes[0].version, '1.2.0');
});

test('đã xem bản cũ thì hiện mọi bản mới hơn', () => {
    const notes = notesSince('1.0.0', '1.2.0');
    assert.deepEqual(notes.map((entry) => entry.version), ['1.2.0']);
});

test('đang ở bản mới nhất thì không còn gì để khoe', () => {
    assert.deepEqual(notesSince('1.2.0', '1.2.0'), []);
});

test('không rò rỉ ghi chú của bản chưa phát hành', () => {
    const notes = notesSince('', '1.0.0');
    assert.deepEqual(notes, []);
});

test('mọi mục ghi chú đều có version và khoá dịch', () => {
    for (const entry of RELEASE_NOTES) {
        assert.match(entry.version, /^\d+\.\d+\.\d+$/);
        assert.ok(entry.keys.length > 0, `${entry.version} không có khoá nào`);
        for (const key of entry.keys) assert.match(key, /^whatsnew\./);
    }
});
