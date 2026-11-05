# VP-5338 — Đồng bộ bảng màu Category với Staff (Portal)

> Picker màu Category đổi từ bảng 20 màu cũ sang đúng 15 màu của Staff, để màu Category và Staff không còn chỏi nhau
> trên POS. Phần category cũ (BE remap) tách sang [VP-5483](category-old-color-remap.md). Spec: `tests/e2e/regression-linear/vp-5338.e2e.spec.ts`. ID test case: `TC-VP5338-NN`.

|                     |                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**          | [VP-5338](https://linear.app/fastboy/issue/VP-5338) — QC Testing · bug con [VP-5483](https://linear.app/fastboy/issue/VP-5483)  |
| **PR**              | fastboy-portal [#934](https://github.com/FastboyMarketing/fastboy-portal/pull/934) · volt-pos #3273 (POS, ngoài phạm vi)        |
| **Màn hình**        | Management › **Services** (`/pos/nail/<store>/services`) — dialog _New category_ / _Edit category_; Staff Members › _Add staff_ |
| **Môi trường**      | DEV Portal `https://v2.dev-fastboypay.com`, store `#14`, session `admin.stage.json`                                             |
| **Chạy**            | `ENV=stage npx playwright test tests/e2e/regression-linear/vp-5338.e2e.spec.ts`                                                 |
| **Ghi dữ liệu DEV** | **Không** — mọi request ghi (`POST`/`PUT` tới `volt-pos.*`) bị chặn và trả 200 giả; test kiểm tra payload thay vì dữ liệu thật  |
| **Tổng test case**  | 6 tự động + 2 POS test tay (spec có 10: TC-07 … -10 thuộc VP-5483)                                                              |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** bảng màu trong dialog tạo/sửa Category, màu mặc định, payload `colorHex` khi tạo/sửa, chấm màu ở
  bảng màu Add staff để đối chiếu.
- **Ngoài phạm vi tự động:** picker màu trên app POS (mục B3, test tay — cần POS ≥ 1.1.88); category cũ → VP-5483.
- **Dữ liệu:** dùng category có sẵn của store #14 (đọc qua API `GET /categories`). Không tạo, không sửa category thật.

### Phát hiện khi quét DOM (2026-11-02, chặn mọi request ghi)

- Dialog **New category** (`Add category`): ô `Name` (0/50), nhóm **Color** = `radiogroup` gồm 15 `radio` tên theo màu
  (`Peach`, `Pink`, … `Periwinkle`), mã màu nằm ở biến CSS `--pos-swatch`; switch **Active**; nút _Cancel_ / _Create
  category_. Mặc định chọn **Peach `#E3AA8A`**.
- Dialog **Edit category** (menu `Actions for <tên>` → `Edit`): cùng picker, nút _Save changes_.
- API: `POST /categories {name, status, colorHex}`, `PUT /categories/<id> {name, status, colorHex}`. Trước khi tạo, Portal
  gọi `GET /categories?name[]=<tên>&status[]=active&status[]=inactive` để kiểm tra trùng tên.
- Dialog **Add staff** (Staff Members) có đúng 15 màu, cùng tên, cùng mã, cùng thứ tự.
- Dữ liệu ngày 02/11 (sau lệnh remap): mọi category có màu đều thuộc bảng Staff (vd Hand Care = Yellow `#F8D885`,
  Skincare = Sky blue `#9DDDF9`). 9 category có `colorHex = null` (nail, ZZdupCat, test2…) — list và dialog Edit hiển
  thị **Peach** cho các category này.

| #   | Màu      | Mã        | #   | Màu      | Mã        | #   | Màu        | Mã        |
| --- | -------- | --------- | --- | -------- | --------- | --- | ---------- | --------- |
| 1   | Peach    | `#E3AA8A` | 6   | Sky blue | `#9DDDF9` | 11  | Yellow     | `#F8D885` |
| 2   | Pink     | `#F5A3B5` | 7   | Blue     | `#96BDF5` | 12  | Sage       | `#B7D5A1` |
| 3   | Lavender | `#B5ADEF` | 8   | Violet   | `#E299F1` | 13  | Green      | `#78D4A2` |
| 4   | Coral    | `#F4B6A0` | 9   | Salmon   | `#F59992` | 14  | Apricot    | `#F5A98A` |
| 5   | Aqua     | `#9DF5EC` | 10  | Mint     | `#83F0CC` | 15  | Periwinkle | `#A0AFF0` |

---

## B. Test case

### B1. Bảng màu

#### TC-VP5338-01 — Picker Category có đúng 15 màu Staff, đúng thứ tự · Critical

| Bước | Thao tác                         | Kết quả mong đợi                                        |
| ---- | -------------------------------- | ------------------------------------------------------- |
| 1    | Services → **Add category**      | Dialog _New category_ mở                                |
| 2    | Đọc các ô màu trong nhóm _Color_ | Đúng 15 ô, tên và mã màu khớp bảng ở mục A, đúng thứ tự |

#### TC-VP5338-02 — Picker Category giống hệt picker Staff · High

| Bước | Thao tác                                     | Kết quả mong đợi                               |
| ---- | -------------------------------------------- | ---------------------------------------------- |
| 1    | Staff Members → **Add staff** → đọc bảng màu |                                                |
| 2    | Services → **Add category** → đọc bảng màu   | Hai danh sách giống hệt nhau (tên, mã, thứ tự) |

#### TC-VP5338-03 — Màu mặc định khi tạo category là Peach · Medium

| Bước | Thao tác                          | Kết quả mong đợi                         |
| ---- | --------------------------------- | ---------------------------------------- |
| 1    | Mở _New category_, không chọn màu | Ô **Peach** được chọn sẵn (duy nhất 1 ô) |

### B2. Tạo / sửa

#### TC-VP5338-04 — Tạo category với màu Mint gửi đúng `colorHex` · High

| Bước | Thao tác                                      | Kết quả mong đợi                                                              |
| ---- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| 1    | Nhập tên `E2E VP5338 <runId> Mint`, chọn Mint | Ô Mint được chọn, Peach bỏ chọn                                               |
| 2    | **Create category**                           | `POST /categories` với `colorHex: "#83F0CC"`, `status: "active"`; dialog đóng |

#### TC-VP5338-05 — Edit category chọn sẵn màu đã lưu · High

| Bước | Thao tác                                         | Kết quả mong đợi                                     |
| ---- | ------------------------------------------------ | ---------------------------------------------------- |
| 1    | Chọn 1 category có màu thuộc bảng Staff (từ API) |                                                      |
| 2    | `Actions for <tên>` → **Edit**                   | Ô màu đang chọn đúng bằng `colorHex` đã lưu; có 15 ô |

#### TC-VP5338-06 — Đổi màu trong Edit gửi màu mới, giữ tên/trạng thái · High

| Bước | Thao tác                             | Kết quả mong đợi                                                                    |
| ---- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| 1    | Edit category ở TC-05, chọn màu khác |                                                                                     |
| 2    | **Save changes**                     | `PUT /categories/<id>` với `colorHex` mới; `name`, `status` giữ nguyên; dialog đóng |

### B3. Test tay trên POS (PR volt-pos#3273)

#### TC-VP5338-POS-01 — Dialog tạo/sửa category trên POS dùng bảng màu Staff · High

| Bước | Thao tác                                                          | Kết quả mong đợi                                                            |
| ---- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1    | POS ≡ → **Version Update** → Update Now lên bản có fix (≥ 1.1.88) |                                                                             |
| 2    | Settings → Services → Add category / Edit category                | 15 màu Staff đúng thứ tự, mặc định **Peach**; chữ trên card reorder màu ink |

#### TC-VP5338-POS-02 — Category không có màu: POS fallback Peach · Medium

| Bước | Thao tác                                                      | Kết quả mong đợi                                                                                          |
| ---- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1    | Mở Home POS, xem tile category `colorHex = null` (vd `test2`) | Tile màu **Peach**, giống Portal (PR nói Portal fallback `#36BFF2` — trên DEV 02/11 Portal đã hiện Peach) |

> Màu category cũ trên Home POS: xem [VP-5483](category-old-color-remap.md).

---

## C. Kết quả QC trên Linear

- **02/11/2026 lần 1 (Portal dev #14):** 3 PASS / 0 FAIL / 2 chưa test (POS 1.1.87 build trước khi merge volt-pos#3273; BE
  chưa chạy remap).
- **02/11/2026 lần 2:** 5 pass / 1 fail (6 TC) — fail là category cũ còn màu cũ → log bug VP-5483.

---

## D. Chạy test tự động

| Test case          | Tự động               | Ghi chú                                                         |
| ------------------ | --------------------- | --------------------------------------------------------------- |
| TC-VP5338-01 … -06 | `vp-5338.e2e.spec.ts` | Chạy song song; không ghi dữ liệu (mọi request ghi bị mock 200) |

```bash
ENV=stage npx playwright test tests/e2e/regression-linear/vp-5338.e2e.spec.ts --reporter=list
```

## Lịch sử chạy

### 2026-11-02 (UTC+7)

- Lệnh: `ENV=stage npx playwright test tests/e2e/regression-linear/vp-5338.e2e.spec.ts tests/e2e/regression-linear/vp-4812.e2e.spec.ts tests/e2e/regression-linear/vp-4809.e2e.spec.ts tests/e2e/regression-linear/vp-3356.e2e.spec.ts --retries=0 --reporter=list` (chạy chung 4 spec: 32 passed, 1 failed)
- Kết quả 6 ca của file này: **6/6 passed** → **picker Category của Portal đã dùng đúng 15 màu Staff** (fastboy-portal#934 đã lên DEV)
- Spec chạy chung với 4 ca của VP-5483 (1 fail dữ liệu, xem [category-old-color-remap.md](category-old-color-remap.md)).
- Dữ liệu DEV sau khi chạy: không đổi (kiểm qua API: không có category `E2E VP5338…`, không category nào bị sửa trong ngày, flag `merchant_point_payment_config` vẫn cập nhật lần cuối 31/10, `earn_on_tip = false`).
