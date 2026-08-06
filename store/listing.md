# Nội dung listing Chrome Web Store

Copy từng phần vào Developer Dashboard khi nộp bản mới.

## Tên

```
M2 Authenticator
```

## Mô tả ngắn (tối đa 132 ký tự)

```
Mã 2FA offline với vault mã hoá AES-256. Mở khoá bằng vân tay, nhập cả danh sách từ QR Google Authenticator.
```

## Mô tả đầy đủ

```
M2 Authenticator sinh mã xác thực hai lớp (TOTP và HOTP) ngay trong Chrome, không cần lấy điện thoại ra.

BẢO MẬT LÀ MẶC ĐỊNH, KHÔNG PHẢI TUỲ CHỌN

Mọi mã 2FA được mã hoá AES-256-GCM bằng khoá dẫn xuất từ master password của bạn qua PBKDF2-HMAC-SHA256
600.000 vòng. Khi vault khoá, dữ liệu trên máy chỉ là chuỗi vô nghĩa. Master password không được lưu ở
bất cứ đâu, kể cả dạng băm.

MỞ KHOÁ BẰNG VÂN TAY

Dùng Touch ID hoặc Windows Hello để mở vault mà không cần gõ mật khẩu, qua WebAuthn PRF. Master password
vẫn dùng được như phương án dự phòng.

CHUYỂN TỪ GOOGLE AUTHENTICATOR TRONG MỘT LẦN

Một ảnh QR "Chuyển tài khoản" của Google Authenticator mang được cả chục account vào một lượt. Extension
giải mã, hiện danh sách để bạn tick chọn và sửa tên, tự đánh dấu account đã có sẵn, rồi lưu một lần.
Bản export bị chia thành nhiều QR cũng nhập được, extension tự đếm xem đã đủ phần chưa.

TỰ KHOÁ VÀ TỰ DỌN

- Vault tự khoá theo thời gian rảnh bạn đặt, và luôn khoá khi đóng Chrome
- Mã copy xong tự bị xoá khỏi clipboard sau vài giây, kể cả khi bạn đã đóng popup
- Tuỳ chọn làm mờ mã cho tới khi rê chuột vào, chống nhìn trộm màn hình

KHÔNG MẠNG, KHÔNG THEO DÕI

- Không xin quyền truy cập website nào
- Không có content script, không chèn gì vào trang bạn đang xem
- Không gọi mạng, không phân tích hành vi, không quảng cáo
- Không dùng đồng bộ của Chrome, dữ liệu không rời khỏi máy này
- Không dùng thư viện bên thứ ba nào

TÍNH NĂNG KHÁC

- Hỗ trợ TOTP và HOTP, SHA-1 / SHA-256 / SHA-512, mã 6 đến 10 chữ số, chu kỳ tuỳ chỉnh
- Tìm kiếm và sắp xếp thứ tự account
- Vòng đếm ngược cho từng mã
- Nhập bằng ảnh QR (chọn file, kéo thả, hoặc dán bằng Ctrl+V) hoặc nhập tay

LƯU Ý QUAN TRỌNG

Chưa có tính năng sao lưu. Nếu quên master password, không có cách khôi phục dữ liệu. Hãy lưu master password
ở nơi an toàn, và giữ mã dự phòng mà các dịch vụ cấp cho bạn khi bật 2FA.

Cần Chrome 116 trở lên.
```

## Danh mục

```
Năng suất  (Productivity)
```

## Ngôn ngữ

```
Tiếng Việt
```

## Giải trình quyền (mục "Justification" trong dashboard)

- **storage**: Lưu vault 2FA đã mã hoá và cài đặt của người dùng trên máy họ. Không có gì được gửi ra ngoài.
- **alarms**: Khoá vault đúng hạn tự khoá và hẹn giờ xoá clipboard sau khi copy mã, kể cả khi service worker đã ngủ.
- **offscreen**: Service worker không có DOM nên cần một tài liệu offscreen để ghi đè clipboard.
- **clipboardWrite**: Xoá mã OTP khỏi clipboard sau khi hết thời gian giữ.
- **Không xin host permission**: extension không cần và không được phép truy cập nội dung website nào.

## Mục đích sử dụng đơn lẻ (Single purpose)

```
Sinh và quản lý mã xác thực hai lớp (TOTP/HOTP) hoàn toàn trên máy người dùng.
```

## Khai báo xử lý dữ liệu

Tick đúng các ô sau trong dashboard:

- Không thu thập thông tin nhận dạng cá nhân
- Không thu thập thông tin sức khoẻ
- Không thu thập thông tin tài chính hoặc thanh toán
- Không thu thập thông tin xác thực **gửi đi** (mã 2FA chỉ được lưu cục bộ, không truyền đi đâu)
- Không thu thập thông tin liên lạc cá nhân
- Không thu thập vị trí
- Không thu thập lịch sử duyệt web
- Không thu thập hoạt động người dùng
- Không thu thập nội dung website

Ba cam kết bắt buộc: không bán dữ liệu cho bên thứ ba, không dùng dữ liệu ngoài mục đích chính,
không dùng dữ liệu để xác định mức độ tín nhiệm hay cho vay.

## Link chính sách quyền riêng tư

Đăng nội dung `PRIVACY.md` lên một URL công khai (GitHub Pages hoặc file raw trên GitHub) rồi dán link vào đây.
Chrome Web Store bắt buộc có link này khi extension chạm vào dữ liệu nhạy cảm.

## Ảnh chụp màn hình cần chuẩn bị

Kích thước 1280x800 hoặc 640x400, tối thiểu 1 ảnh, nên có 4-5 ảnh:

1. Danh sách mã với vòng đếm ngược
2. Màn khoá kèm nút mở khoá bằng vân tay
3. Màn import: bảng xem lại nhiều account đọc từ một QR Google Authenticator
4. Màn cài đặt: mốc tự khoá và tự xoá clipboard
5. Màn tạo master password kèm thang độ mạnh

Đừng dùng secret thật trong ảnh. Tạo vài account giả để chụp.

## Checklist trước khi nộp

- [ ] `npm test` xanh
- [ ] `npm run build` chạy được, lấy file trong `dist/`
- [ ] Tăng `version` ở **cả** `src/manifest.json` và `package.json` (build sẽ chặn nếu lệch)
- [ ] Đã đăng `PRIVACY.md` lên URL công khai và dán link vào dashboard
- [ ] Đã chuẩn bị ảnh chụp màn hình, không có secret thật
- [ ] Đã tự cài lại từ file zip và thử: tạo vault, import QR, mở khoá lại, tự khoá
