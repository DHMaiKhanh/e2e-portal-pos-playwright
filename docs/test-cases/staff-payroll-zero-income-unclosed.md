# VP-3891 — Staff Payroll kỳ Unclosed: staff Subtotal ≠ $0, Total Income = $0 không được ẩn

> Re-test của [VP-3356](staff-payroll-zero-income.md) theo đúng acceptance criteria #1: tạo đơn cho staff **JD53001**
> (ticket cũng nhắc JS9302) có Subtotal ≠ $0 nhưng Total Income = $0 — staff này không hiện ở Staff Payroll POS, kỳ
> **Current Period (Unclosed)**. Yêu cầu chung: kỳ Unclosed phải hiện **tất cả** staff (có order và không có order)
> giống kỳ đã đóng. Spec: `tests/e2e/regression-linear/vp-3356.e2e.spec.ts` (ID giữ theo spec: `TC-VP3356-04`, `-05`).

|                     |                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**          | [VP-3891](https://linear.app/fastboy/issue/VP-3891) — QC Completed · cha [VP-3356](https://linear.app/fastboy/issue/VP-3356) |
| **Màn hình**        | Portal: Payroll › **Staff Payroll** · POS: Income Reports › **Staff Payroll**                                                |
| **Môi trường**      | DEV Portal `https://v2.dev-fastboypay.com`, store `#14`, session `admin.stage.json`; POS cùng merchant                       |
| **Chạy**            | `ENV=stage npx playwright test tests/e2e/regression-linear/vp-3356.e2e.spec.ts -g "TC-VP3356-0[45]"`                         |
| **Ghi dữ liệu DEV** | **Không** — chỉ đọc                                                                                                          |
| **Tổng test case**  | 2 tự động (Portal) + 3 POS test tay                                                                                          |

---

## A. Phạm vi & dữ liệu

- **Tự động (Portal):** ở kỳ Unclosed, staff Orders > 0 & Total income $0 có dòng với giá trị $0.00, mở chi tiết không
  lỗi. Staff được lấy từ chính response báo cáo của kỳ hiện tại (DEV 02/11: `24234` 4 order / $150.00, `333`, `3333`…);
  kỳ không có staff như vậy thì ca **skip**.
- **Test tay (POS):** staff JD53001 (hoặc staff tương đương) sau khi tạo đơn Subtotal ≠ $0, Total Income $0.

---

## B. Test case

### B1. Portal (tự động)

#### TC-VP3356-04 — Staff có Orders > 0 nhưng Total income $0 vẫn hiện, giá trị $0.00 · Critical

| Bước | Thao tác                                                            | Kết quả mong đợi                                                 |
| ---- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1    | Tìm trong response staff có `numberOfOrders > 0`, `totalIncome = 0` |                                                                  |
| 2    | Mở trang chứa staff đó                                              | Có dòng staff, Orders đúng, Total income **$0.00** (không bị ẩn) |

#### TC-VP3356-05 — Mở chi tiết staff income $0 không lỗi · High

| Bước | Thao tác               | Kết quả mong đợi                                                              |
| ---- | ---------------------- | ----------------------------------------------------------------------------- |
| 1    | Bấm dòng staff ở TC-04 | Panel chi tiết hiện tên staff; Total income `$0.00`; không có "Couldn't load" |

### B2. POS (test tay)

#### TC-VP3891-POS-01 — Staff JD53001 hiện ở kỳ Unclosed với $0.00 · Critical

| Bước | Thao tác                                                                | Kết quả mong đợi                                                                     |
| ---- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | Tạo đơn cho staff **JD53001** có Subtotal ≠ $0.00, Total Income = $0.00 |                                                                                      |
| 2    | POS › Income Reports › Staff Payroll › **Current Period (Unclosed)**    | JD53001 có dòng; Subtotal đúng, Supply Fee / Tip / Total Income = $0.00; khớp Portal |

#### TC-VP3891-POS-02 — Mở chi tiết staff income $0 không lỗi · High

| Bước | Thao tác         | Kết quả mong đợi                               |
| ---- | ---------------- | ---------------------------------------------- |
| 1    | Bấm dòng JD53001 | Chi tiết mở, các mục hiển thị $0.00, không lỗi |

#### TC-VP3891-POS-03 — Kỳ Unclosed hiện cả staff không có order · High

| Bước | Thao tác                                             | Kết quả mong đợi                                                 |
| ---- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| 1    | So danh sách kỳ Unclosed với một kỳ đã đóng trên POS | Kỳ Unclosed cũng liệt kê staff không có order (giống kỳ đã đóng) |
| 2    | So với Portal cùng kỳ                                | Cùng tập staff                                                   |

---

## C. Kết quả QC trên Linear

- Ticket **QC Completed**. Bug gốc: JD53001 không hiện ở kỳ Unclosed dù có order Subtotal ≠ $0.

## D. Chạy test tự động

```bash
ENV=stage npx playwright test tests/e2e/regression-linear/vp-3356.e2e.spec.ts -g "TC-VP3356-0[45]" --reporter=list
```

## Lịch sử chạy

### 2026-11-02 (UTC+7)

- Kết quả 2 ca của file này: **2/2 passed** — staff `24234` (4 order, Subtotal $150.00, Total income $0.00) hiện đúng ở
  kỳ Oct 30 – Nov 2; chi tiết mở không lỗi, Total income $0.00.
