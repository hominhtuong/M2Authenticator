/**
 * Base32 (RFC 4648) - dùng cho secret TOTP.
 * Không dùng thư viện ngoài: đây là code chạm trực tiếp vào seed 2FA.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const LOOKUP = new Map();
for (let i = 0; i < ALPHABET.length; i++) LOOKUP.set(ALPHABET[i], i);

/** Bỏ khoảng trắng, gạch nối, padding và chuẩn hoá hoa. */
export function normalizeBase32(input) {
    return String(input ?? '')
        .toUpperCase()
        .replace(/[\s-]/g, '')
        .replace(/=+$/, '');
}

export function base32Decode(input) {
    const clean = normalizeBase32(input);
    if (!clean) throw new Error('Secret rỗng.');

    let bits = 0;
    let value = 0;
    const out = [];

    for (const ch of clean) {
        const idx = LOOKUP.get(ch);
        if (idx === undefined) {
            throw new Error(`Secret Base32 không hợp lệ (ký tự "${ch}").`);
        }
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }

    if (out.length === 0) throw new Error('Secret Base32 quá ngắn.');
    return new Uint8Array(out);
}

export function base32Encode(bytes) {
    let bits = 0;
    let value = 0;
    let out = '';

    for (const b of bytes) {
        value = (value << 8) | b;
        bits += 8;
        while (bits >= 5) {
            out += ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
    return out;
}

export function isValidBase32(input) {
    try {
        base32Decode(input);
        return true;
    } catch {
        return false;
    }
}
