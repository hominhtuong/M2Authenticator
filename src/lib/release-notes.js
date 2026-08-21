/**
 * Nội dung "Có gì mới", tách khỏi UI để test được và để thêm bản mới chỉ phải sửa một chỗ.
 *
 * Mỗi mục chỉ giữ khoá dịch, câu chữ nằm ở lib/locales. Thêm bản mới thì thêm một mục ở
 * ĐẦU mảng, kèm khoá tương ứng ở cả en.js lẫn vi.js.
 */

export const RELEASE_NOTES = [
    {
        version: '1.2.0',
        keys: [
            'whatsnew.1_2_0.settings',
            'whatsnew.1_2_0.optionalPassword',
            'whatsnew.1_2_0.unlock',
            'whatsnew.1_2_0.backoff',
            'whatsnew.1_2_0.version',
        ],
    },
];

/**
 * So sánh hai chuỗi version kiểu 1.2.0.
 * @returns {number} âm nếu a < b, 0 nếu bằng, dương nếu a > b
 */
export function compareVersions(a, b) {
    const parse = (value) =>
        String(value ?? '')
            .split('.')
            .map((part) => Number.parseInt(part, 10) || 0);

    const left = parse(a);
    const right = parse(b);
    const length = Math.max(left.length, right.length);

    for (let i = 0; i < length; i++) {
        const diff = (left[i] ?? 0) - (right[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

/**
 * Các bản phát hành user chưa xem, mới nhất trước.
 *
 * Chưa biết đã xem tới đâu (`lastSeenVersion` rỗng) thì chỉ trả về đúng bản đang chạy: user
 * vừa nâng cấp cần biết bản này có gì, không cần đọc lại lịch sử từ đời nào.
 */
export function notesSince(lastSeenVersion, currentVersion) {
    const upToCurrent = RELEASE_NOTES.filter(
        (entry) => compareVersions(entry.version, currentVersion) <= 0,
    );

    if (!lastSeenVersion) {
        const [latest] = upToCurrent;
        return latest ? [latest] : [];
    }

    return upToCurrent.filter((entry) => compareVersions(entry.version, lastSeenVersion) > 0);
}
