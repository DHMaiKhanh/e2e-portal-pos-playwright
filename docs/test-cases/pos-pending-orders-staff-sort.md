# VP-4035 — Sắp xếp staff đã check-in theo thứ tự check-in (POS)

> Trên màn Pending Orders / Home (khu vực chọn staff), danh sách staff đã check-in phải xếp theo thời gian check-in:
> ai check-in trước lên đầu, người check-in sau nối đuôi phía sau. Chọn qua nút Sort → **Staff Checked In**
> (Ascending / Descending). ID test case: `TC-VP4035-NN`.

|                    |                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Ticket**         | [VP-4035](https://linear.app/fastboy/issue/VP-4035) — Done                                                              |
| **PR**             | Không ghi trong Linear                                                                                                  |
| **Nền tảng**       | Windows (QC đã chạy) / Android (chưa có kết quả)                                                                        |
| **Màn hình**       | POS › Home / Pending Orders › khu vực chọn staff › nút Sort; POS › **Time Keeping** để check-in/out và đối chiếu giờ IN |
| **Môi trường**     | POS Windows DEV ≥ 1.1.62, tiệm "Volt POS tiem test 14 v1"                                                               |
| **Tự động hoá**    | Không — app POS, test tay                                                                                               |
| **Tổng test case** | 7                                                                                                                       |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** sort Staff Checked In (Ascending / Descending), staff check-in mới nối đuôi, staff chưa
  check-in, check-out và check-in lại trong ngày, đối chiếu với Time Keeping.
- **Ngoài phạm vi:** lựa chọn Sort sau khi reload app — hiện quay về "Default Order", không giữ "Staff Checked In"
  (QC ghi nhận, không thuộc ticket).
- **Dữ liệu:** 10 staff check-in trong ngày theo thứ tự 24234 → 1001vvv → 333 → 5t67 → Althea → Anastasia →
  Alexander2 → APIB… → Anna → Angela (11:31 AM, cách nhau vài giây); thêm Pamela, Zelene Doyle để check-in sau; staff
  chưa check-in: Hiha1, Thalia, Kani…

---

## B. Test case

#### TC-VP4035-01 — Sort theo thứ tự check-in (Ascending) · High

| Bước | Thao tác                                       | Kết quả mong đợi                                                               |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| 1    | Check-in 10 staff theo thứ tự ở mục A          |                                                                                |
| 2    | Home → Sort → **Staff Checked In** → Ascending | Staff check-in sớm nhất lên đầu, đúng thứ tự giờ check-in (24234 → … → Angela) |

#### TC-VP4035-02 — Staff check-in mới nối đuôi phía sau · High

| Bước | Thao tác                                               | Kết quả mong đợi                                        |
| ---- | ------------------------------------------------------ | ------------------------------------------------------- |
| 1    | Đang sort Staff Checked In – Ascending                 |                                                         |
| 2    | Time Keeping → Check In Pamela → Check In Zelene Doyle |                                                         |
| 3    | Về Home                                                | … Angela → Pamela → Zelene Doyle (nối đuôi đúng thứ tự) |

#### TC-VP4035-03 — Staff chưa check-in nằm sau nhóm đã check-in · Medium

| Bước | Thao tác                     | Kết quả mong đợi                                                        |
| ---- | ---------------------------- | ----------------------------------------------------------------------- |
| 1    | Xem phần sau nhóm checked-in | Staff chưa check-in (Hiha1, Thalia, Kani…) xếp sau, giữ thứ tự mặc định |

#### TC-VP4035-04 — Sort Descending · Medium

| Bước | Thao tác              | Kết quả mong đợi                                                                                                                       |
| ---- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Sort → **Descending** | Đảo ngược toàn bộ: staff chưa check-in lên trước, nhóm checked-in ở cuối từ mới nhất → sớm nhất (Zelene → Pamela → Angela → … → 24234) |

#### TC-VP4035-05 — Staff check-out bị bỏ khỏi nhóm checked-in · Medium

| Bước | Thao tác                        | Kết quả mong đợi                                                  |
| ---- | ------------------------------- | ----------------------------------------------------------------- |
| 1    | Time Keeping → Check Out Pamela |                                                                   |
| 2    | Về Home                         | Pamela không còn trạng thái checked-in, về lại nhóm chưa check-in |

#### TC-VP4035-06 — Check-out rồi check-in lại trong ngày · Medium

| Bước | Thao tác                                      | Kết quả mong đợi                                                                                                   |
| ---- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1    | Sau TC-05, Time Keeping → Check In lại Pamela |                                                                                                                    |
| 2    | Về Home                                       | Pamela quay lại nhóm checked-in, giữ vị trí theo lần check-in **đầu tiên** trong ngày (… Angela → Pamela → Zelene) |

#### TC-VP4035-07 — Đối chiếu với Time Keeping · Medium

| Bước | Thao tác                                      | Kết quả mong đợi         |
| ---- | --------------------------------------------- | ------------------------ |
| 1    | So thứ tự trên Home với giờ IN ở Time Keeping | Thứ tự khớp giờ check-in |

---

## C. Kết quả QC trên Linear

**26/10/2026 — POS Windows DEV 1.1.62**, tiệm "Volt POS tiem test 14 v1": **7/7 pass, 0 fail**.

| Test case          | Kết quả |
| ------------------ | ------- |
| TC-VP4035-01 … -07 | PASS    |

- Không có bug. Ghi nhận ngoài phạm vi: sau reload app, Sort quay về "Default Order".
- Chưa có kết quả trên Android.

## Lịch sử chạy

### 2026-10-26 (UTC+7)

- POS Windows DEV 1.1.62 (nâng cấp qua Version Update), tiệm "Volt POS tiem test 14 v1".
- Kết quả: 7/7 pass.
