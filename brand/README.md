# Nhận diện thương hiệu

Logo là mặt khỉ gốc, giữ nguyên không vẽ lại, ghép thêm huy hiệu ổ khoá ở góc dưới phải để nhìn vào
biết ngay đây là ứng dụng xác thực chứ không phải một extension linh tinh.

| File | Dùng ở đâu |
| --- | --- |
| `logo.png` | 320px, nền trong suốt - README, ảnh đại diện, listing |
| `lock-badge.svg` | nguồn vector của riêng huy hiệu ổ khoá |

Icon thật của extension nằm ở `src/assets/icons/`, sinh ra từ chính hai file trên:

- `icon128.png` và `icon48.png`: ảnh gốc + huy hiệu, đường kính huy hiệu bằng 40% cạnh ảnh, tâm đặt ở
  77,5% chiều ngang và 78,5% chiều dọc.
- `icon16.png`: chỉ có mặt khỉ, cắt sát 82% khung. Ở 16px huy hiệu chỉ còn khoảng 6px, thêm vào là cả
  ổ khoá lẫn khuôn mặt cùng nhoè, nên bỏ.

Màu dùng trong huy hiệu: vàng `#ffc93d` sang `#f5a623` (lấy từ mảng vàng trên mặt khỉ), ổ khoá `#12141b`,
viền ngoài đen trùng nền đĩa để huy hiệu tách khỏi khuôn mặt.

Muốn dựng lại bộ icon: render `lock-badge.svg` ra PNG đúng cỡ cần rồi ghép lên `logo.png` theo tỷ lệ ở trên.
