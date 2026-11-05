# VP-4556 — CDC service GCI lỗi FK category khi category bị xóa đồng thời (BE)

> Alert prod 13/10/2026 (TopNotch Nail Bar #21362): pipeline `syncing-cdc`, operation `service_update` (table `service`,
> op `u`) lỗi `pq: insert or update on table "service" violates foreign key constraint "fk_e19d9ad212469de2" (23503)`.
> Nguyên nhân: query `service_update` trong `redpanda-connect/resource/gci/catalog/service.yaml` tra category **2 lần**
> bằng 2 subquery riêng (một cho `SET category_id`, một cho guard `EXISTS`), nên category bị xóa giữa lúc tra và lúc ghi
> thì FK fail và cả message CDC lỗi. Hướng sửa: tra category **1 lần** trong một CTE ngoài, `UPDATE` đọc từ CTE đó cho
> cả `category_id` và guard; áp dụng tương tự cho `service_insert`; rà các resource cùng kiểu (`staff_service`,
> `customer_checkin_service`). ID test case: `TC-VP4556-NN`.

|                           |                                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**                | [VP-4556](https://linear.app/fastboy/issue/VP-4556) — QC Completed                                                                                        |
| **PR**                    | Chưa rõ (không ghi trong ticket/comment)                                                                                                                  |
| **Nền tảng**              | Backend — pipeline `syncing-cdc` (GCI → Volt POS), `syncing-dts` (POS → GCI)                                                                              |
| **Màn hình / Thành phần** | `redpanda-connect/resource/gci/catalog/service.yaml` (`service_update`, `service_insert`); Portal → System → Monitoring → Report tasks / Background tasks |
| **Môi trường**            | DEV — GCI `pos.gocheckin.net` (Tenant Test Volpos) ↔ Volt POS merchant **#14** (Volt POS tiem test 14 v1)                                                 |
| **Tự động hoá**           | Không — kiểm qua dữ liệu/log BE                                                                                                                           |
| **Tổng test case**        | 14                                                                                                                                                        |

---

## A. Phạm vi & dữ liệu

- **Acceptance criteria:**
  1. Event `u` của service có category bị xóa đồng thời không còn gây `23503` / alert `syncing-cdc`.
  2. Sync service create/update/delete bình thường không thay đổi.
- **Trong phạm vi:** `service_update`, `service_insert` (cùng file), hành vi khi category tham chiếu không còn (skip
  update hay update `category_id = NULL` — dev cần chốt và ghi lại), resource anh em `staff_service`,
  `customer_checkin_service`.
- **Cách kiểm:** Portal → System → Monitoring → **Report tasks** / **Background tasks** → Type **Sys Notify Cdc
  Failure** (`sys_notify_cdc_failure`), lọc Status _Failed_, merchant #14; đối chiếu dữ liệu service/category trên POS /
  Portal. Ghi lại mốc giờ trước khi thao tác để so task mới.
- **Lưu ý:** lỗi gốc là race condition — xóa category trên GCI chưa chắc tái hiện đúng thời điểm. Các ca B2 kiểm "không
  phát sinh lỗi", không chứng minh được race đã hết; ca TC-04 cần dev hỗ trợ ép race (vd gửi event `u` của service sau
  khi category đã bị xóa).
- **Task không liên quan cần loại trừ:** lỗi `customer_group` (`syncing-dts`, "Volt Pos Metadata must be a string") của
  #14 lúc 11:29 ngày 02/11 không thuộc ticket này.
- **Dọn dữ liệu:** category/service tạo cho test đặt tiền tố `QC-4556-`.

---

## B. Test case

### B1. Chiều GCI → POS (`syncing-cdc`)

#### TC-VP4556-01 — Tạo category + nhiều service trên GCI sync đúng sang POS · High

| Bước | Thao tác                                                                                     | Kết quả mong đợi                                                          |
| ---- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1    | GCI → Gap Setting → Service: tạo category `QC-4556-A` + 30 service; `QC-4556-B` + 15 service | Tạo thành công trên GCI                                                   |
| 2    | Đợi sync, kiểm tra POS/Portal merchant #14                                                   | Đủ 30/30 và 15/15 service, đúng category; không có Sys Notify Cdc Failure |

#### TC-VP4556-02 — Xóa category đang có nhiều service không gây lỗi FK · Critical

| Bước | Thao tác                                           | Kết quả mong đợi                                                                     |
| ---- | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | Ghi mốc giờ; xóa `QC-4556-A` (30 service) trên GCI |                                                                                      |
| 2    | Đợi > 1 phút, Refresh Monitoring                   | Không có task Sys Notify Cdc Failure mới; không có lỗi `fk_e19d9ad212469de2` (23503) |
| 3    | Lặp lại với `QC-4556-B` (15 service)               | Như bước 2                                                                           |

#### TC-VP4556-03 — Dữ liệu POS sau khi xóa category trên GCI · High

| Bước | Thao tác                                      | Kết quả mong đợi                                                   |
| ---- | --------------------------------------------- | ------------------------------------------------------------------ |
| 1    | Sau TC-02, kiểm tra category/service trên POS | Category đã xóa không còn; service thuộc category chuyển `deleted` |

#### TC-VP4556-04 — Service `u` đến khi category đã bị xóa (ép race) · Critical

| Bước | Thao tác                                                                                                                               | Kết quả mong đợi                                                                                   |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1    | (Cần dev) Update 1 service trên GCI và xóa category của nó gần như cùng lúc, hoặc replay event `u` của service sau khi category đã xóa | Message CDC được xử lý, không lỗi `23503`, không alert `syncing-cdc`                               |
| 2    | Kiểm tra service trên POS                                                                                                              | Đúng hành vi dev đã chốt (skip update **hoặc** `category_id = NULL`), ghi rõ hành vi trong kết quả |

#### TC-VP4556-05 — Hồi quy: create / update service bình thường · High

| Bước | Thao tác                                             | Kết quả mong đợi                                      |
| ---- | ---------------------------------------------------- | ----------------------------------------------------- |
| 1    | Tạo mới service trong category còn tồn tại trên GCI  | Sync sang POS đúng tên, giá, category                 |
| 2    | Update service (đổi field, và update không đổi data) | POS nhận giá trị mới; không có Sys Notify Cdc Failure |

#### TC-VP4556-06 — Hồi quy: xóa service bình thường · High

| Bước | Thao tác                                  | Kết quả mong đợi                                 |
| ---- | ----------------------------------------- | ------------------------------------------------ |
| 1    | Xóa 1 service (category vẫn còn) trên GCI | Service trên POS chuyển `deleted`; không lỗi CDC |

#### TC-VP4556-07 — Hồi quy: update service đổi sang category khác · Medium

| Bước | Thao tác                                                            | Kết quả mong đợi                             |
| ---- | ------------------------------------------------------------------- | -------------------------------------------- |
| 1    | Trên GCI chuyển 1 service từ category X sang Y (cả hai còn tồn tại) | POS hiện service ở category Y; không lỗi CDC |

#### TC-VP4556-08 — Service không có category (`ref_id` NULL) · Medium

| Bước | Thao tác                                                            | Kết quả mong đợi                                      |
| ---- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| 1    | Tạo / update service không gán category trên GCI (nếu GCI cho phép) | Sync bình thường (guard `$13 IS NULL`), không lỗi CDC |

#### TC-VP4556-09 — `service_insert` khi category bị xóa đồng thời · High

| Bước | Thao tác                                                                                                     | Kết quả mong đợi                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 1    | (Cần dev) Tạo service trong category rồi xóa category ngay, hoặc replay event insert sau khi category đã xóa | Không lỗi `23503`, không alert `syncing-cdc`; hành vi theo quyết định của dev |

### B2. Chiều POS → GCI (`syncing-dts`)

#### TC-VP4556-10 — Tạo category trên POS · Medium

| Bước | Thao tác                                     | Kết quả mong đợi                      |
| ---- | -------------------------------------------- | ------------------------------------- |
| 1    | Portal → Services → Add category `QC-4556-C` | Tạo thành công, không có task lỗi CDC |

#### TC-VP4556-11 — Tạo nhiều service trong category trên POS · Medium

| Bước | Thao tác                                           | Kết quả mong đợi                                |
| ---- | -------------------------------------------------- | ----------------------------------------------- |
| 1    | Add service `QC-4556C Svc 01 … 08` vào `QC-4556-C` | Tạo thành công; không có Sys Notify Cdc Failure |

#### TC-VP4556-12 — Xóa category đang có nhiều service trên POS · High

| Bước | Thao tác                                                    | Kết quả mong đợi                                                     |
| ---- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| 1    | Ghi mốc giờ; xóa `QC-4556-C` trên POS, đợi ~3 phút          |                                                                      |
| 2    | Background tasks → `sys_notify_cdc_failure` + Status Failed | 0 task mới; không có lỗi `fk_e19d9ad212469de2`                       |
| 3    | Kiểm trạng thái các service của category đã xóa             | Ghi lại trạng thái (QC 02/11 thấy vẫn **Active** — chờ dev xác nhận) |
| 4    | Background tasks Failed của #14 sau mốc giờ                 | Không có task Failed mới                                             |

### B3. Resource anh em

#### TC-VP4556-13 — `staff_service` khi service/staff cha bị xóa đồng thời · Medium

| Bước | Thao tác                                                                                          | Kết quả mong đợi                                |
| ---- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1    | (Cần dev xác nhận có sửa hay không) Gán/bỏ gán service cho thợ trên GCI đồng thời với xóa service | Không lỗi FK `23503`, không alert `syncing-cdc` |

#### TC-VP4556-14 — `customer_checkin_service` khi service cha bị xóa đồng thời · Medium

| Bước | Thao tác                                                                                              | Kết quả mong đợi                                |
| ---- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1    | (Cần dev xác nhận có sửa hay không) Check-in khách chọn service trên GCI đồng thời với xóa service đó | Không lỗi FK `23503`, không alert `syncing-cdc` |

---

## C. Kết quả QC trên Linear

**02/11/2026 — lần 1** (khanh_do, GCI → POS, verify qua Report tasks → Sys Notify Cdc Failure): **5/5 PASS – 0 FAIL**.

| Test case (doc) | TC trên Linear | Kết quả | Ghi chú                                                                                              |
| --------------- | -------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| TC-VP4556-01    | 1              | PASS    | 30/30 và 15/15 service sync đúng category                                                            |
| TC-VP4556-02    | 2, 3           | PASS    | Xóa QC-4556-A (~11:20), QC-4556-B (~14:49): không task mới (vẫn 31 task, mới nhất 11:49 của #100004) |
| TC-VP4556-03    | 4              | PASS    | 30 + 15 service chuyển `deleted`                                                                     |
| TC-VP4556-05    | 5              | PASS    | Create/update (không đổi data) sync bình thường                                                      |

**02/11/2026 — lần 2** (khanh_do, POS → GCI qua `syncing-dts`, verify qua Background tasks): **4/4 PASS – 0 FAIL**.

| Test case (doc) | TC trên Linear | Kết quả | Ghi chú                                                                                                |
| --------------- | -------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| TC-VP4556-10    | 1              | PASS    | Tạo QC-4556-C 15:34                                                                                    |
| TC-VP4556-11    | 2              | PASS    | 9 service thuộc QC-4556-C (2 service không tạo được do DEV gián đoạn "We couldn't load this merchant") |
| TC-VP4556-12    | 3, 4           | PASS    | Xóa 15:40:59 → 0 task Failed; **9 service vẫn Active** sau khi xóa category                            |

**Chưa chạy:** TC-04, -06, -07, -08, -09, -13, -14 (ép race, `service_insert`, resource anh em, xóa service / đổi
category / service không category).

**Điểm mở:**

- Lỗi gốc là race condition, chưa tái hiện được đúng thời điểm — PASS ở trên chỉ chứng minh không còn lỗi FK trong các
  lần test, chưa chứng minh race đã hết (TC-04, -09 cần dev hỗ trợ).
- Xóa category từ POS thì service vẫn **Active** — đã nhờ dev xác nhận đây có phải hành vi mong muốn, chưa có trả lời.
- Hành vi khi category không còn (skip vs `category_id = NULL`) chưa thấy được ghi lại trong ticket.

## Lịch sử chạy

### 2026-11-02

- QC tay lần 1 (GCI → POS) — 5/5 PASS.
- QC tay lần 2 (POS → GCI) — 4/4 PASS.
