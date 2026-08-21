import { $, clear, confirmDialog, el, show, toast } from '../lib/dom.js';
import { copyCode } from '../lib/clipboard.js';
import { MSG } from '../lib/messages.js';
import { displayLabel } from '../lib/otpauth.js';
import { generateForAccount, secondsRemaining } from '../lib/totp.js';
import { openExtensionWindow } from '../lib/windows.js';
import { buildLanguageSwitcher, initI18n, onLanguageChange, t } from '../lib/i18n.js';
import { createUnlockView } from '../unlock/unlock-view.js';
import { createSettingsView } from '../settings/settings-view.js';
import { buildWhatsNewPanel } from '../settings/whatsnew-view.js';
import { currentVersion } from '../lib/version.js';
import * as vault from '../lib/vault.js';

const RING_RADIUS = 12;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const EXPIRY_WARNING_SECONDS = 5;

const ui = {
    screens: {
        locked: $('#screenLocked'),
        vault: $('#screenVault'),
    },
    search: $('#search'),
    settingsTitle: $('#settingsTitle'),
    settingsBtn: $('#settingsBtn'),
    settingsPanel: $('#settingsPanel'),
    whatsnewPanel: $('#whatsnewPanel'),
    versionLabel: $('#versionLabel'),
    lockBtn: $('#lockBtn'),
    addBtn: $('#addBtn'),
    sortBtn: $('#sortBtn'),
    list: $('#list'),
    emptyState: $('#emptyState'),
};

let settings = { ...vault.DEFAULT_SETTINGS };
let accounts = [];
let sorting = false;
let tickTimer = null;
/** 'list' | 'settings' | 'whatsnew' */
let view = 'list';
/** Dựng một lần rồi dùng lại, để mở đi mở lại cài đặt không mất trạng thái đang gõ dở. */
let settingsView = null;
let unlockView = null;
/** id account => { account, codeEl, ringValue, ringLabel } */
const rendered = new Map();

// ------------------------------------------------------------ điều hướng

function showScreen(name) {
    for (const [key, node] of Object.entries(ui.screens)) show(node, key === name);
    document.body.dataset.screen = name;
}

function openPage(path) {
    chrome.tabs.create({ url: chrome.runtime.getURL(path) });
    window.close();
}

// ------------------------------------------------------------- mở khoá

/**
 * Màn khoá dùng chung khung với cửa sổ unlock, nên bấm vân tay không còn cảnh giao diện
 * nhảy sang một khung khác kích thước. Riêng ceremony WebAuthn vẫn phải chạy ở cửa sổ riêng:
 * hộp thoại sinh trắc của hệ điều hành cướp focus làm popup đóng và huỷ ceremony giữa chừng.
 */
function mountUnlockView() {
    if (unlockView) return unlockView;

    unlockView = createUnlockView({
        onUnlocked: () => enterVault(),
        onBiometricRequest: () => {
            openExtensionWindow('unlock/unlock.html?biometric=1', { width: 396, height: 560 }).finally(
                () => window.close(),
            );
        },
    });

    ui.screens.locked.append(unlockView.root);
    return unlockView;
}

async function showLocked() {
    stopTicking();
    rendered.clear();
    view = 'list';
    showScreen('locked');
    await mountUnlockView().start();
}

// ------------------------------------------------------------- cài đặt

function paintView() {
    const onList = view === 'list';
    document.body.dataset.view = view;

    show(ui.search, onList);
    show(ui.addBtn, onList);
    show(ui.sortBtn, onList);
    show(ui.list, onList);
    show(ui.emptyState, onList && accounts.length === 0);

    show(ui.settingsTitle, !onList);
    ui.settingsTitle.textContent = t(
        view === 'whatsnew' ? 'whatsnew.title' : 'options.title',
        { version: currentVersion() },
    );

    show(ui.settingsPanel, view === 'settings');
    show(ui.whatsnewPanel, view === 'whatsnew');

    // Bánh răng giữ nguyên icon, chỉ sáng lên khi đang ở trong cài đặt.
    ui.settingsBtn.dataset.active = String(view === 'settings');
    ui.settingsBtn.setAttribute('aria-pressed', String(view === 'settings'));
}

async function openSettings() {
    if (!settingsView) {
        settingsView = createSettingsView({
            compact: true,
            onSettingsChanged: async () => {
                settings = await vault.getSettings();
                await paintLockButton();
                renderList();
            },
            onVaultDestroyed: () => setTimeout(() => window.location.reload(), 700),
        });
        ui.settingsPanel.append(settingsView.root);
    }

    view = 'settings';
    paintView();
    ui.settingsPanel.scrollTop = 0;
    await settingsView.refresh();
}

function showList() {
    view = 'list';
    paintView();
}

// ------------------------------------------------------------ có gì mới

/** Chỉ hiện sau khi user vừa nâng cấp lên bản có ghi chú mà họ chưa xem. */
function openWhatsNew() {
    const panel = buildWhatsNewPanel({
        lastSeenVersion: settings.lastSeenVersion,
        onDismiss: async () => {
            settings = await vault.saveSettings({ lastSeenVersion: currentVersion() });
            clear(ui.whatsnewPanel);
            showList();
        },
    });
    if (!panel) return false;

    clear(ui.whatsnewPanel);
    ui.whatsnewPanel.append(panel);
    view = 'whatsnew';
    paintView();
    return true;
}

/** Không còn lớp master password thì nút khoá không có tác dụng gì, ẩn hẳn cho khỏi gây hiểu nhầm. */
async function paintLockButton() {
    show(ui.lockBtn, (await vault.getProtection()) === vault.Protection.PASSWORD);
}

// -------------------------------------------------------------- vault

ui.lockBtn.addEventListener('click', async () => {
    await vault.lock();
    chrome.runtime.sendMessage({ type: MSG.LOCK_NOW }).catch(() => {});
    await showLocked();
});

ui.settingsBtn.addEventListener('click', () => {
    if (view === 'settings') showList();
    else openSettings();
});

ui.addBtn.addEventListener('click', () => openPage('import/import.html'));
$('#emptyAddBtn').addEventListener('click', () => openPage('import/import.html'));

ui.sortBtn.addEventListener('click', () => {
    sorting = !sorting;
    ui.list.dataset.sorting = String(sorting);

    // Sắp xếp phải thấy toàn bộ danh sách: nút lên/xuống đổi chỗ trong danh sách thật,
    // nếu đang lọc thì "hàng ngay trên" trên màn hình không phải hàng ngay trên trong vault.
    ui.search.disabled = sorting;
    if (sorting) ui.search.value = '';

    renderList();
    toast(t(sorting ? 'popup.sort.on' : 'popup.sort.off'), sorting ? 'info' : 'success');
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
    return `${account.issuer} ${account.account}`.toLowerCase().includes(query);
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

async function handleCopy(codeEl) {
    const code = codeEl.dataset.code;
    if (!code) return;

    const ok = await copyCode(code, settings.clipboardClearSeconds);
    if (!ok) {
        toast(t('popup.copy.failed'), 'error');
        return;
    }

    const seconds = Number(settings.clipboardClearSeconds);
    toast(
        seconds > 0 ? t('popup.copy.doneWithClear', { seconds }) : t('popup.copy.done'),
        'success',
    );
    await vault.touchActivity();
}

async function handleDelete(account) {
    const confirmed = await confirmDialog({
        title: t('popup.delete.title'),
        message: t('popup.delete.message', { label: displayLabel(account, t('common.unknownAccount')) }),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
        danger: true,
    });
    if (!confirmed) return;

    await vault.deleteAccount(account.id);
    accounts = await vault.listAccounts();
    renderList();
    toast(t('popup.delete.done'), 'success');
}

function buildEntry(account, index, total) {
    const { wrapper: ring, value: ringValue, label: ringLabel } = buildRing();

    const codeEl = el('button', {
        class: 'entry__code',
        type: 'button',
        title: t('popup.entry.copyHint'),
        text: '••••••',
    });
    codeEl.dataset.hidden = String(Boolean(settings.hideCodes));
    codeEl.addEventListener('click', () => handleCopy(codeEl));

    const main = el('div', { class: 'entry__main' }, [
        el('div', {
            class: 'entry__issuer',
            text: account.issuer || account.account || t('common.unknownAccount'),
        }),
        account.issuer && account.account
            ? el('div', { class: 'entry__account', text: account.account })
            : null,
        codeEl,
        account.type === 'hotp'
            ? el('div', {
                  class: 'hotp-counter',
                  text: t('popup.entry.hotpCounter', { counter: account.counter ?? 0 }),
              })
            : null,
    ]);

    const actions = el('div', { class: 'entry__actions' });

    if (sorting) {
        const up = el('button', { class: 'btn btn--icon', type: 'button', title: t('popup.entry.moveUp') }, [
            icon(ICONS.up),
        ]);
        up.disabled = index === 0;
        up.addEventListener('click', () => moveAccount(account.id, -1));

        const down = el('button', { class: 'btn btn--icon', type: 'button', title: t('popup.entry.moveDown') }, [
            icon(ICONS.down),
        ]);
        down.disabled = index === total - 1;
        down.addEventListener('click', () => moveAccount(account.id, 1));

        actions.append(up, down);
    } else {
        if (account.type === 'hotp') {
            const next = el('button', { class: 'btn btn--icon', type: 'button', title: t('popup.entry.nextCode') }, [
                icon(ICONS.refresh),
            ]);
            next.addEventListener('click', async () => {
                await vault.incrementHotpCounter(account.id);
                accounts = await vault.listAccounts();
                renderList();
            });
            actions.append(next);
        }

        const copy = el('button', { class: 'btn btn--icon', type: 'button', title: t('popup.entry.copy') }, [
            icon(ICONS.copy),
        ]);
        copy.addEventListener('click', () => handleCopy(codeEl));

        const remove = el('button', { class: 'btn btn--icon', type: 'button', title: t('popup.entry.delete') }, [
            icon(ICONS.trash),
        ]);
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

    show(ui.emptyState, view === 'list' && accounts.length === 0);

    if (accounts.length > 0 && visible.length === 0) {
        ui.list.append(el('p', { class: 'empty__text', text: t('popup.noMatch') }));
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
            codeEl.textContent = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
            codeEl.dataset.code = code;
            delete codeEl.dataset.error;
        } catch {
            codeEl.textContent = t('popup.entry.brokenSecret');
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

function stopTicking() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
}

// -------------------------------------------------------------- khởi động

async function enterVault() {
    settings = await vault.getSettings();
    accounts = await vault.listAccounts();
    showScreen('vault');
    ui.versionLabel.textContent = t('popup.version', { version: currentVersion() });
    await paintLockButton();

    // Vừa nâng cấp thì chào bằng màn "Có gì mới" thay vì danh sách, một lần duy nhất.
    if (view === 'list') openWhatsNew();
    paintView();

    renderList();
    startTicking();
    await vault.touchActivity();
    if (view === 'list') ui.search.focus();
}

async function boot() {
    await initI18n();

    // Màn khoá tự mang nút cờ của nó (dựng trong unlock-view.js).
    $('#vaultLang').append(buildLanguageSwitcher({ compact: true }));

    // Đổi ngôn ngữ phải vẽ lại danh sách vì nhãn nút và tên mặc định dựng bằng JS.
    onLanguageChange(async () => {
        settings = await vault.getSettings();
        ui.versionLabel.textContent = t('popup.version', { version: currentVersion() });
        if (!ui.screens.vault.hidden) {
            paintView();
            renderList();
        }
    });

    // Lần đầu mở mà chưa có vault (mới cài, hoặc vừa xoá sạch): dựng bản không master password
    // rồi vào thẳng danh sách. Không chặn user bằng một màn đặt mật khẩu.
    let state = await vault.getState();
    if (state === vault.VaultState.UNINITIALIZED) {
        await vault.ensureVault();
        state = await vault.getState();
    }

    if (state === vault.VaultState.LOCKED) {
        await showLocked();
        return;
    }

    await enterVault();
}

// Vault bị auto-lock trong lúc popup đang mở thì phải phản ứng ngay.
chrome.storage.session.onChanged.addListener(async (changes) => {
    if (!('dek' in changes) || changes.dek.newValue) return;
    // Vault không còn lớp mật khẩu thì DEK biến mất chỉ là do dọn dẹp, nó tự mở lại ngay.
    if ((await vault.getProtection()) !== vault.Protection.PASSWORD) return;
    await showLocked();
});

window.addEventListener('unload', () => {
    stopTicking();
    unlockView?.destroy();
    settingsView?.destroy();
});

boot();
