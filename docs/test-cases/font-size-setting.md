# VP-4809 — Setting Font Size (Portal)

> Request 1 của ticket #1561986: tiệm tự chỉnh cỡ chữ trên Volt POS. Thêm setting **Font size** (Small / Medium /
> Large, mặc định Medium) ở Portal › Store Settings › Configuration và POS › Setting › Accessibility, cùng một flag.
> Spec: `tests/e2e/regression-linear/vp-4809.e2e.spec.ts`. ID test case: `TC-VP4809-NN`.

|                     |                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**          | [VP-4809](https://linear.app/fastboy/issue/VP-4809) — QC Testing (POS 7/7 Pass ngày 02/11)                                      |
| **PR**              | fastboy-portal #845 · volt-pos #3087 · volt-pos-api #1535                                                                       |
| **Màn hình**        | Store Settings › **Configuration** (`/pos/nail/<store>/setting?tab=configuration`), card _Font size_                            |
| **Môi trường**      | DEV Portal `https://v2.dev-fastboypay.com`, store `#14`, session `admin.stage.json`                                             |
| **Chạy**            | `ENV=stage npx playwright test tests/e2e/regression-linear/vp-4809.e2e.spec.ts`                                                 |
| **Ghi dữ liệu DEV** | **Không** — `FontSizeSettingPage.mockWrites()` chặn `PUT /sys_settings`, trả 200 giả và phủ giá trị vừa gửi lên các lần GET sau |
| **Tổng test case**  | 8 tự động (Portal) + 9 POS test tay                                                                                             |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** card Font size trên Portal — hiển thị, giá trị đang lưu, mặc định, lưu từng lựa chọn, giữ sau
  reload, xử lý khi lưu lỗi.
- **Test tay (POS, cuối mục B):** POS › Setting › Accessibility và cỡ chữ thực tế trên POS.
- **Ngoài phạm vi:** Request 2 (Print All Staff Income) — file riêng
  [pos-print-all-staff-income.md](pos-print-all-staff-income.md).
- **Lưu ý dữ liệu:** POS ghi **cùng flag** khi đổi Accessibility, nên giá trị trên DEV có thể bị đổi bởi máy POS đang
  test (đã thấy 02/11: `medium` → `large` → `medium` trong vài phút, không do Portal). Test đọc giá trị hiện tại, không
  giả định cố định.

### Phát hiện khi quét DOM (2026-11-02, chặn mọi request ghi)

- Card **Font size**, mô tả "Text size on every POS terminal of this merchant."; `radiogroup "Font size"` gồm 3 thẻ:

  | Giá trị  | Nhãn   | Mô tả                           |
  | -------- | ------ | ------------------------------- |
  | `small`  | Small  | Fits more on each screen.       |
  | `medium` | Medium | The standard POS text size.     |
  | `large`  | Large  | Easier to read from a distance. |

- Chọn một thẻ là **lưu ngay** (không có thanh Unsaved changes): `PUT /sys_settings/<id> {"value":{"font_size":"large"}}`.
- Flag `merchant_theme_pos_style`; `config.default_value = {font_size: "medium"}`, `selections = small | medium | large`.
- Lưu lỗi → thẻ chọn quay về giá trị cũ và hiện toast lỗi lấy theo response: 5xx → "Server Error" + `message`, 4xx →
  "Invalid Request" + `message`, response không có `message` → "Something went wrong. Please try again.".
  **Toast lỗi hiện 2 lần giống hệt nhau** (thấy cả ở Services và Payment & transactions) — lỗi giao diện nhỏ, chưa log bug.

---

## B. Test case

#### TC-VP4809-01 — Card Font size hiển thị đủ 3 lựa chọn · High

| Bước | Thao tác                          | Kết quả mong đợi                                                                                                      |
| ---- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1    | Mở Store Settings › Configuration | Có card **Font size** + mô tả; 3 thẻ Small / Medium / Large theo đúng thứ tự, đúng mô tả ở bảng trên; chọn đúng 1 thẻ |

#### TC-VP4809-02 — Thẻ đang chọn khớp giá trị đã lưu · High

| Bước | Thao tác                                    | Kết quả mong đợi             |
| ---- | ------------------------------------------- | ---------------------------- |
| 1    | Đọc flag `merchant_theme_pos_style` qua API |                              |
| 2    | So với thẻ đang chọn                        | Thẻ chọn = `value.font_size` |

#### TC-VP4809-03 — Mặc định là Medium · Medium

| Bước | Thao tác                      | Kết quả mong đợi                                                          |
| ---- | ----------------------------- | ------------------------------------------------------------------------- |
| 1    | Đọc `config` của flag qua API | `default_value.font_size = "medium"`; lựa chọn chỉ gồm small/medium/large |

> Chưa kiểm được trên một tiệm mới chưa từng lưu (QC cũng ghi chú điểm này) — ca này kiểm cấu hình mặc định phía server.

#### TC-VP4809-04 / -05 / -06 — Chọn Small / Medium / Large lưu đúng giá trị · High

| Bước | Thao tác                                                   | Kết quả mong đợi                                                                                                                              |
| ---- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | (Nếu đang là giá trị cần test thì chọn giá trị khác trước) |                                                                                                                                               |
| 2    | Chọn thẻ cần test                                          | Gửi ngay `PUT /sys_settings/<id>` với `{"value":{"font_size":"<giá trị>"}}`; thẻ được chọn; toast **"Font size updated"**; không có toast lỗi |

#### TC-VP4809-07 — Lựa chọn được giữ sau reload · Medium

| Bước | Thao tác            | Kết quả mong đợi           |
| ---- | ------------------- | -------------------------- |
| 1    | Chọn 1 giá trị khác |                            |
| 2    | Reload trang        | Thẻ vừa chọn vẫn được chọn |

#### TC-VP4809-08 — Lưu lỗi: báo lỗi và quay về giá trị cũ · Medium

| Bước | Thao tác                            | Kết quả mong đợi                                                             |
| ---- | ----------------------------------- | ---------------------------------------------------------------------------- |
| 1    | Giả lập `PUT /sys_settings` trả 500 |                                                                              |
| 2    | Chọn một giá trị khác               | Toast lỗi ("Server Error" + message của server); thẻ chọn quay về giá trị cũ |

### POS › Setting › Accessibility (test tay)

#### TC-VP4809-POS-01 — Hiển thị setting Font Size · High

| Bước | Thao tác                                | Kết quả mong đợi                                           |
| ---- | --------------------------------------- | ---------------------------------------------------------- |
| 1    | POS › Setting › General › Accessibility | Có mục **Font Size** với 3 lựa chọn Small / Medium / Large |

#### TC-VP4809-POS-02 / -03 / -04 — Chọn Small / Medium / Large · High

| Bước | Thao tác                  | Kết quả mong đợi                                                                                                   |
| ---- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1    | Chọn từng cỡ chữ          | Cỡ chữ đổi ngay: Small chữ 17.5px / tiêu đề 28px, Medium 20px / 32px, Large 22.5px / 36px; server lưu đúng giá trị |
| 2    | Mở Portal › Configuration | Card Font size hiện đúng giá trị POS vừa chọn (cùng flag)                                                          |

#### TC-VP4809-POS-05 — Large áp dụng trên các màn khác · Medium

| Bước | Thao tác                                            | Kết quả mong đợi                                      |
| ---- | --------------------------------------------------- | ----------------------------------------------------- |
| 1    | Font Size = Large, mở Pending Orders, Order History | Toàn bộ màn to lên, không vỡ layout, không tràn ngang |

#### TC-VP4809-POS-06 — Giữ lựa chọn khi reload / chuyển màn · Medium

| Bước | Thao tác                       | Kết quả mong đợi       |
| ---- | ------------------------------ | ---------------------- |
| 1    | Chọn 1 cỡ, chuyển màn / reload | Vẫn giữ cỡ chữ đã chọn |

#### TC-VP4809-POS-07 — Giữ lựa chọn sau khi tắt mở lại app · Medium

| Bước | Thao tác                                  | Kết quả mong đợi |
| ---- | ----------------------------------------- | ---------------- |
| 1    | Font Size = Large, tắt hẳn POS rồi mở lại | Vẫn là Large     |

#### TC-VP4809-POS-08 — Đổi trên Portal, POS nhận giá trị mới · High

| Bước | Thao tác                                      | Kết quả mong đợi                             |
| ---- | --------------------------------------------- | -------------------------------------------- |
| 1    | Portal › Configuration › chọn Large           |                                              |
| 2    | Xem POS (sau khi sync / mở lại Accessibility) | POS hiển thị Large, Accessibility chọn Large |

#### TC-VP4809-POS-09 — Tiệm mới mặc định Medium · Medium

| Bước | Thao tác                                   | Kết quả mong đợi                        |
| ---- | ------------------------------------------ | --------------------------------------- |
| 1    | Đăng nhập POS tiệm chưa từng lưu Font Size | Accessibility chọn **Medium**, chữ 20px |

> Request 2 của ticket (Print All Staff Income) là tính năng riêng: [pos-print-all-staff-income.md](pos-print-all-staff-income.md).

---

## C. Kết quả QC trên Linear

- **02/11/2026 (POS DEV 1.1.86, update từ 1.1.67 qua Version Update): 7/7 PASS** — tương ứng TC-VP4809-POS-01 … -07.
  Chưa kiểm được mặc định Medium cho tiệm mới (tiệm DEV đã chỉnh sẵn về Small trước khi test) → TC-VP4809-POS-09 chưa
  chạy; TC-VP4809-POS-08 chưa có kết quả riêng. Sau khi test QC để Font Size tiệm DEV về Medium.
- **02/11/2026 (Portal DEV + POS 1.1.86): Portal 6/6 PASS** — TC-FS-P01 hiển thị card; P02/P03/P06 Portal đổi Large /
  Small / Medium → POS nhận ngay, toast "Font size updated"; P04 POS đổi → reload Portal thấy giá trị mới; P05 giữ sau
  reload. Các ca Portal này tương ứng TC-VP4809-01, -04 … -07 (P04 cần máy POS nên test tay — TC-VP4809-POS-08 theo chiều
  ngược lại).
- **02/11/2026 (POS 1.1.89):** Request 2 Print All Staff Income PASS (video trên Linear) → ticket **QC Completed**.

---

## D. Chạy test tự động

| Test case          | Tự động               | Ghi chú                                      |
| ------------------ | --------------------- | -------------------------------------------- |
| TC-VP4809-01 … -08 | `vp-4809.e2e.spec.ts` | Không ghi dữ liệu (mock `PUT /sys_settings`) |

```bash
ENV=stage npx playwright test tests/e2e/regression-linear/vp-4809.e2e.spec.ts --reporter=list
```

## Lịch sử chạy

### 2026-11-02 (UTC+7)

- Lệnh: `ENV=stage npx playwright test tests/e2e/regression-linear/vp-5338.e2e.spec.ts tests/e2e/regression-linear/vp-4812.e2e.spec.ts tests/e2e/regression-linear/vp-4809.e2e.spec.ts tests/e2e/regression-linear/vp-3356.e2e.spec.ts --retries=0 --reporter=list` (chạy chung 4 spec: 32 passed, 1 failed)
- Kết quả spec này: **8/8 passed**
- Ghi nhận: toast lỗi hiện 2 lần giống hệt nhau (xem mục A). Giá trị `font_size` trên DEV đổi `medium` → `large` (08:55:30) → `medium` (08:56:31) trong lúc quét, không do Portal/suite — nhiều khả năng từ máy POS đang test Accessibility.
- Dữ liệu DEV sau khi chạy: `font_size = medium`, không có ghi mới từ suite.
