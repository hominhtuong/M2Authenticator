/**
 * Đọc QR từ ảnh bằng BarcodeDetector có sẵn trong Chrome.
 * Không dùng thư viện QR ngoài: ảnh QR chứa seed 2FA, không đưa qua code lạ.
 */

import { fail } from './errors.js';

export function isBarcodeDetectorAvailable() {
    return typeof globalThis.BarcodeDetector !== 'undefined';
}

async function detectFromBitmap(bitmap) {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const codes = await detector.detect(bitmap);
    return codes.map((code) => code.rawValue).filter(Boolean);
}

/**
 * Thử đọc ở kích thước gốc, nếu trượt thì phóng to rồi thử lại.
 * Ảnh chụp màn hình QR nhỏ hay trượt ở lần đầu.
 */
export async function readQrFromBlob(blob) {
    if (!isBarcodeDetectorAvailable()) {
        fail('error.qrNoDetector');
    }

    let bitmap;
    try {
        bitmap = await createImageBitmap(blob);
    } catch {
        fail('error.qrCannotOpenImage');
    }

    try {
        const direct = await detectFromBitmap(bitmap);
        if (direct.length > 0) return direct;

        const scale = Math.min(4, Math.max(2, Math.ceil(600 / Math.max(bitmap.width, bitmap.height))));
        const canvas = new OffscreenCanvas(bitmap.width * scale, bitmap.height * scale);
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        const upscaled = await createImageBitmap(canvas);
        try {
            return await detectFromBitmap(upscaled);
        } finally {
            upscaled.close();
        }
    } finally {
        bitmap.close();
    }
}

/** Đọc nhiều file ảnh, gom kết quả và lỗi theo từng file. */
export async function readQrFromFiles(files) {
    const values = [];
    const errors = [];

    for (const file of files) {
        try {
            const found = await readQrFromBlob(file);
            if (found.length === 0) {
                errors.push({ name: file.name, code: 'error.qrNotFound', params: {} });
            } else {
                values.push(...found);
            }
        } catch (error) {
            errors.push({ name: file.name, code: error.code ?? 'error.unknown', params: error.params ?? {} });
        }
    }

    return { values, errors };
}
