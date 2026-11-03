# VP-4809 (Request 2) — In nhiều Staff Income/Payroll trên một receipt (POS)

> Request 2 của ticket #1561986 (Larita Nail Spa #21397): tiệm muốn in toàn bộ Staff Income cùng lúc trên **1 receipt**
> thay vì chọn và in từng staff. Thêm multi-select staff khi xem báo cáo Staff Income/Payroll; **Print** in tuần tự báo
> cáo của mọi staff đã chọn, mỗi staff một phần riêng. Request 1 (Font Size) ở [font-size-setting.md](font-size-setting.md).

|                    |                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------- |
| **Ticket**         | [VP-4809](https://linear.app/fastboy/issue/VP-4809) — QC Completed                      |
| **Nền tảng**       | POS Windows (Android: chưa rõ trong ticket)                                             |
| **Màn hình**       | POS › Income Reports › **Staff Income** / **Staff Payroll** — chọn staff, nút **Print** |
| **Môi trường**     | POS DEV, store `#14`, máy in receipt                                                    |
| **Tự động hoá**    | Không — app POS, test tay                                                               |
| **Tổng test case** | 9                                                                                       |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** chọn một / nhiều / tất cả staff, in ra 1 receipt gồm từng phần riêng cho mỗi staff, số liệu khớp
  báo cáo, áp dụng cho Staff Income và Staff Payroll.
- **Ngoài phạm vi:** Font Size (Request 1); cách in từng staff như trước (chỉ kiểm không bị hỏng — TC-08).
- **Dữ liệu:** kỳ có ít nhất 3 staff có income và 1 staff income $0. Ticket chỉ mô tả yêu cầu, chưa có thiết kế chi
  tiết (vị trí checkbox, nút Select all, thứ tự in) — các ca dưới viết theo yêu cầu, cần đối chiếu lại khi có UI.

---

## B. Test case

#### TC-VP4809-PR-01 — Có chọn nhiều staff trên báo cáo · High

| Bước | Thao tác                                     | Kết quả mong đợi                                    |
| ---- | -------------------------------------------- | --------------------------------------------------- |
| 1    | Mở Income Reports › Staff Income (kỳ bất kỳ) | Mỗi staff có ô chọn; chọn được nhiều staff cùng lúc |

#### TC-VP4809-PR-02 — In 1 staff · High

| Bước | Thao tác                 | Kết quả mong đợi                                               |
| ---- | ------------------------ | -------------------------------------------------------------- |
| 1    | Chọn 1 staff → **Print** | 1 receipt, có phần báo cáo của staff đó, số liệu khớp màn hình |

#### TC-VP4809-PR-03 — In nhiều staff trên một receipt · Critical

| Bước | Thao tác                           | Kết quả mong đợi                                                                     |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | Chọn 3 staff → **Print**           | **Một** receipt, in tuần tự 3 phần; mỗi phần có tên staff và đường ngăn cách rõ ràng |
| 2    | So từng phần với báo cáo của staff | Số liệu từng phần khớp màn hình, không lẫn số giữa các staff                         |

#### TC-VP4809-PR-04 — Chọn tất cả staff · High

| Bước | Thao tác                                | Kết quả mong đợi                                         |
| ---- | --------------------------------------- | -------------------------------------------------------- |
| 1    | Chọn tất cả (Select all nếu có) → Print | Receipt có đủ phần của mọi staff đã chọn, không thiếu ai |

#### TC-VP4809-PR-05 — Thứ tự in theo thứ tự danh sách · Medium

| Bước | Thao tác                           | Kết quả mong đợi                                                                           |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| 1    | Chọn staff không liền nhau → Print | Thứ tự các phần trên receipt nhất quán (theo danh sách hoặc thứ tự chọn — xác nhận với PO) |

#### TC-VP4809-PR-06 — Staff income $0 · Medium

| Bước | Thao tác                                 | Kết quả mong đợi                                  |
| ---- | ---------------------------------------- | ------------------------------------------------- |
| 1    | Chọn kèm 1 staff có income $0.00 → Print | Phần của staff đó in đủ các dòng $0.00, không lỗi |

#### TC-VP4809-PR-07 — Không chọn staff nào · Medium

| Bước | Thao tác                    | Kết quả mong đợi                                           |
| ---- | --------------------------- | ---------------------------------------------------------- |
| 1    | Bỏ chọn hết → bấm **Print** | Nút Print bị khoá hoặc có thông báo; không in receipt rỗng |

#### TC-VP4809-PR-08 — In từng staff như cũ không bị ảnh hưởng · High

| Bước | Thao tác                                            | Kết quả mong đợi                |
| ---- | --------------------------------------------------- | ------------------------------- |
| 1    | Mở chi tiết 1 staff → in như trước khi có tính năng | Vẫn in đúng receipt của 1 staff |

#### TC-VP4809-PR-09 — Áp dụng cho Staff Payroll · High

| Bước | Thao tác                                       | Kết quả mong đợi         |
| ---- | ---------------------------------------------- | ------------------------ |
| 1    | Lặp TC-03 ở Income Reports › **Staff Payroll** | Kết quả như Staff Income |

---

## C. Kết quả QC trên Linear

- **02/11/2026 (POS dev 1.1.89): PASS** — QC đính kèm video, không có bảng từng ca, nên các TC ở mục B chưa có kết quả riêng. Ticket VP-4809 đã **QC Completed**.

## Lịch sử chạy

Chưa chạy.
