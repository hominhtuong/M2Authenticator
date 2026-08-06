/**
 * Bọc chrome.storage thành promise + hằng số key dùng chung.
 *
 * local   : ghi xuống đĩa. Chỉ chứa ciphertext và cấu hình không nhạy cảm.
 * session : chỉ nằm trong RAM, tự bay khi đóng Chrome. Chứa DEK khi vault đang mở.
 */

export const LOCAL_KEYS = {
    VAULT: 'vault_v2',
    SECURITY: 'security_v1',
    SETTINGS: 'settings_v1',
};

export const SESSION_KEYS = {
    DEK: 'dek',
    LOCK_AT: 'lockAt',
};

export const ALARMS = {
    AUTO_LOCK: 'auto-lock',
    CLIPBOARD_CLEAR: 'clipboard-clear',
};

export async function localGet(keys) {
    return chrome.storage.local.get(keys);
}

export async function localSet(items) {
    return chrome.storage.local.set(items);
}

export async function localRemove(keys) {
    return chrome.storage.local.remove(keys);
}

export async function sessionGet(keys) {
    return chrome.storage.session.get(keys);
}

export async function sessionSet(items) {
    return chrome.storage.session.set(items);
}

export async function sessionRemove(keys) {
    return chrome.storage.session.remove(keys);
}

export async function sessionClear() {
    return chrome.storage.session.clear();
}
