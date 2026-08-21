/**
 * "Có gì mới": danh sách gạch đầu dòng dựng từ lib/release-notes.js.
 *
 * Dùng ở hai chỗ: panel tự hiện trong popup sau khi cập nhật, và nút xem lại trong thẻ Phiên bản
 * của màn Cài đặt. Cùng một nguồn nội dung nên hai nơi không lệch.
 */

import { el } from '../lib/dom.js';
import { t } from '../lib/i18n.js';
import { notesSince } from '../lib/release-notes.js';
import { currentVersion } from '../lib/version.js';

/** @returns {HTMLElement|null} null khi không có ghi chú nào để hiện. */
export function buildNotesList(lastSeenVersion = '') {
    const entries = notesSince(lastSeenVersion, currentVersion());
    if (entries.length === 0) return null;

    return el(
        'div',
        { class: 'whatsnew__entries' },
        entries.map((entry) =>
            el('div', { class: 'whatsnew__entry' }, [
                entries.length > 1
                    ? el('div', { class: 'whatsnew__version', text: entry.version })
                    : null,
                el(
                    'ul',
                    { class: 'whatsnew__list' },
                    entry.keys.map((key) => el('li', { text: t(key) })),
                ),
            ]),
        ),
    );
}

/**
 * Panel đầy đủ có tiêu đề và nút đóng, dành cho popup.
 * @returns {HTMLElement|null}
 */
export function buildWhatsNewPanel({ lastSeenVersion = '', onDismiss }) {
    const list = buildNotesList(lastSeenVersion);
    if (!list) return null;

    const dismiss = el('button', {
        class: 'btn btn--primary btn--block',
        type: 'button',
        text: t('whatsnew.dismiss'),
    });
    dismiss.addEventListener('click', () => onDismiss?.());

    // Không lặp lại tiêu đề: thanh trên cùng của popup đã ghi "Có gì mới ở bản X".
    return el('div', { class: 'whatsnew' }, [
        el('p', { class: 'whatsnew__lead', text: t('whatsnew.lead') }),
        list,
        dismiss,
    ]);
}
