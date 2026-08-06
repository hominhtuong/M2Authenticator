/** Tên message giữa các trang extension, service worker và tài liệu offscreen. */
export const MSG = {
    LOCK_NOW: 'lock-now',
    SCHEDULE_CLIPBOARD_CLEAR: 'schedule-clipboard-clear',
    CANCEL_CLIPBOARD_CLEAR: 'cancel-clipboard-clear',

    // service worker => offscreen
    OFFSCREEN_SCHEDULE_CLEAR: 'offscreen-schedule-clear',
    OFFSCREEN_CLEAR_NOW: 'offscreen-clear-now',

    // offscreen => service worker
    CLIPBOARD_CLEARED: 'clipboard-cleared',
};

export const OFFSCREEN_PATH = 'offscreen/offscreen.html';
