/**
 * Giả lập tối thiểu API chrome.* để chụp màn hình cho listing store.
 *
 * CHỈ dùng cho việc chụp ảnh, không bao giờ được đóng gói vào extension: thư mục tools/
 * nằm ngoài src/ nên scripts/build.mjs không đụng tới.
 *
 * Mục đích là render đúng giao diện thật với dữ liệu mẫu. Toàn bộ mật mã vẫn chạy thật
 * (PBKDF2, AES-GCM, TOTP), chỉ có tầng lưu trữ và message là giả.
 *
 * Dữ liệu được ánh xạ xuống localStorage và nạp lại ĐỒNG BỘ lúc script này chạy. Nhờ vậy
 * trang seeder gieo dữ liệu một lần, mọi trang sau đó mở lên là đã có sẵn, không phụ thuộc
 * vào thứ tự chạy giữa các module.
 */

(() => {
    function createArea(persistKey) {
        let data;
        try {
            data = new Map(Object.entries(JSON.parse(localStorage.getItem(persistKey) ?? '{}')));
        } catch {
            data = new Map();
        }

        const listeners = new Set();
        const persist = () => {
            localStorage.setItem(persistKey, JSON.stringify(Object.fromEntries(data)));
        };

        const normalize = (keys) => {
            if (keys == null) return [...data.keys()];
            if (typeof keys === 'string') return [keys];
            if (Array.isArray(keys)) return keys;
            return Object.keys(keys);
        };

        const notify = (changes) => {
            for (const listener of listeners) listener(changes);
        };

        return {
            async get(keys) {
                const result = {};
                for (const key of normalize(keys)) {
                    if (data.has(key)) result[key] = structuredClone(data.get(key));
                }
                return result;
            },
            async set(items) {
                const changes = {};
                for (const [key, value] of Object.entries(items)) {
                    changes[key] = { oldValue: data.get(key), newValue: value };
                    data.set(key, structuredClone(value));
                }
                persist();
                notify(changes);
            },
            async remove(keys) {
                const changes = {};
                for (const key of normalize(keys)) {
                    changes[key] = { oldValue: data.get(key), newValue: undefined };
                    data.delete(key);
                }
                persist();
                notify(changes);
            },
            async clear() {
                data.clear();
                persist();
            },
            onChanged: {
                addListener: (fn) => listeners.add(fn),
                removeListener: (fn) => listeners.delete(fn),
            },
        };
    }

    globalThis.chrome = {
        storage: {
            local: createArea('__m2_mock_local__'),
            session: createArea('__m2_mock_session__'),
        },

        runtime: {
            id: 'screenshotharnessscreenshotharnessxy',
            getURL: (path) => `/${String(path).replace(/^\/+/, '')}`,
            sendMessage: async () => ({ ok: true }),
            getContexts: async () => [],
            onMessage: { addListener: () => {} },
            onInstalled: { addListener: () => {} },
            onStartup: { addListener: () => {} },
        },

        alarms: {
            async create() {},
            async clear() {},
            onAlarm: { addListener: () => {} },
        },

        tabs: { async create() {} },
        windows: { async create() {}, async getCurrent() { return { left: 0, top: 0, width: 1440, height: 900 }; } },
        offscreen: { async createDocument() {}, async closeDocument() {} },
    };

    /** Trang seeder gọi để dọn sạch trước khi gieo lại. */
    globalThis.__resetMockStorage__ = () => {
        localStorage.removeItem('__m2_mock_local__');
        localStorage.removeItem('__m2_mock_session__');
    };
})();
