/**
 * Màn cài đặt dùng chung.
 *
 * Popup nhúng thẳng vào panel bên trong, trang options/ nhúng full trang. Một nguồn duy nhất để
 * hai nơi không lệch nội dung, và để mọi thứ user cần đều với tới được ngay từ popup.
 *
 * Toàn bộ chữ đi qua t(), toàn bộ DOM dựng bằng helper trong lib/dom.js.
 */

import { confirmDialog, el, show, toast } from '../lib/dom.js';
import { assessPassword } from '../lib/crypto.js';
import { openExtensionWindow } from '../lib/windows.js';
import { buildLanguageSwitcher, describeError, onLanguageChange, t } from '../lib/i18n.js';
import * as vault from '../lib/vault.js';
import { isPlatformAuthenticatorAvailable, registerBiometric, webAuthnErrorCode } from '../lib/webauthn.js';
import { InstallType, UpdateStatus, checkForUpdate, currentVersion, getInstallType } from '../lib/version.js';
import { buildNotesList } from './whatsnew-view.js';

const FACT_KEYS = ['encryption', 'kdf', 'locked', 'unlocked', 'network', 'sync'];

function card(name, children, { danger = false } = {}) {
    return el('section', { class: danger ? 'card card--danger' : 'card', dataset: { section: name } }, children);
}

function cardHead(titleKey, leadKey) {
    return [
        el('h2', { text: t(titleKey) }),
        leadKey ? el('p', { class: 'card__lead', text: t(leadKey) }) : null,
    ];
}

function selectField(labelKey, options, value, onChange, hintKey = null) {
    const select = el('select', { class: 'input' });
    for (const option of options) {
        select.append(el('option', { value: String(option.value), text: t(option.key) }));
    }
    select.value = String(value);
    select.addEventListener('change', () => onChange(select.value));

    return el('label', { class: 'field' }, [
        el('span', { class: 'field__label', text: t(labelKey) }),
        select,
        hintKey ? el('span', { class: 'field__hint', text: t(hintKey) }) : null,
    ]);
}

function checkField(labelKey, checked, onChange) {
    const input = el('input', { type: 'checkbox', checked });
    input.addEventListener('change', () => onChange(input.checked));
    return el('label', { class: 'checkline' }, [input, el('span', { text: t(labelKey) })]);
}

function passwordField(labelKey, id) {
    const input = el('input', { class: 'input', type: 'password', id, autocomplete: 'new-password', required: true });
    const field = el('label', { class: 'field' }, [
        el('span', { class: 'field__label', text: t(labelKey) }),
        input,
    ]);
    return { field, input };
}

/** Thanh đo độ mạnh mật khẩu, dùng lại ở cả đổi mật khẩu lẫn bật lại lớp mật khẩu. */
function strengthMeter() {
    const bars = Array.from({ length: 5 }, () => el('span', { class: 'strength__bar' }));
    const label = el('div', { class: 'strength__label' });
    const root = el('div', { class: 'strength-block' }, [
        el('div', { class: 'strength', 'aria-hidden': 'true' }, bars),
        label,
    ]);

    function update(value) {
        const result = assessPassword(value);
        const level = result.score <= 1 ? 1 : result.score <= 3 ? 2 : 3;

        bars.forEach((bar, index) => {
            if (index < result.score) bar.dataset.on = String(level);
            else delete bar.dataset.on;
        });

        if (!value) label.textContent = '';
        else if (result.ok) label.textContent = t('password.strength', { label: t(result.labelKey) });
        else label.textContent = t(result.issues[0].code, result.issues[0].params);

        return result;
    }

    return { root, update };
}

/**
 * @param {object} options
 * @param {boolean} options.compact popup thì gọn hơn: phần thông tin bảo mật gập lại
 * @param {() => void} options.onSettingsChanged báo cho chỗ nhúng vẽ lại danh sách mã
 * @param {() => void} options.onVaultDestroyed
 */
export function createSettingsView({ compact = false, onSettingsChanged = null, onVaultDestroyed = null } = {}) {
    const root = el('div', { class: compact ? 'settings settings--compact' : 'settings' });

    let settings = { ...vault.DEFAULT_SETTINGS };
    let protection = vault.Protection.PASSWORD;
    let unlocked = false;
    let biometricEnrolled = false;
    let biometricAvailable = false;
    let enablingPassword = false;
    let installType = InstallType.UNKNOWN;
    let showingNotes = false;
    let disposed = false;

    // ---------------------------------------------------------------- dữ liệu

    async function load() {
        settings = await vault.getSettings();
        protection = await vault.getProtection();
        unlocked = (await vault.getState()) === vault.VaultState.UNLOCKED;
        biometricEnrolled = await vault.hasBiometric();
        biometricAvailable = await isPlatformAuthenticatorAvailable();
        installType = await getInstallType();
    }

    async function save(changes, messageKey) {
        settings = await vault.saveSettings(changes);
        toast(t(messageKey), 'success');
        onSettingsChanged?.();
    }

    // ---------------------------------------------------------------- ngôn ngữ

    function languageCard() {
        return card('language', [
            ...cardHead('options.language.title', 'options.language.lead'),
            buildLanguageSwitcher(),
        ]);
    }

    // --------------------------------------------------- lớp master password

    function protectionCard() {
        const on = protection === vault.Protection.PASSWORD;

        const status = el('div', {
            class: 'status-line',
            dataset: { on: String(on) },
            text: on ? t('options.protection.on') : t('options.protection.off'),
        });

        const children = [...cardHead('options.protection.title', 'options.protection.lead'), status];

        if (on) {
            const disableBtn = el('button', {
                class: 'btn btn--danger',
                type: 'button',
                text: t('options.protection.disable'),
            });
            disableBtn.disabled = !unlocked;
            disableBtn.addEventListener('click', disableProtection);

            children.push(el('div', { class: 'row-actions' }, [disableBtn]));
            if (!unlocked) {
                children.push(el('p', { class: 'card__note', text: t('options.protection.needUnlock') }));
            }
        } else if (enablingPassword) {
            children.push(enablePasswordForm());
        } else {
            const enableBtn = el('button', {
                class: 'btn btn--primary',
                type: 'button',
                text: t('options.protection.enable'),
            });
            enableBtn.addEventListener('click', () => {
                enablingPassword = true;
                render();
            });

            children.push(
                el('div', { class: 'row-actions' }, [enableBtn]),
                el('p', { class: 'card__note', text: t('options.protection.hiddenNote') }),
            );
        }

        return card('protection', children);
    }

    function enablePasswordForm() {
        const { field: nextField, input: next } = passwordField('options.protection.newPassword', 'protectionNext');
        const { field: confirmField, input: confirm } = passwordField('options.protection.confirm', 'protectionConfirm');
        const meter = strengthMeter();
        const alert = el('div', { class: 'alert', hidden: true });

        const submit = el('button', {
            class: 'btn btn--primary',
            type: 'submit',
            text: t('options.protection.submit'),
        });
        submit.disabled = true;

        const cancel = el('button', {
            class: 'btn btn--ghost',
            type: 'button',
            text: t('common.cancel'),
        });
        cancel.addEventListener('click', () => {
            enablingPassword = false;
            render();
        });

        function validate() {
            const result = meter.update(next.value);
            submit.disabled = !(result.ok && confirm.value.length > 0 && confirm.value === next.value);
        }

        next.addEventListener('input', validate);
        confirm.addEventListener('input', validate);

        const form = el('form', { autocomplete: 'off' }, [
            el('p', { class: 'card__note', text: t('options.protection.enableLead') }),
            nextField,
            meter.root,
            confirmField,
            alert,
            el('div', { class: 'row-actions' }, [submit, cancel]),
        ]);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            show(alert, false);

            if (next.value !== confirm.value) {
                alert.className = 'alert alert--error';
                alert.textContent = t('options.protection.mismatch');
                show(alert, true);
                return;
            }

            submit.disabled = true;
            submit.textContent = t('options.protection.working');

            try {
                await vault.enablePasswordProtection(next.value);
                enablingPassword = false;
                toast(t('options.protection.enabled'), 'success');
                await refresh();
                onSettingsChanged?.();
            } catch (error) {
                alert.className = 'alert alert--error';
                alert.textContent = describeError(error);
                show(alert, true);
                submit.disabled = false;
                submit.textContent = t('options.protection.submit');
            }
        });

        return form;
    }

    async function disableProtection() {
        const confirmed = await confirmDialog({
            title: t('options.protection.disableTitle'),
            message: t('options.protection.disableMessage'),
            confirmLabel: t('options.protection.disableAction'),
            cancelLabel: t('common.cancel'),
            danger: true,
        });
        if (!confirmed) return;

        try {
            await vault.disablePasswordProtection();
            toast(t('options.protection.disabled'), 'success');
            await refresh();
            onSettingsChanged?.();
        } catch (error) {
            toast(describeError(error), 'error');
        }
    }

    // -------------------------------------------------------------- auto-lock

    function autoLockCard() {
        if (protection !== vault.Protection.PASSWORD) return null;

        return card('autolock', [
            ...cardHead('options.lock.title', 'options.lock.lead'),
            selectField(
                'options.lock.after',
                [
                    { value: 1, key: 'options.lock.1' },
                    { value: 5, key: 'options.lock.5' },
                    { value: 15, key: 'options.lock.15' },
                    { value: 30, key: 'options.lock.30' },
                    { value: 60, key: 'options.lock.60' },
                    { value: 0, key: 'options.lock.0' },
                ],
                settings.autoLockMinutes,
                (value) => save({ autoLockMinutes: Number(value) }, 'options.lock.saved'),
            ),
        ]);
    }

    function displayCard() {
        return card('display', [
            ...cardHead('options.display.title', 'options.display.lead'),
            selectField(
                'options.clipboard.label',
                [
                    { value: 10, key: 'options.clipboard.10' },
                    { value: 20, key: 'options.clipboard.20' },
                    { value: 60, key: 'options.clipboard.60' },
                    { value: 0, key: 'options.clipboard.0' },
                ],
                settings.clipboardClearSeconds,
                (value) => save({ clipboardClearSeconds: Number(value) }, 'options.clipboard.saved'),
                'options.clipboard.hint',
            ),
            checkField('options.hideCodes', Boolean(settings.hideCodes), (checked) =>
                save({ hideCodes: checked }, 'options.saved'),
            ),
        ]);
    }

    // ---------------------------------------------------------------- vân tay

    function biometricCard() {
        if (protection !== vault.Protection.PASSWORD) return null;

        const statusKey = biometricEnrolled
            ? 'options.biometric.on'
            : !biometricAvailable
              ? 'options.biometric.unavailable'
              : !unlocked
                ? 'options.biometric.needUnlock'
                : 'options.biometric.off';

        const alert = el('div', { class: 'alert', hidden: true });
        const actions = el('div', { class: 'row-actions' });

        if (!biometricEnrolled && biometricAvailable && unlocked) {
            const enroll = el('button', {
                class: 'btn btn--primary',
                type: 'button',
                text: t('options.biometric.enable'),
            });

            enroll.addEventListener('click', async () => {
                // Ceremony WebAuthn không sống nổi trong popup: hộp thoại sinh trắc của hệ điều hành
                // cướp focus làm popup đóng giữa chừng. Trong popup thì mở cửa sổ riêng canh giữa.
                if (compact) {
                    openExtensionWindow('options/options.html?focus=biometric', {
                        width: 460,
                        height: 620,
                    }).finally(() => window.close());
                    return;
                }

                enroll.disabled = true;
                enroll.textContent = t('options.biometric.enabling');
                show(alert, false);

                let registration;
                try {
                    registration = await registerBiometric();
                    await vault.enrollBiometric({
                        credentialId: registration.credentialId,
                        prfSalt: registration.prfSalt,
                        prfOutputBytes: registration.prfOutput,
                    });
                    toast(t('options.biometric.enabled'), 'success');
                    await refresh();
                } catch (error) {
                    const code = error?.name ? webAuthnErrorCode(error) : null;
                    alert.className = 'alert alert--error';
                    alert.textContent = code ? t(code) : describeError(error);
                    show(alert, true);
                    enroll.disabled = false;
                    enroll.textContent = t('options.biometric.enable');
                } finally {
                    if (registration?.prfOutput) registration.prfOutput.fill(0);
                }
            });

            actions.append(enroll);
        }

        if (biometricEnrolled) {
            const remove = el('button', {
                class: 'btn btn--danger',
                type: 'button',
                text: t('options.biometric.remove'),
            });
            remove.addEventListener('click', async () => {
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
                await refresh();
            });
            actions.append(remove);
        }

        return card('biometric', [
            ...cardHead('options.biometric.title', 'options.biometric.lead'),
            el('div', { class: 'status-line', dataset: { on: String(biometricEnrolled) }, text: t(statusKey) }),
            alert,
            actions,
        ]);
    }

    // ------------------------------------------------------- đổi mật khẩu

    function changePasswordCard() {
        if (protection !== vault.Protection.PASSWORD) return null;

        const current = el('input', {
            class: 'input',
            type: 'password',
            id: 'currentPassword',
            autocomplete: 'current-password',
            required: true,
        });
        const { field: nextField, input: next } = passwordField('options.password.next', 'nextPassword');
        const { field: confirmField, input: confirm } = passwordField('options.password.confirm', 'nextPasswordConfirm');
        const meter = strengthMeter();
        const alert = el('div', { class: 'alert', hidden: true });

        next.addEventListener('input', () => meter.update(next.value));

        const submit = el('button', {
            class: 'btn btn--primary',
            type: 'submit',
            text: t('options.password.submit'),
        });

        const form = el('form', { autocomplete: 'off' }, [
            el('label', { class: 'field' }, [
                el('span', { class: 'field__label', text: t('options.password.current') }),
                current,
            ]),
            nextField,
            meter.root,
            confirmField,
            alert,
            submit,
        ]);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            show(alert, false);

            if (next.value !== confirm.value) {
                alert.className = 'alert alert--error';
                alert.textContent = t('options.password.mismatch');
                show(alert, true);
                return;
            }

            submit.disabled = true;
            submit.textContent = t('options.password.working');

            try {
                await vault.changePassword(current.value, next.value);
                form.reset();
                meter.update('');
                alert.className = 'alert alert--success';
                alert.textContent = t('options.password.changed');
                show(alert, true);
                toast(t('options.password.changed'), 'success');
            } catch (error) {
                alert.className = 'alert alert--error';
                alert.textContent = describeError(error);
                show(alert, true);
            } finally {
                submit.disabled = false;
                submit.textContent = t('options.password.submit');
            }
        });

        return card('password', [...cardHead('options.password.title', 'options.password.lead'), form]);
    }

    // ------------------------------------------------------------ thông tin

    function factsList() {
        return el(
            'ul',
            { class: 'facts' },
            FACT_KEYS.map((key) =>
                el('li', {}, [
                    el('b', { text: t(`options.facts.${key}`) }),
                    ' ',
                    el('span', { text: t(`options.facts.${key}Text`) }),
                ]),
            ),
        );
    }

    function factsCard() {
        if (!compact) return card('facts', [...cardHead('options.facts.title', null), factsList()]);

        const details = el('details', { class: 'facts-details' }, [
            el('summary', { text: t('options.facts.title') }),
            factsList(),
        ]);
        return card('facts', [details]);
    }

    // ---------------------------------------------------------- phiên bản

    function aboutCard() {
        const updateKey =
            installType === InstallType.DEVELOPMENT
                ? 'options.about.autoUpdateDev'
                : installType === InstallType.STORE
                  ? 'options.about.autoUpdateStore'
                  : 'options.about.autoUpdateUnknown';

        const alert = el('div', { class: 'alert', hidden: true });

        function setResult(messageKey, variant) {
            alert.className = `alert alert--${variant}`;
            alert.textContent = t(messageKey);
            show(alert, true);
        }

        const check = el('button', {
            class: 'btn',
            type: 'button',
            text: t('options.about.check'),
        });

        check.addEventListener('click', async () => {
            check.disabled = true;
            check.textContent = t('options.about.checking');
            show(alert, false);

            const result = await checkForUpdate();

            if (result.status === UpdateStatus.AVAILABLE) setResult('options.about.updateFound', 'success');
            else if (result.status === UpdateStatus.UP_TO_DATE) setResult('options.about.upToDate', 'info');
            else if (result.status === UpdateStatus.THROTTLED) setResult('options.about.throttled', 'warning');
            else setResult('options.about.checkUnsupported', 'warning');

            check.disabled = false;
            check.textContent = t('options.about.check');
        });

        const notesSlot = el('div', { class: 'whatsnew whatsnew--inline', hidden: !showingNotes });
        if (showingNotes) {
            const list = buildNotesList('');
            notesSlot.append(list ?? el('p', { class: 'card__note', text: t('whatsnew.empty') }));
        }

        const notesBtn = el('button', {
            class: 'btn',
            type: 'button',
            text: t(showingNotes ? 'options.about.hideNotes' : 'options.about.whatsNew'),
        });
        notesBtn.addEventListener('click', () => {
            showingNotes = !showingNotes;
            render();
        });

        return card('about', [
            el('h2', { text: t('options.about.title') }),
            el('div', {
                class: 'status-line',
                text: t('options.about.version', { version: currentVersion() }),
            }),
            el('p', { class: 'card__lead', text: t(updateKey) }),
            el('div', { class: 'row-actions' }, [check, notesBtn]),
            alert,
            notesSlot,
        ]);
    }

    // ----------------------------------------------------------- xoá vault

    function dangerCard() {
        const destroy = el('button', {
            class: 'btn btn--danger',
            type: 'button',
            text: t('options.destroy.action'),
        });

        destroy.addEventListener('click', async () => {
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
            onVaultDestroyed?.();
        });

        return card('danger', [...cardHead('options.destroy.title', 'options.destroy.lead'), destroy], { danger: true });
    }

    // -------------------------------------------------------------- vẽ lại

    function render() {
        root.replaceChildren();
        for (const section of [
            languageCard(),
            protectionCard(),
            autoLockCard(),
            displayCard(),
            biometricCard(),
            changePasswordCard(),
            factsCard(),
            aboutCard(),
            dangerCard(),
        ]) {
            if (section) root.append(section);
        }
    }

    async function refresh() {
        await load();
        if (disposed) return;
        render();
    }

    const stopListening = onLanguageChange(render);

    return {
        root,
        refresh,
        /** Cuộn tới đúng thẻ, dùng khi popup đẩy user sang trang này để đăng ký vân tay. */
        scrollToSection(name) {
            root.querySelector(`[data-section="${name}"]`)?.scrollIntoView({ block: 'center' });
        },
        destroy() {
            disposed = true;
            stopListening();
        },
    };
}
