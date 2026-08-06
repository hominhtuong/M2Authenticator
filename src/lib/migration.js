/**
 * Giải mã QR "Chuyển tài khoản" của Google Authenticator: otpauth-migration://offline?data=<base64>
 *
 * Đây là đường nhập hàng loạt: một ảnh QR chứa hàng chục account.
 *
 * Schema (rút từ MigrationPayload của Google Authenticator):
 *   MigrationPayload {
 *     repeated OtpParameters otp_parameters = 1;
 *     int32 version = 2; int32 batch_size = 3; int32 batch_index = 4; int32 batch_id = 5;
 *   }
 *   OtpParameters {
 *     bytes secret = 1; string name = 2; string issuer = 3;
 *     Algorithm algorithm = 4;   // 1 SHA1, 2 SHA256, 3 SHA512, 4 MD5
 *     DigitCount digits = 5;     // 1 SIX, 2 EIGHT
 *     OtpType type = 6;          // 1 HOTP, 2 TOTP
 *     int64 counter = 7;
 *   }
 */

import { base32Encode } from './base32.js';
import { decodeMessage, firstVarint, firstString, firstBytes, allBytes } from './protobuf.js';
import { DEFAULT_PERIOD } from './totp.js';

const ALGORITHM_BY_ID = {
    0: 'SHA-1', // UNSPECIFIED - Google Authenticator mặc định SHA-1
    1: 'SHA-1',
    2: 'SHA-256',
    3: 'SHA-512',
};

const DIGITS_BY_ID = { 0: 6, 1: 6, 2: 8 };
const TYPE_BY_ID = { 0: 'totp', 1: 'hotp', 2: 'totp' };

export function isMigrationUri(raw) {
    return String(raw ?? '')
        .trim()
        .toLowerCase()
        .startsWith('otpauth-migration://');
}

function base64UrlToBytes(input) {
    let text = String(input ?? '').trim().replace(/-/g, '+').replace(/_/g, '/');
    while (text.length % 4 !== 0) text += '=';
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

/**
 * Tách "Issuer:account" trong field name, ưu tiên issuer riêng nếu có.
 */
function splitName(name, issuerField) {
    const raw = String(name ?? '').trim();
    let issuer = String(issuerField ?? '').trim();
    let account = raw;

    if (raw.includes(':')) {
        const [head, ...rest] = raw.split(':');
        const tail = rest.join(':').trim();
        if (!issuer) issuer = head.trim();
        account = tail || head.trim();
    }

    return { issuer, account };
}

function parseOtpParameters(bytes) {
    const fields = decodeMessage(bytes);

    const secretBytes = firstBytes(fields, 1);
    if (!secretBytes || secretBytes.length === 0) {
        throw new Error('Một mục trong QR không có secret.');
    }

    const { issuer, account } = splitName(firstString(fields, 2), firstString(fields, 3));

    const algorithmId = Number(firstVarint(fields, 4, 1n));
    const algorithm = ALGORITHM_BY_ID[algorithmId];
    if (!algorithm) {
        throw new Error(`Thuật toán không hỗ trợ trong QR (mã ${algorithmId}). MD5 không được dùng cho 2FA.`);
    }

    const digits = DIGITS_BY_ID[Number(firstVarint(fields, 5, 1n))] ?? 6;
    const type = TYPE_BY_ID[Number(firstVarint(fields, 6, 2n))] ?? 'totp';
    const counter = Number(firstVarint(fields, 7, 0n));

    return {
        type,
        issuer,
        account,
        secret: base32Encode(secretBytes),
        digits,
        period: DEFAULT_PERIOD, // format export không mang period, Google Authenticator luôn dùng 30s
        algorithm,
        counter: type === 'hotp' ? counter : 0,
    };
}

/**
 * @param {string} raw nội dung thô đọc từ QR
 * @returns {{accounts: Array<object>, batch: {index: number, size: number, id: number}, version: number}}
 */
export function parseMigrationUri(raw) {
    const text = String(raw ?? '').trim();
    if (!isMigrationUri(text)) {
        throw new Error('Đây không phải QR chuyển tài khoản của Google Authenticator.');
    }

    let url;
    try {
        url = new URL(text);
    } catch {
        throw new Error('Link migration trong QR không hợp lệ.');
    }

    const data = url.searchParams.get('data');
    if (!data) throw new Error('QR migration thiếu tham số data.');

    let payloadBytes;
    try {
        payloadBytes = base64UrlToBytes(data);
    } catch {
        throw new Error('Dữ liệu trong QR migration không giải mã được (base64 hỏng).');
    }

    const fields = decodeMessage(payloadBytes);
    const accounts = allBytes(fields, 1).map(parseOtpParameters);

    if (accounts.length === 0) {
        throw new Error('QR migration không chứa account nào.');
    }

    return {
        accounts,
        version: Number(firstVarint(fields, 2, 0n)),
        batch: {
            size: Number(firstVarint(fields, 3, 1n)) || 1,
            index: Number(firstVarint(fields, 4, 0n)),
            id: Number(firstVarint(fields, 5, 0n)),
        },
    };
}
