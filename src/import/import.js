/**
 * Màn nhập account. Điểm chính: một ảnh QR "Chuyển tài khoản" của Google Authenticator
 * chứa cả chục account, nên luồng chuẩn là quét => xem lại => lưu một lượt.
 */

import { $, $$, clear, el, show, toast } from '../lib/dom.js';
import { dedupeKey, displayLabel, isOtpAuthUri, parseOtpAuthUri } from '../lib/otpauth.js';
import { isMigrationUri, parseMigrationUri } from '../lib/migration.js';
import { readQrFromBlob, readQrFromFiles } from '../lib/qr.js';
import * as vault from '../lib/vault.js';

const ui = {
    lockedNotice: $('#lockedNotice'),
    workspace: $('#workspace'),
    dropZone: $('#dropZone'),
    fileInput: $('#fileInput'),
    scanStatus: $('#scanStatus'),
    reviewSection: $('#reviewSection'),
    reviewTitle: $('#reviewTitle'),
    reviewList: $('#reviewList'),
    reviewSummary: $('#reviewSummary'),
    batchNotice: $('#batchNotice'),
    saveBtn: $('#saveBtn'),
};

/** Hàng đang chờ duyệt: { account, selected, duplicate } */
let pending = [];
let existingKeys = new Set();
/** Gom các phần của một lần export nhiều QR: batchId => Set(index đã có) */
const batches = new Map();

// ---------------------------------------------------------------- tabs

for (const tab of $$('.tab')) {
    tab.addEventListener('click', () => {
        for (const other of $$('.tab')) other.classList.toggle('tab--active', other === tab);
        show($('#panelQr'), tab.dataset.tab === 'qr');
        show($('#panelManual'), tab.dataset.tab === 'manual');
    });
}

// -------------------------------------------------------------- trạng thái

function setStatus(message, variant = 'info') {
    if (!message) {
        show(ui.scanStatus, false);
        return;
    }
    ui.scanStatus.className = `alert alert--${variant}`;
    ui.scanStatus.textContent = message;
    show(ui.scanStatus, true);
}

// ---------------------------------------------------------- quét QR

/** Một chuỗi QR có thể là 1 account (otpauth) hoặc cả gói (otpauth-migration). */
function parseQrValue(raw) {
    if (isMigrationUri(raw)) {
        const result = parseMigrationUri(raw);
        batches.set(result.batch.id, {
            size: result.batch.size,
            seen: new Set([...(batches.get(result.batch.id)?.seen ?? []), result.batch.index]),
        });
        return result.accounts;
    }
    if (isOtpAuthUri(raw)) {
        return [parseOtpAuthUri(raw)];
    }
    throw new Error('Mã QR này không phải QR 2FA.');
}

function describeBatches() {
    const messages = [];
    for (const [id, info] of batches) {
        if (info.size <= 1) continue;
        const missing = info.size - info.seen.size;
        if (missing > 0) {
            messages.push(
                `Lần xuất này gồm ${info.size} mã QR, bạn mới nhập ${info.seen.size}. Còn thiếu ${missing} mã (batch ${id}).`,
            );
        } else {
            messages.push(`Đã nhập đủ ${info.size} mã QR của lần xuất này.`);
        }
    }
    return messages;
}

async function ingestRawValues(values, sourceErrors = []) {
    const parsed = [];
    const errors = [...sourceErrors];

    for (const raw of values) {
        try {
            parsed.push(...parseQrValue(raw));
        } catch (error) {
            errors.push({ name: 'QR', reason: error.message });
        }
    }

    if (parsed.length === 0) {
        setStatus(
            errors.length > 0
                ? `Không nhập được: ${errors.map((item) => `${item.name}: ${item.reason}`).join(' | ')}`
                : 'Không tìm thấy account nào trong ảnh.',
            'error',
        );
        return;
    }

    addToPending(parsed);

    const notes = [`Đọc được ${parsed.length} account.`];
    if (errors.length > 0) {
        notes.push(`${errors.length} ảnh không đọc được: ${errors.map((item) => item.name).join(', ')}.`);
    }
    setStatus(notes.join(' '), errors.length > 0 ? 'warning' : 'success');

    const batchMessages = describeBatches();
    if (batchMessages.length > 0) {
        ui.batchNotice.textContent = batchMessages.join(' ');
        show(ui.batchNotice, true);
    } else {
        show(ui.batchNotice, false);
    }
}

function addToPending(newAccounts) {
    const pendingKeys = new Set(pending.map((row) => dedupeKey(row.account)));

    for (const account of newAccounts) {
        const key = dedupeKey(account);
        if (pendingKeys.has(key)) continue; // trùng ngay trong đợt quét này
        pendingKeys.add(key);

        const duplicate = existingKeys.has(key);
        pending.push({ account, selected: !duplicate, duplicate });
    }

    renderReview();
}

// --------------------------------------------------------- bảng review

function renderReview() {
    show(ui.reviewSection, pending.length > 0);
    if (pending.length === 0) return;

    clear(ui.reviewList);
    ui.reviewTitle.textContent = `Xem lại ${pending.length} account`;

    pending.forEach((row, index) => {
        const checkbox = el('input', { type: 'checkbox', checked: row.selected });
        checkbox.addEventListener('change', () => {
            row.selected = checkbox.checked;
            updateSummary();
        });

        const issuerInput = el('input', {
            class: 'review-row__input',
            type: 'text',
            value: row.account.issuer,
            placeholder: 'Dịch vụ',
        });
        issuerInput.addEventListener('input', () => {
            row.account.issuer = issuerInput.value;
        });

        const accountInput = el('input', {
            class: 'review-row__input',
            type: 'text',
            value: row.account.account,
            placeholder: 'Tài khoản',
        });
        accountInput.addEventListener('input', () => {
            row.account.account = accountInput.value;
        });

        const meta = el('div', { class: 'review-row__meta' }, [
            row.duplicate ? el('span', { class: 'badge badge--dup', text: 'đã có' }) : null,
            row.account.type === 'hotp' ? el('span', { class: 'badge badge--hotp', text: 'HOTP' }) : null,
            el('div', {
                text: `${row.account.algorithm.replace('SHA-', 'SHA')} · ${row.account.digits} số · ${row.account.period}s`,
            }),
        ]);

        ui.reviewList.append(
            el('div', { class: 'review-row', dataset: { duplicate: String(row.duplicate) } }, [
                checkbox,
                el('div', { class: 'review-row__fields' }, [issuerInput, accountInput]),
                meta,
            ]),
        );
    });

    updateSummary();
}

function updateSummary() {
    const selected = pending.filter((row) => row.selected).length;
    const duplicates = pending.filter((row) => row.duplicate).length;

    const parts = [`Đã chọn ${selected}/${pending.length}`];
    if (duplicates > 0) parts.push(`${duplicates} account đã có sẵn nên bỏ chọn mặc định`);

    ui.reviewSummary.textContent = parts.join(' · ');
    ui.saveBtn.disabled = selected === 0;
}

$('#selectAllBtn').addEventListener('click', () => {
    pending.forEach((row) => {
        row.selected = true;
    });
    renderReview();
});

$('#selectNoneBtn').addEventListener('click', () => {
    pending.forEach((row) => {
        row.selected = false;
    });
    renderReview();
});

$('#cancelBtn').addEventListener('click', () => {
    pending = [];
    batches.clear();
    show(ui.batchNotice, false);
    renderReview();
    setStatus('');
});

ui.saveBtn.addEventListener('click', async () => {
    const chosen = pending.filter((row) => row.selected).map((row) => row.account);
    if (chosen.length === 0) return;

    ui.saveBtn.disabled = true;
    ui.saveBtn.textContent = 'Đang lưu...';

    try {
        const result = await vault.addAccounts(chosen);

        const notes = [`Đã lưu ${result.added} account vào vault mã hoá.`];
        if (result.skipped > 0) notes.push(`${result.skipped} account đã có sẵn nên bỏ qua.`);
        if (result.failed.length > 0) {
            notes.push(`${result.failed.length} account lỗi: ${result.failed[0].reason}`);
        }

        toast(notes[0], 'success');
        setStatus(notes.join(' '), result.failed.length > 0 ? 'warning' : 'success');

        pending = [];
        batches.clear();
        show(ui.batchNotice, false);
        await refreshExistingKeys();
        renderReview();
    } catch (error) {
        setStatus(error.message, 'error');
    } finally {
        ui.saveBtn.disabled = false;
        ui.saveBtn.textContent = 'Lưu vào vault';
    }
});

// -------------------------------------------------------- nguồn ảnh

async function handleFiles(fileList) {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) {
        setStatus('Hãy chọn file ảnh chứa mã QR.', 'error');
        return;
    }

    setStatus(`Đang đọc ${files.length} ảnh...`);
    const { values, errors } = await readQrFromFiles(files);
    await ingestRawValues(values, errors);
}

ui.dropZone.addEventListener('click', () => ui.fileInput.click());
ui.dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        ui.fileInput.click();
    }
});

ui.fileInput.addEventListener('change', async (event) => {
    const files = event.target.files;
    event.target.value = '';
    if (files?.length) await handleFiles(files);
});

for (const type of ['dragenter', 'dragover']) {
    ui.dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        ui.dropZone.dataset.dragging = 'true';
    });
}

for (const type of ['dragleave', 'drop']) {
    ui.dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        delete ui.dropZone.dataset.dragging;
    });
}

ui.dropZone.addEventListener('drop', async (event) => {
    if (event.dataTransfer?.files?.length) await handleFiles(event.dataTransfer.files);
});

document.addEventListener('paste', async (event) => {
    const items = Array.from(event.clipboardData?.items ?? []);
    const imageItem = items.find((item) => item.type.startsWith('image/'));

    if (imageItem) {
        event.preventDefault();
        setStatus('Đang đọc ảnh vừa dán...');
        try {
            const values = await readQrFromBlob(imageItem.getAsFile());
            if (values.length === 0) {
                setStatus('Không tìm thấy mã QR trong ảnh vừa dán.', 'error');
                return;
            }
            await ingestRawValues(values);
        } catch (error) {
            setStatus(error.message, 'error');
        }
        return;
    }

    // Dán thẳng link otpauth:// cũng chấp nhận.
    const text = event.clipboardData?.getData('text/plain')?.trim();
    if (text && (isOtpAuthUri(text) || isMigrationUri(text))) {
        event.preventDefault();
        await ingestRawValues([text]);
    }
});

// ------------------------------------------------------------ nhập tay

$('#manualForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const account = {
        type: 'totp',
        issuer: $('#mIssuer').value.trim(),
        account: $('#mAccount').value.trim(),
        secret: $('#mSecret').value,
        algorithm: $('#mAlgorithm').value,
        digits: Number($('#mDigits').value),
        period: Number($('#mPeriod').value),
    };

    if (!account.issuer && !account.account) {
        setStatus('Hãy điền ít nhất tên dịch vụ hoặc tên tài khoản.', 'error');
        return;
    }

    try {
        await vault.addAccount(account);
        toast(`Đã thêm ${displayLabel(account)}.`, 'success');
        event.target.reset();
        $('#mPeriod').value = '30';
        await refreshExistingKeys();
    } catch (error) {
        setStatus(error.message, 'error');
    }
});

// ----------------------------------------------------------- khởi động

async function refreshExistingKeys() {
    const stored = await vault.listAccounts();
    existingKeys = new Set(stored.map(dedupeKey));
}

async function boot() {
    const state = await vault.getState();

    if (state !== vault.VaultState.UNLOCKED) {
        show(ui.lockedNotice, true);
        show(ui.workspace, false);
        return;
    }

    show(ui.lockedNotice, false);
    show(ui.workspace, true);
    await refreshExistingKeys();
    await vault.touchActivity();
}

// Vault bị khoá giữa chừng thì chặn luôn thao tác lưu.
chrome.storage.session.onChanged.addListener((changes) => {
    if ('dek' in changes && !changes.dek.newValue) {
        show(ui.lockedNotice, true);
        show(ui.workspace, false);
    }
});

boot();
