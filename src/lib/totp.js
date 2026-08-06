/**
 * HOTP (RFC 4226) và TOTP (RFC 6238) trên Web Crypto.
 */

import { base32Decode } from './base32.js';

export const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-512'];
export const DEFAULT_PERIOD = 30;
export const DEFAULT_DIGITS = 6;
export const DEFAULT_ALGORITHM = 'SHA-1';

/** Chấp nhận cả "SHA1" lẫn "SHA-1", trả về dạng WebCrypto. */
export function normalizeAlgorithm(algorithm) {
    const raw = String(algorithm ?? '').toUpperCase().replace(/[\s_-]/g, '');
    switch (raw) {
        case 'SHA1':
            return 'SHA-1';
        case 'SHA256':
            return 'SHA-256';
        case 'SHA512':
            return 'SHA-512';
        case '':
            return DEFAULT_ALGORITHM;
        default:
            throw new Error(`Thuật toán không hỗ trợ: ${algorithm}`);
    }
}

function counterToBytes(counter) {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    // Counter có thể vượt 2^32, tách hi/lo để không mất bit.
    const big = BigInt(counter);
    view.setUint32(0, Number((big >> 32n) & 0xffffffffn));
    view.setUint32(4, Number(big & 0xffffffffn));
    return new Uint8Array(buf);
}

async function hmac(keyBytes, msgBytes, algorithm) {
    const key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: { name: algorithm } },
        false,
        ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, msgBytes);
    return new Uint8Array(sig);
}

function dynamicTruncate(hmacBytes) {
    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
    return (
        (((hmacBytes[offset] & 0x7f) << 24) |
            ((hmacBytes[offset + 1] & 0xff) << 16) |
            ((hmacBytes[offset + 2] & 0xff) << 8) |
            (hmacBytes[offset + 3] & 0xff)) >>>
        0
    );
}

export async function generateHOTP({
    secret,
    counter,
    digits = DEFAULT_DIGITS,
    algorithm = DEFAULT_ALGORITHM,
}) {
    const algo = normalizeAlgorithm(algorithm);
    const digitCount = Number(digits) || DEFAULT_DIGITS;
    if (digitCount < 6 || digitCount > 10) {
        throw new Error('Số chữ số phải nằm trong khoảng 6 đến 10.');
    }

    const keyBytes = base32Decode(secret);
    const mac = await hmac(keyBytes, counterToBytes(counter), algo);
    const code = dynamicTruncate(mac) % 10 ** digitCount;
    return String(code).padStart(digitCount, '0');
}

export async function generateTOTP({
    secret,
    timeMs = Date.now(),
    period = DEFAULT_PERIOD,
    digits = DEFAULT_DIGITS,
    algorithm = DEFAULT_ALGORITHM,
}) {
    const step = Number(period) || DEFAULT_PERIOD;
    if (step <= 0) throw new Error('Chu kỳ phải lớn hơn 0.');
    const counter = Math.floor(timeMs / 1000 / step);
    return generateHOTP({ secret, counter, digits, algorithm });
}

/** Số giây còn lại của mã TOTP hiện tại. */
export function secondsRemaining(period = DEFAULT_PERIOD, timeMs = Date.now()) {
    const step = Number(period) || DEFAULT_PERIOD;
    return step - Math.floor(timeMs / 1000) % step;
}

/** Sinh mã cho một account bất kể totp hay hotp. */
export async function generateForAccount(account, timeMs = Date.now()) {
    if (account.type === 'hotp') {
        return generateHOTP({
            secret: account.secret,
            counter: account.counter ?? 0,
            digits: account.digits,
            algorithm: account.algorithm,
        });
    }
    return generateTOTP({
        secret: account.secret,
        timeMs,
        period: account.period,
        digits: account.digits,
        algorithm: account.algorithm,
    });
}
