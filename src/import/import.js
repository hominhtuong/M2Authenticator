/**
 * Màn nhập account. Điểm chính: một ảnh QR "Chuyển tài khoản" của Google Authenticator
 * chứa cả chục account, nên luồng chuẩn là quét => xem lại => lưu một lượt.
 */

import { $, $$, clear, el, show, toast } from '../lib/dom.js';
import { dedupeKey, displayLabel, isOtpAuthUri, parseOtpAuthUri } from '../lib/otpauth.js';
import { isMigrationUri, parseMigrationUri } from '../lib/migration.js';
import { readQrFromBlob, readQrFromFiles } from '../lib/qr.js';
import { buildLanguageSwitcher, describeError, initI18n, onLanguageChange, t } from '../lib/i18n.js';
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
/** Gom các phần của một lần export nhiều QR: batchId => { size, seen:Set } */
const batches = new Map();
/** Trạng thái ô thông báo, giữ lại để vẽ lại được khi đổi ngôn ngữ. */
let status = null;

// ---------------------------------------------------------------- tabs

for (const tab of $$('.tab')) {
    tab.addEventListener('click', () => {
        for (const other of $$('.tab')) other.classList.toggle('tab--active', other === tab);
        show($('#panelQr'), tab.dataset.tab === 'qr');
        show($('#panelManual'), tab.dataset.tab === 'manual');
    });
}

// -------------------------------------------------------------- trạng thái

/** Nhớ khoá dịch chứ không nhớ câu chữ, để đổi ngôn ngữ là câu tự đổi theo. */
function setStatus(parts, variant = 'info') {
    status = parts ? { parts, variant } : null;
    paintStatus();
}

function paintStatus() {
    if (!status) {
        show(ui.scanStatus, false);
        return;
    }
    ui.scanStatus.className = `alert alert--${status.variant}`;
    ui.scanStatus.textContent = status.parts
        .map((part) => (typeof part === 'string' ? part : t(part.key, part.params)))
        .join(' ');
    show(ui.scanStatus, true);
}

// ---------------------------------------------------------- quét QR

/** Một chuỗi QR có thể là 1 account (otpauth) hoặc cả gói (otpauth-migration). */
function parseQrValue(raw) {
    if (isMigrationUri(raw)) {
        const result = parseMigrationUri(raw);
        const previous = batches.get(result.batch.id)?.seen ?? [];
        batches.set(result.batch.id, {
            size: result.batch.size,
            seen: new Set([...previous, result.batch.index]),
        });
        return result.accounts;
    }
    if (isOtpAuthUri(raw)) return [parseOtpAuthUri(raw)];

    return [];
}

function describeBatches() {
    const parts = [];
    for (const [id, info] of batches) {
        if (info.size <= 1) continue;
        const missing = info.size - info.seen.size;
        parts.push(
            missing > 0
                ? { key: 'import.batchMissing', params: { size: info.size, seen: info.seen.size, missing, id } }
                : { key: 'import.batchComplete', params: { size: info.size } },
        );
    }
    return parts;
}

function paintBatchNotice(parts) {
    if (parts.length === 0) {
        show(ui.batchNotice, false);
        return;
    }
    ui.batchNotice.textContent = parts.map((part) => t(part.key, part.params)).join(' ');
    show(ui.batchNotice, true);
}

async function ingestRawValues(values, sourceErrors = []) {
    const parsed = [];
    const errors = [...sourceErrors];

    for (const raw of values) {
        try {
            const found = parseQrValue(raw);
            if (found.length === 0) errors.push({ name: 'QR', code: 'error.otpNotOtpauth', params: {} });
            else parsed.push(...found);
        } catch (error) {
            errors.push({ name: 'QR', code: error.code ?? 'error.unknown', params: error.params ?? {} });
        }
    }

    if (parsed.length === 0) {
        setStatus(
            errors.length > 0
                ? [
                      {
                          key: 'import.failed',
                          params: { details: errors.map((item) => `${item.name}: ${t(item.code, item.params)}`).join(' | ') },
                      },
                  ]
                : [{ key: 'import.noneFound' }],
            'error',
        );
        return;
    }

    addToPending(parsed);

    const parts = [{ key: 'import.readCount', params: { count: parsed.length } }];
    if (errors.length > 0) {
        parts.push({
            key: 'import.readErrors',
            params: { count: errors.length, names: errors.map((item) => item.name).join(', ') },
        });
    }
    setStatus(parts, errors.length > 0 ? 'warning' : 'success');

    paintBatchNotice(describeBatches());
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
    ui.reviewTitle.textContent = t('import.review.title', { count: pending.length });

    for (const row of pending) {
        const checkbox = el('input', { type: 'checkbox', checked: row.selected });
        checkbox.addEventListener('change', () => {
            row.selected = checkbox.checked;
            updateSummary();
        });

        const issuerInput = el('input', {
            class: 'review-row__input',
            type: 'text',
            value: row.account.issuer,
            placeholder: t('import.review.issuerPlaceholder'),
        });
        issuerInput.addEventListener('input', () => {
            row.account.issuer = issuerInput.value;
        });

        const accountInput = el('input', {
            class: 'review-row__input',
            type: 'text',
            value: row.account.account,
            placeholder: t('import.review.accountPlaceholder'),
        });
        accountInput.addEventListener('input', () => {
            row.account.account = accountInput.value;
        });

        const meta = el('div', { class: 'review-row__meta' }, [
            row.duplicate
                ? el('span', { class: 'badge badge--dup', text: t('import.review.badgeDuplicate') })
                : null,
            row.account.type === 'hotp' ? el('span', { class: 'badge badge--hotp', text: 'HOTP' }) : null,
            el('div', {
                text: `${row.account.algorithm.replace('SHA-', 'SHA')} · ${row.account.digits} · ${row.account.period}s`,
            }),
        ]);

        ui.reviewList.append(
            el('div', { class: 'review-row', dataset: { duplicate: String(row.duplicate) } }, [
                checkbox,
                el('div', { class: 'review-row__fields' }, [issuerInput, accountInput]),
                meta,
            ]),
        );
    }

    updateSummary();
}

function updateSummary() {
    const selected = pending.filter((row) => row.selected).length;
    const duplicates = pending.filter((row) => row.duplicate).length;

    const parts = [t('import.review.summary', { selected, total: pending.length })];
    if (duplicates > 0) parts.push(t('import.review.summaryDuplicates', { count: duplicates }));

    ui.reviewSummary.textContent = parts.join(' · ');
    ui.saveBtn.disabled = selected === 0;
}

$('#selectAllBtn').addEventListener('click', () => {
    for (const row of pending) row.selected = true;
    renderReview();
});

$('#selectNoneBtn').addEventListener('click', () => {
    for (const row of pending) row.selected = false;
    renderReview();
});

$('#cancelBtn').addEventListener('click', () => {
    pending = [];
    batches.clear();
    show(ui.batchNotice, false);
    renderReview();
    setStatus(null);
});

ui.saveBtn.addEventListener('click', async () => {
    const chosen = pending.filter((row) => row.selected).map((row) => row.account);
    if (chosen.length === 0) return;

    ui.saveBtn.disabled = true;
    ui.saveBtn.textContent = t('import.review.saving');

    try {
        const result = await vault.addAccounts(chosen);

        const parts = [{ key: 'import.saved', params: { count: result.added } }];
        if (result.skipped > 0) parts.push({ key: 'import.savedSkipped', params: { count: result.skipped } });
        if (result.failed.length > 0) {
            const [first] = result.failed;
            parts.push({
                key: 'import.savedFailed',
                params: { count: result.failed.length, reason: t(first.code, first.params) },
            });
        }

        toast(t('import.saved', { count: result.added }), 'success');
        setStatus(parts, result.failed.length > 0 ? 'warning' : 'success');

        pending = [];
        batches.clear();
        show(ui.batchNotice, false);
        await refreshExistingKeys();
        renderReview();
    } catch (error) {
        setStatus([describeError(error)], 'error');
    } finally {
        ui.saveBtn.disabled = false;
        ui.saveBtn.textContent = t('import.review.save');
    }
});

// -------------------------------------------------------- nguồn ảnh

async function handleFiles(fileList) {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) {
        setStatus([{ key: 'import.needImage' }], 'error');
        return;
    }

    setStatus([{ key: 'import.reading', params: { count: files.length } }]);
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
        setStatus([{ key: 'import.readingPasted' }]);
        try {
            const values = await readQrFromBlob(imageItem.getAsFile());
            if (values.length === 0) {
                setStatus([{ key: 'import.noneInPasted' }], 'error');
                return;
            }
            await ingestRawValues(values);
        } catch (error) {
            setStatus([describeError(error)], 'error');
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
        setStatus([{ key: 'import.manual.needName' }], 'error');
        return;
    }

    try {
        await vault.addAccount(account);
        toast(t('import.manual.added', { label: displayLabel(account, t('common.unknownAccount')) }), 'success');
        event.target.reset();
        $('#mPeriod').value = '30';
        setStatus(null);
        await refreshExistingKeys();
    } catch (error) {
        setStatus([describeError(error)], 'error');
    }
});

// ----------------------------------------------------------- khởi động

async function refreshExistingKeys() {
    const stored = await vault.listAccounts();
    existingKeys = new Set(stored.map(dedupeKey));
}

async function boot() {
    await initI18n();
    $('#langSlot').append(buildLanguageSwitcher());

    onLanguageChange(() => {
        paintStatus();
        paintBatchNotice(describeBatches());
        if (pending.length > 0) renderReview();
        else ui.reviewTitle.textContent = t('import.review.titleIdle');
    });

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
