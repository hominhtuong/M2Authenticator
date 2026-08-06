/**
 * Trang mở khoá dạng cửa sổ riêng.
 *
 * Ở đây thay vì trong popup vì hộp thoại vân tay của hệ điều hành làm popup mất focus và đóng lại,
 * huỷ luôn ceremony WebAuthn. Cửa sổ riêng thì sống sót.
 */

import { $, $$, show } from '../lib/dom.js';
import { assessPassword } from '../lib/crypto.js';
import { buildLanguageSwitcher, describeError, initI18n, onLanguageChange, t } from '../lib/i18n.js';
import * as vault from '../lib/vault.js';
import { evaluatePrf, isPlatformAuthenticatorAvailable, webAuthnErrorCode } from '../lib/webauthn.js';

const params = new URLSearchParams(location.search);
const wantSetup = params.has('setup');
const wantBiometric = params.has('biometric');

const ui = {
    title: $('#title'),
    lead: $('#lead'),
    alert: $('#alert'),
    setupForm: $('#setupForm'),
    newPassword: $('#newPassword'),
    confirmPassword: $('#confirmPassword'),
    ackLoss: $('#ackLoss'),
    createBtn: $('#createBtn'),
    unlockForm: $('#unlockForm'),
    password: $('#password'),
    unlockBtn: $('#unlockBtn'),
    biometricBtn: $('#biometricBtn'),
    strengthBars: $$('.strength__bar'),
    strengthLabel: $('#strengthLabel'),
    footnote: $('#footnote'),
};

let mode = 'unlock'; // 'setup' | 'unlock'

function setAlert(message, variant = 'error') {
    if (!message) {
        show(ui.alert, false);
        return;
    }
    ui.alert.className = `alert alert--${variant}`;
    ui.alert.textContent = message;
    show(ui.alert, true);
}

function showError(error) {
    const code = error?.name ? webAuthnErrorCode(error) : null;
    setAlert(code ? t(code) : describeError(error));
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
        setAlert(t('unlock.setup.mismatch'));
        return;
    }

    ui.createBtn.disabled = true;
    ui.createBtn.textContent = t('unlock.setup.working');
    setAlert('');

    try {
        await vault.initialize(ui.newPassword.value);
        ui.newPassword.value = '';
        ui.confirmPassword.value = '';
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?welcome=1') });
        done();
    } catch (error) {
        showError(error);
        ui.createBtn.disabled = false;
        ui.createBtn.textContent = t('unlock.setup.action');
    }
});

// -------------------------------------------------------------- mở khoá

ui.unlockForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    ui.unlockBtn.disabled = true;
    ui.unlockBtn.textContent = t('unlock.working');
    setAlert('');

    try {
        await vault.unlockWithPassword(ui.password.value);
        ui.password.value = '';
        done();
    } catch (error) {
        showError(error);
        ui.password.select();
    } finally {
        ui.unlockBtn.disabled = false;
        ui.unlockBtn.textContent = t('unlock.action');
    }
});

async function unlockWithBiometric() {
    ui.biometricBtn.disabled = true;
    ui.biometricBtn.textContent = t('unlock.biometricWaiting');
    setAlert('');

    let prfOutput;
    try {
        const descriptor = await vault.getBiometricDescriptor();
        if (!descriptor?.credentialId || !descriptor?.prfSalt) {
            setAlert(t('error.biometricBadRecord'));
            return;
        }

        prfOutput = await evaluatePrf(descriptor.credentialId, descriptor.prfSalt);
        await vault.unlockWithPrf(prfOutput);
        done();
    } catch (error) {
        showError(error);
    } finally {
        if (prfOutput) prfOutput.fill(0);
        ui.biometricBtn.disabled = false;
        ui.biometricBtn.textContent = t('unlock.biometric');
    }
}

ui.biometricBtn.addEventListener('click', unlockWithBiometric);

// ------------------------------------------------------------ khởi động

/** Chữ dựng bằng JS phải vẽ lại khi đổi ngôn ngữ, khác với chữ có data-i18n trong HTML. */
function paintDynamicText() {
    if (mode === 'setup') {
        ui.title.textContent = t('unlock.setup.title');
        ui.lead.textContent = t('unlock.setup.lead');
        ui.footnote.textContent = '';
    } else {
        ui.title.textContent = t('unlock.title');
        ui.lead.textContent = t('unlock.lead');
        ui.footnote.textContent = t('unlock.footnote');
    }
    if (ui.newPassword.value) renderStrength();
}

async function boot() {
    await initI18n();
    $('#langSlot').append(buildLanguageSwitcher());
    onLanguageChange(paintDynamicText);

    const initialized = await vault.isInitialized();

    if (!initialized || wantSetup) {
        if (initialized) {
            mode = 'unlock';
            paintDynamicText();
            setAlert(t('unlock.setup.exists'), 'warning');
            show(ui.unlockForm, true);
            ui.password.focus();
            return;
        }

        mode = 'setup';
        paintDynamicText();
        show(ui.setupForm, true);
        ui.createBtn.disabled = true;
        ui.newPassword.focus();
        return;
    }

    mode = 'unlock';
    paintDynamicText();
    show(ui.unlockForm, true);

    const biometricReady = (await vault.hasBiometric()) && (await isPlatformAuthenticatorAvailable());
    show(ui.biometricBtn, biometricReady);

    const status = await vault.getLockoutStatus();
    if (status.lockedOut) {
        setAlert(t('error.tooManyAttempts', { seconds: Math.ceil(status.remainingMs / 1000) }));
    }

    if (wantBiometric && biometricReady) {
        await unlockWithBiometric();
    } else {
        ui.password.focus();
    }
}

boot();
