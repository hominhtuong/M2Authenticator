/**
 * Đặt nội dung khung 1280x800 từ tham số URL, rồi nhúng trang thật vào iframe.
 * Không có chữ nào viết cứng ở đây để một khung dùng lại được cho mọi ảnh.
 */

const params = new URLSearchParams(location.search);

const layout = params.get('layout') || 'popup';
document.body.dataset.layout = layout;

document.getElementById('title').textContent = params.get('title') || '';
document.getElementById('subtitle').textContent = params.get('subtitle') || '';

const bullets = params.getAll('bullet');
const list = document.getElementById('bullets');
for (const text of bullets) {
    const item = document.createElement('li');
    item.textContent = text;
    list.append(item);
}

const frame = document.getElementById('frame');

if (layout === 'full') {
    frame.width = 1280;
    frame.height = 800;
} else {
    frame.width = Number(params.get('w') || 380);
    frame.height = Number(params.get('h') || 560);
}

frame.src = params.get('src') || '/popup/popup.html';

// Báo cho bên chụp ảnh biết iframe đã vẽ xong.
frame.addEventListener('load', () => {
    document.body.dataset.ready = 'true';
});
