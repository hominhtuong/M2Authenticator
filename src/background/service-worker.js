/**
 * Service worker: giữ hai việc phải sống lâu hơn popup.
 *   1. Auto-lock đúng hạn kể cả khi user không mở popup nữa.
 *   2. Xoá clipboard sau khi copy mã, kể cả khi popup đã đóng.
 *
 * Service worker của MV3 bị kill bất kỳ lúc nào, nên mọi trạng thái nằm ở storage,
 * không giữ biến toàn cục.
 */

import { ALARMS, SESSION_KEYS, sessionGet, sessionRemove } from '../lib/storage.js';
import { MSG, OFFSCREEN_PATH } from '../lib/messages.js';
import { Protection, ensureVault, getProtection } from '../lib/vault.js';

const CLIPBOARD_PENDING_KEY = 'clipboardPending';
const PENDING_UPDATE_KEY = 'pendingUpdate';

// -------------------------------------------------------------- auto-lock

async function lockVault() {
    await sessionRemove([SESSION_KEYS.DEK, SESSION_KEYS.LOCK_AT]);
    await chrome.alarms.clear(ALARMS.AUTO_LOCK);
    await applyPendingUpdate();
}

// ----------------------------------------------------------- cập nhật

/**
 * Áp bản mới khi việc đó không làm phiền ai.
 *
 * Đăng ký onUpdateAvailable nghĩa là trình duyệt chờ chính chúng ta gọi reload() thay vì tự cài,
 * nên phải chủ động quyết định. reload() xoá sạch chrome.storage.session, tức là vault đang mở sẽ
 * khoá lại và user phải nhập mật khẩu giữa chừng. Vì vậy:
 *
 *   - vault không đặt master password  => reload ngay, user không mất gì
 *   - vault đang khoá                  => reload ngay, đằng nào cũng phải mở khoá
 *   - vault đang mở                    => hoãn, chờ tới lúc khoá (hoặc trình duyệt khởi động lại)
 */
async function applyPendingUpdate() {
    const stored = await chrome.storage.session.get(PENDING_UPDATE_KEY);
    if (!stored[PENDING_UPDATE_KEY]) return;

    if ((await getProtection()) === Protection.NONE) {
        chrome.runtime.reload();
        return;
    }

    const session = await sessionGet([SESSION_KEYS.DEK]);
    if (!session[SESSION_KEYS.DEK]) chrome.runtime.reload();
}

/**
 * Alarm có thể nổ sớm hoặc muộn hơn mốc thật, nên luôn đối chiếu lockAt
 * rồi hẹn lại phần còn thiếu thay vì khoá mù.
 */
async function handleAutoLockAlarm() {
    const stored = await sessionGet([SESSION_KEYS.DEK, SESSION_KEYS.LOCK_AT]);
    if (!stored[SESSION_KEYS.DEK]) return;

    const lockAt = stored[SESSION_KEYS.LOCK_AT];
    if (!lockAt) return; // 0 phút = chỉ khoá khi đóng trình duyệt

    const remainingMs = lockAt - Date.now();
    if (remainingMs <= 0) {
        await lockVault();
        return;
    }
    chrome.alarms.create(ALARMS.AUTO_LOCK, { delayInMinutes: remainingMs / 60_000 });
}

// -------------------------------------------------------------- clipboard

async function ensureOffscreenDocument() {
    const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (existing.length > 0) return;

    await chrome.offscreen.createDocument({
        url: OFFSCREEN_PATH,
        reasons: ['CLIPBOARD'],
        justification: 'Xoá mã OTP khỏi clipboard sau khi hết thời gian giữ.',
    });
}

async function closeOffscreenDocument() {
    try {
        await chrome.offscreen.closeDocument();
    } catch {
        // Chưa mở thì thôi.
    }
}

/**
 * Đường chính là hẹn giờ trong tài liệu offscreen, vì chrome.alarms bị kẹp ở mức khoảng một phút
 * nên không phục vụ được mốc 10-20 giây. Alarm chỉ đóng vai lưới an toàn nếu tài liệu offscreen chết.
 */
async function scheduleClipboardClear(seconds) {
    await chrome.storage.session.set({ [CLIPBOARD_PENDING_KEY]: true });

    await chrome.alarms.clear(ALARMS.CLIPBOARD_CLEAR);
    chrome.alarms.create(ALARMS.CLIPBOARD_CLEAR, { delayInMinutes: Math.max(seconds, 60) / 60 });

    try {
        await ensureOffscreenDocument();
        await chrome.runtime.sendMessage({ type: MSG.OFFSCREEN_SCHEDULE_CLEAR, seconds });
    } catch {
        // Không dựng được offscreen thì vẫn còn alarm dự phòng.
    }
}

/** Lưới an toàn: alarm nổ mà clipboard vẫn chưa được dọn. */
async function forceClipboardClear() {
    const stored = await chrome.storage.session.get(CLIPBOARD_PENDING_KEY);
    if (!stored[CLIPBOARD_PENDING_KEY]) return;

    try {
        await ensureOffscreenDocument();
        await chrome.runtime.sendMessage({ type: MSG.OFFSCREEN_CLEAR_NOW });
    } catch {
        // Không dọn được thì không có gì để phục hồi.
    } finally {
        await chrome.storage.session.remove(CLIPBOARD_PENDING_KEY);
        await closeOffscreenDocument();
    }
}

async function cancelClipboardClear() {
    await chrome.alarms.clear(ALARMS.CLIPBOARD_CLEAR);
    await chrome.storage.session.remove(CLIPBOARD_PENDING_KEY);
    await closeOffscreenDocument();
}

// ------------------------------------------------------------- lắp sự kiện

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARMS.AUTO_LOCK) {
        handleAutoLockAlarm();
    } else if (alarm.name === ALARMS.CLIPBOARD_CLEAR) {
        forceClipboardClear();
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return false;

    switch (message?.type) {
        case MSG.LOCK_NOW:
            lockVault().then(() => sendResponse({ ok: true }));
            return true;

        case MSG.SCHEDULE_CLIPBOARD_CLEAR:
            scheduleClipboardClear(Number(message.seconds) || 0).then(() => sendResponse({ ok: true }));
            return true;

        case MSG.CANCEL_CLIPBOARD_CLEAR:
            cancelClipboardClear().then(() => sendResponse({ ok: true }));
            return true;

        case MSG.CLIPBOARD_CLEARED:
            // Offscreen báo đã dọn xong, thu dọn nốt phần của service worker.
            chrome.alarms.clear(ALARMS.CLIPBOARD_CLEAR);
            chrome.storage.session.remove(CLIPBOARD_PENDING_KEY).then(closeOffscreenDocument);
            return false;

        default:
            return false;
    }
});

chrome.runtime.onUpdateAvailable.addListener(() => {
    chrome.storage.session.set({ [PENDING_UPDATE_KEY]: true }).then(applyPendingUpdate);
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason !== 'install' && reason !== 'update') return;

    // Cài xong là dùng được ngay: dựng sẵn vault không master password, im lặng.
    // Cố ý KHÔNG mở tab nào - lần cài đầu không được cướp màn hình của user.
    ensureVault();
});

// Chrome khởi động lại: session storage đã trống sẵn, chỉ cần dọn alarm treo.
chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.clear(ALARMS.AUTO_LOCK);
    chrome.alarms.clear(ALARMS.CLIPBOARD_CLEAR);
});
