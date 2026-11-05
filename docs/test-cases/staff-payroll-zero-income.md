# VP-3356 — Staff Payroll hiện đủ staff có Order/Subtotal nhưng Total Income = $0

> Bug ở **POS**: Income Reports › Staff Payroll ẩn staff có Orders > 0 / Subtotal ≠ $0 nhưng Total Income = $0, nên danh
> sách và dòng Summary lệch với Portal. Ticket lấy **Portal › Payroll › Staff Payroll** làm chuẩn. File này gồm các ca
> tự động khoá hành vi chuẩn trên Portal và các ca POS test tay theo acceptance criteria. Re-test với staff cụ thể ở
> kỳ Unclosed: [VP-3891](staff-payroll-zero-income-unclosed.md). Spec: `tests/e2e/regression-linear/vp-3356.e2e.spec.ts`.

|                     |                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**          | [VP-3356](https://linear.app/fastboy/issue/VP-3356) — QC Completed · liên quan [VP-2460](https://linear.app/fastboy/issue/VP-2460) |
| **Màn hình**        | Portal: Operations › **Payroll** › tab **Staff Payroll** · POS: Income Reports › **Staff Payroll**                                 |
| **Môi trường**      | DEV Portal `https://v2.dev-fastboypay.com`, store `#14`, session `admin.stage.json`; POS cùng merchant                             |
| **Chạy**            | `ENV=stage npx playwright test tests/e2e/regression-linear/vp-3356.e2e.spec.ts -g "TC-VP3356-0[1236]"`                             |
| **Ghi dữ liệu DEV** | **Không** — chỉ đọc (truy vấn báo cáo là `POST …/run` nhưng không ghi dữ liệu)                                                     |
| **Tổng test case**  | 4 tự động (Portal) + 5 POS test tay                                                                                                |

---

## A. Phạm vi & dữ liệu

- **Tự động (Portal):** danh sách Staff Payroll kỳ Current Period (Unclosed) và kỳ đã đóng — đủ mọi staff; số liệu từng
  dòng khớp dữ liệu báo cáo; dấu âm.
- **Test tay (POS):** danh sách + Summary của POS khớp Portal, case refund âm, không regression màn Staff Income
  (VP-2460).
- **Dữ liệu:** không tạo order. Ví dụ trong ticket (kỳ Aug 20 – Aug 26, 2026): `1001bc` Orders 1, Subtotal **−$62.00**
  (refund), Total income $0.00; `Thong` Orders 1, Subtotal $30.00, Total income $0.00.

### Phát hiện khi quét (2026-11-02)

- Dữ liệu bảng lấy từ `POST /v4/report_queries/staff-by-staff/run` với
  `{"params":{"after":"<ngày đầu kỳ>","before":"<ngày cuối kỳ>","include_no_income":"true"}}`. Response trả **toàn bộ**
  staff (`rows`, `total_rows`); bảng phân trang phía client 30 dòng/trang (`?page=N`), cùng thứ tự với `rows`.
- Kỳ `Oct 30 – Nov 2, 2026 (Current Period, Unclosed)`: 340 staff; có staff Orders > 0, Total income $0.00 (vd `24234`
  4 order / $150.00, `333`, `3333`, `5t67`…). Số âm hiển thị bằng dấu trừ Unicode: `1001vvv` Total income **`−$22.88`**.
- Tiền trong response tính bằng **cent** (`subtotal: 117299` → `$1,172.99`).
- Kỳ **đã đóng** (vd `Oct 23 – Oct 29, 2026`) không chạy báo cáo mà đọc bản chốt `GET /staff_payrolls?page=N&periodId=…`
  (phân trang phía server, `totalItems` = 342, có cả staff $0). Cột Supply fee lấy từ field khác với báo cáo live nên
  TC-06 không so cột này.
- Bấm 1 dòng → panel chi tiết (Sale, Refund, Subtotal, …, **Total income**, Split pay); với staff income $0 panel hiện
  đủ các mục, Total income `$0.00`, không lỗi.

---

## B. Test case

### B1. Portal (tự động)

#### TC-VP3356-01 — Kỳ Unclosed truy vấn kèm `include_no_income` · High

| Bước | Thao tác                                 | Kết quả mong đợi                                                     |
| ---- | ---------------------------------------- | -------------------------------------------------------------------- |
| 1    | Mở Payroll › Staff Payroll (kỳ mặc định) | Kỳ đang chọn là "… Current Period (Unclosed)"                        |
| 2    | Xem request `staff-by-staff/run`         | `params.include_no_income = "true"`, `after`/`before` là ngày của kỳ |

#### TC-VP3356-02 — Bảng liệt kê đủ mọi staff của báo cáo · High

| Bước | Thao tác                    | Kết quả mong đợi                                 |
| ---- | --------------------------- | ------------------------------------------------ |
| 1    | Đọc tổng ở thanh phân trang | `… of N` với N = `total_rows` = số dòng response |

#### TC-VP3356-03 — Số liệu dòng khớp báo cáo (trang 1) · High

| Bước | Thao tác                                      | Kết quả mong đợi                                                                            |
| ---- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1    | So 30 dòng đầu với 30 `rows` đầu của response | Name, Orders, Subtotal, Supply fee, Tip, Total income khớp (cent → `$x,xxx.xx`, số âm `−$`) |

#### TC-VP3356-06 — Kỳ đã đóng cũng liệt kê đủ staff, kể cả income $0 · High

| Bước | Thao tác                                    | Kết quả mong đợi                                                                                                                         |
| ---- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Chọn kỳ đã đóng gần nhất ở ô Payroll period | Portal gọi `GET /staff_payrolls?periodId=…`                                                                                              |
| 2    | So tổng ở phân trang với response           | Bằng `totalItems`; 30 dòng trang 1 khớp `member` (Name, Orders, Subtotal, Tip, Total income); staff Orders > 0 & income $0 có trong bảng |

> Số âm (case refund `1001bc` −$62.00) được kiểm trong TC-03 khi trang 1 có dòng âm.

### B2. POS (test tay)

#### TC-VP3356-POS-01 — Kỳ Unclosed: staff Orders > 0 nhưng Total Income $0 vẫn hiện · Critical

| Bước | Thao tác                                                                                                     | Kết quả mong đợi                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 1    | Portal › Payroll › Staff Payroll, kỳ Current Period (Unclosed): ghi lại staff Orders > 0, Total income $0.00 |                                                                    |
| 2    | POS › Income Reports › **Staff Payroll**, cùng kỳ                                                            | Các staff đó có trong danh sách, Total Income **$0.00** (không ẩn) |

#### TC-VP3356-POS-02 — Case refund âm hiện đúng dấu · High

| Bước | Thao tác                                       | Kết quả mong đợi                                |
| ---- | ---------------------------------------------- | ----------------------------------------------- |
| 1    | Tìm staff có Subtotal âm (vd `1001bc` −$62.00) | Dòng hiện, Subtotal mang dấu âm đúng như Portal |

#### TC-VP3356-POS-03 — Danh sách POS khớp Portal ở kỳ Unclosed và kỳ đã đóng · High

| Bước | Thao tác                                       | Kết quả mong đợi                                                                                             |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1    | So danh sách staff POS với Portal, kỳ Unclosed | Cùng tập staff                                                                                               |
| 2    | Lặp lại với 1 kỳ đã đóng                       | Cùng tập staff (query kỳ đóng của POS từng lọc `status = active` — staff inactive phải vẫn có nếu Portal có) |

#### TC-VP3356-POS-04 — Dòng Summary khớp danh sách · High

| Bước | Thao tác                                                                        | Kết quả mong đợi                                                                       |
| ---- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1    | Đọc Summary (Total Staff / Orders / Subtotal / Supply Fee / Tip / Total Income) | Bằng tổng các dòng sau khi bổ sung staff $0 (gồm cả −$62.00 / +$30.00 trước đây bị ẩn) |

#### TC-VP3356-POS-05 — Màn Staff Income không đổi hành vi (VP-2460) · Medium

| Bước | Thao tác                                | Kết quả mong đợi                                              |
| ---- | --------------------------------------- | ------------------------------------------------------------- |
| 1    | POS › Staff Income (V1 và V2), mặc định | Vẫn **ẩn** staff không có income như trước (không regression) |

> Mở chi tiết staff income $0 trên POS: xem TC-VP3891-POS-02 ở [VP-3891](staff-payroll-zero-income-unclosed.md).

---

## C. Kết quả QC trên Linear

- Ticket **QC Completed**; cả 6 acceptance criteria đã được tick trên Linear. Ca staff JD53001 ở kỳ Unclosed được log lại
  thành VP-3891 (cũng đã QC Completed).

## D. Chạy test tự động

```bash
ENV=stage npx playwright test tests/e2e/regression-linear/vp-3356.e2e.spec.ts -g "TC-VP3356-0[1236]" --reporter=list
```

## Lịch sử chạy

### 2026-11-02 (UTC+7)

- Kết quả 4 ca của file này: **4/4 passed** (kỳ hiện tại Oct 30 – Nov 2: 340 staff; kỳ đóng Oct 23 – Oct 29: 342 staff).
- Chỉ đọc, không ghi dữ liệu.
