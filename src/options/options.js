import { $, $$, confirmDialog, show, toast } from '../lib/dom.js';
import { assessPassword } from '../lib/crypto.js';
import * as vault from '../lib/vault.js';
import {
    describeWebAuthnError,
    isPlatformAuthenticatorAvailable,
    registerBiometric,
} from '../lib/webauthn.js';

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

// ------------------------------------------------------------- cài đặt

async function loadSettings() {
    const settings = await vault.getSettings();
    ui.autoLock.value = String(settings.autoLockMinutes);
    ui.clipboardClear.value = String(settings.clipboardClearSeconds);
    ui.hideCodes.checked = Boolean(settings.hideCodes);
}

ui.autoLock.addEventListener('change', async () => {
    await vault.saveSettings({ autoLockMinutes: Number(ui.autoLock.value) });
    toast('Đã lưu mốc tự khoá.', 'success');
});

ui.clipboardClear.addEventListener('change', async () => {
    await vault.saveSettings({ clipboardClearSeconds: Number(ui.clipboardClear.value) });
    toast('Đã lưu cài đặt clipboard.', 'success');
});

ui.hideCodes.addEventListener('change', async () => {
    await vault.saveSettings({ hideCodes: ui.hideCodes.checked });
    toast('Đã lưu.', 'success');
});

// -------------------------------------------------------------- vân tay

async function refreshBiometricSection() {
    const enrolled = await vault.hasBiometric();
    const available = await isPlatformAuthenticatorAvailable();

    ui.biometricStatus.dataset.on = String(enrolled);

    if (enrolled) {
        ui.biometricStatus.textContent = 'Đang bật. Bạn có thể mở vault bằng sinh trắc thay cho master password.';
    } else if (!available) {
        ui.biometricStatus.textContent =
            'Thiết bị này không có cảm biến sinh trắc khả dụng cho trình duyệt. Vẫn dùng master password bình thường.';
    } else if (!unlocked) {
        ui.biometricStatus.textContent = 'Hãy mở khoá vault trước, rồi mới bật được mở khoá bằng vân tay.';
    } else {
        ui.biometricStatus.textContent = 'Chưa bật.';
    }

    show(ui.enrollBtn, !enrolled && available && unlocked);
    show(ui.removeBtn, enrolled);
}

ui.enrollBtn.addEventListener('click', async () => {
    ui.enrollBtn.disabled = true;
    ui.enrollBtn.textContent = 'Đang chờ xác thực...';
    setAlert(ui.biometricAlert, '');

    let registration;
    try {
        registration = await registerBiometric();
        await vault.enrollBiometric({
            credentialId: registration.credentialId,
            prfSalt: registration.prfSalt,
            prfOutputBytes: registration.prfOutput,
        });
        setAlert(ui.biometricAlert, 'Đã bật mở khoá bằng vân tay.', 'success');
        toast('Đã bật mở khoá bằng vân tay.', 'success');
    } catch (error) {
        setAlert(ui.biometricAlert, error.name ? describeWebAuthnError(error) : error.message);
    } finally {
        if (registration?.prfOutput) registration.prfOutput.fill(0);
        ui.enrollBtn.disabled = false;
        ui.enrollBtn.textContent = 'Bật mở khoá bằng vân tay';
        await refreshBiometricSection();
    }
});

ui.removeBtn.addEventListener('click', async () => {
    const confirmed = await confirmDialog({
        title: 'Gỡ mở khoá bằng vân tay?',
        message: 'Sau khi gỡ, bạn chỉ mở được vault bằng master password. Hãy chắc chắn bạn còn nhớ nó.',
        confirmLabel: 'Gỡ',
        danger: true,
    });
    if (!confirmed) return;

    await vault.removeBiometric();
    toast('Đã gỡ vân tay.', 'success');
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

    ui.strengthLabel.textContent = ui.nextPassword.value
        ? result.ok
            ? `Độ mạnh: ${result.label}`
            : result.issues[0]
        : '';
}

ui.nextPassword.addEventListener('input', renderStrength);

ui.passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setAlert(ui.passwordAlert, '');

    if (ui.nextPassword.value !== ui.nextPasswordConfirm.value) {
        setAlert(ui.passwordAlert, 'Hai lần nhập mật khẩu mới không khớp.');
        return;
    }

    ui.changeBtn.disabled = true;
    ui.changeBtn.textContent = 'Đang xử lý...';

    try {
        await vault.changePassword(ui.currentPassword.value, ui.nextPassword.value);
        ui.passwordForm.reset();
        renderStrength();
        setAlert(ui.passwordAlert, 'Đã đổi master password.', 'success');
        toast('Đã đổi master password.', 'success');
    } catch (error) {
        setAlert(ui.passwordAlert, error.message);
    } finally {
        ui.changeBtn.disabled = false;
        ui.changeBtn.textContent = 'Đổi mật khẩu';
    }
});

// -------------------------------------------------------------- xoá vault

ui.destroyBtn.addEventListener('click', async () => {
    const first = await confirmDialog({
        title: 'Xoá toàn bộ vault?',
        message: 'Tất cả account 2FA sẽ mất vĩnh viễn. Không có bản sao lưu nào để khôi phục.',
        confirmLabel: 'Tiếp tục',
        danger: true,
    });
    if (!first) return;

    const second = await confirmDialog({
        title: 'Chắc chắn chưa?',
        message: 'Nếu bạn chưa tắt 2FA hoặc chưa lưu mã dự phòng ở các dịch vụ đang dùng, bạn sẽ bị khoá ngoài tài khoản của mình.',
        confirmLabel: 'Xoá vĩnh viễn',
        danger: true,
    });
    if (!second) return;

    await vault.destroyVault();
    toast('Đã xoá vault.', 'success');
    setTimeout(() => location.reload(), 800);
});

// ------------------------------------------------------------ khởi động

async function boot() {
    if (new URLSearchParams(location.search).has('welcome')) {
        show(ui.welcomeNotice, true);
    }

    const state = await vault.getState();
    unlocked = state === vault.VaultState.UNLOCKED;

    show(ui.lockedNotice, state === vault.VaultState.LOCKED);

    // Đổi mật khẩu chỉ cần bọc lại DEK bằng mật khẩu cũ, nên làm được cả khi vault đang khoá.
    // Chỉ chặn khi chưa có vault nào.
    const noVault = state === vault.VaultState.UNINITIALIZED;
    ui.passwordForm.querySelectorAll('input, button').forEach((node) => {
        node.disabled = noVault;
    });
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
