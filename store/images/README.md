# Ảnh chụp màn hình cho Chrome Web Store

Tất cả 1280x800 PNG, đúng kích thước Chrome Web Store yêu cầu. Tối thiểu store cần 1 ảnh, nên dùng 4-5 ảnh.

| File | Nội dung | Nên dùng |
| --- | --- | --- |
| `01-codes.png` | Danh sách mã với vòng đếm ngược | Bắt buộc, đặt làm ảnh đầu tiên |
| `02-locked.png` | Màn khoá kèm nút mở bằng vân tay | Nên có |
| `03-import.png` | Bảng xem lại 8 account đọc từ một QR Google Authenticator | Nên có, đây là điểm bán hàng mạnh nhất |
| `04-settings.png` | Trang cài đặt: ngôn ngữ, tự khoá, clipboard, vân tay | Nên có |
| `05-setup.png` | Tạo master password kèm thang độ mạnh và cảnh báo không khôi phục được | Tuỳ chọn |
| `06-languages.png` | Giao diện tiếng Việt, chứng minh có i18n | Tuỳ chọn |

## Dữ liệu trong ảnh

Toàn bộ là tài khoản bịa (`alex@example.com`, `root-billing`) với secret bịa. **Không có secret thật nào**
trong các ảnh này, và đừng bao giờ chụp lại bằng vault thật của bạn: ảnh sẽ nằm công khai trên store.

Mã OTP hiện trong ảnh là mã thật sinh từ secret bịa, nên chúng vô hại.

## Chụp lại

Giao diện trong ảnh là code thật, không phải bản dựng lại cho đẹp: một harness giả lập `chrome.*` rồi render
đúng HTML/CSS/JS của extension với dữ liệu mẫu. Mật mã vẫn chạy thật (PBKDF2 600.000 vòng, AES-256-GCM, TOTP).

```bash
npm run screenshots          # dựng harness vào dist/harness/
python3 -m http.server 4173 --directory dist/harness
```

Rồi mở lần lượt, chụp ở khung 1280x800:

| Ảnh | Đường dẫn |
| --- | --- |
| Gieo dữ liệu trước | `/seeder.html?biometric=1` |
| 01 | `/showcase.html?src=/popup/popup.html&h=520&title=...&bullet=...` |
| 02 | gieo lại với `&state=locked`, rồi mở showcase như trên với `h=380` |
| 03 | `/import/import.html`, dán `globalThis.__DEMO_MIGRATION_URI__` vào trang |
| 04 | `/options/options.html` |
| 05 | xoá localStorage, mở `/unlock/unlock.html?setup=1`, nhập mật khẩu |
| 06 | gieo lại với `&lang=vi`, mở `/options/options.html` |

Chi tiết tham số của khung `showcase.html` nằm trong `tools/screenshots/showcase.js`.

## Ảnh quảng bá (không bắt buộc)

Store còn nhận thêm hai loại, chưa làm:

- Small promo tile 440x280
- Marquee promo tile 1400x560

Logo gốc để dựng chúng nằm ở thư mục `brand/`.
