# M2 Authenticator

**Tiếng Việt** · [English](README.en.md)

![Logo M2 Authenticator](brand/logo.png)

Extension Chrome sinh mã xác thực hai lớp (TOTP/HOTP) chạy **hoàn toàn offline**. Mục tiêu: thay được app
authenticator trên điện thoại mà không phải hạ tiêu chuẩn bảo mật.

Zero dependency, không bundler, không một lời gọi mạng nào. Toàn bộ chạy trên Web Crypto, `BarcodeDetector`
và WebAuthn - đều là API có sẵn của Chrome. Mã nguồn đủ nhỏ để đọc hết trong một buổi, và đó là chủ ý:
một ứng dụng giữ seed 2FA thì phải kiểm chứng được.

Giao diện có **tiếng Anh và tiếng Việt**, đổi bằng nút cờ ngay trong extension, không cần tải lại.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-c%C3%A0i%20ngay-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/lkfhkcegjopcbkoafepfmmajlkbnglfh)
![Version](https://img.shields.io/badge/version-1.2.0-informational)
![License](https://img.shields.io/badge/license-MIT-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-brightgreen)
![Chrome](https://img.shields.io/badge/chrome-116%2B-orange)
![Dependencies](https://img.shields.io/badge/dependencies-0-success)
![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20VI-blueviolet)

---

## Có gì mới trong 1.2.0

Lịch sử đầy đủ ở [CHANGELOG.md](CHANGELOG.md).

- **Cài xong là dùng được ngay.** Không còn màn tạo master password chắn đường người mới. Vault mặc định chưa
  đặt mật khẩu; ai cần bảo vệ thật thì bật trong Cài đặt, account giữ nguyên. Đánh đổi nói rõ ở mục
  [Tắt master password](#tắt-master-password-đọc-kỹ).
- **Cài đặt mở ngay trong popup** (từ 1.1.0). Bấm bánh răng là popup giãn ra và hiện cài đặt tại chỗ; bánh răng
  sáng lên khi đang ở trong cài đặt, bấm lần nữa là về danh sách mã.
- **Một khung mở khoá duy nhất** (từ 1.1.0), nên không còn cảnh giao diện lệch chỗ khi bấm vân tay. Cửa sổ quét
  vân tay nay bám vào góc phải trên của cửa sổ trình duyệt, gần đúng chỗ popup vừa đứng.
- **Chống dò mật khẩu chặt hơn** (từ 1.1.0): 5 lần sai đầu không phạt, từ lần thứ 6 chờ 15s rồi gấp đôi mỗi
  lần, trần 30 phút, khoá cả ô mật khẩu lẫn nút vân tay trong lúc chờ.

Vault đang có không cần làm gì khi cập nhật: định dạng lưu trữ giữ nguyên, không có bước migrate, mật khẩu và
vân tay đã đặt vẫn dùng bình thường. Mặc định mới chỉ áp cho máy cài lần đầu.

---

## Cài đặt

### Cách 1: từ Chrome Web Store (khuyến nghị)

[**chromewebstore.google.com/detail/lkfhkcegjopcbkoafepfmmajlkbnglfh**](https://chromewebstore.google.com/detail/lkfhkcegjopcbkoafepfmmajlkbnglfh)

Bấm **Add to Chrome** là xong, extension tự cập nhật khi có bản mới.

### Cách 2: tải bản đóng gói từ Releases

1. Tải file `m2-authenticator-<version>.zip` ở [trang Releases](../../releases)
2. Giải nén
3. Mở `chrome://extensions`, bật **Developer mode**
4. Bấm **Load unpacked**, trỏ vào thư mục vừa giải nén

Nếu tự build từ mã nguồn, `npm run build` tạo sẵn `dist/unpacked/` để Load unpacked thẳng, khỏi giải nén.

### Cách 3: fork và tự build

```bash
git clone https://github.com/hominhtuong/M2Authenticator.git
cd M2Authenticator
npm test        # 53 test, không cần cài dependency nào
npm run build   # tạo dist/m2-authenticator-<version>.zip
```

Rồi Load unpacked trỏ vào thư mục **`src/`**.

Yêu cầu: Chrome 116 trở lên. Không cần Node để chạy extension, chỉ cần khi chạy test hoặc đóng gói.

---

## Hướng dẫn sử dụng

### Lần đầu: dùng được ngay

Cài xong là dùng được, không có màn đặt mật khẩu chắn đường. Vault được tạo sẵn ở trạng thái **chưa đặt master
password**: mở popup là thấy danh sách, thêm account được luôn.

Đánh đổi phải biết: khi chưa đặt master password, khoá giải mã nằm ngay trong profile trình duyệt, cạnh dữ
liệu. Bất cứ thứ gì đọc được profile đó đều đọc được seed 2FA của bạn.

### Bật master password (nên làm)

**Cài đặt => Master password => Bật master password.** Toàn bộ account giữ nguyên, chỉ khoá được bọc lại.

Cách đặt mật khẩu vừa mạnh vừa dễ nhớ: **một câu dài từ 16 ký tự trở lên**, ví dụ `con mèo trèo cây cau 2026`.
Không cần ký tự đặc biệt nếu câu đủ dài. Đây không phải cho tiện - độ dài đóng góp entropy nhiều hơn hẳn
việc nhét `!@#` vào một mật khẩu ngắn.

> **Không có cách khôi phục.** Mật khẩu này không được lưu ở bất cứ đâu, kể cả dạng băm. Quên là mất toàn bộ
> account. Hãy lưu nó vào một trình quản lý mật khẩu, và giữ mã dự phòng mà các dịch vụ cấp khi bật 2FA.

### Chuyển cả danh sách từ Google Authenticator

Đây là cách nhanh nhất, một ảnh QR mang được cả chục account:

1. Mở app Google Authenticator trên điện thoại
2. Menu ba chấm => **Chuyển tài khoản** => **Xuất tài khoản**
3. Chọn các account cần chuyển, bấm **Tiếp theo**
4. Chụp màn hình mã QR hiện ra
5. Trong extension, bấm nút **+** rồi kéo thả ảnh vào (hoặc dán bằng `Ctrl+V`)
6. Tick chọn account muốn giữ, sửa tên nếu cần, bấm **Lưu vào vault**

Nếu app hiện nhiều QR liên tiếp thì chụp hết và chọn tất cả ảnh cùng lúc. Extension tự đếm xem đã đủ phần chưa
và báo nếu còn thiếu.

> Ảnh QR đó chứa toàn bộ secret ở dạng đọc thẳng được. **Xoá ảnh khỏi máy ngay sau khi nhập xong.**

### Thêm từng account

- **Từ QR thường:** bấm **+**, kéo thả hoặc chọn ảnh QR mà dịch vụ hiển thị khi bật 2FA
- **Nhập tay:** bấm **+**, chuyển sang tab **Nhập tay**, dán chuỗi secret Base32 dịch vụ đưa cho bạn
- **Dán link:** copy nguyên link `otpauth://totp/...` rồi dán vào trang nhập bằng `Ctrl+V`

### Dùng hàng ngày

| Thao tác | Cách làm |
| --- | --- |
| Copy mã | Bấm thẳng vào dãy số, hoặc bấm nút copy |
| Tìm account | Gõ vào ô tìm kiếm ở đầu popup |
| Đổi thứ tự | Bấm nút sắp xếp, dùng mũi tên lên xuống |
| Khoá ngay | Bấm nút ổ khoá góc phải |
| Sinh mã HOTP tiếp theo | Bấm nút làm mới trên dòng account đó |
| Xoá account | Bấm nút thùng rác, xác nhận |

Vòng tròn bên trái đếm ngược số giây còn lại của mã. Mã chuyển sang màu vàng khi còn dưới 5 giây.

### Bật mở khoá bằng vân tay

Vào **Cài đặt** (nút bánh răng, mở ngay trong popup) => mục **Mở khoá bằng vân tay** => **Bật**. Cần máy có
Touch ID, Windows Hello hoặc khoá bảo mật hỗ trợ WebAuthn PRF. Riêng bước đăng ký mở ra cửa sổ riêng, vì hộp
thoại sinh trắc của hệ điều hành làm popup đóng giữa chừng.

Sau khi bật, màn khoá có thêm nút mở bằng sinh trắc. Master password vẫn dùng được như phương án dự phòng, và
gỡ vân tay không ảnh hưởng gì tới đường mật khẩu.

### Đổi ngôn ngữ

Nút cờ có ở màn khoá, cuối popup, đầu trang nhập account và trong Cài đặt. Bấm là đổi ngay, không cần tải lại
trang. Lựa chọn được ghi nhớ cho mọi trang của extension.

Mặc định là tiếng Anh. Hiện hỗ trợ tiếng Anh và tiếng Việt.

### Các mốc nên chỉnh trong Cài đặt

Bấm nút bánh răng là cài đặt mở ngay trong popup, không nhảy sang tab khác. Bấm mũi tên quay lại để về danh
sách mã, bấm ổ khoá để khoá vault luôn.

- **Tự khoá sau:** mặc định 5 phút không thao tác. Đặt "Chỉ khi đóng trình duyệt" nếu máy cá nhân và bạn thấy
  phiền. Chỉ hiện khi đã bật master password.
- **Tự xoá clipboard:** mặc định 20 giây sau khi copy mã. Đặt "Không tự xoá" nếu bạn hay copy thứ khác xen giữa.
- **Làm mờ mã:** bật nếu hay dùng máy nơi đông người hoặc share màn hình.
- **Master password:** bật hoặc tắt bất cứ lúc nào. Đọc kỹ phần dưới trước khi tắt.

### Tắt master password (đọc kỹ)

Trong **Cài đặt => Master password** có nút tắt hẳn lớp mật khẩu. Đây cũng là trạng thái mặc định của bản mới
cài. Khi không có master password:

- Vault mở thẳng, không hỏi gì, không auto-lock. Các mục Tự khoá, Mở khoá bằng vân tay và Đổi mật khẩu bị ẩn
  vì không còn mật khẩu nào để khoá.
- Dữ liệu vẫn nằm ở dạng mã hoá, nhưng khoá giải mã nằm ngay trong profile Chrome, cạnh dữ liệu. Nghĩa là
  bất cứ thứ gì đọc được profile Chrome của bạn đều đọc được seed 2FA. Đây là đánh đổi tiện lợi, không phải
  bảo vệ.
- Mật khẩu cũ và vân tay đã đăng ký bị gỡ. Bật lại là phải đặt mật khẩu mới từ đầu.

---

## Cơ chế bảo mật

Phần này nói cụ thể extension làm gì để bảo vệ seed 2FA của bạn, và nói thẳng cả những gì nó **không** chống được.
Mô hình đe doạ đầy đủ nằm ở [SECURITY.md](SECURITY.md).

### Mã hoá khi lưu

Mọi secret 2FA được mã hoá **AES-256-GCM** trước khi chạm đĩa. Khi vault đang khoá, dữ liệu trên máy bạn chỉ là
chuỗi vô nghĩa.

- IV 12 byte ngẫu nhiên riêng cho **mỗi lần ghi**, không bao giờ dùng lại với cùng một khoá
- Tag xác thực 128 bit: sửa một bit trong ciphertext là giải mã thất bại, không trả ra dữ liệu rác
- AAD gắn ciphertext với đúng schema và đúng mục đích, chặn kiểu tấn công bê bản bọc khoá của vault này dán
  sang vị trí khác, và chặn hạ cấp schema

### Dẫn xuất khoá

Khoá được dẫn xuất từ master password bằng **PBKDF2-HMAC-SHA256, 600.000 vòng**, salt ngẫu nhiên 16 byte.
Đây là mức OWASP khuyến nghị. Master password không được lưu ở bất cứ đâu, kể cả dạng băm, nên không có file
mật khẩu để trộm và không có hash để dò offline.

Password được `normalize('NFKC')` trước khi dẫn xuất, nên gõ dấu tiếng Việt kiểu tổ hợp hay dựng sẵn vẫn ra
đúng một khoá.

### Kiến trúc khoá hai tầng

```text
master password ──PBKDF2-SHA256, 600k vòng──> KEK ──AES-GCM bọc──┐
                                                                  ├──> DEK ──AES-256-GCM──> vault
WebAuthn PRF ─────HKDF-SHA256────────────────> BEK ──AES-GCM bọc──┘
```

**DEK** là 32 byte ngẫu nhiên mã hoá toàn bộ danh sách account. **KEK** và **BEK** chỉ dùng để bọc DEK, không
bao giờ chạm vào dữ liệu account.

Tách hai tầng vì ba lý do cụ thể:

1. Đổi mật khẩu chỉ cần bọc lại 32 byte, không phải mã hoá lại toàn bộ vault. Không có cửa sổ nào mà dữ liệu
   ở trạng thái nửa cũ nửa mới.
2. Vân tay và mật khẩu là hai bản bọc **song song** của cùng một DEK. Bật hoặc gỡ một đường không đụng đường kia.
3. Salt sinh mới mỗi lần đổi mật khẩu, nên bảng tra tính sẵn cho mật khẩu cũ thành vô dụng.

### Mở khoá bằng sinh trắc

Dùng extension `prf` của WebAuthn. Authenticator trả về 32 byte bí mật ổn định theo cặp (credential, salt);
32 byte đó qua HKDF-SHA256 thành khoá bọc DEK.

- Bí mật PRF không rời khỏi phần cứng ở dạng tái tạo được nếu thiếu xác thực sinh trắc
- `userVerification: 'required'` nên chạm cảm biến là bắt buộc, cắm thiết bị vào thôi là chưa đủ
- Không có bản sao master password nào được lưu

Ceremony chạy ở một cửa sổ riêng chứ không phải trong popup, vì hộp thoại sinh trắc của hệ điều hành cướp focus
làm popup đóng và huỷ ceremony giữa chừng.

### Vòng đời khoá trong bộ nhớ

Khi mở khoá, DEK nằm trong `chrome.storage.session`: chỉ trong RAM, không ghi đĩa, tự xoá khi đóng trình duyệt,
và không cho content script đọc (extension này cũng không có content script nào).

Đây là đánh đổi có chủ ý. Service worker của Manifest V3 bị kill bất kỳ lúc nào, nên giữ khoá trong biến toàn
cục là vô nghĩa: user sẽ phải nhập lại mật khẩu vài phút một lần và sẽ chọn mật khẩu yếu để đỡ mệt.

### Tự khoá và tự dọn

- Khi đã bật master password, vault tự khoá sau thời gian rảnh bạn đặt và **luôn** khoá khi đóng trình duyệt
- Auto-lock chạy hai lớp: kiểm mốc thời gian mỗi lần truy cập vault, cộng một alarm xoá khoá khỏi bộ nhớ đúng
  hạn kể cả khi không ai mở popup
- Mã copy xong bị ghi đè khỏi clipboard sau N giây, do service worker lên lịch nên vẫn chạy sau khi popup đóng

### Chống dò mật khẩu

Năm lần sai đầu không bị phạt, từ lần thứ sáu phải chờ và thời gian chờ gấp đôi sau mỗi lần. Bộ đếm ghi
xuống bộ nhớ bền nên khởi động lại Chrome không reset, và về 0 ngay khi mở khoá thành công:

| Lần sai | 1-5 | 6 | 7 | 8 | 9 | 10 | 11 | 12+ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Phải chờ | 0 | 15s | 30s | 1 phút | 2 phút | 4 phút | 8 phút | gấp đôi tới trần 30 phút |

Lúc đang bị phạt, cả ô mật khẩu lẫn nút mở khoá bằng vân tay đều bị khoá và màn hình đếm ngược tại chỗ:
chặn một đường mà chừa đường kia thì lớp chống dò không có tác dụng gì.

Cố ý **không** có tính năng xoá vault sau N lần sai: khi chưa có export backup, tính năng đó biến một lần
nghịch bàn phím thành mất vĩnh viễn mọi tài khoản 2FA.

### Bề mặt tấn công đã cắt

| Hạng mục | Trạng thái |
| --- | --- |
| Quyền host | Không có. Extension không đọc/ghi được bất kỳ website nào |
| Content script | Không có. Không chèn code vào trang nào |
| Gọi mạng | Không có. Build sẽ **fail** nếu phát hiện `fetch`, `XMLHttpRequest`, `WebSocket` hay `importScripts` trong `src/` |
| Thư viện ngoài | Không có. Zero runtime dependency, không có bề mặt supply chain |
| Đồng bộ | Không dùng `chrome.storage.sync`. Dữ liệu không rời khỏi máy |
| CSP | `script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'` |
| `innerHTML` / `eval` | Không dùng ở đâu. DOM dựng qua helper, nội dung user luôn qua `textContent` |
| ID account | `crypto.randomUUID()`, không phải `Math.random()` |

Extension chỉ xin 4 quyền, mỗi quyền có lý do viết trong [SECURITY.md](SECURITY.md): `storage`, `alarms`,
`offscreen`, `clipboardWrite`. Không quyền nào cho phép đọc nội dung trang web bạn đang xem.

### Những gì extension KHÔNG chống được

Nói thẳng để bạn tự quyết định:

1. **Malware đang chạy với quyền của bạn khi vault đang mở.** Đọc được RAM là lấy được khoá. Không phần mềm
   nào chạy trong trình duyệt chống được điều này.
2. **Keylogger** ghi lại master password lúc bạn gõ.
3. **Master password yếu.** 600k vòng PBKDF2 làm việc dò chậm đi, không làm nó bất khả thi.
4. **Phishing.** Extension không biết bạn đang nhập mã vào trang thật hay trang giả.
5. **Ảnh QR export còn nằm trên máy.** Ảnh đó chứa toàn bộ secret ở dạng đọc thẳng được.

So với authenticator trên điện thoại: điện thoại có thêm secure enclave phần cứng và sandbox ở mức hệ điều hành.
Extension này không có hai thứ đó. Cái nó có: mã hoá at-rest thật, không mạng, không dependency, và mã nguồn mở
để bất kỳ ai cũng kiểm chứng được.

---

## Cấu trúc mã nguồn

```text
src/                    extension (thư mục để load unpacked / đem đi nén)
  manifest.json
  lib/                  module thuần, không đụng DOM, test được bằng node
    base32.js           Base32 RFC 4648
    totp.js             HOTP RFC 4226 + TOTP RFC 6238
    crypto.js           PBKDF2, HKDF, AES-GCM, đánh giá mật khẩu
    vault.js            trạng thái vault, khoá phiên, CRUD account
    storage.js          bọc chrome.storage
    otpauth.js          phân tích otpauth://
    protobuf.js         đọc protobuf wire format
    migration.js        giải mã QR export Google Authenticator
    qr.js               đọc QR bằng BarcodeDetector
    webauthn.js         đăng ký / xác thực PRF
    clipboard.js        copy kèm hẹn giờ xoá
    windows.js          mở trang của extension thành cửa sổ canh giữa màn hình
    dom.js              helper dựng DOM (không có API nào nhận HTML string)
    messages.js         hằng số message
    errors.js           AppError mang mã lỗi thay vì câu chữ
    i18n.js             đa ngôn ngữ lúc chạy + nút cờ đổi ngôn ngữ
    locales/            bảng dịch en.js và vi.js
  _locales/             tên và mô tả cho Chrome Web Store (en, vi)
  background/           service worker: auto-lock, dọn clipboard
  offscreen/            tài liệu offscreen chỉ để ghi đè clipboard
  popup/                danh sách mã, tìm kiếm, sắp xếp, panel cài đặt
  unlock/               khung mở khoá dùng chung + trang tạo master password (cửa sổ riêng, cần cho WebAuthn)
  settings/             màn cài đặt dùng chung cho popup và trang options
  import/               quét QR và xem lại trước khi lưu hàng loạt
  options/              vỏ full-size của màn cài đặt (nơi chạy được ceremony đăng ký vân tay)
scripts/
  build.mjs             kiểm tra + đóng gói zip
  release.mjs           tag + tạo GitHub release
  publish.mjs           đẩy bản mới lên Chrome Web Store qua API
store/                  nội dung listing Chrome Web Store (tiếng Việt và tiếng Anh)
  images/               ảnh chụp màn hình 1280x800 để nộp store
tools/screenshots/      harness giả lập chrome.* để chụp lại ảnh khi UI đổi
brand/                  logo gốc và huy hiệu ổ khoá dạng vector (không đóng gói vào extension)
tests/                  node --test, không dependency

CONTRIBUTING.md         ràng buộc và quy trình đóng góp
SECURITY.md             mô hình đe doạ đầy đủ
PRIVACY.md              chính sách quyền riêng tư
RELEASING.md            quy trình phát hành (dành cho maintainer)
CHANGELOG.md            thay đổi của từng bản phát hành
```

---

## Phát triển

```bash
npm test                  # 53 test, gồm vector chính thức RFC 6238 / RFC 4226 / RFC 4648
npm run build             # kiểm tra rồi đóng gói dist/m2-authenticator-<version>.zip + dist/unpacked/
npm run screenshots       # dựng harness để chụp lại ảnh cho store
npm run release:github    # tag + tạo GitHub release, đính kèm zip
npm run publish:store     # đẩy lên Chrome Web Store qua API
```

`npm run build` là cổng chặn, nó fail nếu:

- version giữa `src/manifest.json` và `package.json` lệch nhau
- manifest xin quyền ngoài danh sách trắng
- xuất hiện host permission hoặc content script
- có file `.js` nào trong `src/` chứa lời gọi mạng
- hai bảng dịch lệch khoá nhau, hoặc HTML/JS dùng khoá dịch không tồn tại

Hai script phát hành cần cấu hình: copy `.env.example` thành `.env` rồi điền theo hướng dẫn trong
[RELEASING.md](RELEASING.md). File `.env` đã nằm trong `.gitignore`, **đừng bao giờ commit nó**.

---

## Đóng góp

Rất hoan nghênh. Đọc [CONTRIBUTING.md](CONTRIBUTING.md) trước khi mở pull request - có vài ràng buộc cứng
không thể thương lượng (không dependency, không network, không `innerHTML`) vì đây là ứng dụng giữ seed 2FA.

Tìm thấy lỗi bảo mật thì đọc mục "Báo lỗi bảo mật" trong [SECURITY.md](SECURITY.md), đừng mở issue công khai
với chi tiết khai thác được.

---

## Trạng thái

Bản hiện tại là **1.2.0**, đã lên Chrome Web Store. Phần thuật toán (TOTP/HOTP, Base32, protobuf, AES-GCM,
PBKDF2, HKDF) và chính sách chống dò mật khẩu có 53 test tự động phủ, gồm vector chính thức của RFC 6238,
RFC 4226 và RFC 4648, cùng các test giữ cho hai bảng dịch không lệch nhau.

Còn thiếu, và biết là thiếu:

- **Chưa có export/import backup mã hoá.** Quên master password là mất toàn bộ account, không có đường cứu.
  Đây cũng là lý do chưa bật tính năng xoá vault sau N lần nhập sai. Ưu tiên số một cho bản kế tiếp.
- **Chưa có kiểm định bảo mật độc lập.** Mã nguồn mở để bù cho việc đó, nhưng mở nguồn không thay thế được audit.
- **Mới có tiếng Anh và tiếng Việt.** Thêm ngôn ngữ chỉ cần một file trong `src/lib/locales/`, xem CONTRIBUTING.

---

## Giấy phép

[MIT](LICENSE). Fork thoải mái, dùng cho mục đích cá nhân hay thương mại đều được, chỉ cần giữ lại thông báo
bản quyền.
