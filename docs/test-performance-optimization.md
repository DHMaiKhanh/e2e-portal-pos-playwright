# Test Performance Optimization

Ghi nhận quá trình tối ưu thời gian chạy bộ e2e, từ **1.2 giờ** (2026-08-10) xuống
**179 giây** (2026-08-12) trên cùng một máy, cùng một bộ test.

Mọi con số trong tài liệu này là **số đo thật**, không phải ước tính. Chỗ nào chưa
đo được thì ghi rõ là chưa đo.

---

## 1. Kết quả

| Mốc                                               | Wall clock   | Pass    | Fail |
| ------------------------------------------------- | ------------ | ------- | ---- |
| 2026-08-10 — `workers: 1`, `trace: 'on'`          | **~1.2 giờ** | 170     | 109  |
| 2026-08-12 — sau khi song song hoá + sửa skeleton | 229.8s       | 208     | 67   |
| 2026-08-12 — sau khi tắt trace + sửa 50 test hỏng | **179.1s**   | **258** | 17   |

Lượt cuối, đo bằng step-timing reporter (8 workers, 394 test):

| Chỉ số                        | Trước vòng cuối | Sau vòng cuối       |
| ----------------------------- | --------------- | ------------------- |
| Wall clock                    | 229.8s          | **179.1s** (−22%)   |
| Tổng test-time                | 1585.7s         | 1303.3s             |
| Thời gian đốt trong test fail | 648.9s (40.9%)  | **154.1s (11.8%)**  |
| Thời gian trong hook          | 976.4s (61.6%)  | 887.4s (68.1%)      |
| Hiệu suất song song           | 6.90x / 8       | **7.28x / 8** (91%) |

> Tỷ lệ hook **tăng** dù thời gian tuyệt đối giảm — vì phần fail co lại, mẫu số nhỏ đi.

---

## 2. Cách đo

Đừng tối ưu dựa trên cảm giác. Reporter tổng thời gian mỗi test không đủ để biết
giây phút bị đốt ở đâu — cần thời gian **từng step**.

[`tools/reporters/step-timing-reporter.ts`](../tools/reporters/step-timing-reporter.ts)
gắn vào config sau một cờ env, mặc định tắt nên không ảnh hưởng lượt chạy thường:

```bash
STEP_TIMING_OUT=/tmp/steps.json WORKERS=8 npx playwright test tests/e2e
```

Nó xuất ra: thời gian từng step ≥ 100ms, tách hook / thân test, và **dòng code nào
chặn** mỗi test fail. Chính dữ liệu này lật ngược giả định ban đầu — điểm nghẽn
không phải timeout mà là hook tải trang.

> **Lưu ý:** đừng truyền `--reporter=list` trên CLI khi profiling. Cờ đó **ghi đè
> toàn bộ** mảng reporter trong config, kể cả reporter đo đạc.

---

## 3. Các tối ưu đã thành công

### 3.1 `workers: 1` → `8` — đòn bẩy lớn nhất

Nguyên nhân số một. `fullyParallel: true` đã bật nhưng vô nghĩa khi chỉ có 1 worker.

Số đo trên thư mục `customers`:

| Workers | Wall      | Trung bình test pass | p99   |
| ------- | --------- | -------------------- | ----- |
| 4       | 105.8s    | 5.51s                | 7.3s  |
| **8**   | **63.8s** | 6.16s                | 8.5s  |
| 16      | 62.0s     | 11.06s               | 18.1s |
| 24      | 69.6s     | 14.48s               | 28.0s |

Wall clock **phẳng** từ 8 trở đi, trong khi độ trễ mỗi test tăng gấp đôi vì request
xếp hàng phía server. Chọn 8 vì cùng wall clock nhưng gấp đôi biên an toàn trước
timeout. Số pass/fail giống hệt nhau ở 4/8/16/24 → test thực sự độc lập.

**Ceiling là Portal từ xa, không phải CPU máy chạy test.**

### 3.2 Tái dùng BrowserContext theo worker — −29%

Mặc định Playwright tạo context mới mỗi test ⇒ HTTP cache lạnh ⇒ mỗi test tải lại
~75 file bundle trước khi app kịp hydrate.

[`src/fixtures/reuseContext.fixture.ts`](../src/fixtures/reuseContext.fixture.ts):
một context cho mỗi worker, một Page mới cho mỗi test.

|                      | Điều hướng | Nạp dữ liệu | Tổng      |
| -------------------- | ---------- | ----------- | --------- |
| Context mới mỗi test | ~0.9s      | ~3.4s       | ~4.3s     |
| Context dùng chung   | ~0.4s      | ~1.4s       | **~1.8s** |

Đo A/B trên `tests/e2e/payroll` (33 test, all-pass, 8 workers, 2 lượt mỗi cấu hình):

```
REUSE_CONTEXT=0   53.8s / 54.7s  ->  54.3s
mặc định (bật)    39.4s / 37.7s  ->  38.5s   (−29.0%)
```

**Cái giá phải trả:**

- Mất `video` (`recordVideo` là tuỳ chọn cấp context).
- **Blast radius**: context và browser đều là worker-scoped, nên một lần crash
  trình duyệt giết **mọi test còn lại của worker đó**. Quan sát ngày 2026-08-12:
  một lần crash làm hỏng liền 8 test Customers, tất cả báo
  `Target page, context or browser has been closed`. Chạy riêng thư mục đó ngay
  sau: 63 passed, 0 failed.

> Khi thấy một **cụm** test cùng thư mục fail với lỗi vòng đời trình duyệt, hãy
> nghi crash trước, và chạy lại riêng thư mục để xác nhận — đừng sửa test.

Thoát hiểm: `REUSE_CONTEXT=0` quay về fixture gốc của Playwright.

### 3.3 Sửa vòng chờ skeleton — bỏ timeout cháy mỗi test

Bảng render skeleton (cùng role row/cell, text rỗng) trong lúc tải. Nhưng sau khi
tải xong, app vẫn **giữ ~50 node skeleton ẩn** mount vĩnh viễn — nên phép đếm
không giới hạn không bao giờ về 0 và **đốt trọn timeout ở mọi test**.

Sửa bằng cách scope vào `:visible` — số này đi từ 80 → 0 đúng lúc dữ liệu thật về:

```ts
await expect(page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0, {
  timeout: Timeouts.MEDIUM,
});
```

Áp dụng ở [`CustomersPage`](../src/pages/customers/CustomersPage.ts),
[`OrdersPage`](../src/pages/orders/OrdersPage.ts),
[`BatchHistoryPage`](../src/pages/batch/BatchHistoryPage.ts),
[`ProductsPage`](../src/pages/products/ProductsPage.ts).

### 3.4 `trace` mặc định `off` — −25%

`retain-on-failure` **không** phải cấu hình rẻ như tên gọi: nó ghi trace cho **mọi**
test rồi mới xoá bản pass. Chi phí ghi vẫn trả đủ trên cả ~400 test.

A/B trên `tests/e2e/payroll` (33 test, all-pass, 2 lượt):

```
trace: retain-on-failure   39.4s / 37.7s  ->  38.5s
trace: off                 29.0s / 28.7s  ->  28.8s   (−25.2%)
```

Khi fail vẫn còn screenshot + `error-context.md` + call log — đủ khoanh vùng phần
lớn lỗi. Khi cần trace đầy đủ, chạy lại **chỉ những test đã fail**:

```bash
TRACE=retain-on-failure npx playwright test --last-failed
```

### 3.5 Sửa 50 test hỏng — cắt 495s test-time

Test fail đốt gần trọn timeout rồi mới báo lỗi. 67 fail = 40.9% toàn bộ test-time.

Điều quan trọng: 67 lỗi **chỉ có 4 nguyên nhân gốc**.

| Nguyên nhân gốc                                                                                                                             | Ảnh hưởng                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| App gom filter về `data-slot="filter-select-trigger"` chung, xoá các slot riêng (`order-filters-status`, `-payment-method`, `-date-preset`) | 14 lỗi click-timeout; riêng selector status đốt 114.9s trên 8 test |
| Nhãn đổi sang số nhiều: `All status`→`All statuses`, `All method`→`All methods`, thêm option `Pending`                                      | rải khắp Orders + Batch History                                    |
| Màn Customers thành Radix Tabs, **cả hai panel cùng mount** → mọi locator toàn trang khớp 2 phần tử (bảng, footer, page indicator)          | ~10 lỗi strict-mode                                                |
| Thiếu wait: `count()` và `textContent()` **không tự chờ**; `ProductsPage.waitForReady()` chỉ chờ ô search chứ không chờ bảng                | Overview device summary, toàn bộ Services search/pagination        |

Kết quả theo màn hình (chạy riêng từng thư mục):

| Màn hình      | Trước | Sau                        |
| ------------- | ----- | -------------------------- |
| Orders        | 17    | **0**                      |
| Customers     | 20    | **0**                      |
| Overview      | 14    | **0**                      |
| Batch History | 8     | 4 _(bug sản phẩm)_         |
| Services      | 6     | 1 _(bug sản phẩm)_         |
| Staffs        | 2     | 2 _(bug sản phẩm đã biết)_ |

**Một lỗi test đáng nhớ:** kiểm tra trạng thái active của sidebar bằng
`/active|selected|current/i.test(className)`. Class Tailwind của **mọi** link đều
chứa `active:text-sidebar-accent-foreground`, nên phép thử luôn trả về `true` —
vừa làm TC-BH-006 không thể pass, vừa khiến TC-BH-007 pass một cách vô nghĩa. Đã
đổi sang đọc `aria-current` + `data-active`.

---

## 4. Những hướng đã thử và THẤT BẠI

Ghi lại để không ai mất công thử lại.

### 4.1 Cache asset tĩnh xuống đĩa qua `context.route` — chậm hơn 3.6 lần

Ý tưởng: chặn request, lưu 71 file JS xuống đĩa, phục vụ lại từ đó.

```
Thư mục customers:  63.8s  ->  230.9s
```

Hai lý do: (1) chặn request đi vòng qua Node tốn nhiều hơn chính lần tải mạng nó
thay thế; (2) phục vụ lại mà không kèm header cache khiến Chromium request lại
toàn bộ asset qua Node ở **mỗi** lần điều hướng. Đã gỡ bỏ hoàn toàn.

Hướng đúng để lấy lợi ích cache là **tái dùng context** (mục 3.2) — dùng cache HTTP
nội bộ của Chromium, không đi qua Node.

### 4.2 Cắt bớt reporter — không có tác dụng

Nghi 5 reporter chạy song song (đặc biệt `allure-playwright` với `detail: true`)
là gánh nặng. Đo A/B trên payroll:

```
đủ 5 reporter        39.5s / 37.0s  ->  38.3s
chỉ reporter `list`  39.4s / 37.7s  ->  38.5s   (−0.7%, trong biên nhiễu)
```

**Kết luận: reporter gần như miễn phí. Đừng đụng vào.**

### 4.3 Siết timeout toàn cục — nguy hiểm, không nên

Ý tưởng ban đầu là hạ `expect.timeout` / `actionTimeout` để test fail chết nhanh.
Số đo bác bỏ:

- p99 của test **pass** là 8.5s ở 8 workers, trong khi `actionTimeout` là 10s →
  biên chỉ còn 1.5s. Siết thêm sẽ biến test pass thành fail.
- Ở 16 workers p99 là 18.1s — 10s đã là **thiếu**.

Quan trọng hơn: hook tải trang (68% test-time) **về sớm**, không hề chạm timeout.
Siết timeout không cắt được một giây nào ở đó.

Cách đúng để xử lý test fail là **sửa test**, không phải hạ timeout.

### 4.4 Tăng worker quá 8 — xem mục 3.1

Wall clock phẳng, p99 tăng gấp đôi. Không có lợi.

---

## 5. Chi phí còn lại

**Hook tải trang: 887s = 68% test-time.** Mỗi test là một vòng đời trang hoàn chỉnh.

Phân rã trung bình 3.4s mỗi hook:

| Bước                                | Trung bình |
| ----------------------------------- | ---------- |
| `Navigate to /pos/<id>/<screen>`    | 0.9s       |
| `waitForReady` — chờ SPA dựng shell | 1.8–2.0s   |
| `waitForReady` — chờ dữ liệu về     | 0.9s       |

Với test pass: hook chiếm **78.5%** thời gian. Một test pass trung bình 4.4s thì
3.4s là tải trang, 1.0s là assertion thật.

Cắt khoản này đòi hỏi bỏ mô hình "mỗi test một lần tải trang" — gộp các test chỉ-đọc
trong cùng `describe` để dùng chung một lần tải. **Quyết định hiện tại: giữ nguyên**,
ưu tiên tính độc lập giữa các test.

### Vì sao chưa nên chia nhiều máy

- Hiệu suất song song đã đạt **91% của trần 8 workers** — chỉ còn 9% hao phí lập lịch.
- Nút cổ chai là **Portal từ xa**. Chia ra nhiều máy vẫn là cùng số request đồng thời
  đập vào cùng một server, chỉ khác địa chỉ nguồn. Đường cong 4→8→16→24 cho thấy
  server bão hoà, không phải client.
- Còn một lần **crash trình duyệt** chưa rõ nguyên nhân trong lượt chạy full. Nhân
  bản ra nhiều máy khi chưa hiểu crash chỉ nhân bản luôn sự bất ổn.

Sharding chỉ có ý nghĩa sau khi Portal được scale, hoặc sau khi cắt được 887s hook.

---

## 6. Tái lập phép đo

```bash
# Profiling đầy đủ (đừng truyền --reporter, nó ghi đè config)
STEP_TIMING_OUT=/tmp/steps.json WORKERS=8 npx playwright test tests/e2e

# A/B một biến, 2 lượt mỗi cấu hình, xen kẽ để rải nhiễu server.
# Dùng thư mục all-pass (payroll) để loại nhiễu từ test fail.
TRACE=off        WORKERS=8 npx playwright test tests/e2e/payroll
REUSE_CONTEXT=0  WORKERS=8 npx playwright test tests/e2e/payroll
```

Nguyên tắc: **một biến mỗi lần, tối thiểu 2 lượt, chạy trên thư mục không có test
fail** — test fail làm nhiễu wall clock nhiều hơn bất kỳ biến nào đang đo.

---

## 7. Bug sản phẩm phát hiện trong quá trình này

Các test dưới đây **cố ý để đỏ** — chúng đang bắt đúng lỗi thật, sửa test để pass
là che lỗi.

| Ca                     | Triệu chứng                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-BH-037, TC-BH-008   | `status≠all` + kết quả rỗng → **trắng trang** (không bảng, không empty state, không cả heading). Đối chứng: `status=all` cùng khoảng ngày hiển thị đúng |
| TC-BH-039              | `status=bogus` → trắng trang thay vì fallback về "All statuses"                                                                                         |
| TC-BH-038              | `dateAfter=not-a-date` → param bị âm thầm bỏ, rồi **kẹt 50 skeleton vĩnh viễn**                                                                         |
| TC-SVC-010             | Handle kéo-thả category "Other" có `aria-disabled="false"` — phá quy tắc "Other luôn cuối"                                                              |
| TC-STF-028, TC-STF-069 | Đã ghi nhận từ vòng trước                                                                                                                               |

Chi tiết từng ca nằm trong mục "Lịch sử chạy" của
[`docs/test-cases/`](./test-cases/).

### Thay đổi hành vi cần xác nhận với team sản phẩm

- Root `/` **không còn redirect** về Overview của store — nay render trang chọn ứng
  dụng Fastboy Portal.
- Nút thứ hai trên app rail đổi nhãn `Portal` → `Payment`.
- Customer Groups từ route sidebar thành **tab** của màn Customers (`?tab=groups`);
  URL cũ vẫn sống nhưng chỉ dưới dạng redirect.
- Bộ lọc ngày mặc định của Orders: `Today` → `Last 7 Days`.
- "Back to orders" nay **giữ** bộ lọc thay vì reset về mặc định.
- Nút "Re-Open Order" không còn trong DOM (TC-ORD-031 đã `test.fixme`, chưa xác minh
  được vì store không còn đơn Canceled/Refunded nào).

---

## Tham chiếu

- [playwright.config.ts](../playwright.config.ts)
- [src/fixtures/reuseContext.fixture.ts](../src/fixtures/reuseContext.fixture.ts)
- [tools/reporters/step-timing-reporter.ts](../tools/reporters/step-timing-reporter.ts)
- [docs/test-cases/](./test-cases/) — lịch sử chạy và chi tiết từng ca
