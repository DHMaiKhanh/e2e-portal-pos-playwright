# Portal POS Test Results — app desktop xem kết quả

App desktop (Electron) hiển thị kết quả Playwright cho người không cần đọc code. **Không có server, không chạy
localhost**: app đọc file kết quả ngay trên máy và tự bật lên khi một lượt chạy test kết thúc.

Mã nguồn: `tools/results-app/`.

## Mở app

```bash
npm run results
```

Tạo shortcut **"Portal POS Test Results"** ngoài Desktop và trong Start Menu (Windows, chạy một lần):

```bash
npm run results:shortcut
```

## Cách hoạt động

```
npx playwright test …  ──►  results-reporter.cjs  ──►  reports/desktop-app/latest.json  ──►  app tự mở / tự cập nhật
```

- `playwright.config.ts` có thêm reporter `tools/results-app/results-reporter.cjs`. Chạy test xong, reporter ghi kết quả
  vào `reports/desktop-app/` (thư mục đã được gitignore) rồi **mở app** (hoặc đưa cửa sổ đang mở lên trước).
- App đang mở sẽ tự nhận kết quả mới, hiện thông báo Windows "Chạy test xong" và nháy biểu tượng trên taskbar.
- Giữa cửa sổ app và tiến trình Electron chỉ dùng IPC, trang app được nạp từ file `index.html`.
  Không có cổng mạng nào được mở.
- Trên CI (`CI` hoặc `JENKINS_URL` có giá trị), reporter vẫn ghi file nhưng không mở cửa sổ. Muốn tắt tự mở ở máy mình:
  đặt `RESULTS_APP_OPEN=0`.

> Nếu chạy với `--reporter=list` thì Playwright **bỏ hết** reporter trong config, app sẽ không nhận kết quả. Hãy chạy
> không kèm `--reporter`, hoặc thêm reporter của app: `--reporter=list,./tools/results-app/results-reporter.cjs`.

## Trong app có gì

| Khu vực            | Nội dung                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Bảng sức khoẻ      | Vòng tròn % đạt, câu kết luận ("Có 3 chỗ cần xem" / "Tất cả đều đạt"), số đạt / lỗi / chập chờn / bỏ qua, thời gian     |
| Theo màn hình      | Mỗi màn hình (Customers, Edit Order, …) là một ô viền xanh / vàng / đỏ. Bấm vào ô để lọc danh sách                      |
| Danh sách cần xem  | Mặc định chỉ hiện test lỗi và chập chờn. Có bộ lọc Lỗi / Chập chờn / Đạt / Bỏ qua / Tất cả và ô tìm kiếm                |
| Chi tiết một test  | Thông báo lỗi, **ảnh chụp màn hình**, **video**, **các bước đã chạy** (bước bị dừng tô đỏ), lý do bị bỏ qua             |
| Nút trong chi tiết | **Sao chép để gửi dev** (tên test + các bước + lỗi), mở thư mục ảnh/video, mở file test                                 |
| Lỗi bước chuẩn bị  | Nếu bước đăng nhập lỗi (ví dụ session hết hạn) app hiện cảnh báo đỏ và hướng dẫn chạy `npm run auth:stage`              |
| Tab Lịch sử        | Biểu đồ cột 20 lần chạy gần nhất (đạt / lỗi / chập chờn / bỏ qua) và bảng chi tiết. Bấm một lần chạy để xem lại         |
| Chạy test          | Chọn màn hình (bỏ trống = tất cả) và môi trường (stage / prod), bấm **Bắt đầu chạy**, có thanh tiến độ, log và nút Dừng |
| Report chi tiết    | Mở report HTML đầy đủ của Playwright (`reports/html/index.html`) bằng trình duyệt dưới dạng file                        |

## Dữ liệu

| File                                 | Nội dung                                  |
| ------------------------------------ | ----------------------------------------- |
| `reports/desktop-app/latest.json`    | Lượt chạy mới nhất, app theo dõi file này |
| `reports/desktop-app/runs/<id>.json` | Từng lượt chạy, giữ 30 lượt gần nhất      |
| `reports/desktop-app/history.json`   | Tóm tắt mỗi lượt cho tab Lịch sử          |

Ảnh chụp và video vẫn nằm trong `test-results/` của Playwright. Lượt chạy mới sẽ xoá thư mục đó, nên khi xem lại một lượt
cũ, phần ảnh và video có thể không còn.

## So với Test Runner GUI

`npm run app` / `npm run gui` (Test Runner GUI, xem [test-runner-gui.md](test-runner-gui.md)) vẫn chạy một server
localhost ẩn bên trong. App kết quả này thì không. Hai công cụ dùng độc lập với nhau.
