/**
 * Phân tích URI otpauth:// (QR 2FA thông thường, một account mỗi mã).
 */

import { normalizeBase32, isValidBase32 } from './base32.js';
import { normalizeAlgorithm, DEFAULT_DIGITS, DEFAULT_PERIOD, DEFAULT_ALGORITHM } from './totp.js';
import { fail } from './errors.js';

export function isOtpAuthUri(raw) {
    return String(raw ?? '')
        .trim()
        .toLowerCase()
        .startsWith('otpauth://');
}

export function parseOtpAuthUri(raw) {
    const text = String(raw ?? '').trim();
    if (!isOtpAuthUri(text)) fail('error.otpNotOtpauth');

    let url;
    try {
        url = new URL(text);
    } catch {
        fail('error.otpBadUri');
    }

    const type = (url.hostname || '').toLowerCase();
    if (type !== 'totp' && type !== 'hotp') {
        fail('error.otpTypeUnsupported', { type: type || '?' });
    }

    const secret = normalizeBase32(url.searchParams.get('secret') || '');
    if (!secret) fail('error.otpNoSecret');
    if (!isValidBase32(secret)) fail('error.otpSecretNotBase32');

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
        fail('error.otpDigitsInvalid');
    }
    if (!Number.isFinite(period) || period <= 0 || period > 300) {
        fail('error.otpPeriodInvalid');
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

/**
 * Nhãn hiển thị: "Issuer (account)" hoặc phần nào có.
 * Chuỗi thay thế do chỗ gọi truyền vào, vì tầng lib không biết ngôn ngữ đang dùng.
 */
export function displayLabel(account, fallback = '?') {
    const issuer = String(account.issuer ?? '').trim();
    const name = String(account.account ?? '').trim();
    if (issuer && name) return `${issuer} (${name})`;
    return issuer || name || fallback;
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
