# M2 Authenticator - Chrome Extension (TOTP/HOTP)

Extension Chrome lưu và sinh mã 2FA (TOTP/HOTP) hoàn toàn offline, thay thế app authenticator trên mobile.
Mục tiêu chất lượng: user dám bỏ app mobile để dùng cái này, nên bảo mật là ràng buộc cứng, không phải tính năng.

## Nguyên tắc bất di bất dịch

1. **Secret không bao giờ chạm đĩa ở dạng plaintext.** Mọi seed TOTP chỉ tồn tại dưới dạng ciphertext trong
   `chrome.storage.local`. Bản rõ chỉ sống trong RAM khi vault đang mở khoá.
2. **Không có network.** Extension không gọi fetch/XHR/WebSocket, không analytics, không CDN, không remote code.
   Nếu một thay đổi cần network, dừng lại và hỏi trước.
3. **Zero runtime dependency.** Không npm package nào được đóng gói vào extension. Chỉ dùng Web Crypto,
   `BarcodeDetector`, WebAuthn - đều là API sẵn có của Chrome. `package.json` chỉ phục vụ script dev.
4. **Không `innerHTML`, không `eval`, không `new Function`.** Dựng DOM qua helper trong `src/lib/dom.js`.
   CSP trong manifest cấm inline script; đừng tìm cách lách.
5. **Quyền tối thiểu.** Chỉ `storage`, `alarms`, `offscreen`, `clipboardWrite`. Không host permission,
   không content script, không `tabs`, không `clipboardRead`. Thêm quyền mới phải có lý do viết vào
   `SECURITY.md` và cập nhật danh sách trắng trong `scripts/build.mjs`.
6. **Không đưa bí mật vào repo.** Khoá phát hành nằm trong `.env` (đã gitignore). Không hardcode token,
   không in bí mật ra log, không commit `.env` kể cả khi đang debug.

## Cấu trúc

```text
src/                  Extension thật (load unpacked trỏ vào đây)
  manifest.json
  lib/                Module thuần, không đụng DOM, test được bằng node --test
  lib/locales/        Bảng dịch en.js và vi.js
  _locales/           Tên + mô tả cho Chrome Web Store
  background/         Service worker: auto-lock, dọn clipboard
  popup/              UI chính (mở khoá + danh sách mã)
  unlock/             Trang mở khoá dạng cửa sổ riêng - bắt buộc cho WebAuthn
  import/             Màn review khi nhập hàng loạt
  options/            Cài đặt + đổi mật khẩu + đăng ký vân tay
scripts/build.mjs     Đóng gói zip để nộp store
store/                Nội dung listing Chrome Web Store
tests/                node --test, không dependency
```

## Kiến trúc khoá (đọc trước khi sửa bất cứ thứ gì trong `lib/vault.js`)

Hai tầng khoá, cố ý tách rời:

- **DEK** (Data Encryption Key): AES-256-GCM ngẫu nhiên, sinh một lần, mã hoá toàn bộ danh sách account.
- **KEK** (Key Encryption Key): dẫn xuất từ master password qua PBKDF2-SHA-256 600.000 vòng, chỉ dùng để bọc DEK.

DEK được bọc song song bởi nhiều cách mở khoá: một bản bọc bằng password, một bản bọc bằng khoá lấy từ
WebAuthn PRF (vân tay). Vì vậy đổi mật khẩu chỉ cần bọc lại DEK, không phải mã hoá lại toàn bộ vault, và
đăng ký/gỡ vân tay không ảnh hưởng đường password.

Khi mở khoá, DEK dạng raw nằm trong `chrome.storage.session` (bộ nhớ, không ghi đĩa, tự xoá khi đóng Chrome).
Đây là đánh đổi có chủ ý để service worker của MV3 bị kill mà user không phải nhập lại mật khẩu liên tục.

## Quy tắc khi sửa code

- Đổi format lưu trữ thì phải tăng `SCHEMA_VERSION` trong `src/lib/vault.js` và viết đường migrate. Không bao giờ
  đọc dữ liệu cũ rồi ghi đè mà không có bước migrate - user mất seed là mất luôn tài khoản của họ.
- Mọi thao tác AES-GCM phải truyền AAD qua `aadFor()`. Không tự chế chuỗi AAD.
- Hằng số `DOMAIN` trong `lib/crypto.js` là wire format, không phải tên hiển thị. Sản phẩm đổi tên thì chuỗi
  đó vẫn đứng yên. Đổi nó là mọi vault đã tồn tại không giải mã được nữa.
- Không log secret, DEK, password, hay payload đã giải mã. Kể cả `console.debug` khi đang dev.
- Sửa `lib/totp.js`, `lib/base32.js`, `lib/protobuf.js`, `lib/migration.js` thì chạy `npm test` trước khi báo xong.
- Không viết chữ hiển thị thẳng vào code. HTML dùng `data-i18n`, JS dùng `t()`, `lib/` ném `fail('error.x')`
  chứ không tự dịch. Thêm khoá phải thêm ở cả `locales/en.js` lẫn `locales/vi.js`.

## Lệnh

```bash
npm test                  # node --test, không cần cài dependency nào
npm run build             # kiểm tra manifest + quyền + không có lời gọi mạng, rồi tạo dist/*.zip
npm run release:github    # tag + GitHub release (cần gh đã đăng nhập)
npm run publish:store     # đẩy lên Chrome Web Store (cần .env, xem RELEASING.md)
```

`npm run build` là cổng chặn: nó fail nếu version giữa manifest.json và package.json lệch nhau, nếu manifest
xin quyền ngoài danh sách trắng, nếu xuất hiện host permission hoặc content script, hoặc nếu có file `.js` nào
trong `src/` chứa `fetch`/`XMLHttpRequest`/`WebSocket`/`importScripts`.

Load thủ công: `chrome://extensions` => Developer mode => Load unpacked => chọn thư mục `src/`.

## Việc đã biết là còn thiếu

- Chưa có export/import backup mã hoá. Hệ quả: quên master password là mất toàn bộ account, không có đường cứu.
  Đây là lý do chưa bật tính năng xoá vault sau N lần nhập sai.
- Mới có tiếng Anh và tiếng Việt.
