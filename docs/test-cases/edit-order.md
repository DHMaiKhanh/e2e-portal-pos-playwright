# Edit Order — Tài liệu tính năng & Test case

> Cập nhật thông tin Order không ảnh hưởng giá tiền. **Phần A** mô tả tính năng theo spec của 2 ticket, đối chiếu với
> lần quét DOM thật trên DEV. **Phần B** là bộ test case QC tổng hợp từ cả 2 ticket.

|                       |                                                                                                                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**            | [VP-2591](https://linear.app/fastboy/issue/VP-2591/portal-cho-phep-cap-nhat-thong-tin-order-khong-anh-huong-djen-gia-tien) (yêu cầu nghiệp vụ, cha) · [VP-2593](https://linear.app/fastboy/issue/VP-2593/portal-cap-nhat-thong-tin-order-khong-anh-huong-djen-gia-tien) (Portal FE, con) |
| **Liên quan**         | VP-2592 (API BE `PUT /orders/{id}/items`) · VP-3825 (BE meta event cho tag "Updated") · VP-2327, VP-3062, VP-3148, VP-4113                                                                                                                                                               |
| **PR**                | FE: `FastboyMarketing/fastboy-portal#436` · BE: `FastboyMarketing/volt-pos-api#1204`, `#1300`                                                                                                                                                                                            |
| **Trạng thái**        | Cả 2 ticket đang ở **QC Testing**                                                                                                                                                                                                                                                        |
| **Màn hình**          | Portal › Operations › Orders › **Order Detail** — `/pos/nail/<storeId>/orders/<orderUuid>`                                                                                                                                                                                               |
| **Môi trường quét**   | DEV Portal `https://v2.dev-fastboypay.com`, store `#14` (Volt POS tiem test 14 v1), session `admin.stage.json`                                                                                                                                                                           |
| **Ngày quét**         | 2026-10-13                                                                                                                                                                                                                                                                               |
| **Nguồn quét**        | `docs/test-cases/_scan/edit-order/scan*.json` + ảnh chụp `.png` cùng thư mục (gitignored)                                                                                                                                                                                                |
| **Tổng số test case** | 70                                                                                                                                                                                                                                                                                       |

> **Cách quét:** Playwright MCP không kết nối được trong phiên này, nên tính năng được quét bằng script Playwright
> chạy trực tiếp với session đã đăng nhập. Script **chỉ đọc**: mọi request `POST/PUT/PATCH/DELETE` tới API đều bị chặn
> (log ghi nhận 0 request bị chặn), không bấm **Confirm update**, nên không order nào bị thay đổi.

**Mục lục**

- [Phần A — Tài liệu tính năng](#phần-a--tài-liệu-tính-năng)
- [Phần B — Test case](#phần-b--test-case)
- [Phần C — Chạy test tự động](#phần-c--chạy-test-tự-động)

---

## Phần A — Tài liệu tính năng

### A1. Mục tiêu

Cho phép user sửa các thông tin **nghiệp vụ** bị nhập sai của order đã tạo hoặc đã hoàn tất (customer, staff, tên
service, note, phân bổ tip), và **giữ nguyên mọi số tiền**: tổng order, giá từng dòng, discount, phí, payment.
Thao tác này không tạo payment transaction mới.

### A2. Điểm vào (entry points) trên Order Detail

Order Detail có 2 nút edit riêng (icon ✏️, chỉ có `aria-label`):

| Nút (aria-label)       | Vị trí                                    | Mở ra                                                       |
| ---------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `Edit customer`        | Card **Order information**, dòng Customer | Dialog chọn/đổi customer                                    |
| `Edit service details` | Card **Service details**                  | Dialog **Edit service details** (staff, service, note, tip) |

Các action khác đang có trên header (không thuộc phạm vi ticket nhưng cần chú ý khi test hồi quy):

| Status                                    | Menu **More actions**                                      | Nút khác    |
| ----------------------------------------- | ---------------------------------------------------------- | ----------- |
| Successful - Unsettled                    | `Adjust tip`, `Re-open order` (disabled*), `Cancel order…` | —           |
| Successful - Settled                      | `Refund`, `Re-open order` (disabled*)                      | `Split tip` |
| Partial refunded                          | `Refund`, `Re-open order` (disabled*)                      | —           |
| Refunded / Canceled / Pending / Re-opened | `Re-open order` (disabled*)                                | —           |

\* Hiển thị kèm chú thích "Only closed orders can be re-opened".

### A3. Điều kiện cho phép Edit (eligibility)

#### A3.1 Kết quả quét thực tế

| Status order           | `Edit customer` | `Edit service details` | Order dùng để quét |
| ---------------------- | :-------------: | :--------------------: | ------------------ |
| Successful - Unsettled |       ✅        |           ✅           | OD261013-36194378  |
| Successful - Settled   |       ✅        |           ✅           | OD261013-76850170  |
| Partial refunded       |       ✅        |           ✅           | OD261009-16969206  |
| Refunded               |       ❌        |           ❌           | OD261009-16977613  |
| Canceled               |       ❌        |           ❌           | OD261013-34422353  |
| Pending                |       ❌        |           ❌           | OD261013-36274209  |
| Re-opened              |       ❌        |           ❌           | OD261013-71015006  |

Bộ lọc Status trên Order listing còn các status `Canceling`, `Refunding`, `Cancel issue`, `Refund issue`. Data DEV
hiện không có order ở các status này nên chưa quét được.

#### A3.2 Spec hiện đang mâu thuẫn ⚠️

| Nguồn                            | Status được Edit                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------- |
| VP-2591 – mô tả (bản mới nhất)   | **Partial Refunded, Successful - Settled, Successful - Unsettled**               |
| VP-2591 – comment của PO (23/07) | Successful Unsettled/Settled, **Refunded**, Partial Refunded; trừ Canceled       |
| VP-2593 – mục Eligibility        | Successful (Unsettled/Settled)                                                   |
| VP-2593 – AC & việc cần làm #3   | "4 status hợp lệ", "thêm status `REFUNDED`"                                      |
| **Thực tế trên DEV**             | Successful - Unsettled, Successful - Settled, Partial refunded (= VP-2591 mô tả) |

→ Cần PO chốt trạng thái **Refunded** có được edit hay không.

#### A3.3 Ràng buộc payroll (theo spec, chưa quét được trên UI)

- Order thuộc kỳ payroll **đã chốt (locked)**: **vẫn cho Edit**. Sau khi lưu phải recalculate toàn bộ report liên quan
  (Store Income, Staff Income, Staff Payroll, …).
- Kỳ payroll đã **tạo Check** (đã in check lương) cho staff liên quan: **không cho Edit**. Nếu cần sửa, liên hệ DEV.

### A4. Dialog "Edit customer"

- Tiêu đề: **"Add customer"** (khi order chưa có customer). Mô tả: "Attach a customer to Order #<orderId>".
- Ô tìm kiếm `Search by name, phone...` và danh sách customer có sẵn (số điện thoại được che: `••• ••• 1152`).
- Ghi chú cố định: _"Adding, changing or removing the customer recalculates loyalty points. No amount on this order changes."_
- Nút: `Cancel`, `Save changes` (disabled cho đến khi chọn customer).
- Theo comment FE, tag Updated được suy ra từ `entity_histories` có `author.uri` là `/orders/<id>/items` **hoặc**
  `/orders/<id>/customer`. Vì vậy đổi customer cũng phải gắn tag Updated.

### A5. Dialog "Edit service details"

Tiêu đề **"Edit service details"**, mô tả _"Reassign staff, change services or notes. Amounts stay the same."_

#### A5.1 Khu vực "Staff & services"

Mỗi staff là một **nhóm (group)**: header ghi `<Staff> · N service(s) · $<tổng>`, bên dưới là các dòng service.

| Control (aria-label / text)   | Chức năng quan sát được                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `Add staff`                   | Thêm một nhóm trống "Select staff · 0 services" kèm hướng dẫn _"No service yet — drag one here, change the staff, or remove it before saving."_ |
| `Change staff for this group` | Dropdown có ô tìm `Search staff…` để đổi staff cho **cả nhóm**                                                                                  |
| `Staff actions`               | Menu: `Select all services`, `Remove staff`                                                                                                     |
| `Drag to reassign staff`      | Tay nắm kéo-thả một dòng service sang nhóm staff khác                                                                                           |
| `Select service` (checkbox)   | Chọn nhiều dòng. Khi có dòng được chọn sẽ hiện `Move to…` và `Clear`                                                                            |
| `Move to…`                    | Danh sách staff của store. Chọn staff thì các dòng đã chọn được chuyển sang nhóm đó                                                             |
| `Service name` (textbox)      | Gõ tay tên service                                                                                                                              |
| `Change service`              | Dropdown catalog (`Search service…`), **không hiển thị giá**, chỉ để điền tên                                                                   |
| `Add note` (theo dòng)        | Mở textbox `Service note`                                                                                                                       |
| Giá dòng (`$30.00`)           | Chỉ hiển thị dạng text, **không có input** nên không sửa được                                                                                   |

Validate: nhóm staff không có service thì hiện _"Each section needs a staff and a service."_ và **khoá `Save changes`**.
Đã kiểm chứng: chuyển dòng duy nhất của Pamela sang Thalia làm nhóm Pamela còn 0 services và Save bị khoá.

#### A5.2 Dòng service đã refunded (order Partial refunded)

Quan sát trên OD261009-16969206 (Express Pedicure $30 đã refund, Lavender Treatment $37):

- Dòng refunded hiện label **"Refunded"**.
- `Service name` **disabled**, `Change service` **disabled**, `Drag to reassign staff` và `Select service` **disabled**.
- `Services total` chỉ tính dòng chưa refund: **$37.00**, trong khi header nhóm ghi $67.00.

⚠️ **Lệch spec VP-2593**, vốn yêu cầu dòng refunded _"vẫn move/sửa bình thường, BE tự tính lại; UI highlight đỏ +
label Refunded"_. Thực tế dòng này đang bị khoá. Highlight đỏ cần xác nhận bằng mắt (xem `edit-service-partial-refunded.png`).

#### A5.3 Dòng Store (không có staff)

Theo spec: khoá hoàn toàn (không kéo/chọn/sửa được), không nhận tip, không nằm trong payload.
**Chưa quét được** vì data DEV không có order nào chứa store item.

#### A5.4 Khu vực "Tip allocation"

Chỉ hiện khi order có tip. Order không có tip thì hiện _"No tip on this order"_.

Quét trên OD261013-36288168 (Pamela $30 + Thalia $37, tip $3.00):

| Thành phần                      | Hành vi quan sát được                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Total tip $3.00`               | Chỉ là text, không sửa được                                                                                                          |
| Tablist **"Tip split method"**  | `Split evenly` (mặc định) · `Proportion` · `Manual`                                                                                  |
| Split evenly                    | $1.50 / $1.50; ô `Tip amount for <Staff>` **disabled**                                                                               |
| Proportion                      | Chia theo tiền service: $1.35 (Pamela $30) / $1.65 (Thalia $37); ô **disabled**                                                      |
| Manual                          | Ô `Tip amount for <Staff>` **được sửa**                                                                                              |
| Recipients & amounts            | Mỗi người nhận hiện `<Staff> $<x> in services`. Danh sách = staff đang làm service, không có checkbox chọn tay                       |
| Status cân bằng                 | `Balanced $3.00 / $3.00`. Khi lệch: `Off by $1.15 $4.15 / $3.00` + lỗi _"Tip shares must add up to the total tip."_ và **khoá Save** |
| Khi dồn hết service cho 1 staff | Recipients chỉ còn staff đó (Thalia $67.00 in services)                                                                              |

Theo VP-2593, tip được lưu **chung trong 1 API edit-order** (không gọi `PUT /split_tip` riêng).

#### A5.5 Order note

Textbox `Order note` (placeholder _"Add a note for this order"_).

#### A5.6 Footer & Save

- `Services total $<x>` là text cố định.
- `Save changes` **disabled** khi mở dialog và chỉ bật khi có thay đổi hợp lệ.
- `Cancel` khi đã có thay đổi: **đóng dialog ngay**, không hỏi xác nhận huỷ thay đổi.
- ⚠️ Xoá trống `Service name` thì `Save changes` **vẫn bật**, chưa thấy validate. Cần xác minh BE có chặn khi Confirm không
  (VP-2593 TC18 kỳ vọng chặn).

### A6. Popup xác nhận

Bấm `Save changes` sẽ mở popup:

| Thành phần | Spec (VP-2591)                                                                                                      | Thực tế                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Title      | Confirm Order Update?                                                                                               | **Confirm order update?**   |
| Message    | This action will update the order information without changing any amount or payment data. Do you want to continue? | Khớp                        |
| Nút        | Cancel · Confirm Update                                                                                             | Cancel · **Confirm update** |

Chỉ khác chữ hoa/thường. Cần PO/UX xác nhận chấp nhận được hay không.
Bấm `Cancel` trên popup: popup đóng, dialog edit vẫn mở và giữ nguyên các thay đổi đang sửa.

### A7. Sau khi lưu

| Hạng mục                  | Spec                                                                                                            | Trạng thái quét                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tag **Updated** – Detail  | Hiển thị sau khi edit                                                                                           | Chưa quan sát được (không tìm thấy order nào đã edit qua tính năng này). Card hiện ghi "Last updated: <thời gian>"                                       |
| Tag **Updated** – Listing | Hiển thị                                                                                                        | 3 trang listing **không có** tag. Theo comment FE ngày 10/09, listing đang chờ BE expose `edited` trên `GET /orders` hoặc filter `edited=true` (VP-3825) |
| Activity log              | Ghi user, thời gian, field, giá trị cũ → mới (BE ghi qua `entity_history`)                                      | Card Activity log có tab `All / Order / Item / Tender / Tip / Gateway / JSON`, hiển thị dạng `cũ → mới`                                                  |
| Report                    | Đổi staff/service thì report hiển thị staff/service mới, số tiền giữ nguyên. Kỳ payroll locked phải recalculate | Cần kiểm tra thủ công sau khi Confirm                                                                                                                    |
| Payment                   | Không phát sinh transaction mới                                                                                 | Cần kiểm tra Payment details / Activity log sau khi Confirm                                                                                              |

### A8. API (theo ticket)

- `PUT /orders/{id}/items`: body dùng IRI `item`/`staff` và field `serviceName` (không gửi `serviceId`). `note` và
  tip gom vào cùng API khi BE bổ sung xong.
- API phải **từ chối** payload chứa field tiền (amount/fee/discount/tip value/payment).
- Activity log: `entity_histories` với `author.uri` ∈ {`/orders/<id>/items`, `/orders/<id>/customer`}.
  Còn mở câu hỏi về dạng param `author_has_key` hay `author_has_key[]=`.

### A9. Tổng hợp điểm lệch / câu hỏi mở

| #   | Vấn đề                                                                                      | Mức độ     | Cần ai chốt    |
| --- | ------------------------------------------------------------------------------------------- | ---------- | -------------- |
| 1   | Order **Refunded** không có nút edit. Spec mâu thuẫn giữa VP-2591, comment PO và VP-2593    | Cao        | PO             |
| 2   | Dòng service **refunded** bị khoá hoàn toàn, trong khi VP-2593 yêu cầu move/sửa được        | Cao        | PO / FE        |
| 3   | Xoá trống `Service name` vẫn bật được Save, chưa thấy validate                              | Trung bình | FE             |
| 4   | Tag **Updated** chưa có ở Listing (chờ BE)                                                  | Trung bình | BE             |
| 5   | Text popup khác chữ hoa so với spec ("Confirm order update?", "Confirm update")             | Thấp       | PO / UX        |
| 6   | Huỷ dialog khi đã có thay đổi thì đóng luôn, không cảnh báo mất dữ liệu                     | Thấp       | UX             |
| 7   | Chưa có data DEV cho store item, order Canceling/Refunding/…, kỳ payroll locked/đã in check | —          | QC (seed data) |
| 8   | Chưa rõ đổi customer có dùng chung popup Confirm và có gắn tag Updated không                | Trung bình | PO / FE        |

---

## Phần B — Test case

> Bộ test case tổng hợp từ **VP-2591** (30 TC, phần nghiệp vụ) và **VP-2593** (50 TC, phần Portal FE). Các case trùng
> nhau đã được gộp; cột **Nguồn** ghi TC gốc của từng ticket. Label UI lấy từ lần quét DOM thật trên DEV ngày 2026-10-13.

**Ký hiệu cột "Scan":**

- ✅ Đã quan sát trên DEV và khớp spec.
- ⚠️ Đã quan sát nhưng **lệch spec**, cần PO/DEV xác nhận.
- 🔍 Chưa kiểm chứng được bằng quét chỉ-đọc. Cần test thủ công (phải bấm Confirm update), seed data, hoặc kiểm tra API/DB.

**Order mẫu trên DEV (store 14):**

| Mục đích                                   | Order             |
| ------------------------------------------ | ----------------- |
| Successful - Unsettled, 2 thợ, có tip $3   | OD261013-36288168 |
| Successful - Unsettled, 1 thợ, có discount | OD261013-36194378 |
| Successful - Settled                       | OD261013-76850170 |
| Partial refunded (1 dòng refunded)         | OD261009-16969206 |
| Refunded                                   | OD261009-16977613 |
| Canceled                                   | OD261013-34422353 |
| Pending                                    | OD261013-36274209 |
| Re-opened                                  | OD261013-71015006 |

### B1. Hiển thị nút Edit & Eligibility

| ID        | Tiêu đề                                            | Các bước & Kết quả mong đợi                                                                                                             | Ưu tiên    | Nguồn                 | Scan                                                       |
| --------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------- | ---------------------------------------------------------- |
| TC-EO-001 | Nút edit hiện với order **Successful - Unsettled** | Mở Order Detail của order Successful - Unsettled → có `Edit customer` và `Edit service details`                                         | Cao        | 2591-TC01 · 2593-TC01 | ✅                                                         |
| TC-EO-002 | Nút edit hiện với order **Successful - Settled**   | Mở order Successful - Settled → có cả 2 nút edit                                                                                        | Cao        | 2591-TC01 · 2593-TC02 | ✅                                                         |
| TC-EO-003 | Nút edit hiện với order **Partial refunded**       | Mở order Partial refunded → có cả 2 nút edit                                                                                            | Cao        | 2591-TC01 · 2593-TC03 | ✅                                                         |
| TC-EO-004 | Order **Refunded**                                 | Mở order Refunded → theo VP-2591 (mô tả): **không** có nút edit. Theo comment PO và VP-2593 AC: **có** nút edit                         | Cao        | 2591-TC03 · 2593-TC04 | ⚠️ Thực tế không có nút. Spec mâu thuẫn, chờ PO chốt       |
| TC-EO-005 | Order **Canceled** không có nút edit               | Mở order Canceled → không có `Edit customer` / `Edit service details`                                                                   | Cao        | 2591-TC02 · 2593-TC05 | ✅                                                         |
| TC-EO-006 | Status không hợp lệ khác không có nút edit         | Mở lần lượt order Pending, Re-opened, Canceling, Refunding, Cancel issue, Refund issue → không có nút edit                              | Trung bình | 2593-TC06             | ✅ Pending, Re-opened · 🔍 các status còn lại chưa có data |
| TC-EO-007 | Kỳ payroll **đã chốt (locked)** vẫn được edit      | Order thuộc kỳ payroll đã lock → nút edit vẫn hiện, lưu được. Sau khi lưu, Store Income / Staff Income / Staff Payroll được recalculate | Cao        | 2591-AC               | 🔍                                                         |
| TC-EO-008 | Kỳ payroll **đã tạo Check** thì không cho edit     | Order có staff thuộc kỳ payroll đã in check → nút edit ẩn/disable, hoặc lưu bị chặn kèm thông báo liên hệ DEV                           | Cao        | 2591-AC               | 🔍                                                         |
| TC-EO-009 | User không có quyền thì không edit được            | Đăng nhập bằng role không có quyền sửa order → không thấy hoặc không dùng được nút edit                                                 | Cao        | 2591-TC29             | 🔍                                                         |

### B2. Edit customer

| ID        | Tiêu đề                                         | Các bước & Kết quả mong đợi                                                                                                                                                                                                                                              | Ưu tiên    | Nguồn       | Scan |
| --------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----------- | ---- |
| TC-EO-010 | Mở dialog Edit customer                         | Bấm `Edit customer` → dialog "Add customer", mô tả "Attach a customer to Order #…", ô `Search by name, phone...`, danh sách customer với SĐT bị che, ghi chú "…recalculates loyalty points. No amount on this order changes.", nút `Cancel` và `Save changes` (disabled) | Trung bình | 2591-TC04   | ✅   |
| TC-EO-011 | Đổi customer thành công, tổng tiền không đổi    | Chọn customer → `Save changes` → (popup Confirm nếu có) → Customer trên Order information cập nhật. Tổng order, payment giữ nguyên                                                                                                                                       | Cao        | 2591-TC04   | 🔍   |
| TC-EO-012 | Tìm customer                                    | Gõ tên hoặc SĐT vào ô search → danh sách được lọc đúng. Không có kết quả thì hiện empty state                                                                                                                                                                            | Trung bình | — (bổ sung) | 🔍   |
| TC-EO-013 | Huỷ đổi customer                                | Chọn customer → `Cancel` → dialog đóng, customer không đổi                                                                                                                                                                                                               | Trung bình | — (bổ sung) | 🔍   |
| TC-EO-014 | Đổi customer có tạo activity log và tag Updated | Sau khi lưu → Activity log có bản ghi customer cũ → mới, order có tag Updated                                                                                                                                                                                            | Trung bình | 2591-TC23   | 🔍   |

### B3. Sửa Staff

| ID        | Tiêu đề                                         | Các bước & Kết quả mong đợi                                                                                                                                                                                                                                                | Ưu tiên    | Nguồn                 | Scan              |
| --------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------- | ----------------- |
| TC-EO-015 | Bố cục dialog Edit service details              | Bấm `Edit service details` → tiêu đề "Edit service details", mô tả "Reassign staff, change services or notes. Amounts stay the same.", khu "Staff & services", mỗi nhóm staff ghi `N service · $x`, có `Order note`, `Services total`, `Cancel`, `Save changes` (disabled) | Cao        | 2593                  | ✅                |
| TC-EO-016 | Kéo-thả dòng service sang staff khác            | Kéo `Drag to reassign staff` của 1 dòng sang nhóm staff khác → dòng chuyển nhóm, tổng của từng nhóm cập nhật, `Services total` không đổi                                                                                                                                   | Cao        | 2591-TC05 · 2593-TC07 | 🔍                |
| TC-EO-017 | Tick nhiều dòng rồi **Move to…**                | Tick `Select service` → hiện `Move to…` và `Clear` → chọn staff → các dòng chuyển sang staff đó                                                                                                                                                                            | Cao        | 2593-TC08             | ✅                |
| TC-EO-018 | Bỏ chọn bằng `Clear`                            | Tick vài dòng → `Clear` → bỏ chọn hết, `Move to…` ẩn                                                                                                                                                                                                                       | Thấp       | — (bổ sung)           | 🔍                |
| TC-EO-019 | Đổi staff cho cả nhóm                           | `Change staff for this group` → `Search staff…` → chọn staff → toàn bộ dòng của nhóm chuyển sang staff mới                                                                                                                                                                 | Cao        | 2593-TC09             | 🔍                |
| TC-EO-020 | Hoán đổi service giữa 2 staff                   | Order 2 staff A, B: chuyển service của A sang B và của B sang A → lưu → mỗi staff nhận đúng service mới                                                                                                                                                                    | Cao        | 2591-TC06             | 🔍                |
| TC-EO-021 | Thêm staff                                      | `Add staff` → nhóm "Select staff · 0 services" kèm hướng dẫn → chọn staff, kéo service vào → lưu được                                                                                                                                                                      | Trung bình | 2593-TC10             | ✅ (thêm nhóm)    |
| TC-EO-022 | Xoá staff                                       | `Staff actions` → `Remove staff` → nhóm bị xoá. Nếu nhóm còn service thì các service phải được chuyển đi hoặc thao tác bị chặn                                                                                                                                             | Trung bình | 2593-TC11             | 🔍 (đã thấy menu) |
| TC-EO-023 | Chọn tất cả service của 1 staff                 | `Staff actions` → `Select all services` → mọi dòng của nhóm được tick                                                                                                                                                                                                      | Thấp       | — (bổ sung)           | 🔍 (đã thấy menu) |
| TC-EO-024 | Nhóm rỗng chặn Save                             | Chuyển hết service khỏi 1 staff (hoặc `Add staff` mà không gán service) → nhóm hiện "0 services · No service yet — …", lỗi "Each section needs a staff and a service.", `Save changes` disabled                                                                            | Cao        | — (bổ sung)           | ✅                |
| TC-EO-025 | Đổi staff thì sale/tip/income đi theo staff mới | Đổi staff dòng X từ A sang B → lưu → Staff Income / Payroll: sale, tip, income của dòng X thuộc B, số tiền giữ nguyên                                                                                                                                                      | Cao        | 2591-TC05 · 2593-TC12 | 🔍                |

### B4. Sửa Service name & Note

| ID        | Tiêu đề                                           | Các bước & Kết quả mong đợi                                                                                                                               | Ưu tiên    | Nguồn                      | Scan                                     |
| --------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------- | ---------------------------------------- |
| TC-EO-026 | Gõ tay tên service                                | Sửa `Service name` → `Save changes` bật → Confirm → Order Detail hiện tên mới, giá dòng giữ nguyên                                                        | Cao        | 2593-TC14                  | ✅ (Save bật, giá giữ $30.00) · 🔍 (lưu) |
| TC-EO-027 | Chọn tên từ catalog                               | `Change service` → `Search service…` → chọn 1 service → chỉ `Service name` được điền. Catalog không hiện giá, giá dòng **không** đổi theo Service Setting | Cao        | 2591-TC08/TC09 · 2593-TC15 | ✅ (catalog không có giá)                |
| TC-EO-028 | Đổi sang service khác giá thì giá dòng giữ nguyên | Chọn service có giá trong Setting khác giá dòng → lưu → giá dòng, subtotal, tổng order không đổi. `service_id` không đổi (BE chỉ lưu name)                | Cao        | 2591-TC09 · 2593-TC16      | 🔍                                       |
| TC-EO-029 | Tên service trống                                 | Xoá trống `Service name` → mong đợi: validate, `Save changes` bị chặn                                                                                     | Trung bình | 2593-TC18                  | ⚠️ Thực tế Save **vẫn bật**              |
| TC-EO-030 | Tìm trong catalog                                 | Gõ từ khoá vào `Search service…` → danh sách lọc đúng. Không khớp thì hiện empty state                                                                    | Thấp       | — (bổ sung)                | 🔍                                       |
| TC-EO-031 | Thêm Service note                                 | `Add note` trên 1 dòng → textbox `Service note` → nhập → lưu → note hiển thị/lưu đúng                                                                     | Trung bình | 2591-TC12 · 2593-TC17      | ✅ (có textbox) · 🔍 (lưu, chờ BE)       |
| TC-EO-032 | Cập nhật Order note                               | Nhập `Order note` (placeholder "Add a note for this order") → lưu → Order information › Order note hiện nội dung mới                                      | Trung bình | 2591-TC11                  | ✅ (có textbox) · 🔍 (lưu)               |
| TC-EO-033 | Report Service hiện tên mới                       | Sau khi đổi tên service → report liên quan hiện tên mới, số tiền giữ nguyên                                                                               | Trung bình | 2591-TC10                  | 🔍                                       |

### B5. Dòng Refunded (order Partial refunded)

| ID        | Tiêu đề                                           | Các bước & Kết quả mong đợi                                                                                                         | Ưu tiên    | Nguồn       | Scan                                                                         |
| --------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------- | ---------------------------------------------------------------------------- |
| TC-EO-034 | Dòng refunded có label "Refunded" và highlight đỏ | Mở edit trên order Partial refunded → dòng refunded có label "Refunded", nền/viền đỏ                                                | Trung bình | 2593-TC20   | ✅ label · 🔍 màu đỏ (xem ảnh)                                               |
| TC-EO-035 | Dòng refunded vẫn move/sửa được                   | Kéo hoặc `Move to…` dòng refunded, sửa tên → được phép. BE tự tính lại                                                              | Cao        | 2593-TC19   | ⚠️ Thực tế `Service name`, `Change service`, drag, checkbox đều **disabled** |
| TC-EO-036 | Dòng refunded không tính vào tip                  | Order Partial refunded có tip → Recipients & amounts và `$x in services` không tính tiền dòng refunded                              | Trung bình | 2593-TC21   | 🔍 (cần order Partial refunded có tip)                                       |
| TC-EO-037 | Tổng tiền đúng sau khi move dòng refunded         | Move dòng refunded → lưu → tổng order, số tiền refund không đổi                                                                     | Trung bình | 2593-TC22   | 🔍 (bị chặn bởi TC-EO-035)                                                   |
| TC-EO-038 | `Services total` khi có dòng refunded             | Kiểm tra `Services total` (thực tế $37.00, chỉ dòng chưa refund) so với header nhóm ($67.00) → xác nhận cách hiển thị đúng với ý PO | Thấp       | — (bổ sung) | ⚠️ Cần xác nhận                                                              |

### B6. Dòng Store (không có staff)

| ID        | Tiêu đề                               | Các bước & Kết quả mong đợi                                                              | Ưu tiên    | Nguồn     | Scan            |
| --------- | ------------------------------------- | ---------------------------------------------------------------------------------------- | ---------- | --------- | --------------- |
| TC-EO-039 | Store item không kéo được             | Order có store item → mở edit → dòng store không có tay nắm kéo / không kéo được         | Trung bình | 2593-TC23 | 🔍 (thiếu data) |
| TC-EO-040 | Store item không chọn, không sửa được | Không có checkbox, `Service name` và `Change service` bị khoá                            | Trung bình | 2593-TC24 | 🔍              |
| TC-EO-041 | Store item không nhận tip             | Store item không xuất hiện trong Recipients & amounts                                    | Trung bình | 2593-TC25 | 🔍              |
| TC-EO-042 | Store item không có trong payload     | Lưu thay đổi → request `PUT /orders/{id}/items` không chứa store item (kiểm tra Network) | Trung bình | 2593-TC26 | 🔍              |

### B7. Tip allocation

| ID        | Tiêu đề                                 | Các bước & Kết quả mong đợi                                                                                                                                               | Ưu tiên    | Nguồn                 | Scan               |
| --------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------- | ------------------ |
| TC-EO-043 | Order không tip                         | Mở edit trên order tip $0 → hiện "No tip on this order", không có khu Tip allocation                                                                                      | Thấp       | — (bổ sung)           | ✅                 |
| TC-EO-044 | Bố cục Tip allocation                   | Order có tip → hiện `Total tip $x`, tablist "Tip split method" (`Split evenly` mặc định / `Proportion` / `Manual`), "Recipients & amounts", trạng thái `Balanced $x / $x` | Cao        | 2593                  | ✅                 |
| TC-EO-045 | **Split evenly**                        | Tip $3, 2 staff → $1.50 / $1.50, ô tip disabled                                                                                                                           | Cao        | 2591-TC13 · 2593-TC27 | ✅                 |
| TC-EO-046 | **Proportion**                          | Tip $3, service $30 / $37 → $1.35 / $1.65 (theo tỷ lệ), ô tip disabled                                                                                                    | Cao        | 2591-TC13 · 2593-TC28 | ✅                 |
| TC-EO-047 | **Manual** phân bổ hợp lệ               | Chọn `Manual` → ô `Tip amount for <Staff>` sửa được → nhập tổng = Total tip → `Balanced $3.00 / $3.00`, Save bật                                                          | Cao        | 2591-TC15 · 2593-TC29 | ✅                 |
| TC-EO-048 | **Manual** lệch tổng thì chặn Save      | Nhập tổng ≠ Total tip → hiện `Off by $x $y / $3.00` + "Tip shares must add up to the total tip.", `Save changes` disabled                                                 | Cao        | 2591-TC16             | ✅                 |
| TC-EO-049 | Total Tip bị khoá                       | `Total tip` là text, không có input nào sửa được tổng tip                                                                                                                 | Cao        | 2593-TC30             | ✅                 |
| TC-EO-050 | Người nhận tip = staff đang làm service | Danh sách người nhận = staff có service trong order, không có checkbox chọn tay                                                                                           | Trung bình | 2591-TC14 · 2593-TC31 | ✅                 |
| TC-EO-051 | Đổi staff thì tip đi theo               | Chuyển hết service của A sang B → Recipients chỉ còn B (`$x in services` cập nhật) → lưu → tip của B đúng                                                                 | Cao        | 2591-TC14 · 2593-TC32 | ✅ (UI) · 🔍 (lưu) |
| TC-EO-052 | Total Tip trước = sau                   | Đổi method/phân bổ → lưu → Order summary › Tip và tổng tip trong report không đổi                                                                                         | Cao        | 2591-TC13 · 2593-TC33 | 🔍                 |
| TC-EO-053 | Tip lưu chung 1 API                     | Lưu thay đổi tip → Network chỉ có request edit-order, **không** có `PUT /split_tip`                                                                                       | Trung bình | 2593-TC34             | 🔍                 |

### B8. Rule tiền (bất biến)

| ID        | Tiêu đề                          | Các bước & Kết quả mong đợi                                                                                             | Ưu tiên    | Nguồn                    | Scan |
| --------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------ | ---- |
| TC-EO-054 | Không có field tiền nào sửa được | Trong dialog: giá dòng, discount, `Services total`, `Total tip` chỉ là text. Không có input amount/fee/discount/payment | Cao        | 2591-TC17 · 2593-TC36/37 | ✅   |
| TC-EO-055 | Tổng order trước = sau           | Ghi Subtotal/Discount/Tax/Tip/Total trước khi edit → đổi staff + tên + tip → lưu → các giá trị giống hệt                | Cao        | 2591-TC18 · 2593-TC13/35 | 🔍   |
| TC-EO-056 | Không phát sinh transaction mới  | Sau khi lưu → Payment details giữ đúng số payment cũ. Activity log tab `Tender` không có bản ghi mới                    | Cao        | 2591-TC19 · 2593-TC38    | 🔍   |
| TC-EO-057 | API chặn field tiền              | Gọi `PUT /orders/{id}/items` với payload chứa amount/fee/discount/tip/payment → API trả lỗi 4xx, dữ liệu không đổi      | Cao        | 2591-TC28                | 🔍   |
| TC-EO-058 | Order có discount                | Order có discount dòng (vd "-$10.00 off discount") → đổi staff/tên → lưu → discount và giá sau giảm giữ nguyên          | Trung bình | — (bổ sung)              | 🔍   |

### B9. Save / Confirm popup

| ID        | Tiêu đề                                   | Các bước & Kết quả mong đợi                                                                                                                                                                                              | Ưu tiên    | Nguồn                 | Scan                                                                               |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | --------------------- | ---------------------------------------------------------------------------------- |
| TC-EO-059 | Save disabled khi chưa có thay đổi hợp lệ | Mở dialog → `Save changes` disabled. Có thay đổi hợp lệ thì bật. Có lỗi validate thì lại disabled                                                                                                                        | Cao        | 2593-TC39             | ✅                                                                                 |
| TC-EO-060 | Popup đúng nội dung                       | Bấm `Save changes` → popup Title "Confirm Order Update?", Message "This action will update the order information without changing any amount or payment data. Do you want to continue?", nút `Cancel` / `Confirm Update` | Cao        | 2591-TC20 · 2593-TC40 | ⚠️ Message khớp. Title/nút khác chữ hoa: "Confirm order update?", "Confirm update" |
| TC-EO-061 | Cancel trên popup                         | Popup → `Cancel` → popup đóng, dialog edit vẫn mở và giữ thay đổi, chưa lưu gì                                                                                                                                           | Cao        | 2591-TC21 · 2593-TC42 | ✅                                                                                 |
| TC-EO-062 | Confirm update                            | Popup → `Confirm update` → lưu thành công, popup và dialog đóng, Order Detail hiện dữ liệu mới                                                                                                                           | Cao        | 2591-TC22 · 2593-TC41 | 🔍                                                                                 |
| TC-EO-063 | Đóng dialog không lưu                     | Sửa vài field → `Cancel` (hoặc Esc) → dialog đóng ngay. Mở lại thấy dữ liệu gốc                                                                                                                                          | Trung bình | 2593-TC47             | ✅ (đóng ngay, không có cảnh báo huỷ)                                              |
| TC-EO-064 | Dữ liệu được lưu bền                      | Sau khi lưu → reload trang → dữ liệu mới vẫn hiển thị                                                                                                                                                                    | Cao        | 2593-TC48             | 🔍                                                                                 |

### B10. Activity log & tag Updated

| ID        | Tiêu đề                          | Các bước & Kết quả mong đợi                                                                | Ưu tiên    | Nguồn                 | Scan                                                      |
| --------- | -------------------------------- | ------------------------------------------------------------------------------------------ | ---------- | --------------------- | --------------------------------------------------------- |
| TC-EO-065 | Activity log đủ thông tin        | Sau khi lưu → Activity log có: user thực hiện, thời gian, field thay đổi, giá trị cũ → mới | Cao        | 2591-TC23 · 2593-TC45 | 🔍                                                        |
| TC-EO-066 | Log khi sửa nhiều field cùng lúc | Đổi Staff + tên service + Tip trong 1 lần Save → log ghi từng field. Mọi thay đổi đều đúng | Cao        | 2591-TC24 · 2593-TC46 | 🔍                                                        |
| TC-EO-067 | Tag **Updated** ở Order Detail   | Sau khi lưu → header Order Detail có tag Updated                                           | Cao        | 2591-TC25 · 2593-TC44 | 🔍                                                        |
| TC-EO-068 | Tag **Updated** ở Order Listing  | Sau khi lưu → dòng order trên listing có tag Updated                                       | Trung bình | 2591-TC26 · 2593-TC43 | ⚠️ Chưa có trên listing (chờ BE expose `edited`, VP-3825) |

### B11. Edge case / Negative / Phi chức năng

| ID        | Tiêu đề                    | Các bước & Kết quả mong đợi                                                                                                                           | Ưu tiên    | Nguồn                 | Scan |
| --------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------- | ---- |
| TC-EO-069 | Edit nhiều lần liên tiếp   | Edit cùng 1 order 3 lần → dữ liệu và activity log đúng qua từng lần, tổng tiền không đổi                                                              | Trung bình | 2591-TC27             | 🔍   |
| TC-EO-070 | Lỗi mạng / API khi Confirm | Giả lập offline hoặc API 5xx khi bấm `Confirm update` → hiện thông báo lỗi, order không bị cập nhật một phần, dữ liệu đang sửa trong dialog không mất | Cao        | 2591-TC30 · 2593-TC50 | 🔍   |

> Ngoài bảng trên, chạy kèm một lượt **responsive** (2593-TC49): mở dialog ở 1920 / 1366 / 768 / 375 px, kiểm tra không
> tràn ngang, các nút drag/menu vẫn dùng được. Ngoài ra kiểm tra **report** (2591-TC07): sau khi đổi staff, Staff Income
> / Staff Payroll / Income Summary hiện staff mới với số tiền giữ nguyên. Hai mục này đã được tính trong TC-EO-025 và TC-EO-033.

---

### B12. Tổng kết độ phủ

**Theo mức ưu tiên:** Cao 41 · Trung bình 24 · Thấp 5

**Theo kết quả quét:**

| Kết quả                                   | Số case | Ghi chú                                                                                                                               |
| ----------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ Khớp spec (đầy đủ hoặc một phần UI)    | 28      | Eligibility, bố cục dialog, Move to, nhóm rỗng, catalog, tip evenly/proportion/manual, validate tip, popup Cancel, field tiền chỉ đọc |
| ⚠️ Lệch spec / cần xác nhận               | 6       | TC-EO-004, 029, 035, 038, 060, 068                                                                                                    |
| 🔍 Chỉ test thủ công được / cần seed data | 36      | Các case phải bấm `Confirm update`, kiểm tra report/payroll/API, store item, quyền                                                    |

**Ánh xạ nguồn:** 30/30 TC của VP-2591 và 50/50 TC của VP-2593 đều đã được ánh xạ vào bộ trên. Phần lớn case trùng
giữa 2 ticket đã được gộp. 10 case "bổ sung" là các case rút ra từ UI thực tế (Clear, Select all services, nhóm rỗng,
search catalog, discount…).

**Data cần chuẩn bị trước khi test thủ công:**

1. Order có **store item** (không staff): cho TC-EO-039 → 042.
2. Order **Partial refunded có tip**: cho TC-EO-036.
3. Kỳ payroll **locked** và kỳ payroll **đã tạo Check**: cho TC-EO-007, 008.
4. Tài khoản **không có quyền** sửa order: cho TC-EO-009.
5. Order ở các status `Canceling`, `Refunding`, `Cancel issue`, `Refund issue`: cho TC-EO-006.

---

## Phần C — Chạy test tự động

Code Playwright cho 70 case ở Phần B nằm trong `tests/e2e/edit-order/`, Page Object là
`src/pages/orders/OrderDetailPage.ts` (fixture `orderDetailPage`).

| Nhóm                                | File spec                              | Chạy thật | `fixme` |
| ----------------------------------- | -------------------------------------- | --------: | ------: |
| B1. Hiển thị nút Edit & Eligibility | `eligibility.e2e.spec.ts`              |         5 |       4 |
| B2. Edit customer                   | `edit-customer.e2e.spec.ts`            |         1 |       4 |
| B3. Sửa Staff                       | `edit-staff.e2e.spec.ts`               |         4 |       7 |
| B4. Sửa Service name & Note         | `service-name-note.e2e.spec.ts`        |         4 |       4 |
| B5. Dòng Refunded                   | `refunded-line.e2e.spec.ts`            |         1 |       4 |
| B6. Dòng Store                      | `store-line.e2e.spec.ts`               |         0 |       4 |
| B7. Tip allocation                  | `tip-allocation.e2e.spec.ts`           |         9 |       2 |
| B8. Rule tiền                       | `amount-invariants.e2e.spec.ts`        |         1 |       4 |
| B9. Save / Confirm popup            | `save-confirm-popup.e2e.spec.ts`       |         3 |       3 |
| B10. Activity log & tag Updated     | `activity-log-updated-tag.e2e.spec.ts` |         0 |       4 |
| B11. Edge case / Negative           | `edge-negative.e2e.spec.ts`            |         0 |       2 |
| **Tổng**                            |                                        |    **28** |  **42** |

### C1. Câu lệnh

`test:stage` chạy trên DEV Portal `https://v2.dev-fastboypay.com`, cũng là môi trường đã quét ở Phần A.

```bash
# Chạy toàn bộ (headless)
npm run test:stage -- tests/e2e/edit-order

# Chạy một nhóm (một file)
npm run test:stage -- tests/e2e/edit-order/tip-allocation.e2e.spec.ts

# Chạy một test case theo ID
npm run test:stage -- tests/e2e/edit-order --grep "TC-EO-045"

# Chỉ chạy các case smoke (TC-EO-001, 002, 015)
npm run test:stage -- tests/e2e/edit-order --grep @smoke

# Mở trình duyệt để xem test chạy
npm run test:stage -- tests/e2e/edit-order --headed
npm run test:stage -- tests/e2e/edit-order --ui

# Chỉ liệt kê test, không chạy
npx playwright test tests/e2e/edit-order --list

# Xem report HTML của Playwright sau khi chạy (reports/html)
npm run report
```

### C2. Cách đọc kết quả

- **28 case chạy thật** gồm các case ✅ và phần UI của các case ✅ + 🔍.
- **42 case `fixme`** hiện là **skipped**. Đây là kết quả bình thường, không phải lỗi:
  - 36 case 🔍 có ghi chú `TODO(manual/setup)`: cần bấm Confirm update, seed data, đổi role hoặc kiểm tra report/API.
  - 6 case ⚠️ có ghi chú `TODO(spec-conflict)`: chờ PO/DEV chốt.

  Tìm các ghi chú này bằng `grep -rn "TODO(" tests/e2e/edit-order`.

- Test tự tìm order theo status trên listing, không hardcode mã OD. Nếu DEV không có order phù hợp (ví dụ order 2 thợ có
  tip) trong 30 ngày gần nhất, test đó sẽ **skip** kèm lý do.
- **Không thay đổi dữ liệu DEV:** mọi request `POST/PUT/PATCH/DELETE` tới `/orders`, `/customers`, `split_tip` đều bị
  chặn trong `beforeEach`, và không test nào bấm **Confirm update**.

### C3. Xem kết quả trên dashboard

`npm run test:stage -- tests/e2e/edit-order` **không tự đưa kết quả lên dashboard**. Lệnh này chỉ chạy Playwright với
các reporter trong `playwright.config.ts` (list, html, json, junit, allure) và không build dashboard.

Lệnh có ghi kết quả ra `reports/json/results.json`, cũng là file mà dashboard đọc (`scripts/build-dashboard.mjs`).
Vì vậy sau khi chạy test, cần chạy thêm 2 lệnh:

```bash
npm run test:stage -- tests/e2e/edit-order
npm run dashboard:build   # đọc reports/json/results.json, ghi ra reports/dashboard/index.html
npm run dashboard:open    # mở dashboard trên trình duyệt
```

Lưu ý:

- **Dashboard chỉ có kết quả của edit-order.** Mỗi lần chạy, `results.json` bị ghi đè hoàn toàn, nên kết quả của các
  màn hình khác từ lần chạy trước sẽ mất khỏi dashboard.
- **Không dùng `npm run test:report` để chạy riêng edit-order.** Lệnh này gộp chạy test, build và mở dashboard, nhưng
  `scripts/run-tests-and-report.mjs` không nhận đường dẫn truyền vào. Do đó
  `npm run test:report -- tests/e2e/edit-order` vẫn chạy **toàn bộ suite**.
- Nếu chỉ cần report HTML mặc định của Playwright thì không cần build gì thêm: `npm run report`.

## Lịch sử chạy

### 2026-10-14 15:22 (UTC+7)

- Lệnh: `npm run test:stage -- tests/e2e/edit-order --reporter=list`
- Kết quả: 0 passed, 28 failed, 42 skipped (tổng 70, không tính setup)
- Fail: toàn bộ 28 test fail cùng một nguyên nhân, tại `OrdersPage.waitForReady` (`src/pages/orders/OrdersPage.ts:142`):
  không tìm thấy ô search với placeholder `/search by order id, customer name, phone/i`. Trên UI mới, placeholder là
  `Search orders...`.
  - TC-EO-001, 002, 003, 005, 006 (eligibility)
  - TC-EO-010 (edit customer)
  - TC-EO-015, 017, 021, 024 (edit staff)
  - TC-EO-026, 027, 031, 032 (service name & note)
  - TC-EO-034 (refunded line)
  - TC-EO-043 → 051 (tip allocation)
  - TC-EO-054 (amount invariants)
  - TC-EO-059, 061, 063 (save/confirm popup)
- Report chi tiết: `npm run report` (reports/html)

### 2026-10-14 16:10 (UTC+7)

- Lệnh: `npm run test:stage -- tests/e2e/edit-order --reporter=list`
- Kết quả: 28 passed, 0 failed, 42 skipped (tổng 70, không tính setup). 42 skip đều là `test.fixme` có chủ đích.
- Đã sửa page object theo giao diện mới (redesign `pos-*`) của Orders/Order Detail:
  - Ô search: placeholder `Search orders...`; heading `pos-page-heading`; card `pos-card-title`.
  - Filter Status/Payment method là `pos-filter-chip` (tên nút đổi thành `Status: <giá trị>` sau khi chọn); option chọn không phân biệt hoa thường.
  - Phân trang: `Next page` / `Previous page`; chờ dòng đầu đổi sau khi chuyển trang (bảng không còn skeleton).
  - Picker `Move to…` liệt kê toàn bộ staff của tiệm → gõ tên vào `Search staff...` trước khi chọn.
  - Lọc sẵn order nhiều staff qua cột Staff trên listing; chờ nút `Edit service details` render trước khi loại order.
- Report chi tiết: `npm run report` (reports/html)
