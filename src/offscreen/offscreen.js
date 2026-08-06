/**
 * Trang offscreen chỉ làm đúng một việc: ghi đè clipboard bằng chuỗi rỗng.
 *
 * Service worker không có DOM nên không tự làm được, và chrome.alarms không hẹn được mốc dưới
 * khoảng một phút. Trang này là một tài liệu bình thường nên setTimeout ở đây chạy đúng mốc giây.
 */

import { MSG } from '../lib/messages.js';

let timer = null;

function clearClipboard() {
    const sink = document.getElementById('sink');
    // Chuỗi rỗng không ghi đè được, phải ghi một ký tự rồi mới dọn ô nhập.
    sink.value = ' ';
    sink.select();
    document.execCommand('copy');
    sink.value = '';
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return false;

    switch (message?.type) {
        case MSG.OFFSCREEN_SCHEDULE_CLEAR: {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                clearClipboard();
                chrome.runtime.sendMessage({ type: MSG.CLIPBOARD_CLEARED }).catch(() => {});
            }, Math.max(1, Number(message.seconds) || 0) * 1000);
            sendResponse({ ok: true });
            return true;
        }

        case MSG.OFFSCREEN_CLEAR_NOW: {
            if (timer) clearTimeout(timer);
            timer = null;
            clearClipboard();
            sendResponse({ ok: true });
            return true;
        }

        default:
            return false;
    }
});
