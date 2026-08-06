/**
 * Lỗi mang mã thay vì mang câu chữ.
 *
 * Tầng lib không được biết người dùng đang xem ngôn ngữ nào. Nó ném ra mã lỗi ổn định,
 * tầng UI mới tra bảng dịch. Nhờ vậy test khẳng định trên mã (không đổi) thay vì trên
 * câu tiếng Việt (đổi bất cứ lúc nào).
 */

export class AppError extends Error {
    /**
     * @param {string} code khoá tra trong bảng dịch, ví dụ 'error.base32Invalid'
     * @param {Record<string, string|number>} params giá trị chèn vào chỗ {tên} trong câu dịch
     */
    constructor(code, params = {}) {
        super(code);
        this.name = 'AppError';
        this.code = code;
        this.params = params;
    }
}

/** Ném AppError. Viết `fail(...)` gọn hơn `throw new AppError(...)` ở chỗ dùng nhiều. */
export function fail(code, params) {
    throw new AppError(code, params);
}

export function isAppError(error) {
    return error instanceof AppError;
}
