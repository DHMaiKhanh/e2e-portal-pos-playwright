# VP-5214 — Customer Group: không cho tên chỉ có khoảng trắng (Portal)

> Bug con của [VP-4566](customer-group-duplicate-name.md): Portal tạo được (và đổi tên thành) Customer Group có tên toàn
> khoảng trắng. Tên như vậy phải bị chặn giống tên rỗng — báo **"Group name is required"**. Spec:
> `tests/e2e/regression-linear/vp-4566.e2e.spec.ts` (ID giữ theo spec cha: `TC-VP4566-02`, `TC-VP4566-08`).

|                     |                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**          | [VP-5214](https://linear.app/fastboy/issue/VP-5214) — QC Completed · cha [VP-4566](https://linear.app/fastboy/issue/VP-4566) |
| **Màn hình**        | Customers › tab **Customer Groups** — dialog _Create customer group_ / _Edit customer group_                                 |
| **Môi trường**      | DEV Portal `https://v2.dev-fastboypay.com`, store `#14`, session `admin.stage.json`                                          |
| **Chạy**            | `ENV=stage npx playwright test tests/e2e/regression-linear/vp-4566.e2e.spec.ts -g "TC-VP4566-0[28]"`                         |
| **Ghi dữ liệu DEV** | Có — nếu server lỡ tạo/sửa thì group test (`E2E VP4566 …`) được xoá trong `afterEach`                                        |
| **Tổng test case**  | 2                                                                                                                            |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** validate tên chỉ chứa khoảng trắng khi **tạo** và khi **sửa** group, ở cả form và server.
- **Ngoài phạm vi:** tên rỗng hoàn toàn (TC-VP4566-01, đã chặn từ trước) và trim đầu/cuối (VP-5215).
- **Phát hiện khi quét (29/10):** form gửi nguyên văn `"     "` lên server, server trả 2xx — tức là chưa chặn ở cả hai
  phía.

---

## B. Test case

#### TC-VP4566-02 — Tạo group tên chỉ có khoảng trắng bị chặn · Medium

| Bước | Thao tác                                           | Kết quả mong đợi                                                                          |
| ---- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1    | Customer Groups → **Create group**, nhập `"     "` |                                                                                           |
| 2    | Bấm **Create group**                               | Báo lỗi **"Group name is required"**; không tạo group (không `POST`, hoặc server trả 4xx) |

#### TC-VP4566-08 — Đổi tên group thành chỉ khoảng trắng bị chặn · Medium

| Bước | Thao tác                                         | Kết quả mong đợi                                            |
| ---- | ------------------------------------------------ | ----------------------------------------------------------- |
| 1    | Có group `<BASE> Edit`                           |                                                             |
| 2    | Edit → đổi tên thành `"    "` → **Save changes** | Báo lỗi "Group name is required"; tên trên server không đổi |

---

## C. Chạy test tự động

```bash
ENV=stage npx playwright test tests/e2e/regression-linear/vp-4566.e2e.spec.ts -g "TC-VP4566-0[28]" --reporter=list
```

## Lịch sử chạy

### 2026-10-29 (UTC+7)

- **Fail cả 2 ca** (đúng kỳ vọng khi fix chưa lên DEV):
  - TC-VP4566-02 — server tạo được group tên `"     "` (POST 2xx)
  - TC-VP4566-08 — đổi tên thành `"    "` vẫn lưu được (PUT 2xx)
- Group tên trống (`"     "`, tạo 10:31 sáng 29/10) có từ trước khi chạy suite — là dữ liệu của lần test tay, không do suite tạo.
- Ticket đã chuyển **QC Completed** sau lần chạy này; chưa chạy lại tự động.

### 2026-11-03 (UTC+7) — re-test sau khi fix lên DEV

- Lệnh: `ENV=stage npx playwright test tests/e2e/regression-linear/vp-4566.e2e.spec.ts -g "TC-VP4566-(02|03|08|11|12)" --retries=0 --reporter=list`
- Kết quả: **TC-VP4566-02, -08 PASS** (cả 5 ca bug con: 5/5 passed) → bug đã được fix trên DEV.
- Dữ liệu DEV sau khi chạy: không còn group `E2E VP4566 …` nào active (kiểm qua API).
