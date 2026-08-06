# Chính sách quyền riêng tư - M2 Authenticator

Cập nhật: 01/08/2026

## Tóm tắt

M2 Authenticator không thu thập, không truyền và không chia sẻ bất kỳ dữ liệu nào của bạn.
Toàn bộ dữ liệu nằm trên máy bạn, ở dạng mã hoá.

## Dữ liệu extension lưu

Trên máy bạn, trong vùng lưu trữ cục bộ của extension:

| Dữ liệu | Dạng lưu | Mục đích |
| --- | --- | --- |
| Tên dịch vụ, tên tài khoản, secret 2FA, cấu hình mã (số chữ số, chu kỳ, thuật toán) | Mã hoá AES-256-GCM | Sinh mã 2FA |
| Salt và tham số dẫn xuất khoá | Không mã hoá (không nhạy cảm khi đứng riêng) | Dẫn xuất khoá từ master password |
| Thông tin đăng ký vân tay (id credential, salt) | Không mã hoá (không nhạy cảm khi đứng riêng) | Mở khoá bằng sinh trắc |
| Cài đặt: mốc tự khoá, thời gian xoá clipboard, làm mờ mã | Không mã hoá | Ghi nhớ lựa chọn của bạn |
| Số lần nhập sai master password | Không mã hoá | Làm chậm việc dò mật khẩu |

Master password **không được lưu ở bất cứ đâu**, kể cả dạng băm.

## Dữ liệu extension gửi đi

Không có. Extension không có quyền truy cập website nào, không gọi mạng, không dùng dịch vụ phân tích,
không nhúng script bên thứ ba, và không dùng đồng bộ của Chrome. Dữ liệu không rời khỏi máy bạn qua extension.

Bạn có thể tự kiểm chứng: extension không xin `host_permissions` và không có content script. Hai điều này hiển
thị công khai trên trang chi tiết ở Chrome Web Store.

## Quyền extension xin và lý do

- `storage` - lưu vault đã mã hoá và cài đặt trên máy bạn.
- `alarms` - tự khoá vault đúng hạn và hẹn giờ xoá clipboard.
- `offscreen` - tạo trang ẩn để xoá clipboard sau khi copy mã.
- `clipboardWrite` - ghi và xoá clipboard.

Không quyền nào trong số này cho phép đọc nội dung trang web bạn đang xem.

## Xoá dữ liệu

Hai cách, đều xoá vĩnh viễn và không khôi phục được:

- Mở Cài đặt của extension, dùng nút "Xoá vault vĩnh viễn".
- Gỡ extension khỏi Chrome. Chrome xoá luôn vùng lưu trữ của extension.

## Trẻ em

Extension không thu thập dữ liệu nên không thu thập dữ liệu của trẻ em.

## Thay đổi chính sách

Mọi thay đổi sẽ được ghi vào file này kèm ngày cập nhật, và phản ánh trong phần mô tả trên Chrome Web Store.

## Liên hệ

Mở issue trong repository của dự án.
