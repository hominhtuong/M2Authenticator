/**
 * Trang mở khoá dạng cửa sổ riêng.
 *
 * Ở đây thay vì trong popup vì hộp thoại vân tay của hệ điều hành làm popup mất focus và đóng lại,
 * huỷ luôn ceremony WebAuthn. Cửa sổ riêng thì sống sót.
 */

import { $, $$, show } from '../lib/dom.js';
import { assessPassword } from '../lib/crypto.js';
import * as vault from '../lib/vault.js';
import { describeWebAuthnError, evaluatePrf, isPlatformAuthenticatorAvailable } from '../lib/webauthn.js';

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

function setAlert(message, variant = 'error') {
    if (!message) {
        show(ui.alert, false);
        return;
    }
    ui.alert.className = `alert alert--${variant}`;
    ui.alert.textContent = message;
    show(ui.alert, true);
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

    ui.strengthLabel.textContent = ui.newPassword.value
        ? result.ok
            ? `Độ mạnh: ${result.label}`
            : result.issues[0]
        : '';

    return result;
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
        setAlert('Hai lần nhập mật khẩu không khớp.');
        return;
    }

    ui.createBtn.disabled = true;
    ui.createBtn.textContent = 'Đang tạo khoá...';
    setAlert('');

    try {
        await vault.initialize(ui.newPassword.value);

        // Bản 1.x lưu secret trần, chuyển luôn vào vault rồi xoá bản plaintext.
        if (await vault.hasLegacyPlaintextData()) {
            const result = await vault.migrateLegacyPlaintextData();
            setAlert(`Đã tạo vault và chuyển ${result.added} account từ bản cũ vào dạng mã hoá.`, 'success');
        }

        ui.newPassword.value = '';
        ui.confirmPassword.value = '';
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?welcome=1') });
        done();
    } catch (error) {
        setAlert(error.message);
        ui.createBtn.disabled = false;
        ui.createBtn.textContent = 'Tạo vault';
    }
});

// -------------------------------------------------------------- mở khoá

ui.unlockForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    ui.unlockBtn.disabled = true;
    ui.unlockBtn.textContent = 'Đang mở khoá...';
    setAlert('');

    try {
        await vault.unlockWithPassword(ui.password.value);
        ui.password.value = '';
        done();
    } catch (error) {
        setAlert(error.message);
        ui.password.select();
    } finally {
        ui.unlockBtn.disabled = false;
        ui.unlockBtn.textContent = 'Mở khoá';
    }
});

async function unlockWithBiometric() {
    ui.biometricBtn.disabled = true;
    ui.biometricBtn.textContent = 'Đang chờ xác thực...';
    setAlert('');

    let prfOutput;
    try {
        const descriptor = await vault.getBiometricDescriptor();
        if (!descriptor?.credentialId || !descriptor?.prfSalt) {
            throw new Error('Chưa đăng ký mở khoá bằng vân tay.');
        }

        prfOutput = await evaluatePrf(descriptor.credentialId, descriptor.prfSalt);
        await vault.unlockWithPrf(prfOutput);
        done();
    } catch (error) {
        setAlert(error.name ? describeWebAuthnError(error) : error.message);
    } finally {
        if (prfOutput) prfOutput.fill(0);
        ui.biometricBtn.disabled = false;
        ui.biometricBtn.textContent = 'Mở khoá bằng vân tay';
    }
}

ui.biometricBtn.addEventListener('click', unlockWithBiometric);

// ------------------------------------------------------------ khởi động

async function boot() {
    const initialized = await vault.isInitialized();

    if (!initialized || wantSetup) {
        if (initialized) {
            setAlert('Vault đã tồn tại, không tạo lại được.', 'warning');
            show(ui.unlockForm, true);
            ui.password.focus();
            return;
        }

        ui.title.textContent = 'Tạo master password';
        ui.lead.textContent =
            'Master password dùng để mã hoá toàn bộ mã 2FA bằng AES-256-GCM. Không có nó, dữ liệu trên máy chỉ là chuỗi vô nghĩa.';
        show(ui.setupForm, true);
        ui.createBtn.disabled = true;

        const legacyCount = await vault.countLegacyAccounts();
        if (legacyCount > 0) {
            setAlert(
                `Phát hiện ${legacyCount} account của bản cũ đang lưu KHÔNG mã hoá. Chúng sẽ được chuyển vào vault và xoá bản plaintext ngay sau khi bạn tạo mật khẩu.`,
                'warning',
            );
        }

        ui.newPassword.focus();
        return;
    }

    ui.title.textContent = 'Mở khoá vault';
    ui.lead.textContent = 'Nhập master password để giải mã danh sách mã 2FA.';
    show(ui.unlockForm, true);

    const biometricReady = (await vault.hasBiometric()) && (await isPlatformAuthenticatorAvailable());
    show(ui.biometricBtn, biometricReady);

    const status = await vault.getLockoutStatus();
    if (status.lockedOut) {
        setAlert(`Nhập sai quá nhiều lần. Thử lại sau ${Math.ceil(status.remainingMs / 1000)} giây.`);
    }

    if (wantBiometric && biometricReady) {
        await unlockWithBiometric();
    } else {
        ui.password.focus();
    }

    ui.footnote.textContent = 'Vault tự khoá lại theo thời gian rảnh bạn đặt trong Cài đặt.';
}

boot();
