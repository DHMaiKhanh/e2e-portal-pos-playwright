# VP-4402 — Thứ tự cột thợ và màu appointment giống GAP (POS)

> Màn Appointment Overview trên POS phải xếp cột thợ đúng thứ tự như GAP (GoCheckin) và tô màu card/cột appointment
> theo màu thợ giống GAP (yêu cầu của tiệm Xpo Nails #19388). Thứ tự cột lấy từ `display_order` với
> `entity_type = 'staff_appointment'` (API VP-5094). Bug con **VP-5479** (1001vvv bị xếp cuối) và **VP-5481** (màu cột
> khác GAP). ID test case: `TC-VP4402-NN`.

|                    |                                                                                                                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**         | [VP-4402](https://linear.app/fastboy/issue/VP-4402) — Todo · bug con [VP-5479](https://linear.app/fastboy/issue/VP-5479) — Todo · [VP-5481](https://linear.app/fastboy/issue/VP-5481) — Todo                   |
| **PR**             | volt-pos [#3274](https://github.com/FastboyMarketing/volt-pos/pull/3274) (POS, đã approve) · volt-pos-api [#1566](https://github.com/FastboyMarketing/volt-pos-api/pull/1566) (VP-5094, đồng bộ thứ tự từ GCI) |
| **Nền tảng**       | Windows / Android                                                                                                                                                                                              |
| **Màn hình**       | POS › **Appointment Overview** (board cột thợ) · GAP `https://pos.gocheckin.net` › Appointment để đối chiếu                                                                                                    |
| **Môi trường**     | POS Windows dev ≥ **1.1.87**, store `14`; GAP store 14                                                                                                                                                         |
| **Tự động hoá**    | Không — app POS, test tay                                                                                                                                                                                      |
| **Tổng test case** | 13                                                                                                                                                                                                             |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** thứ tự cột thợ trên Appointment Overview so với GAP; màu header/viền cột và nền card appointment
  theo màu thợ; cột Unassigned; appointment tạo trên GAP hiển thị đúng cột trên POS.
- **Ngoài phạm vi:** thứ tự danh sách staff trên POS/Portal (row `entity_type = 'staff'`, khác loại với
  `staff_appointment`); chỉnh thứ tự cột từ POS (POS chỉ đọc — merchant đổi thứ tự trên GCI/CRM).
- **Dữ liệu:** board ngày 11/02/2026 và 11/03/2026 của store 14; 297 thợ có trên cả GAP và POS. Thợ mẫu: Isabella,
  Merri 1, Erin, 1001vvv, Teri Jennings, Lizzie Wade, Ramona Dunn, Anna.

### Quy tắc sắp xếp (theo comment API VP-5094)

- `priority > 0`: thứ tự set trong GCI, tăng dần (có thể có khoảng trống hoặc trùng).
- `priority = 0`: GCI chưa set thứ tự → xếp sau nhóm `> 0`.
- Không có row `staff_appointment` (thợ chỉ có trên POS, hoặc GCI chưa gửi event từ khi release — **không backfill**)
  → xếp cuối.
- Trùng thứ tự → xếp theo tên.
- Client không được ghi/đẩy/sắp lại row `staff_appointment` (API trả POST 422 / PUT 403).
- Màu appointment **không** thuộc VP-5094 (làm ở phía POS).

### Lưu ý dữ liệu đã biết (02/11/2026)

- 10 thợ chưa có row `staff_appointment`: 1001vvv, 333, abc xyz30, Bell, Ben, Delete, Elise Terry, Emma2, JD,
  TestSalary. Chỉ 1001vvv có trên board GAP.
- 2284/2492 thợ trên POS có `colorHex = null` → POS hiển thị xám `#CDCCD2`.

---

## B. Test case

### B1. Thứ tự cột thợ

#### TC-VP4402-01 — POS đã lên version có tính năng · High

| Bước | Thao tác                   | Kết quả mong đợi                                 |
| ---- | -------------------------- | ------------------------------------------------ |
| 1    | Mở POS, xem version ở menu | POS chạy ≥ 1.1.87 (build sau khi merge PR #3274) |

#### TC-VP4402-02 — Thứ tự cột thợ trên POS giống GAP · High

| Bước | Thao tác                                                   | Kết quả mong đợi                              |
| ---- | ---------------------------------------------------------- | --------------------------------------------- |
| 1    | GAP → Appointment → ngày 11/02/2026, ghi lại thứ tự cột    |                                               |
| 2    | POS → Appointment Overview → cùng ngày, ghi lại thứ tự cột |                                               |
| 3    | So sánh toàn bộ các thợ có trên cả 2 board                 | Thứ tự cột POS giống GAP, Unassigned đứng đầu |

#### TC-VP4402-03 — Thợ 1001vvv đứng đúng vị trí thứ 2 như GAP · Medium · VP-5479

| Bước | Thao tác                                  | Kết quả mong đợi                                       |
| ---- | ----------------------------------------- | ------------------------------------------------------ |
| 1    | GAP ngày 11/02: xác nhận 1001vvv là cột 2 | Unassigned → 1001vvv → Isabella → Merri 1 …            |
| 2    | POS cùng ngày: tìm cột 1001vvv            | 1001vvv đứng thứ 2 (ngay sau Unassigned), không ở cuối |

#### TC-VP4402-04 — Thợ chưa có thứ tự trên GCI xếp sau thợ có thứ tự · Medium

| Bước | Thao tác                                                           | Kết quả mong đợi                                                             |
| ---- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1    | Chọn 1 thợ có `priority = 0` và 1 thợ không có row (vd TestSalary) |                                                                              |
| 2    | Xem vị trí trên board POS                                          | Nhóm `priority > 0` trước, rồi `priority = 0`, cuối cùng là thợ không có row |

#### TC-VP4402-05 — Trùng thứ tự thì xếp theo tên · Low

| Bước | Thao tác                                  | Kết quả mong đợi                           |
| ---- | ----------------------------------------- | ------------------------------------------ |
| 1    | Trên GCI/CRM đặt 2 thợ cùng `priority`    |                                            |
| 2    | POS pull dữ liệu, mở Appointment Overview | Hai thợ đứng cạnh nhau, xếp theo tên A → Z |

#### TC-VP4402-06 — Đổi thứ tự cột trên GAP/CRM, POS cập nhật theo · High

| Bước | Thao tác                                           | Kết quả mong đợi                                                |
| ---- | -------------------------------------------------- | --------------------------------------------------------------- |
| 1    | Trên GCI/CRM đổi vị trí 2 thợ (vd Isabella ↔ Erin) |                                                                 |
| 2    | Chờ POS pull dữ liệu (hoặc mở lại app)             | Board POS đổi đúng theo thứ tự mới, các cột khác không xáo trộn |

#### TC-VP4402-07 — POS không tự sắp lại thứ tự cột · Medium

| Bước | Thao tác                                              | Kết quả mong đợi                                                         |
| ---- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| 1    | Trên POS thử kéo/đổi vị trí cột thợ (nếu UI cho phép) | Không có thao tác đổi thứ tự, hoặc thứ tự trở về theo GCI ở lần pull sau |
| 2    | Mở danh sách staff trên POS                           | Thứ tự danh sách staff (row `staff`) không bị thay đổi bởi tính năng này |

### B2. Màu appointment

#### TC-VP4402-08 — Card appointment có màu theo thợ (thợ đã có màu) · High

| Bước | Thao tác                                                      | Kết quả mong đợi                                                               |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1    | GAP tạo appointment Isabella 2:15 PM, Merri 1 3:45 PM (11/02) |                                                                                |
| 2    | POS → Appointment Overview ngày 11/02                         | Nền card màu nhạt của thợ (Isabella xanh, Merri 1 cam), viền trái đúng màu thợ |

#### TC-VP4402-09 — Appointment chưa gán thợ nằm đúng cột Unassigned · Medium

| Bước | Thao tác                                       | Kết quả mong đợi                                        |
| ---- | ---------------------------------------------- | ------------------------------------------------------- |
| 1    | GAP tạo appointment Unassigned 3:00 PM (11/02) |                                                         |
| 2    | POS mở ngày 11/02                              | Card nằm ở cột Unassigned, không bị tô màu của thợ khác |

#### TC-VP4402-10 — Appointment ngày khác hiển thị đúng cột, đúng màu · Medium

| Bước | Thao tác                                 | Kết quả mong đợi                                                       |
| ---- | ---------------------------------------- | ---------------------------------------------------------------------- |
| 1    | GAP tạo appointment Erin 2:00 PM (11/03) |                                                                        |
| 2    | POS chuyển sang ngày 11/03               | Card nằm đúng cột Erin, nền đỏ nhạt theo màu thợ, thứ tự cột không đổi |

#### TC-VP4402-11 — Màu cột Unassigned và thợ chưa có màu trên POS giống GAP · High · VP-5481

| Bước | Thao tác                                                                        | Kết quả mong đợi                                                                                                    |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1    | GAP ngày 11/02: xem màu cột Unassigned, Teri Jennings, Lizzie Wade, Ramona Dunn | Unassigned xanh `#5669FF`, Teri Jennings vàng `#F8D885`, Lizzie Wade tím nhạt `#A0AFF0`, Ramona Dunn xanh `#96BDF5` |
| 2    | POS cùng ngày: xem màu header và card các cột này                               | Giống GAP, không hiển thị xám (`#4D4A5B` / `#CDCCD2`)                                                               |

#### TC-VP4402-12 — Thợ đã có màu trên POS nhưng khác GAP (Anna) · Medium · VP-5481

| Bước | Thao tác                        | Kết quả mong đợi                                        |
| ---- | ------------------------------- | ------------------------------------------------------- |
| 1    | So màu cột Anna trên GAP và POS | POS xanh `#96BDF5` giống GAP (không phải cam `#E3AA8A`) |

#### TC-VP4402-13 — Rà toàn bộ màu cột GAP và POS · Medium · VP-5481

| Bước | Thao tác                                             | Kết quả mong đợi                              |
| ---- | ---------------------------------------------------- | --------------------------------------------- |
| 1    | Board 11/02, so màu header từng cột có trên cả 2 bên | Toàn bộ 297 thợ + Unassigned cùng màu với GAP |

---

## C. Kết quả QC trên Linear

**02/11/2026 — POS Windows dev 1.1.87, GAP store 14** (comment QC trên VP-4402, 7 test case gốc): **5 pass / 2 fail**.

| Test case    | TC trong comment | Kết quả                                                                                    |
| ------------ | ---------------- | ------------------------------------------------------------------------------------------ |
| TC-VP4402-01 | TC-01            | PASS                                                                                       |
| TC-VP4402-02 | TC-02            | PASS (296/297 thợ đúng thứ tự)                                                             |
| TC-VP4402-03 | TC-03            | **FAIL** — 1001vvv bị xếp cuối board POS, không có row `staff_appointment` → **VP-5479**   |
| TC-VP4402-08 | TC-04            | PASS                                                                                       |
| TC-VP4402-09 | TC-05            | PASS                                                                                       |
| TC-VP4402-10 | TC-06            | PASS                                                                                       |
| TC-VP4402-11 | TC-07            | **FAIL** — Unassigned xám đậm, 3 thợ `colorHex = null` hiển thị xám → **VP-5481**          |
| TC-VP4402-12 | TC-07 (cập nhật) | **FAIL** — Anna: GAP xanh `#96BDF5`, POS cam `#E3AA8A` → **VP-5481**                       |
| TC-VP4402-13 | TC-07 (cập nhật) | **FAIL** — 155 thợ cùng màu, 1 sai màu (Anna), 140 thợ POS null → xám, Unassigned khác màu |

- TC-VP4402-04 … -07: chưa có kết quả QC.
- Bug mở: **VP-5479** (Todo), **VP-5481** (Todo). Dev (Thien Duy) đã nhờ phía GoPOS kiểm tra các case này.

## Lịch sử chạy

### 2026-11-02 (UTC+7)

- POS Windows dev 1.1.87, GAP store 14, board 11/02 và 11/03.
- Kết quả: 5 pass, 4 fail (TC-03, -11, -12, -13), 4 chưa chạy (TC-04 … -07).
- Bug: VP-5479, VP-5481.
