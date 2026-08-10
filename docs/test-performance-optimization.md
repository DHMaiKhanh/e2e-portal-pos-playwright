# Test Performance Optimization

Ghi nhận ngày 2026-08-10: chạy 398 test case (170 passed, 109 failed, 119 skipped) mất **1.2h**. Nếu tăng lên 1000 test case với cấu hình hiện tại, ước tính có thể mất ~3h. Cần tối ưu trước khi scale số lượng test.

## Nguyên nhân

1. **`workers: 1`** (playwright.config.ts:26) — nguyên nhân lớn nhất. Toàn bộ test chạy tuần tự, dù `fullyParallel: true` đã bật nhưng vô nghĩa vì chỉ có 1 worker.
2. **`trace: 'on'`** (playwright.config.ts:48, mặc định) — ghi trace cho mọi test kể cả pass, tốn I/O/CPU.
3. **`video: 'retain-on-failure'`** (playwright.config.ts:50) — vẫn phải quay video từng test rồi mới xoá nếu pass.
4. **`slowMo`** (playwright.config.ts:54, từ `env.SLOW_MO`) — nếu > 0 sẽ delay nhân tạo mỗi action.
5. Viewport lớn 1920x1080 cho mọi test.
6. 109 test đang fail — mỗi test fail tốn gần hết timeout (60s/test, 15s navigation) trước khi báo lỗi, cộng dồn thời gian đáng kể.

## Cách tối ưu (ưu tiên cao → thấp)

### Ưu tiên cao

- [ ] Tăng `workers` (VD: 4, hoặc để trống cho Playwright tự chọn theo số CPU core - 1). Cần xác nhận trước: tests có thực sự độc lập (không share account/data) để chạy song song an toàn không — comment trong config ghi lý do pin 1 worker là "multi-user web app".
- [ ] Fix 109 test đang fail — giảm thời gian chờ timeout tích lũy, đồng thời là việc cần làm độc lập với performance.

### Ưu tiên vừa

- [ ] Đổi `trace: 'on'` → `'retain-on-failure'` trong playwright.config.ts:48.
- [ ] Đổi `video` → `'off'` khi chạy dev/local, chỉ bật `'retain-on-failure'` khi cần debug.
- [ ] Kiểm tra `env.SLOW_MO` có đang set > 0 không, tắt khi chạy headless.

### Ưu tiên thấp / dài hạn

- [ ] Sharding khi chạy CI (`--shard=1/4` trên nhiều máy song song).
- [ ] Giảm viewport nếu không cần full HD cho mọi test.
- [ ] Gắn tag để chạy subset (smoke test nhanh khi dev, full suite chạy nightly).

## Tham chiếu

- Config: [playwright.config.ts](../playwright.config.ts)
