/**
 * Mở khoá bằng vân tay / Windows Hello qua WebAuthn, dùng extension PRF.
 *
 * PRF cho phép authenticator trả về một khối 32 byte bí mật, ổn định theo cặp (credential, salt).
 * Khối này không bao giờ rời khỏi thiết bị dưới dạng có thể tái tạo nếu thiếu sinh trắc, nên
 * dùng nó để bọc DEK là an toàn: kẻ có file vault mà không có ngón tay của user thì vô dụng.
 *
 * Lưu ý vận hành: hộp thoại sinh trắc của hệ điều hành làm popup của extension mất focus và bị
 * đóng, huỷ luôn ceremony. Vì vậy mọi lời gọi ở đây phải chạy trong trang cửa sổ riêng
 * (unlock/unlock.html hoặc options), tuyệt đối không gọi từ popup.
 */

import { fromBase64, randomBytes, toBase64 } from './crypto.js';

const RP_NAME = 'M2 Authenticator';
const USER_NAME = 'vault';

function rpId() {
    // Với origin chrome-extension://<id>, Chrome dùng chính extension id làm RP ID.
    return chrome.runtime.id;
}

export function isWebAuthnAvailable() {
    return typeof PublicKeyCredential !== 'undefined' && Boolean(navigator.credentials?.create);
}

export async function isPlatformAuthenticatorAvailable() {
    if (!isWebAuthnAvailable()) return false;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
}

function bufferToBase64(buffer) {
    return toBase64(new Uint8Array(buffer));
}

/**
 * Đăng ký một credential mới và lấy output PRF đầu tiên.
 * @returns {Promise<{credentialId: string, prfSalt: string, prfOutput: Uint8Array}>}
 */
export async function registerBiometric() {
    if (!(await isPlatformAuthenticatorAvailable())) {
        throw new Error('Thiết bị này không có cảm biến vân tay / Windows Hello khả dụng.');
    }

    const prfSalt = randomBytes(32);
    const userId = randomBytes(16);

    const credential = await navigator.credentials.create({
        publicKey: {
            rp: { id: rpId(), name: RP_NAME },
            user: { id: userId, name: USER_NAME, displayName: 'M2 Authenticator vault' },
            challenge: randomBytes(32),
            pubKeyCredParams: [
                { type: 'public-key', alg: -7 }, // ES256
                { type: 'public-key', alg: -257 }, // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                residentKey: 'preferred',
                userVerification: 'required',
            },
            attestation: 'none',
            timeout: 60_000,
            extensions: { prf: { eval: { first: prfSalt } } },
        },
    });

    if (!credential) throw new Error('Đăng ký vân tay bị huỷ.');

    const results = credential.getClientExtensionResults();
    if (!results?.prf?.enabled) {
        throw new Error(
            'Thiết bị hoặc trình duyệt này không hỗ trợ WebAuthn PRF, nên chưa thể mở khoá bằng vân tay. Hãy tiếp tục dùng master password.',
        );
    }

    const credentialId = bufferToBase64(credential.rawId);

    // Nhiều authenticator không trả kết quả PRF ngay lúc tạo, nên lấy qua một lần xác thực.
    const prfOutput =
        results.prf.results?.first != null
            ? new Uint8Array(results.prf.results.first)
            : await evaluatePrf(credentialId, toBase64(prfSalt));

    return { credentialId, prfSalt: toBase64(prfSalt), prfOutput };
}

/**
 * Xác thực bằng sinh trắc và lấy lại đúng output PRF đã dùng lúc đăng ký.
 * @returns {Promise<Uint8Array>}
 */
export async function evaluatePrf(credentialIdBase64, prfSaltBase64) {
    const assertion = await navigator.credentials.get({
        publicKey: {
            rpId: rpId(),
            challenge: randomBytes(32),
            allowCredentials: [
                { type: 'public-key', id: fromBase64(credentialIdBase64) },
            ],
            userVerification: 'required',
            timeout: 60_000,
            extensions: { prf: { eval: { first: fromBase64(prfSaltBase64) } } },
        },
    });

    if (!assertion) throw new Error('Xác thực vân tay bị huỷ.');

    const results = assertion.getClientExtensionResults();
    const first = results?.prf?.results?.first;
    if (!first) {
        throw new Error('Authenticator không trả về dữ liệu PRF. Hãy dùng master password.');
    }

    return new Uint8Array(first);
}

/** Chuyển lỗi WebAuthn thành câu tiếng Việt đọc được. */
export function describeWebAuthnError(error) {
    if (!error) return 'Lỗi không xác định.';
    switch (error.name) {
        case 'NotAllowedError':
            return 'Bạn đã huỷ hoặc hết thời gian xác thực sinh trắc.';
        case 'InvalidStateError':
            return 'Thiết bị này đã đăng ký rồi.';
        case 'NotSupportedError':
            return 'Trình duyệt hoặc thiết bị không hỗ trợ kiểu xác thực này.';
        case 'SecurityError':
            return 'Ngữ cảnh không an toàn để dùng WebAuthn.';
        default:
            return error.message || String(error);
    }
}
