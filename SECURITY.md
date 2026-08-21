# Mô hình bảo mật

Tài liệu này nói rõ extension chống được gì, không chống được gì, và vì sao chọn từng đánh đổi.
Nếu bạn sửa code trong `src/lib/crypto.js` hoặc `src/lib/vault.js`, đọc hết phần này trước.

## Tài sản cần bảo vệ

Seed TOTP/HOTP. Đây là bí mật dài hạn: lộ một lần là kẻ tấn công sinh được mã 2FA vô thời hạn mà không để lại
dấu vết nào ở phía dịch vụ. Không giống mật khẩu, seed không có cơ chế "đăng xuất mọi thiết bị".

## Sơ đồ khoá

```text
master password ──PBKDF2-HMAC-SHA256, 600.000 vòng, salt 16 byte──> KEK ──AES-256-GCM──┐
                                                                                        ├──> DEK ──AES-256-GCM──> vault
WebAuthn PRF ─────HKDF-SHA256, salt 16 byte───────────────────────> BEK ──AES-256-GCM──┘
```

- **DEK** (32 byte ngẫu nhiên từ `crypto.getRandomValues`) mã hoá toàn bộ danh sách account.
- **KEK / BEK** chỉ dùng để bọc DEK, không bao giờ chạm vào dữ liệu account.

Tách hai tầng vì ba lý do:

1. Đổi master password chỉ cần bọc lại 32 byte, không phải mã hoá lại toàn bộ vault. Không có cửa sổ nào mà
   dữ liệu ở trạng thái nửa cũ nửa mới.
2. Vân tay và mật khẩu là hai bản bọc song song của cùng một DEK. Bật hoặc gỡ một đường không đụng đường kia.
3. Salt được sinh mới mỗi lần đổi mật khẩu, nên bảng tra tính sẵn cho mật khẩu cũ vô dụng.

### Chi tiết mã hoá

- AES-256-GCM, IV 12 byte ngẫu nhiên cho **mỗi lần ghi**. IV không bao giờ dùng lại với cùng một khoá.
- Tag xác thực 128 bit. Sửa một bit trong ciphertext là giải mã thất bại chứ không trả về dữ liệu rác.
- Mọi lời gọi truyền AAD dạng `<DOMAIN>|v<schema>|<mục đích>`. AAD chặn kiểu tấn công bê bản bọc DEK
  của vault này dán sang vị trí khác, và chặn hạ cấp schema. `DOMAIN` là hằng số wire format trong
  `src/lib/crypto.js`, cố ý **không** đổi theo tên sản phẩm: đổi một ký tự là mọi vault đã tồn tại
  không giải mã được nữa.
- Master password được `normalize('NFKC')` trước khi dẫn xuất, để gõ dấu tiếng Việt kiểu tổ hợp hay dựng sẵn
  vẫn ra đúng một khoá.

600.000 vòng PBKDF2-SHA256 là mức OWASP khuyến nghị. Chi phí mở khoá khoảng 0,3-0,8 giây trên máy để bàn thường,
đủ để việc dò offline hàng loạt trở nên đắt.

## Vòng đời khoá trong bộ nhớ

Khi mở khoá, DEK dạng raw được cất trong `chrome.storage.session`:

- Chỉ nằm trong RAM, không ghi xuống đĩa.
- Tự xoá khi đóng trình duyệt.
- Mặc định không cho content script đọc. Extension này cũng không có content script nào.

**Đây là đánh đổi có chủ ý.** Service worker của Manifest V3 bị kill bất kỳ lúc nào, nên giữ `CryptoKey`
non-extractable trong biến toàn cục là vô nghĩa: user sẽ phải nhập lại mật khẩu vài phút một lần và sẽ chọn
mật khẩu yếu để đỡ mệt. Cách hiện tại giữ được UX mà vẫn không để khoá chạm đĩa.

Auto-lock chạy hai lớp: mốc `lockAt` được kiểm mỗi lần truy cập vault, và một `chrome.alarms` xoá khoá khỏi
bộ nhớ đúng hạn kể cả khi không ai mở popup.

## Chống dò mật khẩu

Chờ tăng dần theo số lần sai, đếm bằng `chrome.storage.local` nên khởi động lại Chrome không reset:

| Lần sai | 1-5 | 6 | 7 | 8 | 9 | 10 | 11 | 12+ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Phải chờ | 0 | 15s | 30s | 1 phút | 2 phút | 4 phút | 8 phút | gấp đôi, trần 30 phút |

Năm lần đầu không phạt vì gõ nhầm là chuyện thường; từ lần thứ sáu chi phí tăng theo cấp số nhân nên dò tự động
trở nên vô nghĩa. Có trần 30 phút để người quên mật khẩu thật không bị khoá cả ngày - trần đó vẫn giữ tốc độ dò
ở mức 48 lần thử một ngày.

Một lần mở khoá thành công (bằng mật khẩu hoặc vân tay) đưa bộ đếm về 0.

Phạt áp cho **cả** đường mật khẩu lẫn đường vân tay, và UI khoá cả hai nút trong lúc chờ: chặn một đường mà
chừa đường kia thì lớp này không có tác dụng gì.

**Cố ý không có tính năng xoá vault sau N lần sai.** Khi chưa có export backup mã hoá, tính năng đó biến một
lần con nghịch bàn phím thành mất vĩnh viễn mọi tài khoản 2FA. Sẽ cân nhắc lại sau khi có đường sao lưu.

## Lớp master password: mặc định và cách tắt

**Từ bản 1.2.0, extension cài xong là dùng được ngay và chưa đặt master password.** Đây là quyết định về trải
nghiệm, không phải về bảo mật: chặn người mới bằng một màn đặt mật khẩu làm phần lớn họ bỏ ngang hoặc đặt đại
một mật khẩu yếu rồi quên. Trạng thái đang ở đâu được nói rõ trong Cài đặt, và bật lớp mật khẩu chỉ mất một
biểu mẫu.

Ai cần bảo vệ thật thì vào **Cài đặt => Master password => Bật master password** ngay sau khi cài. Toàn bộ
account giữ nguyên, chỉ có DEK được bọc lại bằng KEK dẫn xuất từ mật khẩu mới.

Khi chưa đặt (hoặc đã tắt) master password:

- DEK được bọc lại bằng một khoá ngẫu nhiên 32 byte nằm trong `chrome.storage.local` (`devicekey_v1`), AAD
  `dek-wrap-open`. Vault vẫn là ciphertext trên đĩa, đúng bất biến "không có seed dạng plaintext", **nhưng**
  khoá nằm ngay cạnh dữ liệu. Ai đọc được profile trình duyệt thì đọc được seed. Coi như không có mã hoá.
- Bản bọc bằng mật khẩu và bản bọc bằng vân tay không tồn tại (vault mới) hoặc bị xoá khỏi bản ghi (vừa tắt).
  Không còn mật khẩu cũ nằm lay lắt.
- Auto-lock ngừng hẳn: khoá xong vault sẽ tự mở lại ngay, nên UI ẩn luôn nút khoá và các mục liên quan.

Bật (hoặc bật lại) yêu cầu đặt mật khẩu mới từ đầu: DEK được bọc lại bằng KEK mới, `devicekey_v1` bị xoá khỏi
đĩa. Toàn bộ account giữ nguyên vì DEK không đổi.

Trường `protection` trong bản ghi vault là phần thêm vào, không đổi định dạng cũ: bản ghi thiếu trường này được
đọc là `password`, nên không cần tăng `SCHEMA_VERSION` và vault cũ vẫn giải mã bình thường.

## Bề mặt tấn công đã cắt

| Hạng mục | Trạng thái |
| --- | --- |
| Quyền host | Không có. Extension không đọc/ghi được bất kỳ website nào. |
| Content script | Không có. Không chèn code vào trang nào. |
| Gọi mạng | Không có. `scripts/build.mjs` chặn build nếu thấy `fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`. |
| Thư viện ngoài | Không có. Zero runtime dependency, không có bề mặt supply chain. |
| `chrome.storage.sync` | Không dùng. Dữ liệu không rời khỏi máy. |
| CSP | `script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'` |
| `innerHTML` / `eval` | Không dùng ở đâu. DOM dựng qua `src/lib/dom.js`, nội dung user luôn đi qua `textContent`. |
| ID account | `crypto.randomUUID()`, không phải `Math.random()`. |

### Quyền đang xin và lý do

| Quyền | Lý do |
| --- | --- |
| `storage` | Lưu vault đã mã hoá (`local`) và khoá phiên (`session`). |
| `alarms` | Auto-lock đúng hạn và hẹn giờ xoá clipboard khi service worker đã ngủ. |
| `offscreen` | Service worker không có DOM; cần một trang offscreen để ghi đè clipboard. |
| `clipboardWrite` | Ghi đè clipboard mà không cần user thao tác lại. |

`scripts/build.mjs` chặn đóng gói nếu manifest xin quyền ngoài danh sách này.

## Clipboard

Mã OTP copy xong bị ghi đè sau N giây (mặc định 20). Việc xoá do service worker lên lịch nên vẫn chạy sau khi
popup đóng. Đây là đường rò thật: trang web đọc được clipboard khi bạn dán, và các công cụ đồng bộ clipboard
giữa thiết bị còn đẩy nó đi xa hơn.

Giới hạn: nếu bạn copy thứ khác trong khoảng thời gian đó, việc ghi đè sẽ xoá luôn nội dung mới của bạn.
Đặt về "Không tự xoá" trong Cài đặt nếu thấy phiền.

## Mở khoá bằng vân tay

Dùng extension `prf` của WebAuthn. Authenticator trả về 32 byte bí mật ổn định theo cặp (credential, salt);
32 byte đó qua HKDF-SHA256 thành khoá bọc DEK.

- Bí mật PRF không rời khỏi phần cứng ở dạng tái tạo được nếu thiếu xác thực sinh trắc.
- `userVerification: 'required'` nên chạm cảm biến là bắt buộc, không phải chỉ cắm thiết bị.
- Không có bản sao master password nào được lưu. Gỡ vân tay không ảnh hưởng đường mật khẩu.

Ceremony WebAuthn chạy ở `unlock/unlock.html` mở dạng cửa sổ riêng, **không chạy trong popup**: hộp thoại sinh
trắc của hệ điều hành cướp focus làm popup đóng và huỷ ceremony giữa chừng.

PRF chưa có trên mọi máy. Khi thiếu, UI ẩn tính năng và user dùng master password như bình thường.

## Những gì extension KHÔNG chống được

Nói thẳng để bạn tự quyết định:

1. **Malware đang chạy với quyền của bạn khi vault đang mở.** Đọc được RAM hoặc `chrome.storage.session` là lấy
   được DEK. Không có phần mềm nào chạy trong trình duyệt chống được việc này.
2. **Keylogger.** Ghi được master password lúc bạn gõ.
3. **Máy đã bị root/jailbreak hoặc profile trình duyệt bị người khác dùng chung khi đang mở khoá.**
4. **Master password yếu.** 600k vòng PBKDF2 làm chậm việc dò, không làm nó bất khả thi. Mật khẩu 8 ký tự thường
   vẫn dò ra. Dùng cụm từ dài.
5. **Phishing.** Extension không biết bạn đang nhập mã vào trang thật hay trang giả.
6. **Ảnh QR export còn nằm trên máy.** Ảnh đó chứa toàn bộ secret ở dạng đọc thẳng được. Xoá ngay sau khi nhập.

So với authenticator trên điện thoại: điện thoại có thêm secure enclave phần cứng và sandbox ở mức hệ điều hành.
Extension này không có được hai thứ đó. Cái nó có: mã hoá at-rest thật, không mạng, không dependency, và
mã nguồn đủ nhỏ để đọc hết trong một buổi.

## Báo lỗi bảo mật

Mở issue mô tả vấn đề. Nếu là lỗi khai thác được, đừng đính kèm secret thật trong bước tái hiện.
