/**
 * Phân tích URI otpauth:// (QR 2FA thông thường, một account mỗi mã).
 */

import { normalizeBase32, isValidBase32 } from './base32.js';
import { normalizeAlgorithm, DEFAULT_DIGITS, DEFAULT_PERIOD, DEFAULT_ALGORITHM } from './totp.js';

export function isOtpAuthUri(raw) {
    return String(raw ?? '')
        .trim()
        .toLowerCase()
        .startsWith('otpauth://');
}

export function parseOtpAuthUri(raw) {
    const text = String(raw ?? '').trim();
    if (!isOtpAuthUri(text)) throw new Error('Đây không phải QR 2FA (otpauth://).');

    let url;
    try {
        url = new URL(text);
    } catch {
        throw new Error('Link otpauth trong QR không hợp lệ.');
    }

    const type = (url.hostname || '').toLowerCase();
    if (type !== 'totp' && type !== 'hotp') {
        throw new Error(`Loại OTP không hỗ trợ: ${type || 'không xác định'}.`);
    }

    const secret = normalizeBase32(url.searchParams.get('secret') || '');
    if (!secret) throw new Error('QR không chứa secret.');
    if (!isValidBase32(secret)) throw new Error('Secret trong QR không phải Base32 hợp lệ.');

    const pathLabel = decodeURIComponent(url.pathname || '').replace(/^\/+/, '');
    let issuer = (url.searchParams.get('issuer') || '').trim();
    let account = pathLabel;

    if (pathLabel.includes(':')) {
        const [head, ...rest] = pathLabel.split(':');
        const tail = rest.join(':').trim();
        if (!issuer) issuer = head.trim();
        account = tail || head.trim();
    }

    const digitsRaw = url.searchParams.get('digits');
    const periodRaw = url.searchParams.get('period');
    const counterRaw = url.searchParams.get('counter');

    const digits = digitsRaw ? parseInt(digitsRaw, 10) : DEFAULT_DIGITS;
    const period = periodRaw ? parseInt(periodRaw, 10) : DEFAULT_PERIOD;

    if (!Number.isFinite(digits) || digits < 6 || digits > 10) {
        throw new Error('Số chữ số trong QR không hợp lệ.');
    }
    if (!Number.isFinite(period) || period <= 0 || period > 300) {
        throw new Error('Chu kỳ trong QR không hợp lệ.');
    }

    let algorithm = DEFAULT_ALGORITHM;
    const algorithmRaw = url.searchParams.get('algorithm');
    if (algorithmRaw) algorithm = normalizeAlgorithm(algorithmRaw);

    return {
        type,
        issuer,
        account,
        secret,
        digits,
        period,
        algorithm,
        counter: type === 'hotp' ? Number(counterRaw ?? 0) || 0 : 0,
    };
}

/** Nhãn hiển thị: "Issuer (account)" hoặc phần nào có. */
export function displayLabel(account) {
    const issuer = String(account.issuer ?? '').trim();
    const name = String(account.account ?? '').trim();
    if (issuer && name) return `${issuer} (${name})`;
    return issuer || name || 'Không tên';
}

/** Khoá so trùng để phát hiện account đã tồn tại. */
export function dedupeKey(account) {
    return [
        account.type ?? 'totp',
        String(account.issuer ?? '').trim().toLowerCase(),
        String(account.account ?? '').trim().toLowerCase(),
        normalizeBase32(account.secret),
    ].join('|');
}
