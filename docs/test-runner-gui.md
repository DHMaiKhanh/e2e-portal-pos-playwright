# Test Runner GUI — cách mở & dùng

Giao diện để **chọn test, chạy, và xem kết quả dễ hiểu cho người không biết code**.
Mã nguồn: `tools/test-runner-gui/`. Địa chỉ web mặc định: http://localhost:4782

## Mở bằng cách nào?

| Lệnh                   | Mở kiểu gì                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run app`          | **App desktop (Electron)** — cửa sổ native riêng, có icon trên taskbar, **không mở trình duyệt, không thấy localhost**. Đây là cách khuyến nghị. Đóng cửa sổ là dừng hẳn. |
| `npm run app:shortcut` | Tạo shortcut **"Portal POS Test Runner (App)"** ngoài Desktop + Start Menu, nhấp đúp là mở app desktop (Windows). Chạy một lần.                                           |
| `npm run gui:app`      | Mở như app bằng cửa sổ trình duyệt (Edge/Chrome `--app`, không có thanh địa chỉ). Dự phòng khi chưa cài Electron.                                                         |
| `npm run gui`          | Mở trong tab trình duyệt thường. Đóng tab thì server vẫn chạy (dừng bằng `Ctrl+C`).                                                                                       |
| `npm run gui:shortcut` | Tạo shortcut mở kiểu trình duyệt `--app`.                                                                                                                                 |

> **App desktop vẫn chạy một server local 127.0.0.1 ẩn bên trong** (tái dùng `server.mjs`), nhưng người dùng chỉ thấy một cửa sổ app — không trình duyệt, không URL. Đây là mô hình giống Playwright UI / VS Code.
>
> Lưu ý: GUI này là **công cụ chạy trong repo** (nó đọc `tests/`, `docs/test-cases/`, ghi `reports/`), nên không đóng gói thành file `.exe` cài rời cho máy không có mã nguồn. "App desktop" ở đây = cửa sổ Electron mở từ trong repo.

## Màn hình "📊 Kết quả" — 6 tính năng

Mở app ra, tab mặc định là **Kết quả**. Chạy xong là tự nhảy về đây.

1. **Bảng sức khoẻ** — vòng tròn % lớn + câu chốt ("Có 13 chỗ cần xem" / "Hệ thống ổn") + số đạt/lỗi/flaky/bỏ qua + thời gian. Nhìn 3 giây là hiểu.
2. **Bản đồ màn hình** — mỗi màn hình (Đơn hàng, Khách hàng, Báo cáo…) là một ô, viền xanh/vàng/đỏ. **Bấm một ô để lọc hộp thư lỗi** theo màn hình đó.
3. **Hộp thư lỗi** — chỉ liệt kê test hỏng, dùng **tên test-case tiếng Việt** (không phải message kỹ thuật), **kèm ảnh chụp và video** Playwright ghi lúc lỗi. Lọc theo Lỗi / Flaky.
4. **Xu hướng theo lần chạy** — biểu đồ cột các lần chạy gần đây (tab **Lịch sử**), đánh dấu lần có flaky để khỏi nhầm là bug. Bấm một cột để xem lại lần chạy đó.
5. **Thông báo khi chạy xong** — banner tổng kết + thông báo Windows (chạy cả khi thu nhỏ cửa sổ) + **gửi qua Discord / Gmail** (tab 🔔 Thông báo).
6. **Kể lại từng bước** — bấm vào một test lỗi, xem các bước đã chạy được đánh số, **dừng ở bước nào thì bước đó đỏ** (ví dụ: 1. Đăng nhập → 2. Mở đơn → 3. Đổi số lượng → 4. Bấm "Lưu": không phản hồi). Tester gửi thẳng cho dev, không cần đọc code.

> Tính năng 6 hiển thị đẹp nhất khi test dùng `test.step('...')` để đặt tên bước. Nếu không có, nó tự lấy các thao tác (click/fill/goto). Muốn xem trace đầy đủ: bật **Trace** trong tab "Chạy & Console" rồi dùng nút trace trong ô chi tiết.

## 🔔 Thông báo qua Discord / Gmail

Tab **🔔 Thông báo**. Kết quả tự gửi khi chạy xong (mặc định chỉ gửi khi có test lỗi — bỏ tick để gửi cả khi pass hết).

- **Discord**: Server Settings → Integrations → Webhooks → New Webhook → Copy URL → dán vào ô Webhook URL → **Gửi thử Discord**.
- **Gmail**: cần **Mật khẩu ứng dụng** (App Password), không phải mật khẩu đăng nhập. Bật 2FA rồi tạo tại `myaccount.google.com/apppasswords`. Nhập Gmail gửi đi + mật khẩu + người nhận → **Gửi thử Gmail**.

> Cấu hình và mật khẩu lưu ở `reports/gui-runs/notify.json` — thư mục `reports/` đã được **gitignore**, nên mật khẩu không bao giờ bị commit hay rời khỏi máy. Mật khẩu không bao giờ được gửi ngược về trình duyệt.

## Tuỳ chọn qua biến môi trường

| Biến            | Ý nghĩa                                                   |
| --------------- | --------------------------------------------------------- |
| `GUI_PORT=5000` | Đổi port (mặc định `4782`).                               |
| `GUI_NO_OPEN=1` | Chỉ chạy server, không tự mở cửa sổ.                      |
| `GUI_APP=1`     | Bật chế độ cửa sổ app trình duyệt (`gui:app` đã đặt sẵn). |

Ví dụ (PowerShell): `$env:GUI_PORT=5000; npm run gui`

## Ghi chú

- Nếu server GUI đã chạy sẵn (port bị chiếm), lệnh mới chỉ mở cửa sổ tới server đang chạy.
- Lịch sử, thời lượng, lịch chạy, cài đặt thông báo lưu trong `reports/gui-runs/` (`history.json`, `durations.json`, `schedule.json`, `notify.json`).
- Cửa sổ app trình duyệt dùng profile riêng tại `.cache/test-runner-gui-window`.
- Tất cả vẫn chạy trên môi trường remote dùng chung — xem lưu ý về flake trong ghi nhớ của dự án.
