# Edit Order — Test case theo Linear (VP-2591 · VP-2593)

> VP-2591-TC28 (gọi API với field tiền) đã được bỏ theo yêu cầu QC ngày 2026-10-19.
>
> Chỉ gồm các test case **gốc** QC đã viết trên 2 ticket Linear, giữ nguyên số thứ tự của ticket
> (`VP-2591-TC01…TC30`, `VP-2593-TC01…TC50`). Bộ test tổng hợp, có đối chiếu DOM, nằm ở [edit-order.md](edit-order.md).

|                        |                                                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**             | [VP-2591](https://linear.app/fastboy/issue/VP-2591/portal-cho-phep-cap-nhat-thong-tin-order-khong-anh-huong-djen-gia-tien) — nghiệp vụ (30 TC, trong mô tả ticket)   |
|                        | [VP-2593](https://linear.app/fastboy/issue/VP-2593/portal-cap-nhat-thong-tin-order-khong-anh-huong-djen-gia-tien) — Portal FE (50 TC, trong comment "Test Cases QC") |
| **Trạng thái**         | Cả 2 ticket: **QC Testing**                                                                                                                                          |
| **Màn hình**           | Portal › Order Management › **Order Detail** — nút ✏️ `Edit customer` và `Edit service details`                                                                      |
| **API**                | `PUT /orders/{id}/items` (VP-2592, PR BE `volt-pos-api#1204`, `#1300`) · PR FE `fastboy-portal#436`                                                                  |
| **Code**               | `tests/e2e/edit-order-linear/` — `vp-2591.e2e.spec.ts`, `vp-2593.e2e.spec.ts`, `helpers.ts` · Page Object `src/pages/orders/OrderDetailPage.ts`                      |
| **Ngày lấy từ Linear** | 2026-10-18                                                                                                                                                           |

---

## 1. Tóm tắt yêu cầu

### 1.1 Được phép sửa

Customer · Staff (kéo-thả, tick nhiều → `Move to…`, đổi cả nhóm, thêm/bớt thợ) · Service name (gõ tay hoặc chọn từ
catalog, chỉ để điền tên) · Service note · Order note · Tip (split method + phân bổ từng người).

### 1.2 Rule tiền

- Tổng tiền order **trước = sau**. Không sửa được tiền, giảm giá, phí, payment. **Không tạo transaction mới.**
- **Total Tip trước = sau.** Người nhận tip = staff đang làm service (không chọn tay); đổi staff thì tip đi theo.
- Đổi service: giữ nguyên giá dòng (BE chỉ lưu `serviceName`, không đổi `service_id`).
- Đổi staff: sale + tip + income của dòng chuyển sang staff mới; report đúng staff mới, tiền giữ nguyên.
- Kỳ payroll **đã chốt** vẫn được sửa (phải recalculate report). Kỳ payroll **đã tạo Check** thì không cho sửa.

### 1.3 Status được sửa — các nguồn đang lệch nhau ⚠️

| Nguồn                         | Được sửa                                                               |
| ----------------------------- | ---------------------------------------------------------------------- |
| VP-2591 mô tả + TC01–TC03     | Successful - Unsettled / Settled, Partial Refunded                     |
| VP-2591 comment PO (23/07)    | Như trên **+ Refunded**; chỉ Canceled là không                         |
| VP-2593 Eligibility / TC01–06 | Successful - Unsettled / Settled, Partial Refunded; **không** Refunded |
| VP-2593 AC + việc cần làm #3  | "4 status hợp lệ", "thêm status `REFUNDED`"                            |
| Thực tế trên DEV (13/10)      | Unsettled, Settled, Partial Refunded — Refunded **không** có nút       |

Test tự động đi theo **chính TC của ticket** (VP-2591-TC03 và VP-2593-TC04: Refunded không có nút edit), khớp DEV hiện tại.

### 1.4 Theo loại dòng (VP-2593)

| Loại dòng           | Hành vi theo spec                                                 |
| ------------------- | ----------------------------------------------------------------- |
| Service có staff    | Sửa đầy đủ                                                        |
| Service đã refunded | Vẫn move/sửa, highlight đỏ + label "Refunded", không tính vào tip |
| Store (không staff) | Khoá hoàn toàn, không nhận tip, không nằm trong payload           |

### 1.5 Flow

Edit → sửa → `Save changes` (disabled đến khi hợp lệ) → popup **Confirm Order Update?** (`Cancel` / `Confirm Update`)
→ lưu → tag **Updated** ở Listing + Detail; activity log ghi user, thời gian, field, giá trị cũ → mới.

---

**Ký hiệu**

- Cột **Linear**: ☑ đã tick pass trên ticket · ☐ chưa tick.
- Cột **Tự động**: ✅ chạy đủ ý của TC · ◐ chạy một phần (phần nào ghi ở cột Ghi chú). Không còn case `test.fixme`.
- Cột **Ghi chú**: ❌ = lần chạy 2026-10-19 phát hiện lỗi / lệch spec; "Skip" = DEV thiếu dữ liệu nên test tự bỏ qua kèm lý do.

## 2. VP-2591 — 30 test case

| ID                                  | Test case (theo Linear)                                                                                           | Linear | Tự động | Ghi chú                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | :----: | :-----: | ------------------------------------------------------------------------------------------------ |
| **1. Button Edit Order**            |                                                                                                                   |        |         |                                                                                                  |
| VP-2591-TC01                        | Button **Edit Order** hiển thị trên Order Detail với order ở trạng thái hợp lệ (không phải Canceled/Refunded)     |   ☑    |   ✅    | Kiểm tra Unsettled, Settled, Partial Refunded                                                    |
| VP-2591-TC02                        | Button **Edit Order** bị disable với order **Canceled**                                                           |   ☑    |   ✅    | Trên UI là không có nút                                                                          |
| VP-2591-TC03                        | Button **Edit Order** bị disable với order **Refunded**                                                           |   ☑    |   ✅    | Xem §1.3                                                                                         |
| **2. Cập nhật Customer**            |                                                                                                                   |        |         |                                                                                                  |
| VP-2591-TC04                        | Đổi Customer của order thành công, tổng tiền order không đổi                                                      |   ☑    |   ✅    | Lưu thật: đổi customer (popup "Change customer?" → Change anyway) rồi đổi lại                    |
| **3. Cập nhật Staff**               |                                                                                                                   |        |         |                                                                                                  |
| VP-2591-TC05                        | Đổi Staff cho 1 line item, toàn bộ sale/tip/income của line item chuyển sang staff mới                            |   ☑    |   ✅    | ❌ **Bug**: income cộng cho staff mới nhưng không trừ ở staff cũ (Staff Income)                  |
| VP-2591-TC06                        | Đổi Staff qua lại giữa 2 service trong cùng order                                                                 |   ☑    |   ✅    | Lưu thật: hoán đổi 2 dòng, reload kiểm tra, hoàn tác                                             |
| VP-2591-TC07                        | Sau khi đổi Staff, report liên quan hiển thị đúng Staff mới nhưng số tiền giữ nguyên                              |   ☑    |   ✅    | Staff Income: subtotal theo staff mới; số tiền của order trong Daily Sale không đổi              |
| **4. Cập nhật Service**             |                                                                                                                   |        |         |                                                                                                  |
| VP-2591-TC08                        | Đổi sang service có **cùng giá** với service hiện tại → cho phép, line item giữ nguyên giá                        |   ☑    |    ◐    | Trong dialog: chọn từ catalog, giá dòng và Services total không đổi                              |
| VP-2591-TC09                        | Chọn service có **giá khác** → hệ thống chặn hoặc giữ nguyên giá trị tiền của line item                           |   ☑    |    ◐    | Catalog không hiện giá; chọn service khác tên, giá dòng giữ nguyên                               |
| VP-2591-TC10                        | Sau khi đổi Service, report Service hiển thị đúng service mới, số tiền giữ nguyên                                 |   ☑    |    ◐    | Không report nào liệt kê tên service: kiểm tên mới trên order và số tiền trong Daily Sale        |
| **5. Order/Service note**           |                                                                                                                   |        |         |                                                                                                  |
| VP-2591-TC11                        | Cập nhật Order description/note thành công                                                                        |   ☑    |    ◐    | Nhập được, Save bật; phần hiển thị sau lưu chưa kiểm                                             |
| VP-2591-TC12                        | Cập nhật Service note cho từng item thành công                                                                    |   ☑    |    ◐    | Mở `Add note`, nhập được; phần lưu chưa kiểm (chờ BE)                                            |
| **6. Tip**                          |                                                                                                                   |        |         |                                                                                                  |
| VP-2591-TC13                        | Đổi Tip Split Method, Total Tip trước/sau không đổi                                                               |   ☑    |   ✅    | Đổi qua 3 method, Total tip và `Balanced` giữ nguyên                                             |
| VP-2591-TC14                        | Đổi staff nhận Tip                                                                                                |   ☑    |    ◐    | Chuyển hết service sang staff khác → người nhận tip đổi theo                                     |
| VP-2591-TC15                        | Điều chỉnh số Tip phân bổ cho từng người, nhưng Total Tip giữ nguyên                                              |   ☑    |   ✅    | Manual, tổng = Total tip → `Balanced`, Save bật                                                  |
| VP-2591-TC16                        | Nhập lại phân bổ Tip có tổng khác Total Tip ban đầu → chặn/hiển thị lỗi, không cho Save                           |   ☑    |   ✅    | `Off by…` + lỗi, Save disabled                                                                   |
| **7. Ràng buộc không đổi giá tiền** |                                                                                                                   |        |         |                                                                                                  |
| VP-2591-TC17                        | Các field amount/fee/discount/tip value/payment không thể chỉnh sửa (disable hoặc không hiển thị trong Edit mode) |   ☑    |   ✅    |                                                                                                  |
| VP-2591-TC18                        | Tổng tiền order trước và sau khi update là giống nhau (so sánh trực tiếp)                                         |   ☑    |   ✅    | Đổi note + tên + staff, so Order summary trước/sau                                               |
| VP-2591-TC19                        | Sau khi update, không phát sinh payment transaction mới (kiểm tra payment history/log)                            |   ☐    |   ✅    | Số payment và số bản ghi Tender trong activity log không đổi                                     |
| **8. Confirmation popup**           |                                                                                                                   |        |         |                                                                                                  |
| VP-2591-TC20                        | Khi bấm Save, hiển thị popup đúng Title "Confirm Order Update?" và Message theo spec                              |   ☐    |   ✅    | DEV viết thường: "Confirm order update?" / "Confirm update" — so khớp không phân biệt hoa thường |
| VP-2591-TC21                        | Bấm **Cancel** trên popup → không lưu thay đổi, quay lại trạng thái trước đó                                      |   ☐    |   ✅    |                                                                                                  |
| VP-2591-TC22                        | Bấm **Confirm Update** → lưu thành công, đóng popup, hiển thị thông tin đã cập nhật                               |   ☐    |   ✅    | Popup và dialog đóng, toast "Order updated — no amount changed", note mới hiển thị               |
| **9. Activity Log**                 |                                                                                                                   |        |         |                                                                                                  |
| VP-2591-TC23                        | Sau khi update, activity log ghi đủ: user thực hiện, thời gian, field thay đổi, giá trị cũ, giá trị mới           |   ☐    |   ✅    | Log "Note <cũ> → <mới>", có giờ và tên user                                                      |
| VP-2591-TC24                        | Update nhiều field cùng lúc (VD: Customer + Staff + Tip) → activity log ghi đủ từng field                         |   ☐    |   ✅    | Note + Service Name + Staff Name + Tip đều có trong log                                          |
| **10. Tag Updated**                 |                                                                                                                   |        |         |                                                                                                  |
| VP-2591-TC25                        | Order Detail hiển thị tag **Updated** sau khi edit thành công                                                     |   ☐    |   ✅    |                                                                                                  |
| VP-2591-TC26                        | Order Listing hiển thị tag **Updated** cho order đã chỉnh sửa                                                     |   ☐    |   ✅    | Listing đánh dấu order đã sửa bằng icon bút chì cạnh mã order ("Order information was updated.") |
| **11. Edge case / Negative**        |                                                                                                                   |        |         |                                                                                                  |
| VP-2591-TC27                        | Edit Order nhiều lần liên tiếp trên cùng 1 order, dữ liệu và activity log vẫn chính xác qua từng lần              |   ☐    |   ✅    | 3 lần sửa liên tiếp, mỗi lần đúng và có log                                                      |
| VP-2591-TC29                        | User không có quyền chỉnh sửa order → không thấy hoặc không dùng được action Edit Order                           |   ☐    |    ◐    | Chạy khi có `NO_EDIT_STORAGE_STATE` (session tài khoản không quyền); hiện skip                   |
| VP-2591-TC30                        | Mất kết nối/lỗi network khi Confirm Update → không cập nhật một phần, hiển thị lỗi phù hợp                        |   ☐    |   ✅    | Giả lập mất mạng: hiện "Connection Error", dialog giữ dữ liệu, order không đổi                   |

## 3. VP-2593 — 50 test case

Test trên order **Successful (Unsettled/Settled)**, card **Service Details & Tip** (nút ✏️).

| ID                              | Test case (theo Linear)                                                                 | Linear | Tự động | Ghi chú                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------- | :----: | :-----: | ------------------------------------------------------------------------------------------------ |
| **1. Nút Edit & Eligibility**   |                                                                                         |        |         |                                                                                                  |
| VP-2593-TC01                    | Nút ✏️ hiện ở order status **Successful – Unsettled**                                   |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC02                    | Nút ✏️ hiện ở order status **Successful – Settled**                                     |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC03                    | Nút ✏️ hiện với order **Partial Refunded**                                              |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC04                    | Nút ✏️ không hiện với order có item **Refunded**                                        |   ☐    |   ✅    | Kiểm tra trên order status Refunded (xem §1.3)                                                   |
| VP-2593-TC05                    | Nút ✏️ **KHÔNG** hiện ở order **Canceled**                                              |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC06                    | Nút ✏️ không hiện ở các status không hợp lệ khác (Pending, In Progress…)                |   ☐    |    ◐    | Kiểm tra Pending, Re-opened; DEV không có các status khác                                        |
| **2. Sửa Staff (thợ)**          |                                                                                         |        |         |                                                                                                  |
| VP-2593-TC07                    | Kéo-thả 1 thợ từ dòng này sang dòng khác thành công                                     |   ☐    |   ✅    | Kéo-thả bằng chuột trong dialog                                                                  |
| VP-2593-TC08                    | Tick chọn nhiều item → **Move to** thợ khác thành công                                  |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC09                    | Đổi cả nhóm (group) sang thợ khác thành công                                            |   ☐    |   ✅    | Đổi staff của nhóm trong dialog, số dòng giữ nguyên                                              |
| VP-2593-TC10                    | Thêm thợ vào 1 service                                                                  |   ☐    |    ◐    | `Add staff` thêm nhóm trống; gán service + lưu chưa kiểm                                         |
| VP-2593-TC11                    | Bớt (xóa) thợ khỏi 1 service                                                            |   ☐    |    ◐    | Xoá nhóm thợ trống; kiểm không mất dòng service nào                                              |
| VP-2593-TC12                    | Sau đổi thợ: **sale + tip + income** của dòng chuyển sang thợ mới (report đúng thợ mới) |   ☐    |   ✅    | ❌ **Bug**: income không chuyển đúng sang staff mới (Staff Income)                               |
| VP-2593-TC13                    | Sau đổi thợ: tổng tiền dòng và tổng order **giữ nguyên**                                |   ☐    |    ◐    | Trong dialog: giá từng dòng và Services total không đổi                                          |
| **3. Sửa Service Name & Note**  |                                                                                         |        |         |                                                                                                  |
| VP-2593-TC14                    | Gõ tay tự do tên service → lưu đúng **name** mới                                        |   ☐    |    ◐    | Nhập được, Save bật; phần lưu chưa kiểm                                                          |
| VP-2593-TC15                    | Chọn tên từ **catalog** → chỉ điền tên (không đổi service_id)                           |   ☐    |    ◐    | Catalog không có giá, chỉ điền tên; service_id chỉ thấy khi lưu                                  |
| VP-2593-TC16                    | Sau đổi name: **giá dòng giữ nguyên**, service_id không đổi                             |   ☐    |    ◐    | Giá dòng giữ nguyên; service_id chỉ thấy khi lưu                                                 |
| VP-2593-TC17                    | Sửa **Service note** → lưu đúng (nếu BE đã hỗ trợ note)                                 |   ☐    |    ◐    | Nhập được; phần lưu chưa kiểm                                                                    |
| VP-2593-TC18                    | Để trống name / name không hợp lệ → validate chặn Save                                  |   ☐    |   ✅    | ❌ **Bug** (QC xác nhận 2026-10-19): xoá trống tên service, Save vẫn bật                         |
| **4. Refunded Item**            |                                                                                         |        |         |                                                                                                  |
| VP-2593-TC19                    | Refunded service **vẫn move/sửa được** bình thường                                      |   ☐    |   ✅    | Skip: DEV không có order Partial Refunded                                                        |
| VP-2593-TC20                    | Refunded item được **highlight đỏ + label "Refunded"**                                  |   ☐    |    ◐    | Kiểm label; màu đỏ kiểm bằng mắt                                                                 |
| VP-2593-TC21                    | Refunded item **không được tính vào tip**                                               |   ☐    |   ✅    | Skip: DEV không có order Partial Refunded có tip                                                 |
| VP-2593-TC22                    | BE tự tính lại đúng sau khi move refunded item; tổng tiền không đổi                     |   ☐    |   ✅    | Skip: DEV không có order Partial Refunded 2+ staff                                               |
| **5. Store Item (không staff)** |                                                                                         |        |         |                                                                                                  |
| VP-2593-TC23                    | Store item **read-only**: không kéo được                                                |   ☐    |   ✅    | Nhóm "Store · Not editable": không có tay nắm kéo                                                |
| VP-2593-TC24                    | Store item không chọn/tick được, không sửa được                                         |   ☐    |   ✅    | Dòng Store không có ô sửa tên, checkbox, nút đổi service                                         |
| VP-2593-TC25                    | Store item **không nhận tip**                                                           |   ☐    |   ✅    | Store không có trong danh sách nhận tip                                                          |
| VP-2593-TC26                    | Store item **không nằm trong payload** khi Save                                         |   ☐    |   ✅    | Listing đánh dấu order đã sửa bằng icon bút chì cạnh mã order ("Order information was updated.") |
| **6. Tip**                      |                                                                                         |        |         |                                                                                                  |
| VP-2593-TC27                    | Split method **Evenly** phân bổ đúng                                                    |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC28                    | Split method **Proportion** phân bổ đúng                                                |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC29                    | Split method **Manual** phân bổ từng người đúng                                         |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC30                    | **Total Tip khóa** — không sửa được tổng tip                                            |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC31                    | Recipient = **staff đang làm service** (không có checkbox chọn tay)                     |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC32                    | Đổi staff → tip đi theo staff mới                                                       |   ☐    |   ✅    | Trong dialog                                                                                     |
| VP-2593-TC33                    | **Total Tip trước = sau**                                                               |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC34                    | Tip lưu gom vào **1 API edit-order** (KHÔNG gọi `PUT /split_tip` riêng — check network) |   ☐    |   ✅    | 1 request `PUT /orders/{id}/items` có `tipShares`, không có `split_tip`                          |
| **7. Rule Tiền (bất biến)**     |                                                                                         |        |         |                                                                                                  |
| VP-2593-TC35                    | **Tổng tiền order trước = sau** khi lưu                                                 |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC36                    | Không sửa được field **tiền / giá dòng**                                                |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC37                    | Không sửa được **discount / phí / payment**                                             |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC38                    | **Không tạo transaction mới** (check DB/transaction list)                               |   ☐    |   ✅    | Không có bản ghi Tender/Gateway mới                                                              |
| **8. Save / Confirm / Tag**     |                                                                                         |        |         |                                                                                                  |
| VP-2593-TC39                    | Nút **Save disabled** đến khi thay đổi hợp lệ                                           |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC40                    | Click Save → hiện popup **"Confirm Order Update?"**                                     |   ☐    |   ✅    | So khớp tiêu đề không phân biệt hoa thường                                                       |
| VP-2593-TC41                    | Confirm → lưu thành công                                                                |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC42                    | Hủy popup → không lưu, giữ nguyên dữ liệu cũ                                            |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC43                    | Sau lưu: order gắn tag **Updated** ở **Listing**                                        |   ☐    |   ✅    | Listing đánh dấu order đã sửa bằng icon bút chì cạnh mã order ("Order information was updated.") |
| VP-2593-TC44                    | Sau lưu: order gắn tag **Updated** ở **Detail**                                         |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC45                    | **Activity log** ghi nhận thay đổi qua entity_history                                   |   ☐    |   ✅    | Log "Staff Name <cũ> → <mới>"                                                                    |
| **9. Edge / Regression**        |                                                                                         |        |         |                                                                                                  |
| VP-2593-TC46                    | Đổi nhiều thứ cùng lúc (staff + name + tip) trong 1 lần Save → đúng hết                 |   ☐    |   ✅    | Một request lưu cả items + tipShares; reload thấy đủ thay đổi                                    |
| VP-2593-TC47                    | Mở Edit rồi thoát không lưu → dữ liệu giữ nguyên                                        |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC48                    | Reload sau khi lưu → dữ liệu mới hiển thị đúng (persist)                                |   ☐    |   ✅    |                                                                                                  |
| VP-2593-TC49                    | Kiểm tra hiển thị trên nhiều size màn hình (responsive)                                 |   ☐    |   ✅    | 1920 / 1366 / 768 / 375 px: không tràn ngang, nút Save/Cancel dùng được                          |
| VP-2593-TC50                    | API lỗi khi Save → hiện thông báo lỗi, không mất dữ liệu đang sửa                       |   ☐    |   ✅    | Giả lập API 500: có thông báo lỗi, dialog giữ dữ liệu                                            |

---

## 4. Chạy test tự động

| Spec                  |   Tổng | ✅ chạy đủ | ◐ chạy một phần |
| --------------------- | -----: | ---------: | --------------: |
| `vp-2591.e2e.spec.ts` |     29 |         22 |               7 |
| `vp-2593.e2e.spec.ts` |     50 |         41 |               9 |
| **Tổng**              | **79** |     **63** |          **16** |

Mỗi file có 2 nhóm test:

- **Chỉ đọc** (`describe` đầu): chặn mọi request ghi tới `/orders`, `/customers`, `split_tip`, chỉ thao tác trong dialog rồi
  bấm Cancel.
- **Lưu thật trên DEV** (`describe` "lưu thật trên DEV"): bấm **Confirm update** thật, kiểm tra kết quả (order, activity
  log, tag Updated, Staff Income, Daily Sale), rồi **hoàn tác** trong `finally` (`restoreOrder`: trả tên service, staff,
  note và chia tip về như cũ). Order vẫn giữ tag **Updated** và các dòng activity log. VP-2591 sửa order khớp điều kiện
  thứ nhất, VP-2593 sửa order thứ hai, nên hai file chạy song song không đụng nhau. Trong một file các test lưu thật chạy
  lần lượt.

```bash
# Chạy cả 2 ticket (DEV Portal, headless)
npm run test:stage -- tests/e2e/edit-order-linear

# Chỉ 1 ticket
npm run test:stage -- tests/e2e/edit-order-linear/vp-2593.e2e.spec.ts

# 1 test case theo số Linear
npm run test:stage -- tests/e2e/edit-order-linear --grep "VP-2593-TC27"

# Smoke (VP-2591-TC01, VP-2593-TC01, TC02)
npm run test:stage -- tests/e2e/edit-order-linear --grep @smoke

# Chỉ liệt kê
npx playwright test tests/e2e/edit-order-linear --list
```

**Cách đọc kết quả**

- Test tự tìm order theo status trên listing. DEV thiếu dữ liệu (order Partial Refunded, tài khoản không quyền, order hôm nay
  cho report) thì test **skip** kèm lý do, không phải lỗi.
- Test report (VP-2591-TC05, TC07, VP-2593-TC12) cần order được tạo **hôm nay** (giờ cửa hàng), vì report mặc định lọc
  "Today". Chúng chỉ so số liệu của 2 staff liên quan, không so tổng cửa hàng (DEV liên tục có order mới).
- Test lưu thật để lại dấu vết trên DEV: tag Updated và activity log. Không đổi số tiền nào.
- Môi trường DEV dùng chung nên đôi khi test đỏ do flake. Chạy lại với `--retries=1` trước khi kết luận là bug.

**Lỗi / lệch spec phát hiện (2026-10-19)**

| Case                        | Vấn đề                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| VP-2591-TC05 · VP-2593-TC12 | Đổi staff: subtotal và tip trên Staff Income chuyển đúng, nhưng **income không trừ ở staff cũ** (tổng income cửa hàng tăng) |
| VP-2593-TC18                | Xoá trống tên service, **Save vẫn bật** (spec yêu cầu chặn) — QC đã xác nhận là bug                                         |     |     | ❌ **Bug** (QC xác nhận 2026-10-19): xoá trống tên service, Save vẫn bật |

## Lịch sử chạy

### 2026-10-19 07:14 (UTC+7)

- Lệnh: `npx cross-env ENV=stage playwright test tests/e2e/edit-order-linear --reporter=list`
- Kết quả: 0 passed, 1 failed (setup), 80 did not run (tổng 81)
- Fail:
  - `[setup] global.setup.ts › reuse captured session`: session đã lưu ở `src/data/dynamic/auth/admin.json` hết hạn
    (bị đẩy về trang login). Cả 80 test không chạy, chưa có kết quả nào về bản thân tính năng.
- Cần làm: đăng nhập lại bằng `npm run auth:stage` (Google + 2FA, phải làm tay) rồi chạy lại.

### 2026-10-19 (UTC+7) — chạy lại

- Lệnh: `npx cross-env ENV=stage playwright test tests/e2e/edit-order-linear --reporter=list`
- Kết quả: 0 passed, 1 failed (setup), 80 did not run (tổng 81)
- Fail: vẫn là `[setup] reuse captured session`, session hết hạn. `src/data/dynamic/auth/admin.json` vẫn là bản ngày
  2026-10-16 (refreshToken hết hạn 2026-10-18 17:09 UTC), tức là `npm run auth:stage` chưa ghi được session mới vào file.

### 2026-10-19 14:00 (UTC+7)

- Lệnh: `npx cross-env ENV=stage playwright test tests/e2e/edit-order-linear --reporter=list` (sau khi `npm run auth:stage`)
- Kết quả: 39 passed, 0 failed, 41 skipped (tổng 80, không tính setup), 2.6 phút
- Skipped:
  - 39 case `test.fixme` có chủ đích (⏸ trong bảng).
  - VP-2593-TC03, VP-2593-TC20: skip lúc chạy vì DEV không tìm thấy order **Partial Refunded** trong khoảng ngày lọc.
    VP-2591-TC01 vẫn pass nhưng chỉ kiểm được Unsettled và Settled vì lý do trên.
- Report chi tiết: `npm run report` (reports/html)

### 2026-10-19 14:36 (UTC+7)

- Lệnh: `npx cross-env ENV=stage playwright test tests/e2e/edit-order-linear` (reporter theo config, có app kết quả)
- Kết quả: 39 passed, 0 failed, 41 skipped (tổng 80, không tính setup), 1.7 phút. Giống lần chạy trước: 39 fixme +
  VP-2593-TC03, TC20 skip do DEV không có order Partial Refunded.
- Kết quả xem trong app desktop: `npm run results`

### 2026-10-19 16:41 (UTC+7)

- Lệnh: `npx cross-env ENV=stage playwright test tests/e2e/edit-order-linear` (đã bỏ hết `test.fixme`, có test lưu thật)
- Kết quả: 69 passed, 6 failed, 6 skipped (tổng 80, không tính setup), 9.7 phút. Mọi lần hoàn tác đều thành công.
- Fail (lỗi sản phẩm / lệch spec, xem bảng ở mục 4):
  - VP-2591-TC05, VP-2593-TC12 · Income không trừ ở staff cũ khi đổi staff
  - VP-2591-TC28 · API nhận payload có field tiền (2xx)
  - VP-2591-TC26, VP-2593-TC43 · Chưa có tag Updated ở Order Listing
  - VP-2593-TC18 · Tên service trống vẫn Save được
- Skip: VP-2591-TC29 (chưa có session tài khoản không quyền); VP-2593-TC03, TC19, TC20, TC21, TC22 (DEV không có order
  Partial Refunded).
- Kết quả xem trong app desktop: `npm run results`

### 2026-10-19 17:30 (UTC+7) — chạy chung với edit-order

- Lệnh: `npx cross-env ENV=stage playwright test tests/e2e/edit-order tests/e2e/edit-order-linear`, sau đó chạy lại các
  case fail: `--last-failed --workers=3 --retries=1`
- Lượt đầu: 51 passed, 26 failed, 3 skipped. 20 case fail vì trang Orders trên DEV không tải xong (chạy 2 bộ × 8 worker),
  chạy lại thì 17 case pass và 3 case skip (không có order Partial Refunded).
- Kết quả cuối: 68 passed, 6 failed, 6 skipped (tổng 80). 6 case fail vẫn là các lỗi đã ghi ở mục 4: VP-2591-TC05,
  VP-2593-TC12 (Staff Income khi đổi staff), VP-2591-TC28 (API nhận field tiền), VP-2591-TC26, VP-2593-TC43 (tag Updated
  ở listing), VP-2593-TC18 (tên service trống).

### 2026-10-19 21:00 (UTC+7) — sửa theo phản hồi QC

- Bỏ VP-2591-TC28 (code + bảng). Còn 79 case.
- VP-2591-TC26, VP-2593-TC43: listing đánh dấu order đã sửa bằng icon bút chì (`aria-label="Order information was
updated."`), không phải chữ "Updated". Đã sửa test; chạy lại: cả 2 **passed**.
- VP-2593-TC18: QC xác nhận là bug (tên service trống vẫn Save được) — giữ nguyên test, đang fail đúng.
- Còn fail: VP-2591-TC05, VP-2593-TC12 (Staff Income khi đổi staff), VP-2593-TC18.

## Đã loại bỏ / thay đổi (2026-10-20)

Không xoá TC nào.

- VP-2591-TC05, TC07, TC10 và VP-2593 (Staff Income): report giờ mở đúng ngày của order qua URL `?after=<ngày>&before=<ngày>` (ngày theo múi giờ store) thay vì yêu cầu order "placed today" → bỏ điều kiện tiên quyết isOrderFromToday.
- VP-2591-TC24: đổi thứ tự — move service trước rồi mới rename một service KHÁC (rename trước làm moveService không tìm thấy service theo tên).

Còn fail:

- VP-2591-TC29: thiếu môi trường — cần storageState của tài khoản không có quyền sửa order (`NO_EDIT_STORAGE_STATE`).
- VP-2591-TC24: log đổi Staff không khớp định dạng `"<service> · Staff Name <cũ> → <mới>"` — chưa xác minh được định dạng mới do session DEV hết hạn giữa chừng.
- Các TC VP-2591/VP-2593 khác trong danh sách fail ngày 2026-10-20 (VP-2593 :78, 273, 679, 696, 712, 822, 846, 1089) chưa chạy lại được: session `admin.json` bị 401 (`sessions/current`) từ ~16:00 ngày 2026-10-20.
