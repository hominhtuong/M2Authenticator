/**
 * Helper dựng DOM. Cố ý không có hàm nào nhận HTML string:
 * mọi nội dung do user nhập (tên account, issuer) đều đi qua textContent.
 */

export function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);

    for (const [key, value] of Object.entries(props)) {
        if (value == null || value === false) continue;

        if (key === 'class') {
            node.className = value;
        } else if (key === 'text') {
            node.textContent = String(value);
        } else if (key === 'dataset') {
            Object.assign(node.dataset, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key in node && key !== 'list') {
            node[key] = value;
        } else {
            node.setAttribute(key, value === true ? '' : String(value));
        }
    }

    for (const child of [].concat(children)) {
        if (child == null || child === false) continue;
        node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }

    return node;
}

export function clear(node) {
    node.replaceChildren();
}

export function $(selector, root = document) {
    return root.querySelector(selector);
}

export function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}

export function show(node, visible = true) {
    node.hidden = !visible;
}

/** Thông báo nổi, tự biến mất. Không dùng alert() để không chặn popup. */
export function toast(message, variant = 'info', timeoutMs = 3200) {
    let host = $('#toastHost');
    if (!host) {
        host = el('div', { id: 'toastHost', class: 'toast-host' });
        document.body.append(host);
    }

    const node = el('div', { class: `toast toast--${variant}`, role: 'status', text: message });
    host.append(node);

    setTimeout(() => {
        node.classList.add('toast--out');
        setTimeout(() => node.remove(), 250);
    }, timeoutMs);
}

/**
 * Hộp xác nhận thay cho confirm(), vì confirm() làm popup đóng trên một số nền tảng.
 * Nhãn nút do chỗ gọi truyền vào đã dịch sẵn: module này không đụng tới i18n.
 */
export function confirmDialog({ title, message, confirmLabel, cancelLabel, danger = false }) {
    return new Promise((resolve) => {
        const dialog = el('dialog', { class: 'confirm' }, [
            el('h2', { class: 'confirm__title', text: title }),
            el('p', { class: 'confirm__message', text: message }),
            el('div', { class: 'confirm__actions' }, [
                el('button', {
                    class: 'btn btn--ghost',
                    type: 'button',
                    text: cancelLabel,
                    onClick: () => {
                        dialog.close();
                        resolve(false);
                    },
                }),
                el('button', {
                    class: danger ? 'btn btn--danger' : 'btn btn--primary',
                    type: 'button',
                    text: confirmLabel,
                    onClick: () => {
                        dialog.close();
                        resolve(true);
                    },
                }),
            ]),
        ]);

        dialog.addEventListener('cancel', () => resolve(false));
        dialog.addEventListener('close', () => dialog.remove());
        document.body.append(dialog);
        dialog.showModal();
    });
}
