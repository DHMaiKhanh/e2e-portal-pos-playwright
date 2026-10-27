# Test Runner GUI — Tổng hợp (6 tính năng + Discord/Gmail + App desktop)

> Tài liệu tổng hợp toàn bộ phần nâng cấp màn hình kết quả cho Test Runner GUI.
> Ngày: 2026-10-17. Mã nguồn: `tools/test-runner-gui/`.

---

## 1. Yêu cầu ban đầu

- Chạy ngầm (headless) các test case trong source rồi **hiển thị kết quả hiện đại, dễ dùng** cho người **không biết code**.
- Áp dụng **đủ cả 6 kiểu hiển thị** cùng lúc.
- **Gửi lỗi qua Gmail hoặc Discord** khi chạy xong.
- Đóng gói thành **app desktop**, không phải mở localhost dưới trình duyệt.

---

## 2. Quyết định kiến trúc

| Vấn đề                        | Lựa chọn                                        | Lý do                                                                                                                                                         |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web hay desktop?              | **App desktop Electron, tái dùng `server.mjs`** | Không phải viết lại; vẫn giữ được chế độ web dự phòng                                                                                                         |
| Có cần localhost không?       | **Có, nhưng ẩn**                                | App desktop nào (Electron/VS Code/Playwright UI) cũng chạy server local 127.0.0.1 ẩn bên trong. Người dùng chỉ thấy cửa sổ app — không trình duyệt, không URL |
| Đóng gói `.exe` cài rời?      | **Không**                                       | GUI này là **công cụ chạy trong repo** (đọc `tests/`, `docs/test-cases/`, ghi `reports/`). Không có repo thì không chạy được, nên `.exe` rời không có ý nghĩa |
| 6 kiểu: làm 6 "skin" hay gộp? | **Gộp tất cả vào 1 màn "Kết quả"**              | Tester không cần chọn kiểu hiển thị; gộp cho trải nghiệm tốt và liền mạch hơn                                                                                 |

**Kết luận:** "App desktop" = cửa sổ Electron mở từ trong repo bằng `npm run app`.

---

## 3. Sáu tính năng (đã dựng & kiểm chứng)

Mở app → tab mặc định **📊 Kết quả**. Chạy xong tự nhảy về đây.

1. **Bảng sức khoẻ** — vòng tròn % lớn (ví dụ 96%) + câu chốt ("Có 13 chỗ cần xem" / "Hệ thống ổn") + số đạt/lỗi/flaky/bỏ qua + thời gian. Nhìn 3 giây là hiểu.
2. **Bản đồ màn hình** — mỗi màn hình của Portal là một ô, viền xanh/vàng/đỏ theo tình trạng. **Bấm một ô để lọc hộp thư lỗi** theo màn hình đó.
3. **Hộp thư lỗi** — chỉ liệt kê test hỏng, dùng **tên test-case tiếng Việt** (không phải message kỹ thuật), **kèm ảnh chụp + video** Playwright ghi lúc lỗi. Lọc theo Tất cả / Lỗi / Flaky.
4. **Xu hướng theo lần chạy** — biểu đồ cột các lần chạy gần đây (tab 🕘 **Lịch sử**), đánh dấu lần có flaky. Bấm một cột để xem lại lần chạy đó.
5. **Thông báo khi chạy xong** — banner tổng kết + thông báo Windows (chạy cả khi thu nhỏ cửa sổ) + **gửi qua Discord / Gmail** (tab 🔔 Thông báo).
6. **Kể lại từng bước** — bấm một test lỗi → xem các bước được đánh số, **bước hỏng được tô đỏ** (ví dụ: 1. Đăng nhập → 2. Mở đơn #1024 → 3. Đổi số lượng → 4. Bấm "Lưu": không phản hồi). Tester gửi thẳng cho dev, không cần đọc code.

---

## 4. Thông báo qua Discord / Gmail

Tab **🔔 Thông báo**. Mặc định **chỉ gửi khi có test lỗi** (bỏ tick để gửi cả khi pass hết).

- **Discord**: Server Settings → Integrations → Webhooks → New Webhook → Copy URL → dán vào ô → **Gửi thử Discord**.
- **Gmail**: cần **Mật khẩu ứng dụng** (App Password) — bật 2FA rồi tạo tại `myaccount.google.com/apppasswords`. Nhập Gmail gửi đi + mật khẩu + người nhận → **Gửi thử Gmail**.

> 🔒 Cấu hình + mật khẩu lưu ở `reports/gui-runs/notify.json`. Thư mục `reports/` đã **gitignore** nên mật khẩu **không bao giờ bị commit** hay rời khỏi máy. Mật khẩu cũng **không gửi ngược về trình duyệt**.

---

## 5. Cách mở

| Lệnh                   | Mở kiểu gì                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `npm run app`          | **App desktop Electron** (khuyến nghị) — cửa sổ native, không trình duyệt, không localhost |
| `npm run app:shortcut` | Tạo shortcut app desktop ngoài Desktop + Start Menu (Windows)                              |
| `npm run gui:app`      | App bằng cửa sổ trình duyệt (`--app`, không thanh địa chỉ) — dự phòng                      |
| `npm run gui`          | Mở trong tab trình duyệt thường                                                            |

Chi tiết dùng: xem [test-runner-gui.md](test-runner-gui.md).

---

## 6. File đã thay đổi

**Thêm mới**

| File                                      | Vai trò                                                              |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `tools/test-runner-gui/electron-main.cjs` | Vỏ Electron: khởi động `server.mjs` ẩn rồi mở cửa sổ native          |
| `tools/test-runner-gui/notify.mjs`        | Gửi Discord (webhook) + Gmail (nodemailer), lưu/đọc cấu hình an toàn |
| `docs/test-runner-gui-tong-hop.md`        | File này                                                             |

**Sửa**

| File                                         | Thay đổi                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `tools/test-runner-gui/index.html`           | Thêm tab "📊 Kết quả" (tính năng 1-2-3-5-6) + tab "🔔 Thông báo" + biểu đồ xu hướng (4)  |
| `tools/test-runner-gui/server.mjs`           | API `/api/notify`, `/api/notify/test`; gửi thông báo khi chạy xong; lưu `steps` của test |
| `tools/test-runner-gui/live-reporter.cjs`    | Bắt từng bước (`test.step`/thao tác) cho tính năng 6                                     |
| `tools/test-runner-gui/install-shortcut.mjs` | Hỗ trợ tạo shortcut cho app Electron                                                     |
| `package.json`                               | Thêm `electron`, `nodemailer`; script `app`, `app:shortcut`                              |

---

## 7. Đã kiểm thử

- ✅ Cú pháp tất cả file backend (`node --check`) và client script.
- ✅ Server thật: `/api/notify` lưu/đọc đúng, **mật khẩu không bị lộ** ra ngoài.
- ✅ Electron khởi chạy thật: tiến trình app native, server tự lên, trang tải HTTP 200.
- ✅ Render toàn bộ UI (donut, bản đồ màn hình, hộp thư lỗi, kể từng bước, xu hướng, tab thông báo) với dữ liệu mẫu — **0 lỗi console**.

---

## 8. Lưu ý quan trọng

1. Ảnh/video ở Hộp thư lỗi chỉ hiện khi có **lần chạy thật** (Playwright đính kèm lúc test fail).
2. Tính năng 6 đẹp nhất khi test dùng `test.step('...')` để đặt tên bước; nếu không, nó tự lấy các thao tác click/fill/goto. Muốn trace đầy đủ: bật **Trace** trong tab "Chạy & Console".
3. Suite chạy trên **môi trường remote dùng chung** — nhiều test đỏ là do flake môi trường, không phải bug. Chạy lại với retries trước khi kết luận.
4. Chưa chạy toàn bộ suite để lấy dữ liệu thật (tốn thời gian, ảnh hưởng người khác). Mở `npm run app` → chọn test → **Chạy** để có số liệu thật.

---

## 9. Việc có thể làm thêm (tuỳ chọn)

- Chạy ngầm một lần toàn bộ suite (headless) để màn Kết quả có dữ liệu thật.
- Thêm kênh thông báo khác (Slack, Telegram) — cùng mô hình webhook như Discord.
- Commit/push các thay đổi khi bạn đã xem và đồng ý.
