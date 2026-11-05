# VP-4566 — Cho phép tạo Customer Group trùng tên (Portal)

> Bỏ ràng buộc "tên Customer Group không được trùng", đồng bộ với DTS (DTS đang cho phép trùng). Trước fix, Portal chặn
> và báo **"Customer group name is already in use."**. Spec: `tests/e2e/regression-linear/vp-4566.e2e.spec.ts`.
> ID test case: `TC-VP4566-NN`.

|                     |                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**          | [VP-4566](https://linear.app/fastboy/issue/VP-4566) — Urgent · QC Completed                                                                                 |
| **PR**              | volt-pos-api [#1567](https://github.com/FastboyMarketing/volt-pos-api/pull/1567) · volt-pos [#3149](https://github.com/FastboyMarketing/volt-pos/pull/3149) |
| **Bug con**         | Mỗi bug một file riêng — xem bảng dưới                                                                                                                      |
| **Màn hình**        | Customers › tab **Customer Groups** (`/pos/nail/<store>/customers?tab=groups`)                                                                              |
| **Môi trường**      | DEV Portal `https://v2.dev-fastboypay.com`, store `#14` (Volt POS tiem test 14 v1), session `admin.stage.json`                                              |
| **Chạy**            | `ENV=stage npx playwright test tests/e2e/regression-linear/vp-4566.e2e.spec.ts`                                                                             |
| **Ghi dữ liệu DEV** | Có — tạo group tên `E2E VP4566 <runId>…` rồi **xoá trong `afterEach`**; không gán customer, không sửa group có sẵn                                          |
| **Tổng test case**  | 7 trong file này (spec có 12: 5 ca còn lại nằm ở file của bug con)                                                                                          |

| Bug con                                             | Nội dung                                        | File                                                         | Test case         |
| --------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ | ----------------- |
| [VP-5214](https://linear.app/fastboy/issue/VP-5214) | Tạo/sửa được group tên chỉ có khoảng trắng      | [customer-group-blank-name.md](customer-group-blank-name.md) | TC-VP4566-02, -08 |
| [VP-5215](https://linear.app/fastboy/issue/VP-5215) | Tên group không được trim đầu/cuối              | [customer-group-name-trim.md](customer-group-name-trim.md)   | TC-VP4566-03      |
| [VP-5216](https://linear.app/fastboy/issue/VP-5216) | Bộ lọc Group hiện group đã xoá, thiếu group mới | [customer-group-filter.md](customer-group-filter.md)         | TC-VP4566-11, -12 |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** tạo / sửa tên Customer Group trùng tên trên Portal, danh sách + tìm kiếm group, kiểm tra server
  (API) không còn chặn trùng tên.
- **Ngoài phạm vi:** app POS Windows/Android (QC đã test tay 9/9 Pass trên POS 1.1.78, xem comment Linear 29/10).
- **Dữ liệu:** mỗi lần chạy sinh `runId` (timestamp base36) để tên không đụng lần chạy khác hoặc worker khác.
  - `BASE = "E2E VP4566 <runId>-<case>"` — mỗi case một tên riêng, nên các case chạy song song được.
  - Mọi group test tạo ra (qua API hoặc qua form, lấy từ response `POST`) được ghi id lại và xoá trong `afterEach`
    (kể cả khi case fail).
- **Không đụng** group có sẵn của tiệm (VIP, QA G1, hihi…) — ca "group cũ không bị ảnh hưởng" dùng group do chính test tạo.

### Những điều phát hiện khi quét DOM (2026-10-29, chặn mọi request ghi)

- Nút **Create group** ở header mở dialog "Create customer group" (Group name, Description, Cancel / Create group).
  Menu "Actions for <tên>" của mỗi dòng: View customers / Edit / Delete…. Edit → dialog "Edit customer group"
  (Save changes). Delete… → alertdialog "Delete customer group" (Delete group).
- Bỏ trống tên → `alert "Group name is required"`, không gửi request.
- API ở host data `volt-pos.<portal-host>`, xác thực bằng cookie phiên + header `x-merch-id`:
  `GET /customer_groups?page=1&name[]=<q>&status[]=active&order[createdAt]=desc`, `POST /customer_groups {name, status}`,
  `PUT /customer_groups/<id> {name, status}`. **Xoá là xoá mềm:** `PUT … {status: "deleted"}`.

---

## B. Test case

### B1. Validate tên

#### TC-VP4566-01 — Bỏ trống Group name bị chặn · High

| Bước | Thao tác                                | Kết quả mong đợi                                                        |
| ---- | --------------------------------------- | ----------------------------------------------------------------------- |
| 1    | Tab Customer Groups → mở form tạo group | Form hiện, ô Group name trống                                           |
| 2    | Bấm Create/Save khi chưa nhập gì        | Báo lỗi **"Group name is required"**; không có request `POST` tạo group |

### B2. Tạo group trùng tên — mục tiêu chính của ticket

#### TC-VP4566-04 — Tạo group trùng tên hoàn toàn thành công · Urgent

| Bước | Thao tác                            | Kết quả mong đợi                                                                      |
| ---- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| 1    | Tạo group `<BASE>`                  | Tạo thành công                                                                        |
| 2    | Tạo tiếp group tên `<BASE>` lần nữa | `POST` 2xx; **không** xuất hiện "Customer group name is already in use."; dialog đóng |
| 3    | Tìm `<BASE>` trong danh sách        | Có **2 dòng** `<BASE>` với 2 id khác nhau                                             |

#### TC-VP4566-05 — Tạo group trùng tên khác hoa/thường thành công · High

| Bước | Thao tác                             | Kết quả mong đợi                          |
| ---- | ------------------------------------ | ----------------------------------------- |
| 1    | Có group `<BASE> Case`               |                                           |
| 2    | Tạo group `<base> case` (chữ thường) | Tạo thành công, tên giữ nguyên chữ thường |
| 3    | Tìm theo tên                         | Thấy cả 2 group                           |

#### TC-VP4566-06 — Server (API) chấp nhận tên trùng · High

| Bước | Thao tác                                                        | Kết quả mong đợi                    |
| ---- | --------------------------------------------------------------- | ----------------------------------- |
| 1    | Gọi API tạo group `<BASE> Api` 2 lần (giống request của Portal) | Cả 2 lần 2xx, trả về 2 id khác nhau |
| 2    | `GET` danh sách group lọc theo tên                              | Có đủ 2 bản ghi                     |

> Ca này chứng minh ràng buộc đã bỏ ở **server**, không chỉ ở form (PR volt-pos-api #1567).

### B3. Sửa tên group

#### TC-VP4566-07 — Đổi tên group thành tên đã tồn tại thành công · High

| Bước | Thao tác                            | Kết quả mong đợi             |
| ---- | ----------------------------------- | ---------------------------- |
| 1    | Có 2 group `<BASE> A` và `<BASE> B` |                              |
| 2    | Sửa `<BASE> B` → `<BASE> A` → Save  | Lưu 2xx, không báo trùng tên |
| 3    | Tìm `<BASE> A`                      | Có 2 dòng `<BASE> A`         |

### B4. Danh sách, tìm kiếm

#### TC-VP4566-09 — Tìm kiếm trả đủ mọi group trùng tên · High

| Bước | Thao tác                                  | Kết quả mong đợi                            |
| ---- | ----------------------------------------- | ------------------------------------------- |
| 1    | Có 3 group cùng tên `<BASE> Search`       |                                             |
| 2    | Tìm `<BASE> Search` ở tab Customer Groups | Hiện đủ 3 dòng; số dòng khớp số bản ghi API |

#### TC-VP4566-10 — Group cũ cùng tên không bị ảnh hưởng · High

| Bước | Thao tác                                              | Kết quả mong đợi                                                 |
| ---- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| 1    | Có group `<BASE> Old`, ghi lại bản ghi (tên, members) |                                                                  |
| 2    | Tạo group mới cùng tên rồi sửa tên group mới          |                                                                  |
| 3    | Đọc lại group cũ                                      | Tên, số member, thông tin khác giữ nguyên; group mới có id riêng |

---

## C. Chạy test tự động

| Test case                                  | Tự động               | Ghi chú                                                        |
| ------------------------------------------ | --------------------- | -------------------------------------------------------------- |
| TC-VP4566-01, -04, -05, -06, -07, -09, -10 | `vp-4566.e2e.spec.ts` | Chạy song song; mỗi case tự dọn group đã tạo trong `afterEach` |

```bash
ENV=stage npx playwright test tests/e2e/regression-linear/vp-4566.e2e.spec.ts --reporter=list
```

Lệnh trên chạy cả 12 ca, gồm 5 ca của bug con (VP-5214/5215/5216).

## Lịch sử chạy

### 2026-10-29 (UTC+7)

- Lệnh: `ENV=stage WORKERS=4 npx playwright test tests/e2e/regression-linear/vp-4566.e2e.spec.ts --retries=0 --reporter=list`
- Kết quả cả spec: **8 passed, 5 failed** (tổng 12 TC, chưa tính setup), chạy 2 lần cho cùng kết quả
- Các ca của file này: TC-VP4566-01, -04, -05, -06, -07, -09, -10 **pass hết** → **chức năng chính của VP-4566 (cho phép
  trùng tên) đã chạy đúng**. 5 ca fail thuộc bug con, xem lịch sử ở file của từng bug.
- Dữ liệu DEV sau khi chạy: 38 group active, bằng trước khi chạy; không còn group `E2E VP4566 …` nào.
