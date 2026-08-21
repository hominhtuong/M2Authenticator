/**
 * Mở trang của extension thành cửa sổ riêng, đặt đúng chỗ popup vừa đứng.
 *
 * Có file này vì cửa sổ mở bằng chrome.windows.create mà không truyền left/top sẽ rơi vào vị trí
 * mặc định của hệ điều hành, thường là giữa hoặc mép trái màn hình. Người dùng vừa bấm một nút ở
 * góc phải trên mà giao diện nhảy ra giữa màn hình thì tưởng là hai màn hình khác nhau.
 *
 * Popup của extension luôn treo dưới icon trên thanh công cụ, tức là góc phải trên của cửa sổ trình
 * duyệt đang dùng. Neo cửa sổ mới vào đúng đó là gần nhất với chỗ popup vừa biến mất.
 */

/** Khoảng chừa cho thanh công cụ, đo trên Chrome/Brave ở mức zoom mặc định. */
const TOOLBAR_OFFSET = 78;
const EDGE_MARGIN = 12;

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

/** Canh giữa màn hình, dùng khi không đọc được cửa sổ hiện tại. */
function centeredBounds(width, height) {
    const availWidth = globalThis.screen?.availWidth ?? width;
    const availHeight = globalThis.screen?.availHeight ?? height;
    return {
        left: Math.max(0, Math.round((availWidth - width) / 2)),
        top: Math.max(0, Math.round((availHeight - height) / 2)),
    };
}

async function anchoredBounds(width, height) {
    try {
        const current = await chrome.windows.getCurrent();
        if (!Number.isFinite(current?.left) || !Number.isFinite(current?.top)) {
            return centeredBounds(width, height);
        }

        const availWidth = globalThis.screen?.availWidth ?? current.width;
        const availHeight = globalThis.screen?.availHeight ?? current.height;

        return {
            left: clamp(
                Math.round(current.left + current.width - width - EDGE_MARGIN),
                0,
                Math.max(0, availWidth - width),
            ),
            top: clamp(Math.round(current.top + TOOLBAR_OFFSET), 0, Math.max(0, availHeight - height)),
        };
    } catch {
        return centeredBounds(width, height);
    }
}

export async function openExtensionWindow(path, { width = 396, height = 560 } = {}) {
    const bounds = await anchoredBounds(width, height);
    return chrome.windows.create({
        url: chrome.runtime.getURL(path),
        type: 'popup',
        width,
        height,
        ...bounds,
    });
}
