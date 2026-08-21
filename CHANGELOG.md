# Changelog

Mọi thay đổi đáng kể của M2 Authenticator. Bản mới nhất nằm trên cùng.
Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), version theo [SemVer](https://semver.org/lang/vi/).

Trang cài đặt: [Chrome Web Store](https://chromewebstore.google.com/detail/lkfhkcegjopcbkoafepfmmajlkbnglfh)

_English version below each release._

---

## [1.3.0] - 2026-08-21

### Thêm

- **Hiển thị phiên bản đang chạy.** Chân popup ghi `v1.3.0`, và Cài đặt có thẻ **Phiên bản** ghi đầy đủ hơn.
- **Nút kiểm tra cập nhật** trong Cài đặt => Phiên bản. Bản cài từ Chrome Web Store vốn đã tự cập nhật ngầm
  (trình duyệt kiểm tra lúc khởi động và vài giờ một lần, cài khi extension đang rảnh), nút này chỉ để hỏi
  ngay thay vì chờ. Bản load unpacked được báo thẳng là không có nguồn cập nhật để hỏi.
- **Áp bản mới sớm khi không làm phiền ai.** Service worker lắng nghe `onUpdateAvailable` và chỉ gọi
  `chrome.runtime.reload()` khi vault không đặt master password hoặc đang khoá. Vault đang mở thì hoãn tới
  lúc khoá, vì reload xoá bộ nhớ phiên và sẽ bắt nhập lại mật khẩu giữa chừng.
- **Màn "Có gì mới".** Sau khi cập nhật, mở popup lần đầu là thấy tóm tắt thay đổi; bấm "Đã hiểu" là vào
  danh sách và không hiện lại. Xem lại bất cứ lúc nào ở Cài đặt => Phiên bản => Có gì mới. Máy mới cài
  không thấy màn này.

<details>
<summary>English</summary>

**Added**

- **The running version is visible**: `v1.3.0` in the popup footer and a full Version card in Settings.
- **A check-for-updates button** in Settings => Version. Store installs already update themselves in the
  background (the browser checks at startup and every few hours, and installs while the extension is idle);
  the button just asks right now. Unpacked development builds are told plainly that they have no update
  channel to ask.
- **Updates are applied early when that costs nothing.** The service worker listens for `onUpdateAvailable`
  and only calls `chrome.runtime.reload()` when the vault has no master password or is already locked; an
  unlocked vault defers, because reloading wipes session memory and would force a password re-entry.
- **A what-is-new screen.** After an update the popup opens on a short summary of the changes; "Got it"
  dismisses it for good, and Settings => Version => What is new brings it back. Fresh installs never see it.

</details>

---

## [1.2.0] - 2026-08-21

### Thay đổi

- **Cài xong là dùng được ngay, không còn màn tạo master password chắn đường.** Vault mới được tạo ở trạng
  thái chưa đặt master password, mở popup là thấy danh sách và thêm account được luôn. Ai cần bảo vệ thật thì
  vào Cài đặt => Master password => Bật master password, toàn bộ account giữ nguyên. Đánh đổi được nói rõ
  trong Cài đặt và trong [SECURITY.md](SECURITY.md).
- **Bỏ nút quay lại khi đang ở trong Cài đặt.** Bánh răng giữ nguyên icon và sáng lên ở trạng thái đang chọn,
  bấm lần nữa là về danh sách mã.
- **Chỗ nào nói tới trình duyệt thì gọi là "trình duyệt".** Trước đây gọi thẳng là Chrome, trong khi extension
  chạy được trên Brave, Cốc Cốc, Edge và các bản nền Chromium khác.

### Sửa

- Cửa sổ mở khoá bằng vân tay nhảy ra giữa màn hình. Nay nó bám vào góc phải trên của cửa sổ trình duyệt đang
  dùng, tức là gần đúng chỗ popup vừa đứng.
- Hàng nút đổi ngôn ngữ trong Cài đặt của popup kéo hết chiều ngang mà chữ dồn về trái, nhìn hụt một mảng.
  Nay hai nút chia đôi hàng.

<details>
<summary>English</summary>

**Changed**

- **Installing no longer stops at a create-master-password screen.** A new vault starts with no master
  password, so the popup opens straight into the list and accounts can be added immediately. Anyone who wants
  real protection turns it on in Settings => Master password => Turn on master password, with every account
  left untouched. The trade-off is spelled out in the UI and in SECURITY.md.
- **The back button inside Settings is gone.** The gear keeps its icon and lights up in a selected state
  instead; clicking it again returns to the codes.
- **Wording now says "browser" instead of "Chrome"**, since the extension also runs on Brave, Cốc Cốc, Edge and
  other Chromium builds.

**Fixed**

- The fingerprint unlock window jumped to the centre of the screen. It now anchors to the top-right corner of
  the current browser window, roughly where the popup was.
- In the popup settings, the language switcher stretched across the row while the labels stayed left, leaving
  an empty gap. The two buttons now split the row evenly.

</details>

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

[1.3.0]: https://github.com/hominhtuong/M2Authenticator/releases/tag/v1.3.0
[1.2.0]: https://github.com/hominhtuong/M2Authenticator/releases/tag/v1.2.0
[1.1.0]: https://github.com/hominhtuong/M2Authenticator/releases/tag/v1.1.0
[1.0.0]: https://github.com/hominhtuong/M2Authenticator/releases/tag/v1.0.0
