/**
 * Màn mở khoá dùng chung.
 *
 * Popup và cửa sổ unlock cùng dựng từ file này để hai nơi không bao giờ lệch nhau một pixel:
 * trước đây mỗi bên tự viết HTML riêng, nên bấm "vân tay" là giao diện nhảy sang một khung khác
 * hẳn về kích thước lẫn vị trí.
 *
 * Một khung duy nhất, đổi trạng thái bên trong:
 *   password  - ô nhập master password (mặc định)
 *   scanning  - đang chờ chạm cảm biến, ẩn ô mật khẩu để không có hai form cùng lúc
 *   lockout   - sai quá nhiều, khoá cả hai đường mở khoá và đếm ngược tại chỗ
 */

import { el, show } from '../lib/dom.js';
import { buildLanguageSwitcher, describeError, onLanguageChange, t } from '../lib/i18n.js';
import * as vault from '../lib/vault.js';
import { evaluatePrf, isPlatformAuthenticatorAvailable, webAuthnErrorCode } from '../lib/webauthn.js';

/** Đếm ngược đọc được: dưới một phút thì tính giây, trên thì phút:giây. */
function formatWait(remainingMs) {
    const total = Math.max(1, Math.ceil(remainingMs / 1000));
    if (total < 60) return t('unlock.wait.seconds', { seconds: total });
    return t('unlock.wait.minutes', {
        minutes: Math.floor(total / 60),
        seconds: String(total % 60).padStart(2, '0'),
    });
}

/**
 * @param {object} options
 * @param {() => void} options.onUnlocked chạy khi DEK đã nằm trong session
 * @param {(() => void)|null} options.onBiometricRequest nếu có, nút vân tay gọi hàm này thay vì tự
 *        chạy WebAuthn. Popup bắt buộc phải truyền: hộp thoại sinh trắc của hệ điều hành cướp focus
 *        làm popup đóng và huỷ ceremony giữa chừng.
 * @param {boolean} options.autoBiometric mở ra là chạy quét vân tay ngay
 */
export function createUnlockView({ onUnlocked, onBiometricRequest = null, autoBiometric = false } = {}) {
    const alert = el('div', { class: 'alert', hidden: true });

    const password = el('input', {
        class: 'input',
        type: 'password',
        id: 'masterPassword',
        autocomplete: 'current-password',
        required: true,
        placeholder: t('unlock.password'),
    });

    const submitBtn = el('button', {
        class: 'btn btn--primary btn--block',
        type: 'submit',
        text: t('unlock.action'),
    });

    const form = el('form', { class: 'unlock-form', autocomplete: 'off' }, [
        el('label', { class: 'visually-hidden', for: 'masterPassword', text: t('unlock.password') }),
        password,
        submitBtn,
    ]);

    const biometricBtn = el('button', {
        class: 'btn btn--block unlock-card__biometric',
        type: 'button',
        text: t('unlock.biometric'),
        hidden: true,
    });

    const scanTitle = el('p', { class: 'scan__title', text: t('unlock.scan.title') });
    const scanHint = el('p', { class: 'scan__hint', text: t('unlock.scan.hint') });
    const scanCancel = el('button', {
        class: 'btn btn--block btn--ghost',
        type: 'button',
        text: t('unlock.scan.usePassword'),
    });

    const scan = el('div', { class: 'scan', hidden: true }, [
        el('div', { class: 'scan__pulse' }, [fingerprintIcon()]),
        scanTitle,
        scanHint,
        scanCancel,
    ]);

    const title = el('h1', { text: t('unlock.title') });
    const lead = el('p', { class: 'unlock-card__lead', text: t('unlock.lead') });
    const footnote = el('p', { class: 'unlock-card__footnote', text: t('unlock.footnote') });
    const langSlot = el('div', { class: 'unlock-card__lang' }, [buildLanguageSwitcher({ compact: true })]);

    const root = el('div', { class: 'unlock-card' }, [
        el('div', { class: 'brand' }, [
            el('img', { src: '../assets/icons/icon48.png', alt: '', width: 40, height: 40 }),
            title,
        ]),
        lead,
        alert,
        form,
        biometricBtn,
        scan,
        footnote,
        langSlot,
    ]);

    let state = 'password';
    let biometricReady = false;
    let countdownTimer = null;
    let disposed = false;
    let lockedOut = false;
    let lockoutShown = false;

    // ------------------------------------------------------------- hiển thị

    function setAlert(message, variant = 'error') {
        if (!message) {
            show(alert, false);
            return;
        }
        alert.className = `alert alert--${variant}`;
        alert.textContent = message;
        show(alert, true);
    }

    function showError(error) {
        const code = error?.name ? webAuthnErrorCode(error) : null;
        setAlert(code ? t(code) : describeError(error));
    }

    function paint() {
        const scanning = state === 'scanning';
        // Đang quét thì câu dẫn về mật khẩu không còn đúng, ẩn đi để khung chỉ nói một chuyện.
        show(lead, !scanning);
        show(form, !scanning);
        show(biometricBtn, !scanning && biometricReady);
        show(scan, scanning);
        show(footnote, !scanning);
    }

    /** Chữ dựng bằng JS nên phải vẽ lại tay khi đổi ngôn ngữ. */
    function repaintText() {
        title.textContent = t('unlock.title');
        lead.textContent = t('unlock.lead');
        footnote.textContent = t('unlock.footnote');
        password.placeholder = t('unlock.password');
        submitBtn.textContent = t('unlock.action');
        biometricBtn.textContent = t('unlock.biometric');
        scanTitle.textContent = t('unlock.scan.title');
        scanHint.textContent = t('unlock.scan.hint');
        scanCancel.textContent = t('unlock.scan.usePassword');
        refresh();
    }

    // ------------------------------------------------------ chống dò mật khẩu

    function stopCountdown() {
        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = null;
    }

    function setLockedOut(locked) {
        lockedOut = locked;
        password.disabled = locked;
        submitBtn.disabled = locked;
        biometricBtn.disabled = locked;
        root.dataset.lockedOut = String(locked);
    }

    /**
     * Đọc lại trạng thái phạt và vẽ đúng. Khoá cả nút mật khẩu lẫn nút vân tay:
     * chặn một đường mà chừa đường kia thì lớp chống dò không có tác dụng gì.
     */
    async function refreshLockout() {
        const status = await vault.getLockoutStatus();
        if (disposed) return status;

        if (status.lockedOut) {
            lockoutShown = true;
            setLockedOut(true);
            setAlert(t('unlock.lockout', { time: formatWait(status.remainingMs) }), 'error');
            if (!countdownTimer) countdownTimer = setInterval(refreshLockout, 1000);
        } else {
            stopCountdown();
            setLockedOut(false);
            if (lockoutShown) {
                lockoutShown = false;
                setAlert('');
            }
        }

        return status;
    }

    async function refresh() {
        biometricReady = (await vault.hasBiometric()) && (await isPlatformAuthenticatorAvailable());
        if (disposed) return;
        paint();
        await refreshLockout();
    }

    // ------------------------------------------------------------- mở khoá

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!password.value) return;

        submitBtn.disabled = true;
        submitBtn.textContent = t('unlock.working');
        setAlert('');

        try {
            await vault.unlockWithPassword(password.value);
            password.value = '';
            stopCountdown();
            onUnlocked?.();
        } catch (error) {
            showError(error);
            password.select();
            await refreshLockout();
        } finally {
            submitBtn.textContent = t('unlock.action');
            if (!lockedOut) submitBtn.disabled = false;
        }
    });

    /** Chạy ceremony WebAuthn ngay trong khung này. Chỉ hợp lệ ở trang cửa sổ riêng. */
    async function runBiometric() {
        const status = await vault.getLockoutStatus();
        if (status.lockedOut) {
            await refreshLockout();
            return;
        }

        state = 'scanning';
        setAlert('');
        paint();

        let prfOutput;
        try {
            const descriptor = await vault.getBiometricDescriptor();
            if (!descriptor?.credentialId || !descriptor?.prfSalt) {
                state = 'password';
                paint();
                setAlert(t('error.biometricBadRecord'));
                return;
            }

            prfOutput = await evaluatePrf(descriptor.credentialId, descriptor.prfSalt);
            await vault.unlockWithPrf(prfOutput);
            stopCountdown();
            onUnlocked?.();
        } catch (error) {
            state = 'password';
            paint();
            showError(error);
            await refreshLockout();
            password.focus();
        } finally {
            if (prfOutput) prfOutput.fill(0);
        }
    }

    biometricBtn.addEventListener('click', () => {
        if (onBiometricRequest) onBiometricRequest();
        else runBiometric();
    });

    scanCancel.addEventListener('click', () => {
        state = 'password';
        paint();
        password.focus();
    });

    const stopListening = onLanguageChange(repaintText);

    // ------------------------------------------------------------- vòng đời

    async function start() {
        await refresh();
        if (disposed) return;
        if (autoBiometric && biometricReady && !onBiometricRequest) await runBiometric();
        else if (!lockedOut) password.focus();
    }

    function destroy() {
        disposed = true;
        stopCountdown();
        stopListening();
    }

    return {
        root,
        start,
        refresh,
        destroy,
        setAlert,
        focus: () => password.focus(),
    };
}

function fingerprintIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '34');
    svg.setAttribute('height', '34');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('aria-hidden', 'true');

    const paths = [
        'M12 10a2 2 0 0 1 2 2v3a5 5 0 0 1-.4 2',
        'M10 12a2 2 0 0 1 4 0',
        'M8.5 20a9 9 0 0 0 1.5-5v-3a2 2 0 0 1 2-2',
        'M5.5 17.5A9 9 0 0 0 7 12.5V12a5 5 0 0 1 5-5 5 5 0 0 1 5 5v3',
        'M3.8 8.5A9 9 0 0 1 12 3.5a9 9 0 0 1 8.2 5',
        'M17 18.5a12 12 0 0 1-.4 2.5',
    ];
    for (const d of paths) {
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', d);
        svg.append(path);
    }
    return svg;
}
