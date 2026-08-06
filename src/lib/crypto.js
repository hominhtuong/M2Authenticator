/**
 * Nền tảng mật mã của vault. Mọi thứ chạy trên Web Crypto, không có thư viện ngoài.
 *
 * Sơ đồ khoá:
 *   master password --PBKDF2-SHA256(600k)--> KEK --AES-GCM wrap--> DEK --AES-GCM--> vault
 *   WebAuthn PRF    --HKDF-SHA256---------> BEK --AES-GCM wrap--> DEK (bản bọc song song)
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Số vòng PBKDF2. Cao hơn khuyến nghị OWASP 2023 (600k) cho SHA-256. */
export const KDF_ITERATIONS = 600_000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
export const DEK_BYTES = 32;

export function randomBytes(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
}

export function toBase64(bytes) {
    let binary = '';
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
    return btoa(binary);
}

export function fromBase64(text) {
    const binary = atob(String(text ?? ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

export function utf8(text) {
    return encoder.encode(text);
}

export function fromUtf8(bytes) {
    return decoder.decode(bytes);
}

/**
 * Chuỗi phân tách miền của định dạng lưu trữ.
 *
 * ĐỪNG ĐỔI GIÁ TRỊ NÀY sau khi đã phát hành. Nó đi vào AAD của AES-GCM và `info` của HKDF, nên đổi một
 * ký tự là mọi vault đã tồn tại không giải mã được nữa và user mất sạch tài khoản. Đây là hằng số wire
 * format, không phải tên hiển thị: nếu sản phẩm đổi tên thì chuỗi này vẫn đứng yên.
 *
 * Nếu bắt buộc phải đổi thì phải tăng SCHEMA_VERSION và viết đường giải mã thử cả chuỗi cũ lẫn chuỗi mới.
 */
const DOMAIN = 'm2-authenticator';

/**
 * AAD gắn ciphertext với đúng schema và đúng mục đích, chặn kiểu tấn công
 * bê bản bọc DEK của vault này dán sang chỗ khác.
 */
export function aadFor(purpose, schemaVersion) {
    return utf8(`${DOMAIN}|v${schemaVersion}|${purpose}`);
}

export async function aesGcmEncrypt(key, plaintextBytes, aad) {
    const iv = randomBytes(IV_BYTES);
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 },
        key,
        plaintextBytes,
    );
    return { iv: toBase64(iv), ct: toBase64(new Uint8Array(ciphertext)) };
}

export async function aesGcmDecrypt(key, envelope, aad) {
    const iv = fromBase64(envelope.iv);
    const ciphertext = fromBase64(envelope.ct);
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 },
        key,
        ciphertext,
    );
    return new Uint8Array(plaintext);
}

/** Dẫn xuất KEK từ master password. Password được NFKC hoá để gõ dấu kiểu nào cũng ra một khoá. */
export async function deriveKeyFromPassword(password, saltBytes, iterations = KDF_ITERATIONS) {
    const material = await crypto.subtle.importKey(
        'raw',
        utf8(String(password).normalize('NFKC')),
        'PBKDF2',
        false,
        ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

/** Dẫn xuất khoá bọc từ output PRF của WebAuthn (32 byte entropy sẵn nên dùng HKDF, không cần PBKDF2). */
export async function deriveKeyFromPrf(prfOutputBytes, saltBytes) {
    const material = await crypto.subtle.importKey('raw', prfOutputBytes, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: saltBytes,
            info: utf8(`${DOMAIN}|biometric-kek`),
        },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

/** DEK ở dạng raw bytes, để bọc lại được và cất vào session storage. */
export function generateDekBytes() {
    return randomBytes(DEK_BYTES);
}

export async function importDek(dekBytes) {
    return crypto.subtle.importKey('raw', dekBytes, { name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
    ]);
}

/** Ghi đè bộ đệm chứa khoá. JS không đảm bảo xoá sạch mọi bản sao, nhưng vẫn thu hẹp cửa sổ lộ. */
export function wipe(bytes) {
    if (bytes instanceof Uint8Array) crypto.getRandomValues(bytes);
}

/** Mật khẩu rác phổ biến nhất, chặn thẳng dù có thoả luật độ dài. */
const BLOCKLIST = [
    'password', 'matkhau', '123456', '12345678', '123456789', '1234567890',
    'qwerty', 'qwertyuiop', 'iloveyou', 'admin', 'letmein', 'welcome',
    'authenticator', 'm2authenticator', 'abc123', 'password123', 'matkhau123',
];

const MIN_LENGTH = 10;
/** Từ mốc này trở lên coi là passphrase: đủ entropy nhờ độ dài, không ép luật thành phần. */
const PASSPHRASE_LENGTH = 16;

/**
 * Ước lượng độ mạnh mật khẩu.
 *
 * Theo NIST SP 800-63B: ưu tiên độ dài, không ép luật thành phần ký tự (luật đó đẩy user tới
 * "Matkhau1!" chứ không làm mật khẩu mạnh hơn). Chỉ mật khẩu ngắn mới phải bù bằng đa dạng ký tự.
 * Cố ý bi quan: đây là hàng rào chặn mật khẩu rác, không phải để cho user cảm giác an toàn giả.
 */
export function assessPassword(password) {
    const value = String(password ?? '');
    const lower = value.toLowerCase();

    /** @type {Array<{code: string, params?: Record<string, number>}>} */
    const issues = [];

    const classes =
        (/[a-z]/.test(value) ? 1 : 0) +
        (/[A-Z]/.test(value) ? 1 : 0) +
        (/[0-9]/.test(value) ? 1 : 0) +
        (/[^a-zA-Z0-9]/.test(value) ? 1 : 0);

    const uniqueChars = new Set(value).size;

    if (value.length < MIN_LENGTH) {
        issues.push({ code: 'password.tooShort', params: { min: MIN_LENGTH } });
    } else if (value.length < PASSPHRASE_LENGTH && classes < 3) {
        issues.push({ code: 'password.needMix', params: { length: PASSPHRASE_LENGTH } });
    }

    if (uniqueChars < 5) issues.push({ code: 'password.tooFewUnique' });
    if (/^(.+?)\1+$/.test(value)) issues.push({ code: 'password.repeated' });
    if (BLOCKLIST.some((entry) => lower === entry || lower.startsWith(entry))) {
        issues.push({ code: 'password.blocklisted' });
    }

    // Điểm chủ yếu đi theo độ dài, đa dạng ký tự chỉ cộng thêm.
    let score = 0;
    if (value.length >= MIN_LENGTH) score += 1;
    if (value.length >= 14) score += 1;
    if (value.length >= 20) score += 1;
    if (value.length >= 28) score += 1;
    if (classes >= 3) score += 1;
    if (issues.length > 0) score = Math.min(score, 1);

    const level = Math.min(score, 5);

    return {
        ok: issues.length === 0,
        issues,
        score: level,
        // Khoá tra bảng dịch, không phải câu chữ: tầng lib không biết người dùng xem ngôn ngữ nào.
        labelKey: `password.strength.${level}`,
    };
}
