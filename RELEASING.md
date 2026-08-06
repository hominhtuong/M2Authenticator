# Quy trình phát hành

Tài liệu nội bộ cho người có quyền phát hành. Người đóng góp thông thường không cần đọc.

## Tóm tắt

```bash
npm test                  # phải xanh
npm run build             # tạo dist/m2-authenticator-<version>.zip
npm run release:github    # tag + tạo GitHub release, đính kèm zip
npm run publish:store     # đẩy lên Chrome Web Store
```

Trước đó nhớ tăng `version` ở **cả hai** file `src/manifest.json` và `package.json`. Lệch nhau là build fail.

---

## Cấu hình lần đầu

```bash
cp .env.example .env
```

Rồi điền các giá trị dưới đây. File `.env` đã nằm trong `.gitignore` và nên để quyền `600`:

```bash
chmod 600 .env
```

### GitHub

Không cần token nếu máy đã có GitHub CLI:

```bash
gh auth login
```

`gh` giữ token trong keychain của hệ điều hành, an toàn hơn hẳn để trong file phẳng. Chỉ điền
`GITHUB_TOKEN` vào `.env` khi chạy trên CI hoặc máy không cài được `gh`.

### Chrome Web Store

Cần bốn giá trị. Làm một lần, dùng mãi.

**1. `CWS_EXTENSION_ID`**

Lấy ở URL trang Developer Dashboard của extension. Không phải bí mật.

**2 và 3. `CWS_CLIENT_ID` và `CWS_CLIENT_SECRET`**

1. Vào [Google Cloud Console](https://console.cloud.google.com), tạo project mới
2. **APIs & Services** => **Library** => tìm "Chrome Web Store API" => **Enable**
3. **APIs & Services** => **OAuth consent screen** => chọn **External**, điền tên và email, lưu.
   Ở mục **Test users**, thêm chính email Google đang sở hữu extension.
4. **APIs & Services** => **Credentials** => **Create credentials** => **OAuth client ID**
5. Application type chọn **Desktop app**, đặt tên tuỳ ý
6. Copy Client ID và Client secret

**4. `CWS_REFRESH_TOKEN`**

Mở link sau trong trình duyệt, thay `<CLIENT_ID>` bằng client ID vừa lấy:

```
https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=<CLIENT_ID>&redirect_uri=urn:ietf:wg:oauth:2.0:oob&access_type=offline&prompt=consent
```

Đăng nhập bằng đúng tài khoản sở hữu extension, đồng ý, rồi copy đoạn `code` hiện ra.

Đổi code lấy refresh token:

```bash
curl -s https://oauth2.googleapis.com/token \
  -d "client_id=<CLIENT_ID>" \
  -d "client_secret=<CLIENT_SECRET>" \
  -d "code=<CODE>" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob"
```

Lấy giá trị `refresh_token` trong kết quả. Code chỉ đổi được một lần, hỏng thì lấy code mới.

Kiểm tra cấu hình mà không gọi mạng:

```bash
npm run publish:store -- --dry-run
```

---

## Phát hành một bản mới

### 1. Tăng version

Sửa `version` ở cả `src/manifest.json` và `package.json`. Dùng semver:

- **patch** (1.0.x) - sửa lỗi, không đổi hành vi
- **minor** (1.x.0) - thêm tính năng, tương thích ngược
- **major** (x.0.0) - đổi format lưu trữ hoặc phá vỡ tương thích

Đổi format lưu trữ thì phải tăng `SCHEMA_VERSION` trong `src/lib/vault.js` và viết đường migrate.

### 2. Kiểm tra

```bash
npm test
npm run build
```

Build sẽ fail nếu version lệch, xin quyền ngoài danh sách trắng, có host permission, có content script,
hoặc có lời gọi mạng trong `src/`.

Cài thử bản zip vừa tạo và đi hết luồng: tạo vault, import QR, khoá lại, mở khoá, đợi auto-lock, copy mã
và xác nhận clipboard tự xoá.

### 3. GitHub release

```bash
npm run release:github
```

Script tự đọc version từ manifest, tạo tag `v<version>`, push, tạo release và đính kèm file zip.

### 4. Chrome Web Store

```bash
npm run publish:store
```

Muốn upload mà chưa gửi duyệt ngay:

```bash
npm run publish:store -- --draft
```

Google thường mất vài giờ tới vài ngày để duyệt. Bản đầu tiên hay lâu hơn.

---

## Nếu lỡ commit .env

Coi như mọi khoá trong đó đã lộ. Xoá file rồi commit tiếp là **không đủ**, nội dung vẫn nằm trong lịch sử git.

1. Thu hồi OAuth client ở Google Cloud Console, tạo cái mới
2. Thu hồi token GitHub ở Settings => Developer settings => Personal access tokens
3. Nếu đã push, viết lại lịch sử bằng `git filter-repo` hoặc tạo repo mới với lịch sử sạch
4. Điền lại `.env` với khoá mới

---

## Checklist listing Chrome Web Store

Nội dung điền dashboard nằm ở [store/listing.md](store/listing.md) (tiếng Việt) và
[store/listing-en.md](store/listing-en.md) (tiếng Anh).

- [ ] Link chính sách quyền riêng tư trỏ tới URL công khai của `PRIVACY.md`
- [ ] Đã điền hướng dẫn thử nghiệm, nếu không reviewer mở lên gặp màn khoá là fail
- [ ] Ảnh chụp màn hình không chứa secret thật
- [ ] Ngôn ngữ listing khớp với ngôn ngữ giao diện
