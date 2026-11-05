# VP-5215 — Customer Group: trim khoảng trắng đầu/cuối tên (Portal)

> Bug con của [VP-4566](customer-group-duplicate-name.md): tên group có khoảng trắng đầu/cuối được lưu nguyên văn. Khi đã
> cho phép trùng tên, `"VIP"` và `" VIP "` trở thành hai group nhìn giống nhau. Tên phải được trim trước khi lưu. Spec:
> `tests/e2e/regression-linear/vp-4566.e2e.spec.ts` (ID giữ theo spec cha: `TC-VP4566-03`).

|                     |                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**          | [VP-5215](https://linear.app/fastboy/issue/VP-5215) — QC Completed · cha [VP-4566](https://linear.app/fastboy/issue/VP-4566) |
| **Màn hình**        | Customers › tab **Customer Groups** — dialog _Create customer group_                                                         |
| **Môi trường**      | DEV Portal `https://v2.dev-fastboypay.com`, store `#14`, session `admin.stage.json`                                          |
| **Chạy**            | `ENV=stage npx playwright test tests/e2e/regression-linear/vp-4566.e2e.spec.ts -g "TC-VP4566-03"`                            |
| **Ghi dữ liệu DEV** | Có — tạo group `E2E VP4566 <runId>-03 Trim` rồi xoá trong `afterEach`                                                        |
| **Tổng test case**  | 1                                                                                                                            |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** tên lưu trên server và tên hiển thị trong danh sách sau khi tạo group có khoảng trắng đầu/cuối.
- **Ngoài phạm vi:** tên chỉ có khoảng trắng (VP-5214).
- **Phát hiện khi quét (29/10):** form gửi nguyên văn tên chưa trim lên server, server lưu nguyên văn.

---

## B. Test case

#### TC-VP4566-03 — Khoảng trắng đầu/cuối được trim · Medium

| Bước | Thao tác                                | Kết quả mong đợi                                                        |
| ---- | --------------------------------------- | ----------------------------------------------------------------------- |
| 1    | Mở form tạo, nhập `"   <BASE> Trim   "` |                                                                         |
| 2    | Bấm **Create group**                    | Tạo thành công; tên lưu (API + dòng trong danh sách) là `"<BASE> Trim"` |
| 3    | Tìm `<BASE> Trim`                       | Đúng 1 dòng, tên không có khoảng trắng thừa                             |

---

## C. Chạy test tự động

```bash
ENV=stage npx playwright test tests/e2e/regression-linear/vp-4566.e2e.spec.ts -g "TC-VP4566-03" --reporter=list
```

## Lịch sử chạy

### 2026-10-29 (UTC+7)

- **Fail** (đúng kỳ vọng khi fix chưa lên DEV): tên lưu là `"   E2E VP4566 …-03 Trim   "`, không được trim.
- Group test đã được xoá trong `afterEach`.
- Ticket đã chuyển **QC Completed** sau lần chạy này; chưa chạy lại tự động.

### 2026-11-03 (UTC+7) — re-test sau khi fix lên DEV

- Lệnh: `ENV=stage npx playwright test tests/e2e/regression-linear/vp-4566.e2e.spec.ts -g "TC-VP4566-(02|03|08|11|12)" --retries=0 --reporter=list`
- Kết quả: **TC-VP4566-03 PASS** (cả 5 ca bug con: 5/5 passed) → bug đã được fix trên DEV.
- Dữ liệu DEV sau khi chạy: không còn group `E2E VP4566 …` nào active (kiểm qua API).
