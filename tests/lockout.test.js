import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FREE_ATTEMPTS, backoffDelayFor } from '../src/lib/vault.js';

test('năm lần sai đầu không bị phạt', () => {
    for (let attempts = 0; attempts <= FREE_ATTEMPTS; attempts++) {
        assert.equal(backoffDelayFor(attempts), 0, `lần sai thứ ${attempts} không được bắt chờ`);
    }
});

test('từ lần thứ 6 thời gian chờ gấp đôi sau mỗi lần', () => {
    assert.equal(backoffDelayFor(6), 15_000);
    assert.equal(backoffDelayFor(7), 30_000);
    assert.equal(backoffDelayFor(8), 60_000);
    assert.equal(backoffDelayFor(9), 120_000);
    assert.equal(backoffDelayFor(10), 240_000);
    assert.equal(backoffDelayFor(11), 480_000);
});

test('có trần để người quên mật khẩu thật không bị khoá vô hạn', () => {
    const cap = 30 * 60_000;
    assert.equal(backoffDelayFor(20), cap);
    assert.equal(backoffDelayFor(1000), cap);
});

test('đầu vào rác không làm vỡ hàm', () => {
    assert.equal(backoffDelayFor(undefined), 0);
    assert.equal(backoffDelayFor(-5), 0);
    assert.equal(backoffDelayFor('7'), 30_000);
});
