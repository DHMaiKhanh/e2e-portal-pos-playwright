# VP-5216 — Customers: bộ lọc Group thiếu group mới, hiện group đã xoá (Portal)

> Bug con của [VP-4566](customer-group-duplicate-name.md): bộ lọc **Group** ở tab Customers chỉ tải 30 group đầu (thiếu
> group mới tạo) và có cả group đã xoá. Spec: `tests/e2e/regression-linear/vp-4566.e2e.spec.ts` (ID giữ theo spec cha:
> `TC-VP4566-11`, `TC-VP4566-12`).

|                     |                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**          | [VP-5216](https://linear.app/fastboy/issue/VP-5216) — QC Completed · cha [VP-4566](https://linear.app/fastboy/issue/VP-4566) |
| **Màn hình**        | Customers › tab **Customers** — bộ lọc **Group**                                                                             |
| **Môi trường**      | DEV Portal `https://v2.dev-fastboypay.com`, store `#14`, session `admin.stage.json`                                          |
| **Chạy**            | `ENV=stage npx playwright test tests/e2e/regression-linear/vp-4566.e2e.spec.ts -g "TC-VP4566-1[12]"`                         |
| **Ghi dữ liệu DEV** | Có — tạo group `E2E VP4566 <runId>-11 Filter` / `-12 Deleted` rồi xoá trong `afterEach`                                      |
| **Tổng test case**  | 2                                                                                                                            |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** danh sách option của bộ lọc Group: đủ group active (kể cả group mới nhất), không có group đã xoá.
- **Ngoài phạm vi:** cách phân biệt các group trùng tên trong bộ lọc — ticket có nêu nhưng chưa có thiết kế (ngày tạo?
  số member?), bổ sung test case khi dev chốt UI.
- **Nguyên nhân (quét 29/10):** bộ lọc gọi `GET /customer_groups` **không có tham số** → server trả 30 group đầu, gồm cả
  group đã xoá (xoá là xoá mềm, `status: "deleted"`).

---

## B. Test case

#### TC-VP4566-11 — Bộ lọc Group có group mới tạo · High

| Bước | Thao tác                            | Kết quả mong đợi                                                  |
| ---- | ----------------------------------- | ----------------------------------------------------------------- |
| 1    | Tạo group `<BASE> Filter`           |                                                                   |
| 2    | Tab Customers → mở bộ lọc **Group** | Có option `<BASE> Filter` (danh sách không bị cắt ở 30 group đầu) |

#### TC-VP4566-12 — Bộ lọc Group không hiện group đã xoá · Medium

| Bước | Thao tác                              | Kết quả mong đợi                     |
| ---- | ------------------------------------- | ------------------------------------ |
| 1    | Tạo group `<BASE> Deleted` rồi xoá nó |                                      |
| 2    | Tab Customers → mở bộ lọc Group       | **Không** có option `<BASE> Deleted` |

---

## C. Chạy test tự động

```bash
ENV=stage npx playwright test tests/e2e/regression-linear/vp-4566.e2e.spec.ts -g "TC-VP4566-1[12]" --reporter=list
```

## Lịch sử chạy

### 2026-10-29 (UTC+7)

- **Fail cả 2 ca** (đúng kỳ vọng khi fix chưa lên DEV):
  - TC-VP4566-11 — group vừa tạo không có trong bộ lọc Group (bộ lọc chỉ tải 30 group đầu)
  - TC-VP4566-12 — dữ liệu bộ lọc có 7 group đã xoá: `string`, `aa`, `kkkkk`, `1111`, `heloooooo…`, `xxxx…`,
    `QC VP-4566 Dup`
- Ticket đã chuyển **QC Completed** sau lần chạy này; chưa chạy lại tự động.

### 2026-11-03 (UTC+7) — re-test sau khi fix lên DEV

- Lệnh: `ENV=stage npx playwright test tests/e2e/regression-linear/vp-4566.e2e.spec.ts -g "TC-VP4566-(02|03|08|11|12)" --retries=0 --reporter=list`
- Kết quả: **TC-VP4566-11, -12 PASS** (cả 5 ca bug con: 5/5 passed) → bug đã được fix trên DEV.
- Dữ liệu DEV sau khi chạy: không còn group `E2E VP4566 …` nào active (kiểm qua API).
