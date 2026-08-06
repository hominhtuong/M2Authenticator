import { $, clear, confirmDialog, el, show, toast } from '../lib/dom.js';
import { copyCode } from '../lib/clipboard.js';
import { MSG } from '../lib/messages.js';
import { displayLabel } from '../lib/otpauth.js';
import { generateForAccount, secondsRemaining } from '../lib/totp.js';
import * as vault from '../lib/vault.js';

const RING_RADIUS = 12;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const EXPIRY_WARNING_SECONDS = 5;

const ui = {
    screens: {
        setup: $('#screenSetup'),
        locked: $('#screenLocked'),
        vault: $('#screenVault'),
    },
    lockedAlert: $('#lockedAlert'),
    unlockForm: $('#unlockForm'),
    masterPassword: $('#masterPassword'),
    unlockBtn: $('#unlockBtn'),
    biometricBtn: $('#biometricBtn'),
    search: $('#search'),
    list: $('#list'),
    emptyState: $('#emptyState'),
    legacyBanner: $('#legacyBanner'),
};

let settings = { ...vault.DEFAULT_SETTINGS };
let accounts = [];
let sorting = false;
let tickTimer = null;
/** id account => { codeEl, ringEl, labelEl, account } */
const rendered = new Map();

// ------------------------------------------------------------ điều hướng

function showScreen(name) {
    for (const [key, node] of Object.entries(ui.screens)) show(node, key === name);
}

function openPage(path) {
    chrome.tabs.create({ url: chrome.runtime.getURL(path) });
    window.close();
}

/**
 * WebAuthn phải chạy ở cửa sổ riêng: hộp thoại sinh trắc của hệ điều hành cướp focus
 * làm popup đóng lại và huỷ ceremony giữa chừng.
 */
function openUnlockWindow(query = '') {
    chrome.windows.create({
        url: chrome.runtime.getURL(`unlock/unlock.html${query}`),
        type: 'popup',
        width: 420,
        height: 460,
    });
    window.close();
}

// ------------------------------------------------------------- mở khoá

async function refreshLockedScreen() {
    const status = await vault.getLockoutStatus();
    if (status.lockedOut) {
        const seconds = Math.ceil(status.remainingMs / 1000);
        ui.lockedAlert.textContent = `Nhập sai quá nhiều lần. Thử lại sau ${seconds} giây.`;
        show(ui.lockedAlert, true);
        ui.unlockBtn.disabled = true;
        setTimeout(refreshLockedScreen, 1000);
    } else {
        show(ui.lockedAlert, false);
        ui.unlockBtn.disabled = false;
    }

    show(ui.biometricBtn, await vault.hasBiometric());
}

ui.unlockForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = ui.masterPassword.value;
    if (!password) return;

    ui.unlockBtn.disabled = true;
    ui.unlockBtn.textContent = 'Đang mở khoá...';

    try {
        await vault.unlockWithPassword(password);
        ui.masterPassword.value = '';
        await enterVault();
    } catch (error) {
        ui.lockedAlert.textContent = error.message;
        show(ui.lockedAlert, true);
        ui.masterPassword.select();
        await refreshLockedScreen();
    } finally {
        ui.unlockBtn.textContent = 'Mở khoá';
    }
});

ui.biometricBtn.addEventListener('click', () => openUnlockWindow('?biometric=1'));

$('#goSetup').addEventListener('click', () => openUnlockWindow('?setup=1'));

// -------------------------------------------------------------- vault

$('#lockBtn').addEventListener('click', async () => {
    await vault.lock();
    chrome.runtime.sendMessage({ type: MSG.LOCK_NOW }).catch(() => {});
    window.close();
});

$('#settingsBtn').addEventListener('click', () => openPage('options/options.html'));
$('#addBtn').addEventListener('click', () => openPage('import/import.html'));
$('#emptyAddBtn').addEventListener('click', () => openPage('import/import.html'));

$('#sortBtn').addEventListener('click', () => {
    sorting = !sorting;
    ui.list.dataset.sorting = String(sorting);

    // Sắp xếp phải thấy toàn bộ danh sách: nút lên/xuống đổi chỗ trong danh sách thật,
    // nếu đang lọc thì "hàng ngay trên" trên màn hình không phải hàng ngay trên trong vault.
    ui.search.disabled = sorting;
    if (sorting) ui.search.value = '';

    renderList();
    toast(sorting ? 'Chế độ sắp xếp: bật' : 'Đã lưu thứ tự', sorting ? 'info' : 'success');
});

ui.search.addEventListener('input', renderList);

// ------------------------------------------------------------- render

function icon(paths, size = 16) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    for (const definition of [].concat(paths)) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', definition);
        svg.append(path);
    }
    return svg;
}

const ICONS = {
    copy: ['M9 9h10v10H9z', 'M5 15V5h10'],
    trash: ['M4 7h16', 'M10 11v6M14 11v6', 'M6 7l1 13h10l1-13', 'M9 7V4h6v3'],
    up: ['M12 19V5', 'M5 12l7-7 7 7'],
    down: ['M12 5v14', 'M19 12l-7 7-7-7'],
    refresh: ['M21 12a9 9 0 1 1-3-6.7', 'M21 4v5h-5'],
};

function buildRing() {
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('class', 'ring__svg');
    svg.setAttribute('width', '28');
    svg.setAttribute('height', '28');
    svg.setAttribute('viewBox', '0 0 28 28');

    const track = document.createElementNS(svgNs, 'circle');
    track.setAttribute('class', 'ring__track');
    track.setAttribute('cx', '14');
    track.setAttribute('cy', '14');
    track.setAttribute('r', String(RING_RADIUS));

    const value = document.createElementNS(svgNs, 'circle');
    value.setAttribute('class', 'ring__value');
    value.setAttribute('cx', '14');
    value.setAttribute('cy', '14');
    value.setAttribute('r', String(RING_RADIUS));
    value.setAttribute('stroke-dasharray', String(RING_CIRCUMFERENCE));

    svg.append(track, value);

    const label = el('span', { class: 'ring__label' });
    const wrapper = el('div', { class: 'ring' }, [svg, label]);

    return { wrapper, value, label };
}

function matchesSearch(account, query) {
    if (!query) return true;
    const haystack = `${account.issuer} ${account.account}`.toLowerCase();
    return haystack.includes(query);
}

async function moveAccount(id, delta) {
    const ids = accounts.map((item) => item.id);
    const index = ids.indexOf(id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ids.length) return;

    ids.splice(target, 0, ids.splice(index, 1)[0]);
    await vault.reorderAccounts(ids);
    accounts = await vault.listAccounts();
    renderList();
}

async function handleCopy(account, codeEl) {
    const code = codeEl.dataset.code;
    if (!code) return;

    const ok = await copyCode(code, settings.clipboardClearSeconds);
    if (!ok) {
        toast('Không copy được vào clipboard.', 'error');
        return;
    }

    const seconds = Number(settings.clipboardClearSeconds);
    toast(
        seconds > 0 ? `Đã copy. Clipboard tự xoá sau ${seconds}s.` : 'Đã copy mã.',
        'success',
    );
    await vault.touchActivity();
}

async function handleDelete(account) {
    const confirmed = await confirmDialog({
        title: 'Xoá account?',
        message: `"${displayLabel(account)}" sẽ bị xoá vĩnh viễn. Nếu chưa tắt 2FA ở dịch vụ đó, bạn sẽ mất quyền đăng nhập.`,
        confirmLabel: 'Xoá',
        danger: true,
    });
    if (!confirmed) return;

    await vault.deleteAccount(account.id);
    accounts = await vault.listAccounts();
    renderList();
    toast('Đã xoá account.', 'success');
}

function buildEntry(account, index, total) {
    const { wrapper: ring, value: ringValue, label: ringLabel } = buildRing();

    const codeEl = el('button', {
        class: 'entry__code',
        type: 'button',
        title: 'Bấm để copy',
        text: '••••••',
    });
    codeEl.dataset.hidden = String(Boolean(settings.hideCodes));
    codeEl.addEventListener('click', () => handleCopy(account, codeEl));

    const main = el('div', { class: 'entry__main' }, [
        el('div', { class: 'entry__issuer', text: account.issuer || account.account || 'Không tên' }),
        account.issuer && account.account
            ? el('div', { class: 'entry__account', text: account.account })
            : null,
        codeEl,
        account.type === 'hotp'
            ? el('div', { class: 'hotp-counter', text: `HOTP · counter ${account.counter ?? 0}` })
            : null,
    ]);

    const actions = el('div', { class: 'entry__actions' });

    if (sorting) {
        const up = el('button', { class: 'btn btn--icon', type: 'button', title: 'Lên' }, [icon(ICONS.up)]);
        up.disabled = index === 0;
        up.addEventListener('click', () => moveAccount(account.id, -1));

        const down = el('button', { class: 'btn btn--icon', type: 'button', title: 'Xuống' }, [icon(ICONS.down)]);
        down.disabled = index === total - 1;
        down.addEventListener('click', () => moveAccount(account.id, 1));

        actions.append(up, down);
    } else {
        if (account.type === 'hotp') {
            const next = el('button', { class: 'btn btn--icon', type: 'button', title: 'Sinh mã tiếp theo' }, [
                icon(ICONS.refresh),
            ]);
            next.addEventListener('click', async () => {
                await vault.incrementHotpCounter(account.id);
                accounts = await vault.listAccounts();
                renderList();
            });
            actions.append(next);
        }

        const copy = el('button', { class: 'btn btn--icon', type: 'button', title: 'Copy mã' }, [icon(ICONS.copy)]);
        copy.addEventListener('click', () => handleCopy(account, codeEl));

        const remove = el('button', { class: 'btn btn--icon', type: 'button', title: 'Xoá' }, [icon(ICONS.trash)]);
        remove.addEventListener('click', () => handleDelete(account));

        actions.append(copy, remove);
    }

    const entry = el('div', { class: 'entry', role: 'listitem' }, [
        account.type === 'totp' && !sorting ? ring : null,
        main,
        actions,
    ]);

    rendered.set(account.id, { account, codeEl, ringValue, ringLabel });
    return entry;
}

function renderList() {
    const query = ui.search.value.trim().toLowerCase();
    const visible = accounts.filter((account) => matchesSearch(account, query));

    rendered.clear();
    clear(ui.list);

    show(ui.emptyState, accounts.length === 0);

    if (accounts.length > 0 && visible.length === 0) {
        ui.list.append(el('p', { class: 'empty__text', text: 'Không có account nào khớp.' }));
        return;
    }

    visible.forEach((account, index) => {
        ui.list.append(buildEntry(account, index, visible.length));
    });

    tick();
}

// -------------------------------------------------------------- tick

async function tick() {
    const now = Date.now();

    for (const { account, codeEl, ringValue, ringLabel } of rendered.values()) {
        try {
            const code = await generateForAccount(account, now);
            const grouped = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
            codeEl.textContent = grouped;
            codeEl.dataset.code = code;
            delete codeEl.dataset.error;
        } catch {
            codeEl.textContent = 'Secret lỗi';
            codeEl.dataset.error = 'true';
            delete codeEl.dataset.code;
        }

        if (account.type !== 'totp' || !ringValue) continue;

        const period = account.period || 30;
        const remaining = secondsRemaining(period, now);
        const expiring = remaining <= EXPIRY_WARNING_SECONDS;

        ringValue.setAttribute(
            'stroke-dashoffset',
            String(RING_CIRCUMFERENCE * (1 - remaining / period)),
        );
        ringValue.dataset.expiring = String(expiring);
        ringLabel.textContent = String(remaining);
        codeEl.dataset.expiring = String(expiring);
    }
}

function startTicking() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tick, 1000);
}

// -------------------------------------------------------------- khởi động

async function showLegacyBannerIfNeeded() {
    const count = await vault.countLegacyAccounts();
    if (count === 0) {
        show(ui.legacyBanner, false);
        return;
    }

    clear(ui.legacyBanner);
    ui.legacyBanner.append(
        el('div', {
            text: `Còn ${count} account của bản cũ đang lưu KHÔNG mã hoá trên máy.`,
        }),
        el('button', {
            class: 'btn btn--sm',
            type: 'button',
            text: 'Chuyển vào vault mã hoá',
            style: 'margin-top:8px',
            onClick: async () => {
                const result = await vault.migrateLegacyPlaintextData();
                accounts = await vault.listAccounts();
                renderList();
                await showLegacyBannerIfNeeded();
                toast(`Đã chuyển ${result.added} account và xoá bản plaintext.`, 'success');
            },
        }),
    );
    show(ui.legacyBanner, true);
}

async function enterVault() {
    settings = await vault.getSettings();
    accounts = await vault.listAccounts();
    showScreen('vault');
    renderList();
    startTicking();
    await showLegacyBannerIfNeeded();
    await vault.touchActivity();
    ui.search.focus();
}

async function boot() {
    const state = await vault.getState();

    if (state === vault.VaultState.UNINITIALIZED) {
        showScreen('setup');
        return;
    }

    if (state === vault.VaultState.LOCKED) {
        showScreen('locked');
        await refreshLockedScreen();
        ui.masterPassword.focus();
        return;
    }

    await enterVault();
}

// Vault bị auto-lock trong lúc popup đang mở thì phải phản ứng ngay.
chrome.storage.session.onChanged.addListener((changes) => {
    if ('dek' in changes && !changes.dek.newValue) {
        if (tickTimer) clearInterval(tickTimer);
        rendered.clear();
        showScreen('locked');
        refreshLockedScreen();
    }
});

window.addEventListener('unload', () => {
    if (tickTimer) clearInterval(tickTimer);
});

boot();
