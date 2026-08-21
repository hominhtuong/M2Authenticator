/**
 * Version đang chạy, kiểu cài đặt và kiểm tra cập nhật.
 *
 * Bản cài từ Chrome Web Store tự cập nhật ngầm: trình duyệt kiểm tra lúc khởi động và vài giờ một
 * lần, và chỉ áp bản mới khi extension đang rảnh. Không cần khai báo gì trong manifest, cũng không
 * cần quyền nào. Nút kiểm tra ở đây chỉ để user chủ động hỏi ngay thay vì chờ chu kỳ đó.
 *
 * Bản load unpacked không có đường cập nhật nào, nên phải nói thẳng thay vì để user bấm hoài.
 */

export const UpdateStatus = {
    AVAILABLE: 'update_available',
    UP_TO_DATE: 'no_update',
    THROTTLED: 'throttled',
    UNSUPPORTED: 'unsupported',
};

export const InstallType = {
    STORE: 'store',
    DEVELOPMENT: 'development',
    UNKNOWN: 'unknown',
};

export function currentVersion() {
    return globalThis.chrome?.runtime?.getManifest?.()?.version ?? '0.0.0';
}

/**
 * chrome.management.getSelf() là ngoại lệ không cần quyền "management". Trình duyệt nào không có
 * thì lùi về xem manifest hiệu lực có update_url không - store tự chèn khoá này khi cài.
 */
export async function getInstallType() {
    try {
        const self = await globalThis.chrome?.management?.getSelf?.();
        if (self?.installType === 'development') return InstallType.DEVELOPMENT;
        if (self?.installType) return InstallType.STORE;
    } catch {
        // Không gọi được thì đoán bằng manifest.
    }

    if (globalThis.chrome?.runtime?.getManifest?.()?.update_url) return InstallType.STORE;
    return InstallType.UNKNOWN;
}

/**
 * Hỏi trình duyệt xem có bản mới không.
 * @returns {Promise<{status: string, version?: string}>}
 */
export async function checkForUpdate() {
    if (!globalThis.chrome?.runtime?.requestUpdateCheck) return { status: UpdateStatus.UNSUPPORTED };

    try {
        const result = await chrome.runtime.requestUpdateCheck();
        // MV3 trả về object, bản cũ trả về chuỗi status.
        const status = typeof result === 'string' ? result : result?.status;
        return {
            status: status ?? UpdateStatus.UNSUPPORTED,
            version: typeof result === 'object' ? result?.version : undefined,
        };
    } catch {
        // Bản load unpacked hoặc không có nguồn cập nhật: không có gì để hỏi.
        return { status: UpdateStatus.UNSUPPORTED };
    }
}
