# Đóng góp cho M2 Authenticator

Cảm ơn bạn đã quan tâm. Tài liệu này nói rõ những gì được và không được thay đổi, để bạn không mất công viết
một pull request rồi bị từ chối vì lý do đáng ra phải biết trước.

## Trước hết: đây là ứng dụng giữ seed 2FA

Seed TOTP là bí mật dài hạn. Lộ một lần là kẻ tấn công sinh được mã 2FA vô thời hạn mà không để lại dấu vết
nào ở phía dịch vụ. Không giống mật khẩu, seed không có cơ chế "đăng xuất mọi thiết bị".

Vì vậy dự án chấp nhận đánh đổi tiện lợi để lấy bảo mật, và một số ràng buộc dưới đây là **cứng**, không
thương lượng được kể cả khi pull request rất hay.

## Năm ràng buộc cứng

1. **Secret không bao giờ chạm đĩa ở dạng plaintext.** Mọi seed chỉ tồn tại dưới dạng ciphertext trong
   `chrome.storage.local`. Bản rõ chỉ sống trong RAM khi vault đang mở khoá.

2. **Không có network.** Extension không gọi `fetch`, `XMLHttpRequest`, `WebSocket`, không analytics, không CDN,
   không remote code. `npm run build` sẽ fail nếu phát hiện. Nếu ý tưởng của bạn cần network, hãy mở issue
   thảo luận trước khi viết code.

3. **Zero runtime dependency.** Không npm package nào được đóng gói vào extension. Chỉ dùng Web Crypto,
   `BarcodeDetector`, WebAuthn - đều là API sẵn có của Chrome. Mỗi dependency là một bề mặt supply chain, và
   một ứng dụng giữ seed 2FA không đủ ngân sách rủi ro cho nó. `package.json` chỉ phục vụ script dev.

4. **Không `innerHTML`, không `eval`, không `new Function`.** Dựng DOM qua helper trong `src/lib/dom.js`.
   CSP trong manifest cấm inline script, đừng tìm cách lách.

5. **Quyền tối thiểu.** Hiện chỉ có `storage`, `alarms`, `offscreen`, `clipboardWrite`. Thêm quyền mới phải
   kèm lý do viết vào `SECURITY.md`, và phải cập nhật danh sách trắng trong `scripts/build.mjs`.

## Quy tắc khi sửa code

### Chạm vào định dạng lưu trữ

- Đổi format thì phải tăng `SCHEMA_VERSION` trong `src/lib/vault.js` và viết đường migrate. Không bao giờ đọc
  dữ liệu cũ rồi ghi đè mà không có bước migrate. User mất seed là mất luôn tài khoản của họ.
- Hằng số `DOMAIN` trong `src/lib/crypto.js` là wire format, **không** phải tên hiển thị. Đổi một ký tự là mọi
  vault đã tồn tại không giải mã được nữa.
- Mọi thao tác AES-GCM phải truyền AAD qua `aadFor()`. Đừng tự chế chuỗi AAD.

### Mật mã

- Đừng tự viết primitive. Dùng Web Crypto.
- Đừng hạ số vòng PBKDF2 để "cho nhanh". 600.000 là mức OWASP khuyến nghị.
- Đừng dùng lại IV. `aesGcmEncrypt()` đã sinh IV mới mỗi lần, đừng truyền IV từ ngoài vào.
- Đừng thay AES-GCM bằng chế độ không xác thực.

### Log

Không log secret, khoá, master password, hay payload đã giải mã. Kể cả `console.debug` khi đang dev, kể cả khi
bạn định xoá trước khi commit.

### Test

Module trong `src/lib/` được thiết kế để test được bằng `node --test`, không cần trình duyệt. Nếu bạn sửa
`totp.js`, `base32.js`, `protobuf.js`, `migration.js`, `otpauth.js` hay `crypto.js` thì **bắt buộc** chạy
`npm test` trước khi gửi pull request, và nên thêm test cho phần mình sửa.

Tính năng mật mã mới nên có test cho cả đường thất bại: khoá sai, AAD sai, ciphertext bị sửa.

## Văn phong code

- Vanilla JavaScript, ES modules, không TypeScript, không build step
- Thụt lề 4 space
- Comment giải thích **tại sao**, không phải **cái gì**. Code đã nói cái gì rồi.
- Comment và chuỗi hiển thị viết tiếng Việt có dấu đầy đủ, khớp với phần còn lại của dự án
- Đặt tên tiếng Anh cho biến và hàm

## Quy trình gửi pull request

1. Fork và tạo branch từ `main`
2. Viết code, chạy `npm test` cho tới khi xanh
3. Chạy `npm run build` để chắc chắn không vi phạm cổng chặn
4. Commit với thông điệp mô tả **tại sao** thay đổi, không chỉ liệt kê file đã sửa
5. Mở pull request, mô tả rõ: vấn đề gì, cách giải quyết, đã cân nhắc phương án nào khác
6. Nếu thay đổi chạm vào bảo mật, nói rõ nó ảnh hưởng mô hình đe doạ trong `SECURITY.md` ra sao

Pull request chạm vào `crypto.js` hay `vault.js` sẽ được soi kỹ hơn và có thể mất nhiều vòng review. Đó là chủ ý.

## Việc đang cần người làm

Nếu bạn muốn đóng góp mà chưa biết bắt đầu từ đâu:

- **Export/import backup mã hoá.** Ưu tiên số một. Hiện quên master password là mất sạch, không có đường cứu.
  Cần thiết kế format có version, mã hoá bằng mật khẩu riêng, và màn xác nhận đủ rõ để user không tự bắn chân.
- **i18n.** Giao diện đang tiếng Việt. Cần `_locales/` với tiếng Anh và tiếng Việt, khoảng 120 chuỗi trên 4 trang.
- **Test cho tầng UI.** Hiện chỉ có test cho `src/lib/`. Phần popup, import, options chưa có gì.
- **Kiểm chứng WebAuthn PRF trên nhiều nền tảng.** Đặc biệt Windows Hello và các khoá bảo mật rời.

## Báo lỗi bảo mật

**Đừng mở issue công khai** với chi tiết khai thác được. Xem mục "Báo lỗi bảo mật" trong
[SECURITY.md](SECURITY.md).

Khi mô tả bước tái hiện, đừng đính kèm secret 2FA thật của bạn. Tạo một account giả để minh hoạ.

## Giấy phép

Gửi đóng góp tức là bạn đồng ý phát hành nó theo [giấy phép MIT](LICENSE) của dự án.
