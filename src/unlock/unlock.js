/**
 * Trang mở khoá dạng cửa sổ riêng.
 *
 * Có trang này vì hộp thoại vân tay của hệ điều hành làm popup mất focus và đóng lại, huỷ luôn
 * ceremony WebAuthn. Cửa sổ riêng thì sống sót. Khung mở khoá lấy nguyên từ unlock-view.js -
 * đúng khung mà popup đang hiển thị - nên user không thấy giao diện nhảy chỗ khi bấm vân tay.
 */

import { $, $$, show } from '../lib/dom.js';
import { assessPassword } from '../lib/crypto.js';
import { buildLanguageSwitcher, describeError, initI18n, onLanguageChange, t } from '../lib/i18n.js';
import * as vault from '../lib/vault.js';
import { createUnlockView } from './unlock-view.js';

const params = new URLSearchParams(location.search);
const wantSetup = params.has('setup');
const wantBiometric = params.has('biometric');

const ui = {
    setupCard: $('#setupCard'),
    setupAlert: $('#setupAlert'),
    setupForm: $('#setupForm'),
    newPassword: $('#newPassword'),
    confirmPassword: $('#confirmPassword'),
    ackLoss: $('#ackLoss'),
    createBtn: $('#createBtn'),
    strengthBars: $$('.strength__bar'),
    strengthLabel: $('#strengthLabel'),
    unlockSlot: $('#unlockSlot'),
};

function setSetupAlert(message, variant = 'error') {
    if (!message) {
        show(ui.setupAlert, false);
        return;
    }
    ui.setupAlert.className = `alert alert--${variant}`;
    ui.setupAlert.textContent = message;
    show(ui.setupAlert, true);
}

function done() {
    // Đóng cửa sổ; popup sẽ thấy vault đã mở ở lần bấm tiếp theo.
    window.close();
}

// ----------------------------------------------------------- tạo vault

function renderStrength() {
    const result = assessPassword(ui.newPassword.value);
    const level = result.score <= 1 ? 1 : result.score <= 3 ? 2 : 3;

    ui.strengthBars.forEach((bar, index) => {
        if (index < result.score) bar.dataset.on = String(level);
        else delete bar.dataset.on;
    });

    if (!ui.newPassword.value) {
        ui.strengthLabel.textContent = '';
    } else if (result.ok) {
        ui.strengthLabel.textContent = t('password.strength', { label: t(result.labelKey) });
    } else {
        ui.strengthLabel.textContent = t(result.issues[0].code, result.issues[0].params);
    }
}

function refreshCreateButton() {
    const result = assessPassword(ui.newPassword.value);
    const matched =
        ui.confirmPassword.value.length > 0 && ui.confirmPassword.value === ui.newPassword.value;
    ui.createBtn.disabled = !(result.ok && matched && ui.ackLoss.checked);
}

ui.newPassword.addEventListener('input', () => {
    renderStrength();
    refreshCreateButton();
});
ui.confirmPassword.addEventListener('input', refreshCreateButton);
ui.ackLoss.addEventListener('change', refreshCreateButton);

ui.setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (ui.newPassword.value !== ui.confirmPassword.value) {
        setSetupAlert(t('unlock.setup.mismatch'));
        return;
    }

    ui.createBtn.disabled = true;
    ui.createBtn.textContent = t('unlock.setup.working');
    setSetupAlert('');

    try {
        await vault.initialize(ui.newPassword.value);
        ui.newPassword.value = '';
        ui.confirmPassword.value = '';
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?welcome=1') });
        done();
    } catch (error) {
        setSetupAlert(describeError(error));
        ui.createBtn.disabled = false;
        ui.createBtn.textContent = t('unlock.setup.action');
    }
});

// ------------------------------------------------------------ khởi động

async function mountUnlockView() {
    const view = createUnlockView({ onUnlocked: done, autoBiometric: wantBiometric });
    ui.unlockSlot.append(view.root);
    await view.start();
    return view;
}

async function boot() {
    await initI18n();
    $('#setupLang').append(buildLanguageSwitcher({ compact: true }));
    onLanguageChange(() => {
        if (ui.newPassword.value) renderStrength();
    });

    const initialized = await vault.isInitialized();

    // Vault không còn lớp mật khẩu thì không có gì để mở khoá: nó luôn ở trạng thái mở.
    if (initialized && (await vault.getProtection()) === vault.Protection.NONE) {
        done();
        return;
    }

    if (!initialized) {
        show(ui.setupCard, true);
        ui.createBtn.disabled = true;
        ui.newPassword.focus();
        return;
    }

    const view = await mountUnlockView();

    // Vào bằng link tạo vault nhưng vault đã tồn tại: nói rõ thay vì hiện form tạo lần hai.
    if (wantSetup) view.setAlert(t('unlock.setup.exists'), 'warning');
}

boot();
