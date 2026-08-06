import { $, $$, confirmDialog, show, toast } from '../lib/dom.js';
import { assessPassword } from '../lib/crypto.js';
import { buildLanguageSwitcher, describeError, initI18n, onLanguageChange, t } from '../lib/i18n.js';
import * as vault from '../lib/vault.js';
import { isPlatformAuthenticatorAvailable, registerBiometric, webAuthnErrorCode } from '../lib/webauthn.js';

const ui = {
    welcomeNotice: $('#welcomeNotice'),
    lockedNotice: $('#lockedNotice'),
    autoLock: $('#autoLock'),
    clipboardClear: $('#clipboardClear'),
    hideCodes: $('#hideCodes'),
    biometricStatus: $('#biometricStatus'),
    biometricAlert: $('#biometricAlert'),
    enrollBtn: $('#enrollBiometricBtn'),
    removeBtn: $('#removeBiometricBtn'),
    passwordForm: $('#passwordForm'),
    currentPassword: $('#currentPassword'),
    nextPassword: $('#nextPassword'),
    nextPasswordConfirm: $('#nextPasswordConfirm'),
    passwordAlert: $('#passwordAlert'),
    changeBtn: $('#changePasswordBtn'),
    strengthBars: $$('.strength__bar'),
    strengthLabel: $('#strengthLabel'),
    destroyBtn: $('#destroyBtn'),
};

let unlocked = false;

function setAlert(node, message, variant = 'error') {
    if (!message) {
        show(node, false);
        return;
    }
    node.className = `alert alert--${variant}`;
    node.textContent = message;
    show(node, true);
}

function showBiometricError(error) {
    const code = error?.name ? webAuthnErrorCode(error) : null;
    setAlert(ui.biometricAlert, code ? t(code) : describeError(error));
}

// ------------------------------------------------------------- cài đặt

async function loadSettings() {
    const settings = await vault.getSettings();
    ui.autoLock.value = String(settings.autoLockMinutes);
    ui.clipboardClear.value = String(settings.clipboardClearSeconds);
    ui.hideCodes.checked = Boolean(settings.hideCodes);
}

ui.autoLock.addEventListener('change', async () => {
    await vault.saveSettings({ autoLockMinutes: Number(ui.autoLock.value) });
    toast(t('options.lock.saved'), 'success');
});

ui.clipboardClear.addEventListener('change', async () => {
    await vault.saveSettings({ clipboardClearSeconds: Number(ui.clipboardClear.value) });
    toast(t('options.clipboard.saved'), 'success');
});

ui.hideCodes.addEventListener('change', async () => {
    await vault.saveSettings({ hideCodes: ui.hideCodes.checked });
    toast(t('options.saved'), 'success');
});

// -------------------------------------------------------------- vân tay

async function refreshBiometricSection() {
    const enrolled = await vault.hasBiometric();
    const available = await isPlatformAuthenticatorAvailable();

    ui.biometricStatus.dataset.on = String(enrolled);

    if (enrolled) ui.biometricStatus.textContent = t('options.biometric.on');
    else if (!available) ui.biometricStatus.textContent = t('options.biometric.unavailable');
    else if (!unlocked) ui.biometricStatus.textContent = t('options.biometric.needUnlock');
    else ui.biometricStatus.textContent = t('options.biometric.off');

    show(ui.enrollBtn, !enrolled && available && unlocked);
    show(ui.removeBtn, enrolled);
}

ui.enrollBtn.addEventListener('click', async () => {
    ui.enrollBtn.disabled = true;
    ui.enrollBtn.textContent = t('options.biometric.enabling');
    setAlert(ui.biometricAlert, '');

    let registration;
    try {
        registration = await registerBiometric();
        await vault.enrollBiometric({
            credentialId: registration.credentialId,
            prfSalt: registration.prfSalt,
            prfOutputBytes: registration.prfOutput,
        });
        setAlert(ui.biometricAlert, t('options.biometric.enabled'), 'success');
        toast(t('options.biometric.enabled'), 'success');
    } catch (error) {
        showBiometricError(error);
    } finally {
        if (registration?.prfOutput) registration.prfOutput.fill(0);
        ui.enrollBtn.disabled = false;
        ui.enrollBtn.textContent = t('options.biometric.enable');
        await refreshBiometricSection();
    }
});

ui.removeBtn.addEventListener('click', async () => {
    const confirmed = await confirmDialog({
        title: t('options.biometric.removeTitle'),
        message: t('options.biometric.removeMessage'),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
        danger: true,
    });
    if (!confirmed) return;

    await vault.removeBiometric();
    toast(t('options.biometric.removed'), 'success');
    await refreshBiometricSection();
});

// ---------------------------------------------------------- đổi mật khẩu

function renderStrength() {
    const result = assessPassword(ui.nextPassword.value);
    const level = result.score <= 1 ? 1 : result.score <= 3 ? 2 : 3;

    ui.strengthBars.forEach((bar, index) => {
        if (index < result.score) bar.dataset.on = String(level);
        else delete bar.dataset.on;
    });

    if (!ui.nextPassword.value) {
        ui.strengthLabel.textContent = '';
    } else if (result.ok) {
        ui.strengthLabel.textContent = t('password.strength', { label: t(result.labelKey) });
    } else {
        ui.strengthLabel.textContent = t(result.issues[0].code, result.issues[0].params);
    }
}

ui.nextPassword.addEventListener('input', renderStrength);

ui.passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setAlert(ui.passwordAlert, '');

    if (ui.nextPassword.value !== ui.nextPasswordConfirm.value) {
        setAlert(ui.passwordAlert, t('options.password.mismatch'));
        return;
    }

    ui.changeBtn.disabled = true;
    ui.changeBtn.textContent = t('options.password.working');

    try {
        await vault.changePassword(ui.currentPassword.value, ui.nextPassword.value);
        ui.passwordForm.reset();
        renderStrength();
        setAlert(ui.passwordAlert, t('options.password.changed'), 'success');
        toast(t('options.password.changed'), 'success');
    } catch (error) {
        setAlert(ui.passwordAlert, describeError(error));
    } finally {
        ui.changeBtn.disabled = false;
        ui.changeBtn.textContent = t('options.password.submit');
    }
});

// -------------------------------------------------------------- xoá vault

ui.destroyBtn.addEventListener('click', async () => {
    const first = await confirmDialog({
        title: t('options.destroy.confirm1Title'),
        message: t('options.destroy.confirm1Message'),
        confirmLabel: t('options.destroy.confirm1Action'),
        cancelLabel: t('common.cancel'),
        danger: true,
    });
    if (!first) return;

    const second = await confirmDialog({
        title: t('options.destroy.confirm2Title'),
        message: t('options.destroy.confirm2Message'),
        confirmLabel: t('options.destroy.confirm2Action'),
        cancelLabel: t('common.cancel'),
        danger: true,
    });
    if (!second) return;

    await vault.destroyVault();
    toast(t('options.destroy.done'), 'success');
    setTimeout(() => location.reload(), 800);
});

// ------------------------------------------------------------ khởi động

async function boot() {
    await initI18n();
    $('#langSlot').append(buildLanguageSwitcher());

    onLanguageChange(async () => {
        await refreshBiometricSection();
        if (ui.nextPassword.value) renderStrength();
    });

    if (new URLSearchParams(location.search).has('welcome')) show(ui.welcomeNotice, true);

    const state = await vault.getState();
    unlocked = state === vault.VaultState.UNLOCKED;

    show(ui.lockedNotice, state === vault.VaultState.LOCKED);

    // Đổi mật khẩu chỉ cần bọc lại DEK bằng mật khẩu cũ, nên làm được cả khi vault đang khoá.
    // Chỉ chặn khi chưa có vault nào.
    const noVault = state === vault.VaultState.UNINITIALIZED;
    for (const node of ui.passwordForm.querySelectorAll('input, button')) node.disabled = noVault;
    ui.destroyBtn.disabled = noVault;

    await loadSettings();
    await refreshBiometricSection();

    if (unlocked) await vault.touchActivity();
}

chrome.storage.session.onChanged.addListener(async (changes) => {
    if ('dek' in changes) {
        unlocked = Boolean(changes.dek.newValue);
        show(ui.lockedNotice, !unlocked);
        await refreshBiometricSection();
    }
});

boot();
