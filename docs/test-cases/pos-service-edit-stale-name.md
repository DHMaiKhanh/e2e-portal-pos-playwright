# VP-1418 — Dialog Update Service hiện tên cũ sau khi sửa service trong category (POS)

> Sửa tên service trong một category (vd `victory123` → `victory456`) thì lưu đúng, nhưng mở lại dialog Update Service
> vẫn hiện tên cũ. Yêu cầu: dialog luôn hiện giá trị vừa lưu, làm mới dữ liệu cache/query sau khi update thành công, và
> không field nào khác bị dữ liệu cũ. ID test case: `TC-VP1418-NN`.

|                           |                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| **Ticket**                | [VP-1418](https://linear.app/fastboy/issue/VP-1418) — QC Completed                              |
| **PR**                    | Chưa rõ (không ghi trong ticket/comment)                                                        |
| **Nền tảng**              | POS Windows                                                                                     |
| **Màn hình / Thành phần** | Setting → Services & Products → chọn category → dialog **Update Service**; màn Home (ô service) |
| **Môi trường**            | POS DEV, bản ≥ 1.1.62, tiệm "Volt POS tiem test 14 v1"                                          |
| **Tự động hoá**           | Không — app POS, test tay                                                                       |
| **Tổng test case**        | 8                                                                                               |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** giá trị hiển thị khi mở lại dialog Update Service sau khi lưu (tên, mô tả, giá, Supply Fee,
  Duration, Shown on Web Booking), hiển thị ở màn Home, sau khi đổi category / reload app.
- **Ngoài phạm vi:** đồng bộ service sang Portal/GCI.
- **Dữ liệu:** 1 service test trong 1 category (QC đã dùng category "Other test", service `aaa`). **Sau khi test trả
  service về như cũ** (tên, mô tả trống, Supply Fee $0.00, 0 mins, tắt Shown on Web Booking).
- Dev ghi chú (30/09) là không tái hiện được lỗi gốc ổn định — nên chạy đủ các ca sửa liên tiếp / đổi màn.

---

## B. Test case

### B1. Tên service

#### TC-VP1418-01 — Đổi tên rồi mở lại dialog hiện tên mới · High

| Bước | Thao tác                                                             | Kết quả mong đợi            |
| ---- | -------------------------------------------------------------------- | --------------------------- |
| 1    | Mở Update Service → đổi tên `victory123` → `victory456` → **Update** | Lưu thành công, dialog đóng |
| 2    | Mở lại dialog của service đó (không refresh tay)                     | Ô tên hiện `victory456`     |

#### TC-VP1418-02 — Sửa liên tiếp nhiều lần · Medium

| Bước | Thao tác                                          | Kết quả mong đợi  |
| ---- | ------------------------------------------------- | ----------------- |
| 1    | Đổi `victory456` → `victory789` → Update → mở lại | Hiện `victory789` |
| 2    | Đổi tiếp → `victory999` → Update → mở lại         | Hiện `victory999` |

#### TC-VP1418-03 — Chuyển category khác rồi quay lại · Medium

| Bước | Thao tác                                                | Kết quả mong đợi               |
| ---- | ------------------------------------------------------- | ------------------------------ |
| 1    | Chọn category khác (vd Skincare) → quay lại category cũ | Danh sách service hiện tên mới |
| 2    | Mở dialog service đã sửa                                | Hiện tên mới nhất              |

#### TC-VP1418-04 — Tên mới hiển thị ở màn Home · Medium

| Bước | Thao tác                             | Kết quả mong đợi                  |
| ---- | ------------------------------------ | --------------------------------- |
| 1    | Về Home → chọn category chứa service | Ô service hiện tên (và mô tả) mới |

#### TC-VP1418-05 — Reload app rồi mở lại dialog · Medium

| Bước | Thao tác                               | Kết quả mong đợi |
| ---- | -------------------------------------- | ---------------- |
| 1    | Đổi tên → Update → reload app          |                  |
| 2    | Vào lại Setting → category → mở dialog | Hiện tên vừa lưu |

#### TC-VP1418-06 — Sửa nhưng không lưu thì không giữ bản nháp · Low

| Bước | Thao tác                                               | Kết quả mong đợi                                    |
| ---- | ------------------------------------------------------ | --------------------------------------------------- |
| 1    | Mở dialog, gõ `victoryDRAFT`, bấm **X** (không Update) | Dialog đóng, không lưu                              |
| 2    | Mở lại dialog                                          | Hiện tên đã lưu trước đó, không phải `victoryDRAFT` |

### B2. Các field khác

#### TC-VP1418-07 — Các field khác không bị dữ liệu cũ · High

| Bước | Thao tác                                                                                                     | Kết quả mong đợi                    |
| ---- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| 1    | Sửa Description `QC desc VP-1418`, Supply Fee `$2.50`, Duration `15 mins`, bật Shown on Web Booking → Update |                                     |
| 2    | Mở lại dialog                                                                                                | Mọi field hiện đúng giá trị vừa lưu |

#### TC-VP1418-08 — Đổi giá service rồi mở lại dialog · Medium

| Bước | Thao tác                            | Kết quả mong đợi                |
| ---- | ----------------------------------- | ------------------------------- |
| 1    | Đổi giá service (vd +$1) → Update   |                                 |
| 2    | Mở lại dialog; xem ô service ở Home | Dialog và Home đều hiện giá mới |

---

## C. Kết quả QC trên Linear

**26/10/2026** — khanh_do, POS Windows DEV **1.1.62** (có kiểm tra qua đổi version 1.1.62 → 1.1.59 → nâng lại 1.1.62
bằng Version Update, dữ liệu service vẫn đúng): **7/7 PASS – 0 FAIL**.

| Test case (doc) | TC trên Linear | Kết quả   | Ghi chú                                     |
| --------------- | -------------- | --------- | ------------------------------------------- |
| TC-VP1418-01    | TC01           | PASS      |                                             |
| TC-VP1418-02    | TC03           | PASS      | victory456 → 789 → 999                      |
| TC-VP1418-03    | TC04           | PASS      | Skincare ↔ Other test                       |
| TC-VP1418-04    | TC05           | PASS      |                                             |
| TC-VP1418-05    | TC06           | PASS      | Đổi về victory123 rồi reload                |
| TC-VP1418-06    | TC07           | PASS      |                                             |
| TC-VP1418-07    | TC02           | PASS      | Kiểm sau khi đổi version POS                |
| TC-VP1418-08    | —              | Chưa chạy | Ca bổ sung (field giá chưa được test riêng) |

Không phát hiện bug. Service đã được trả về như cũ sau khi test.

## Lịch sử chạy

### 2026-10-26

- QC tay trên POS Windows DEV 1.1.62 — 7/7 PASS (TC-01 … -07). TC-08 chưa chạy.
