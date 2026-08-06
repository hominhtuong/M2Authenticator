/**
 * Vault mã hoá: nơi duy nhất được phép đọc/ghi secret.
 *
 * Không module nào khác được đụng thẳng vào LOCAL_KEYS.VAULT.
 * Đọc phần "Kiến trúc khoá" trong CLAUDE.md trước khi sửa file này.
 */

import {
    KDF_ITERATIONS,
    SALT_BYTES,
    aadFor,
    aesGcmDecrypt,
    aesGcmEncrypt,
    assessPassword,
    deriveKeyFromPassword,
    deriveKeyFromPrf,
    fromBase64,
    fromUtf8,
    generateDekBytes,
    importDek,
    randomBytes,
    toBase64,
    utf8,
    wipe,
} from './crypto.js';
import {
    ALARMS,
    LOCAL_KEYS,
    SESSION_KEYS,
    localGet,
    localRemove,
    localSet,
    sessionGet,
    sessionRemove,
    sessionSet,
} from './storage.js';
import { normalizeBase32, isValidBase32 } from './base32.js';
import { AppError, fail } from './errors.js';
import { normalizeAlgorithm, DEFAULT_ALGORITHM, DEFAULT_DIGITS, DEFAULT_PERIOD } from './totp.js';
import { dedupeKey } from './otpauth.js';

export const SCHEMA_VERSION = 2;

export const VaultState = {
    UNINITIALIZED: 'uninitialized',
    LOCKED: 'locked',
    UNLOCKED: 'unlocked',
};

export const DEFAULT_SETTINGS = {
    language: 'en',
    autoLockMinutes: 5,
    clipboardClearSeconds: 20,
    hideCodes: false,
    sortMode: 'manual',
};

/** Chống dò mật khẩu: chờ tăng dần, chặn cứng từ lần thứ 5. */
const BACKOFF_STEPS_MS = [0, 0, 1_000, 3_000, 10_000, 30_000, 60_000, 300_000];

/** Vault khoá giữa chừng là chuyện bình thường, UI cần phân biệt nó với lỗi thật. */
export class VaultLockedError extends AppError {
    constructor(code = 'error.vaultLocked') {
        super(code);
        this.name = 'VaultLockedError';
    }
}

// ---------------------------------------------------------------- trạng thái

async function readVaultRecord() {
    const stored = await localGet(LOCAL_KEYS.VAULT);
    return stored[LOCAL_KEYS.VAULT] ?? null;
}

async function writeVaultRecord(record) {
    record.updatedAt = Date.now();
    await localSet({ [LOCAL_KEYS.VAULT]: record });
}

export async function getState() {
    const record = await readVaultRecord();
    if (!record) return VaultState.UNINITIALIZED;
    const dek = await readSessionDek();
    return dek ? VaultState.UNLOCKED : VaultState.LOCKED;
}

export async function isInitialized() {
    return (await readVaultRecord()) !== null;
}

export async function hasBiometric() {
    const record = await readVaultRecord();
    return Boolean(record?.biometric);
}

/**
 * Thông tin công khai cần để chạy ceremony WebAuthn. Không chứa khoá,
 * nhưng vẫn đi qua đây để không trang nào phải đọc thẳng bản ghi vault.
 */
export async function getBiometricDescriptor() {
    const record = await readVaultRecord();
    if (!record?.biometric) return null;
    return {
        credentialId: record.biometric.credentialId,
        prfSalt: record.biometric.prfSalt,
    };
}

// ------------------------------------------------------------- khoá phiên

async function readSessionDek() {
    const stored = await sessionGet([SESSION_KEYS.DEK, SESSION_KEYS.LOCK_AT]);
    const raw = stored[SESSION_KEYS.DEK];
    if (!raw) return null;

    const lockAt = stored[SESSION_KEYS.LOCK_AT];
    if (lockAt && Date.now() > lockAt) {
        await lock();
        return null;
    }
    return fromBase64(raw);
}

async function storeSessionDek(dekBytes) {
    const settings = await getSettings();
    await sessionSet({
        [SESSION_KEYS.DEK]: toBase64(dekBytes),
        [SESSION_KEYS.LOCK_AT]: computeLockAt(settings.autoLockMinutes),
    });
    await scheduleAutoLock(settings.autoLockMinutes);
}

function computeLockAt(autoLockMinutes) {
    const minutes = Number(autoLockMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return null; // 0 = chỉ khoá khi đóng Chrome
    return Date.now() + minutes * 60_000;
}

async function scheduleAutoLock(autoLockMinutes) {
    if (!globalThis.chrome?.alarms) return;
    const minutes = Number(autoLockMinutes);
    await chrome.alarms.clear(ALARMS.AUTO_LOCK);
    if (Number.isFinite(minutes) && minutes > 0) {
        chrome.alarms.create(ALARMS.AUTO_LOCK, { delayInMinutes: minutes });
    }
}

/** Gia hạn hạn khoá khi user còn đang thao tác. */
export async function touchActivity() {
    const stored = await sessionGet([SESSION_KEYS.DEK]);
    if (!stored[SESSION_KEYS.DEK]) return;
    const settings = await getSettings();
    await sessionSet({ [SESSION_KEYS.LOCK_AT]: computeLockAt(settings.autoLockMinutes) });
    await scheduleAutoLock(settings.autoLockMinutes);
}

export async function lock() {
    await sessionRemove([SESSION_KEYS.DEK, SESSION_KEYS.LOCK_AT]);
    if (globalThis.chrome?.alarms) await chrome.alarms.clear(ALARMS.AUTO_LOCK);
}

async function requireDek() {
    const dekBytes = await readSessionDek();
    if (!dekBytes) throw new VaultLockedError();
    return importDek(dekBytes);
}

// ------------------------------------------------------- chống dò mật khẩu

async function readSecurity() {
    const stored = await localGet(LOCAL_KEYS.SECURITY);
    return stored[LOCAL_KEYS.SECURITY] ?? { failedAttempts: 0, lockoutUntil: 0 };
}

export async function getLockoutStatus() {
    const security = await readSecurity();
    const remainingMs = Math.max(0, (security.lockoutUntil ?? 0) - Date.now());
    return {
        failedAttempts: security.failedAttempts ?? 0,
        lockedOut: remainingMs > 0,
        remainingMs,
    };
}

async function recordFailure() {
    const security = await readSecurity();
    const failedAttempts = (security.failedAttempts ?? 0) + 1;
    const delay = BACKOFF_STEPS_MS[Math.min(failedAttempts, BACKOFF_STEPS_MS.length - 1)];
    await localSet({
        [LOCAL_KEYS.SECURITY]: { failedAttempts, lockoutUntil: Date.now() + delay },
    });
    return { failedAttempts, delay };
}

async function clearFailures() {
    await localSet({ [LOCAL_KEYS.SECURITY]: { failedAttempts: 0, lockoutUntil: 0 } });
}

async function assertNotLockedOut() {
    const status = await getLockoutStatus();
    if (status.lockedOut) {
        const seconds = Math.ceil(status.remainingMs / 1000);
        fail('error.tooManyAttempts', { seconds });
    }
}

// ------------------------------------------------------------ khởi tạo

export async function initialize(password) {
    if (await isInitialized()) fail('error.vaultAlreadyExists');

    const strength = assessPassword(password);
    if (!strength.ok) fail(strength.issues[0].code, strength.issues[0].params);

    const salt = randomBytes(SALT_BYTES);
    const kek = await deriveKeyFromPassword(password, salt, KDF_ITERATIONS);

    const dekBytes = generateDekBytes();
    const passwordWrap = await aesGcmEncrypt(kek, dekBytes, aadFor('dek-wrap', SCHEMA_VERSION));

    const dek = await importDek(dekBytes);
    const data = await aesGcmEncrypt(
        dek,
        utf8(JSON.stringify({ accounts: [] })),
        aadFor('vault-data', SCHEMA_VERSION),
    );

    await writeVaultRecord({
        schema: SCHEMA_VERSION,
        kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: KDF_ITERATIONS, salt: toBase64(salt) },
        passwordWrap,
        biometric: null,
        data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });

    await clearFailures();
    await storeSessionDek(dekBytes);
    wipe(dekBytes);
}

// -------------------------------------------------------------- mở khoá

export async function unlockWithPassword(password) {
    await assertNotLockedOut();

    const record = await readVaultRecord();
    if (!record) fail('error.vaultNoAccounts');

    const salt = fromBase64(record.kdf.salt);
    const kek = await deriveKeyFromPassword(password, salt, record.kdf.iterations);

    let dekBytes;
    try {
        dekBytes = await aesGcmDecrypt(kek, record.passwordWrap, aadFor('dek-wrap', record.schema));
    } catch {
        const { failedAttempts } = await recordFailure();
        fail('error.wrongPassword', { attempts: failedAttempts });
    }

    await clearFailures();
    await storeSessionDek(dekBytes);
    wipe(dekBytes);
}

/**
 * Mở khoá bằng vân tay. prfOutput lấy từ webauthn.js, module này không gọi WebAuthn
 * để phần mật mã vẫn test được ngoài trình duyệt.
 */
export async function unlockWithPrf(prfOutputBytes) {
    await assertNotLockedOut();

    const record = await readVaultRecord();
    if (!record?.biometric) fail('error.biometricNotEnrolled');

    const hkdfSalt = fromBase64(record.biometric.hkdfSalt);
    const bek = await deriveKeyFromPrf(prfOutputBytes, hkdfSalt);

    let dekBytes;
    try {
        dekBytes = await aesGcmDecrypt(bek, record.biometric.wrap, aadFor('dek-wrap-bio', record.schema));
    } catch {
        await recordFailure();
        fail('error.biometricUnlockFailed');
    }

    await clearFailures();
    await storeSessionDek(dekBytes);
    wipe(dekBytes);
}

// ------------------------------------------------- quản lý cách mở khoá

export async function changePassword(currentPassword, newPassword) {
    const record = await readVaultRecord();
    if (!record) fail('error.vaultNotInitialized');

    const strength = assessPassword(newPassword);
    if (!strength.ok) fail(strength.issues[0].code, strength.issues[0].params);

    const oldKek = await deriveKeyFromPassword(currentPassword, fromBase64(record.kdf.salt), record.kdf.iterations);

    let dekBytes;
    try {
        dekBytes = await aesGcmDecrypt(oldKek, record.passwordWrap, aadFor('dek-wrap', record.schema));
    } catch {
        await recordFailure();
        fail('error.wrongCurrentPassword');
    }

    // Salt mới cho mật khẩu mới. Vault data giữ nguyên vì DEK không đổi.
    const salt = randomBytes(SALT_BYTES);
    const newKek = await deriveKeyFromPassword(newPassword, salt, KDF_ITERATIONS);

    record.kdf = { name: 'PBKDF2', hash: 'SHA-256', iterations: KDF_ITERATIONS, salt: toBase64(salt) };
    record.passwordWrap = await aesGcmEncrypt(newKek, dekBytes, aadFor('dek-wrap', SCHEMA_VERSION));

    await writeVaultRecord(record);
    await clearFailures();
    wipe(dekBytes);
}

/**
 * Gắn một bản bọc DEK thứ hai bằng khoá dẫn xuất từ PRF. Yêu cầu vault đang mở khoá
 * để lấy được DEK mà không cần hỏi lại mật khẩu.
 */
export async function enrollBiometric({ credentialId, prfSalt, prfOutputBytes }) {
    const record = await readVaultRecord();
    if (!record) fail('error.vaultNotInitialized');

    const dekBytes = await readSessionDek();
    if (!dekBytes) throw new VaultLockedError('error.vaultNeedUnlockForBiometric');

    const hkdfSalt = randomBytes(SALT_BYTES);
    const bek = await deriveKeyFromPrf(prfOutputBytes, hkdfSalt);
    const wrap = await aesGcmEncrypt(bek, dekBytes, aadFor('dek-wrap-bio', SCHEMA_VERSION));

    record.biometric = {
        credentialId,
        prfSalt,
        hkdfSalt: toBase64(hkdfSalt),
        wrap,
        enrolledAt: Date.now(),
    };

    await writeVaultRecord(record);
    wipe(dekBytes);
}

export async function removeBiometric() {
    const record = await readVaultRecord();
    if (!record) return;
    record.biometric = null;
    await writeVaultRecord(record);
}

/** Xoá sạch mọi thứ. Không thể phục hồi. */
export async function destroyVault() {
    await lock();
    await localRemove([LOCAL_KEYS.VAULT, LOCAL_KEYS.SECURITY]);
}

// ------------------------------------------------------- đọc/ghi account

async function readPayload() {
    const record = await readVaultRecord();
    if (!record) fail('error.vaultNotInitialized');

    const dek = await requireDek();
    const plaintext = await aesGcmDecrypt(dek, record.data, aadFor('vault-data', record.schema));
    const payload = JSON.parse(fromUtf8(plaintext));
    return { record, payload };
}

async function writePayload(record, payload) {
    const dek = await requireDek();
    record.data = await aesGcmEncrypt(
        dek,
        utf8(JSON.stringify(payload)),
        aadFor('vault-data', SCHEMA_VERSION),
    );
    await writeVaultRecord(record);
}

export async function listAccounts() {
    const { payload } = await readPayload();
    const accounts = Array.isArray(payload.accounts) ? payload.accounts : [];
    return accounts.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function sanitizeAccount(input) {
    const type = input.type === 'hotp' ? 'hotp' : 'totp';
    const secret = normalizeBase32(input.secret);

    if (!isValidBase32(secret)) fail('error.otpSecretNotBase32');

    const digits = Number(input.digits) || DEFAULT_DIGITS;
    if (digits < 6 || digits > 10) fail('error.digitsRange');

    const period = Number(input.period) || DEFAULT_PERIOD;
    if (period <= 0 || period > 300) fail('error.periodRange');

    return {
        type,
        issuer: String(input.issuer ?? '').trim().slice(0, 120),
        account: String(input.account ?? '').trim().slice(0, 200),
        secret,
        digits,
        period,
        algorithm: normalizeAlgorithm(input.algorithm ?? DEFAULT_ALGORITHM),
        counter: type === 'hotp' ? Number(input.counter) || 0 : 0,
    };
}

/**
 * Thêm nhiều account trong một lượt ghi. Trả về thống kê để màn import báo cáo lại.
 * Bỏ qua bản trùng hệt (cùng type + issuer + account + secret).
 */
export async function addAccounts(inputs) {
    const { record, payload } = await readPayload();
    const accounts = Array.isArray(payload.accounts) ? payload.accounts : [];

    const existing = new Set(accounts.map(dedupeKey));
    let order = accounts.reduce((max, item) => Math.max(max, item.order ?? 0), 0);

    const added = [];
    const skipped = [];
    const failed = [];

    for (const input of inputs) {
        let clean;
        try {
            clean = sanitizeAccount(input);
        } catch (error) {
            failed.push({ input, code: error.code ?? 'error.unknown', params: error.params ?? {} });
            continue;
        }

        const key = dedupeKey(clean);
        if (existing.has(key)) {
            skipped.push(clean);
            continue;
        }

        existing.add(key);
        order += 1;
        const item = {
            id: crypto.randomUUID(),
            ...clean,
            order,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        accounts.push(item);
        added.push(item);
    }

    if (added.length > 0) {
        payload.accounts = accounts;
        await writePayload(record, payload);
    }

    return { added: added.length, skipped: skipped.length, failed };
}

export async function addAccount(input) {
    const result = await addAccounts([input]);
    if (result.failed.length > 0) {
        const [first] = result.failed;
        fail(first.code, first.params);
    }
    if (result.added === 0) fail('error.accountDuplicate');
    return result;
}

export async function updateAccount(id, changes) {
    const { record, payload } = await readPayload();
    const accounts = payload.accounts ?? [];
    const index = accounts.findIndex((item) => item.id === id);
    if (index < 0) fail('error.accountNotFound');

    const merged = sanitizeAccount({ ...accounts[index], ...changes });
    accounts[index] = { ...accounts[index], ...merged, updatedAt: Date.now() };

    payload.accounts = accounts;
    await writePayload(record, payload);
    return accounts[index];
}

export async function deleteAccount(id) {
    const { record, payload } = await readPayload();
    payload.accounts = (payload.accounts ?? []).filter((item) => item.id !== id);
    await writePayload(record, payload);
}

/** Ghi lại thứ tự theo mảng id truyền vào. */
export async function reorderAccounts(orderedIds) {
    const { record, payload } = await readPayload();
    const accounts = payload.accounts ?? [];
    const position = new Map(orderedIds.map((id, index) => [id, index + 1]));

    for (const item of accounts) {
        if (position.has(item.id)) item.order = position.get(item.id);
    }

    payload.accounts = accounts;
    await writePayload(record, payload);
}

/** Tăng counter của HOTP sau khi user dùng mã. */
export async function incrementHotpCounter(id) {
    const { record, payload } = await readPayload();
    const accounts = payload.accounts ?? [];
    const item = accounts.find((entry) => entry.id === id);
    if (!item || item.type !== 'hotp') fail('error.notHotp');

    item.counter = (item.counter ?? 0) + 1;
    item.updatedAt = Date.now();

    payload.accounts = accounts;
    await writePayload(record, payload);
    return item.counter;
}

// ------------------------------------------------------------- cài đặt

export async function getSettings() {
    const stored = await localGet(LOCAL_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(stored[LOCAL_KEYS.SETTINGS] ?? {}) };
}

export async function saveSettings(changes) {
    const next = { ...(await getSettings()), ...changes };
    await localSet({ [LOCAL_KEYS.SETTINGS]: next });
    await touchActivity();
    return next;
}
