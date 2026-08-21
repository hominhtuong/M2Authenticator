/**
 * Mở trang của extension thành cửa sổ riêng, canh giữa màn hình.
 *
 * Có file này vì cửa sổ mở bằng chrome.windows.create không truyền left/top sẽ rơi vào vị trí
 * mặc định của hệ điều hành, thường lệch hẳn sang mép trái. Người dùng thấy giao diện "nhảy chỗ"
 * so với popup vừa bấm, tưởng là hai màn hình khác nhau.
 */

export function openCenteredWindow(path, { width = 400, height = 560 } = {}) {
    const availWidth = globalThis.screen?.availWidth ?? width;
    const availHeight = globalThis.screen?.availHeight ?? height;

    return chrome.windows.create({
        url: chrome.runtime.getURL(path),
        type: 'popup',
        width,
        height,
        left: Math.max(0, Math.round((availWidth - width) / 2)),
        top: Math.max(0, Math.round((availHeight - height) / 2)),
    });
}
