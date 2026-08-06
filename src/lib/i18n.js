/**
 * Đa ngôn ngữ chạy lúc chạy, người dùng tự chọn.
 *
 * Cố ý KHÔNG dùng chrome.i18n: API đó lấy ngôn ngữ theo cài đặt trình duyệt và không đổi được
 * trong lúc chạy, trong khi yêu cầu ở đây là có nút cờ để người dùng tự chuyển. `_locales/` vẫn
 * được giữ, nhưng chỉ cho tên và mô tả trong manifest, tức là phần hiển thị trên Chrome Web Store.
 *
 * Bảng dịch được import tĩnh nên nằm sẵn trong gói. Không tải gì từ mạng, đúng ràng buộc của dự án.
 */

import { en } from './locales/en.js';
import { vi } from './locales/vi.js';
import { isAppError } from './errors.js';
import { getSettings, saveSettings } from './vault.js';

const CATALOGS = { en, vi };

export const DEFAULT_LANGUAGE = 'en';

export const LANGUAGES = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'vi', label: 'Tiếng Việt', short: 'VI' },
];

let current = DEFAULT_LANGUAGE;
const listeners = new Set();

export function getLanguage() {
    return current;
}

export function isSupported(code) {
    return Object.hasOwn(CATALOGS, code);
}

/**
 * Tra câu dịch. Thiếu khoá ở ngôn ngữ đang chọn thì lùi về tiếng Anh, thiếu nốt thì trả về chính
 * khoá đó - hiện ra xấu nhưng nhìn là biết ngay thiếu gì, hơn là hiện chuỗi rỗng.
 */
export function t(key, params) {
    const text = CATALOGS[current]?.[key] ?? CATALOGS[DEFAULT_LANGUAGE][key] ?? key;
    if (!params) return text;

    return Object.entries(params).reduce(
        (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
        text,
    );
}

/** Dịch một AppError. Lỗi thường (bug, lỗi trình duyệt) thì trả nguyên message. */
export function describeError(error) {
    if (!error) return t('error.unknown');
    if (isAppError(error)) return t(error.code, error.params);
    return error.message || t('error.unknown');
}

// ------------------------------------------------------------------ áp dụng

/**
 * Dịch mọi phần tử có đánh dấu trong cây DOM.
 *
 *   data-i18n="khoá"              => textContent
 *   data-i18n-placeholder="khoá"  => thuộc tính placeholder
 *   data-i18n-title="khoá"        => thuộc tính title
 *   data-i18n-label="khoá"        => thuộc tính aria-label
 */
export function applyDom(root = document) {
    for (const node of root.querySelectorAll('[data-i18n]')) {
        node.textContent = t(node.dataset.i18n);
    }
    for (const node of root.querySelectorAll('[data-i18n-placeholder]')) {
        node.placeholder = t(node.dataset.i18nPlaceholder);
    }
    for (const node of root.querySelectorAll('[data-i18n-title]')) {
        node.title = t(node.dataset.i18nTitle);
    }
    for (const node of root.querySelectorAll('[data-i18n-label]')) {
        node.setAttribute('aria-label', t(node.dataset.i18nLabel));
    }

    document.documentElement.lang = current;
}

/** Đăng ký hàm chạy lại mỗi khi đổi ngôn ngữ, dùng cho phần UI dựng bằng JS. */
export function onLanguageChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

export async function setLanguage(code) {
    if (!isSupported(code) || code === current) return;

    current = code;
    await saveSettings({ language: code });

    applyDom();
    for (const callback of listeners) callback(code);
}

/** Đọc ngôn ngữ đã lưu rồi dịch trang. Gọi một lần ở đầu mỗi trang, trước khi render. */
export async function initI18n() {
    const settings = await getSettings();
    if (isSupported(settings.language)) current = settings.language;
    applyDom();
    return current;
}

// -------------------------------------------------------------- nút đổi cờ

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(width, height, children) {
    const node = document.createElementNS(SVG_NS, 'svg');
    node.setAttribute('viewBox', '0 0 60 30');
    node.setAttribute('width', String(width));
    node.setAttribute('height', String(height));
    node.setAttribute('aria-hidden', 'true');
    for (const child of children) node.append(child);
    return node;
}

function shape(tag, attributes) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
}

/**
 * Cờ vẽ bằng SVG chứ không dùng emoji: Windows không có font emoji cờ quốc gia nên
 * emoji cờ ở đó hiện ra thành hai chữ cái, trông như lỗi.
 */
function flagFor(code, size = 18) {
    const height = Math.round((size * 30) / 60);

    if (code === 'vi') {
        return svg(size, height, [
            shape('rect', { width: '60', height: '30', fill: '#DA251D' }),
            shape('path', {
                d: 'M30 8.4l2.2 6.8h7.2l-5.8 4.2 2.2 6.8L30 22l-5.8 4.2 2.2-6.8-5.8-4.2h7.2z',
                fill: '#FFFF00',
            }),
        ]);
    }

    // Union Jack rút gọn: đủ nhận ra ở kích thước 18px.
    return svg(size, height, [
        shape('rect', { width: '60', height: '30', fill: '#012169' }),
        shape('path', { d: 'M0,0 L60,30 M60,0 L0,30', stroke: '#FFFFFF', 'stroke-width': '6' }),
        shape('path', { d: 'M0,0 L60,30 M60,0 L0,30', stroke: '#C8102E', 'stroke-width': '3' }),
        shape('path', { d: 'M30,0 V30 M0,15 H60', stroke: '#FFFFFF', 'stroke-width': '10' }),
        shape('path', { d: 'M30,0 V30 M0,15 H60', stroke: '#C8102E', 'stroke-width': '6' }),
    ]);
}

/**
 * Nhóm nút cờ. `compact` bỏ phần chữ, dùng cho popup vốn chật chỗ.
 * @returns {HTMLElement}
 */
export function buildLanguageSwitcher({ compact = false } = {}) {
    const group = document.createElement('div');
    group.className = compact ? 'langswitch langswitch--compact' : 'langswitch';
    group.setAttribute('role', 'group');

    const buttons = new Map();

    for (const language of LANGUAGES) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'langswitch__btn';
        button.dataset.lang = language.code;
        button.append(flagFor(language.code, compact ? 16 : 18));

        if (!compact) {
            const label = document.createElement('span');
            label.textContent = language.label;
            button.append(label);
        }

        button.title = t('lang.switchTo', { language: language.label });
        button.setAttribute('aria-label', button.title);
        button.addEventListener('click', () => setLanguage(language.code));

        buttons.set(language.code, button);
        group.append(button);
    }

    const paint = () => {
        for (const [code, button] of buttons) {
            const active = code === current;
            button.dataset.active = String(active);
            button.setAttribute('aria-pressed', String(active));
        }
    };

    paint();
    onLanguageChange(paint);

    return group;
}

/** Danh sách khoá của một bảng dịch, dùng cho kiểm tra lúc build. */
export function catalogKeys(code) {
    return Object.keys(CATALOGS[code] ?? {});
}
