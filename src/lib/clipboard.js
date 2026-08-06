/**
 * Copy mã kèm hẹn giờ tự xoá clipboard.
 *
 * Mã OTP nằm lại trong clipboard là một đường rò thật: trang web bất kỳ có thể đọc clipboard
 * khi user dán, và các công cụ đồng bộ clipboard giữa thiết bị còn đẩy nó đi xa hơn.
 * Việc xoá do service worker làm nên vẫn chạy kể cả khi popup đã đóng.
 */

import { MSG } from './messages.js';

export async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Dự phòng cho trường hợp Clipboard API bị chặn vì thiếu focus.
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        return ok;
    }
}

export async function copyCode(text, clearAfterSeconds) {
    const copied = await copyText(text);
    if (!copied) return false;

    const seconds = Number(clearAfterSeconds);
    if (Number.isFinite(seconds) && seconds > 0) {
        try {
            // Chỉ gửi mốc thời gian. Bản thân mã OTP không đi qua kênh message.
            await chrome.runtime.sendMessage({ type: MSG.SCHEDULE_CLIPBOARD_CLEAR, seconds });
        } catch {
            // Service worker chưa sẵn sàng thì bỏ qua, việc copy vẫn thành công.
        }
    }
    return true;
}
