/**
 * Trang cài đặt full-size. Chỉ là lớp vỏ: nội dung do settings/settings-view.js dựng, đúng
 * cái mà popup nhúng vào panel của nó, nên hai nơi không bao giờ lệch nhau.
 *
 * Trang này vẫn cần tồn tại vì ceremony WebAuthn (đăng ký vân tay) không chạy được trong popup.
 */

import { $, show } from '../lib/dom.js';
import { initI18n } from '../lib/i18n.js';
import { createSettingsView } from '../settings/settings-view.js';
import * as vault from '../lib/vault.js';

const ui = {
    welcomeNotice: $('#welcomeNotice'),
    lockedNotice: $('#lockedNotice'),
    host: $('#settingsHost'),
};

let view = null;

async function paintLockedNotice() {
    const state = await vault.getState();
    show(ui.lockedNotice, state === vault.VaultState.LOCKED);
}

async function boot() {
    await initI18n();

    const params = new URLSearchParams(location.search);
    if (params.has('welcome')) show(ui.welcomeNotice, true);

    view = createSettingsView({
        onVaultDestroyed: () => setTimeout(() => location.reload(), 800),
    });
    ui.host.append(view.root);

    await view.refresh();
    await paintLockedNotice();

    if (params.get('focus')) view.scrollToSection(params.get('focus'));

    if ((await vault.getState()) === vault.VaultState.UNLOCKED) await vault.touchActivity();
}

chrome.storage.session.onChanged.addListener(async (changes) => {
    if (!('dek' in changes)) return;
    await paintLockedNotice();
    await view?.refresh();
});

boot();
