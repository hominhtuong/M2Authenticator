# Changelog

Mọi thay đổi đáng kể của M2 Authenticator. Bản mới nhất nằm trên cùng.
Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), version theo [SemVer](https://semver.org/lang/vi/).

Trang cài đặt: [Chrome Web Store](https://chromewebstore.google.com/detail/lkfhkcegjopcbkoafepfmmajlkbnglfh)

_English version below each release._

---

## [1.1.0] - 2026-08-21

### Thêm

- **Cài đặt mở ngay trong popup.** Bấm bánh răng là popup giãn ra hết cỡ và hiện cài đặt tại chỗ, có scroll
  riêng, không mở tab mới. Bánh răng đổi thành mũi tên quay lại. Nút ổ khoá đóng cài đặt rồi khoá vault và
  hiện màn khoá ngay trong popup, thay vì đóng popup như trước.
- **Tắt được master password.** Trong Cài đặt => Master password. Khi tắt: vault mở thẳng, không auto-lock,
  và các mục Tự khoá, Mở khoá bằng vân tay, Đổi mật khẩu bị ẩn kèm một dòng giải thích vì sao. Đánh đổi được
  nói thẳng trong giao diện: khoá giải mã lúc đó nằm ngay trong profile Chrome, cạnh dữ liệu. Bật lại là phải
  đặt mật khẩu mới từ đầu, mật khẩu cũ và vân tay đã đăng ký bị gỡ.

### Thay đổi

- **Một khung mở khoá duy nhất.** Popup và cửa sổ mở khoá dùng chung một bản dựng nên không còn lệch kích
  thước hay lệch vị trí giữa hai nơi. Bấm mở khoá bằng vân tay thì chính khung đó đổi sang trạng thái đang
  quét, không mở ra màn khác.
- **Chống dò mật khẩu chặt hơn.** Chính sách cũ (1s, 3s, 10s, 30s, 60s, 5 phút) thay bằng: 5 lần sai đầu
  không phạt, từ lần thứ 6 chờ 15s rồi gấp đôi sau mỗi lần, trần 30 phút. Trong lúc chờ, cả ô mật khẩu lẫn
  nút mở khoá bằng vân tay đều bị khoá và màn hình đếm ngược tại chỗ. Mở khoá thành công đưa bộ đếm về 0.
- Màn cài đặt và màn mở khoá tách thành `settings/settings-view.js` và `unlock/unlock-view.js` dùng chung,
  trang options trở thành lớp vỏ mỏng. Sửa một chỗ là hai nơi cùng đổi.

### Sửa

- Cửa sổ mở khoá bằng vân tay trước đây rơi vào vị trí mặc định của hệ điều hành, thường lệch hẳn sang mép
  trái so với popup vừa bấm. Nay cửa sổ được canh giữa màn hình và rộng sát popup.

### Ghi chú khi cập nhật

Không cần làm gì. Định dạng lưu trữ giữ nguyên, không có bước migrate, vault đang có mở bình thường bằng
master password cũ. Vân tay đã đăng ký vẫn dùng được.

<details>
<summary>English</summary>

**Added**

- **Settings now open inside the popup.** The popup grows to full height and shows settings in place, with its
  own scroll, instead of opening a new tab. The gear turns into a back arrow. The lock button closes settings,
  locks the vault and shows the unlock screen right there instead of closing the popup.
- **The master password can be turned off.** Settings => Master password. With it off the vault opens straight
  away, auto-lock stops, and the Auto-lock, Fingerprint unlock and Change password sections are hidden with a
  line explaining why. The trade-off is stated plainly in the UI: the decryption key then sits in the Chrome
  profile next to the data. Turning it back on means setting a new password from scratch; the old password and
  any enrolled fingerprint are removed.

**Changed**

- **One single unlock view.** The popup and the unlock window are built from the same code, so they no longer
  differ in size or position. Pressing unlock with fingerprint switches that same view into a scanning state
  instead of opening a different screen.
- **Stricter brute-force protection.** The old policy (1s, 3s, 10s, 30s, 60s, 5 min) is replaced by: the first
  5 wrong attempts cost nothing, the 6th waits 15s and every further attempt doubles it, capped at 30 minutes.
  During the wait both the password field and the fingerprint button are disabled and the view counts down in
  place. A successful unlock resets the counter.
- The settings screen and the unlock screen moved into shared modules (`settings/settings-view.js`,
  `unlock/unlock-view.js`); the options page is now a thin shell.

**Fixed**

- The fingerprint unlock window used to open wherever the OS put it, usually far to the left of the popup you
  just clicked. It is now centred on screen and sized to match the popup.

**Upgrade notes**

Nothing to do. The storage format is unchanged, there is no migration step, and existing vaults open with the
same master password. Enrolled fingerprints keep working.

</details>

---

## [1.0.0] - 2026-08-06

Bản phát hành đầu tiên.

- Sinh mã TOTP và HOTP offline, có vector kiểm thử chính thức của RFC 6238, RFC 4226 và RFC 4648.
- Vault mã hoá AES-256-GCM, khoá dẫn xuất bằng PBKDF2-HMAC-SHA256 600.000 vòng, kiến trúc khoá hai tầng
  DEK/KEK.
- Mở khoá bằng vân tay qua WebAuthn PRF (Touch ID, Windows Hello, khoá bảo mật).
- Nhập hàng loạt từ ảnh QR "Chuyển tài khoản" của Google Authenticator, có màn xem lại trước khi lưu.
- Auto-lock theo thời gian rảnh, tự xoá clipboard sau khi copy mã.
- Giao diện tiếng Anh và tiếng Việt, đổi bằng nút cờ ngay trong extension.
- Không gọi mạng, không dependency, không content script, không host permission.

<details>
<summary>English</summary>

First public release.

- Offline TOTP and HOTP code generation, covered by the official RFC 6238, RFC 4226 and RFC 4648 test vectors.
- AES-256-GCM encrypted vault, key derived with PBKDF2-HMAC-SHA256 at 600,000 iterations, two-tier DEK/KEK
  key architecture.
- Fingerprint unlock through WebAuthn PRF (Touch ID, Windows Hello, security keys).
- Bulk import from the Google Authenticator "Transfer accounts" QR, with a review step before saving.
- Idle auto-lock and automatic clipboard clearing after copying a code.
- English and Vietnamese UI, switchable with the flag buttons inside the extension.
- No network calls, no dependencies, no content scripts, no host permissions.

</details>

[1.1.0]: https://github.com/hominhtuong/M2Authenticator/releases/tag/v1.1.0
[1.0.0]: https://github.com/hominhtuong/M2Authenticator/releases/tag/v1.0.0
