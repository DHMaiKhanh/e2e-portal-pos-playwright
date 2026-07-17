# Test Case — Màn hình Orders (Order History) (Lean Core)

> Portal POS merchant portal. Bộ **lean core** được chọn lọc — các case có giá trị cao, xác định (deterministic),
> chạy trực tiếp trên DOM thật với session đã đăng nhập được tái sử dụng. Được tổng hợp từ scan tĩnh
> (`docs/test-cases/_scan/orders.json`) và khám phá tương tác thật (`docs/test-cases/_scan/orders-interactions.json`,
> `docs/test-cases/_scan/order-detail.json`). Các case cần mock response lỗi, seed dữ liệu lớn (10k+ record),
> giả lập offline/network, hoặc đo hiệu năng đã được lược bớt khỏi bộ lean core (chỉ giữ lại các mốc quan trọng nhất).

|                       |                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Màn hình**          | Orders (Order History)                                                                                     |
| **Route**             | `/pos/<storeId>/orders` (query: `page`, `status`, `paymentMethod`, `dateField`, `dateAfter`, `dateBefore`) |
| **Route con**         | `/pos/<storeId>/orders/<orderId>` — trang **Order Detail** (không phải modal)                              |
| **Tổng số test case** | 34                                                                                                         |
| **Lựa chọn**          | Lean core (Ưu tiên cao, chạy được, không trùng lặp)                                                        |
| **Ngày tạo**          | 2026-07-08                                                                                                 |
| **Nguồn scan**        | `docs/test-cases/_scan/orders.json`, `orders-interactions.json`, `order-detail.json`                       |

## Tổng quan độ bao phủ

**Theo mức ưu tiên:** High 22 · Medium 10 · Low 2

**Theo loại:** Functional 11 · UI 8 · Navigation 6 · Data 5 · Edge 3 · Negative 1

**Theo khu vực:**

| #   | Khu vực                                 | Số case |
| --- | --------------------------------------- | ------- |
| 1   | Tải trang & Bố cục                      | 3       |
| 2   | Điều hướng Sidebar (dùng chung layout)  | 1       |
| 3   | Tìm kiếm (Search)                       | 3       |
| 4   | Bộ lọc Quick Filter (khoảng ngày nhanh) | 2       |
| 5   | Bộ lọc Date Picker (tuỳ chỉnh)          | 2       |
| 6   | Bộ lọc Staff                            | 3       |
| 7   | Bộ lọc Payment Method                   | 2       |
| 8   | Bộ lọc Status                           | 2       |
| 9   | Kết hợp nhiều bộ lọc                    | 2       |
| 10  | Bảng dữ liệu Order History              | 5       |
| 11  | Phân trang                              | 3       |
| 12  | Điều hướng sang Order Detail            | 2       |
| 13  | Trang Order Detail                      | 4       |

---

## Tải trang & Bố cục

### TC-ORD-001 — Vào Orders qua route theo store /pos/<id>/orders

**Ưu tiên:** High | **Loại:** Navigation

**Điều kiện tiên quyết:** Session đã đăng nhập được tái sử dụng (storageState hợp lệ).

**Các bước:**

1. Mở trực tiếp `/pos/<storeId>/orders`.
2. Chờ trang tải xong.

**Kết quả mong đợi:** URL cuối cùng có dạng `/pos/<storeId>/orders?page=1&status=all&paymentMethod=all&dateField=completedAt&dateAfter=<today>&dateBefore=<today>` (query mặc định được app tự thêm). Tiêu đề "Order History" hiển thị. Không bị đá về `/login`.

### TC-ORD-002 — Render đủ các khối chính khi tải lần đầu

**Ưu tiên:** High | **Loại:** UI

**Điều kiện tiên quyết:** Đang ở `/pos/<storeId>/orders`.

**Các bước:**

1. Quan sát toàn bộ trang từ trên xuống.

**Kết quả mong đợi:** Hiển thị đủ: tiêu đề "Order History", ô search, combobox Quick filter (mặc định "Today"), nút chọn ngày (hiển thị ngày hôm nay), nút "All staff", combobox "All method", combobox "All status", bảng dữ liệu với 7 cột (OD ID, PAYMENT METHOD, STAFF, CUSTOMER, STATUS, AMOUNT, DATE/TIME), và thanh phân trang ở cuối.

### TC-ORD-003 — Reload (F5) giữ nguyên bộ lọc trên URL

**Ưu tiên:** Medium | **Loại:** Functional

**Điều kiện tiên quyết:** Đang ở Orders với một bộ lọc bất kỳ đã áp dụng (vd. status=Canceled).

**Các bước:**

1. Ghi lại URL hiện tại (bao gồm query params).
2. Reload trang (F5).

**Kết quả mong đợi:** URL không đổi, bộ lọc trên UI (combobox status, method, ngày...) khớp với giá trị trong query string, và bảng hiển thị dữ liệu tương ứng với bộ lọc đó.

---

## Tìm kiếm (Search)

### TC-ORD-004 — Tìm theo Order ID trả về đúng kết quả

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Có ít nhất 1 order trong khoảng ngày đang lọc; biết trước một Order ID hợp lệ (vd. `OD260707-12050342` hoặc một phần của nó).

**Các bước:**

1. Nhập Order ID (hoặc một phần) vào ô "Search by order ID, customer name, phone...".
2. Chờ kết quả cập nhật.

**Kết quả mong đợi:** Bảng chỉ còn (các) dòng có OD ID khớp với từ khoá; số dòng và "Showing X to Y of Z results" cập nhật tương ứng.

### TC-ORD-005 — Tìm theo tên khách hàng hoặc số điện thoại

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Có order gắn với khách hàng có tên/SĐT xác định (vd. "Kari Burkholder" / "(612) 250-4116").

**Các bước:**

1. Nhập tên khách hàng (hoặc SĐT) vào ô search.
2. Chờ kết quả cập nhật.

**Kết quả mong đợi:** Chỉ (các) order của khách hàng đó được hiển thị trong cột CUSTOMER; các order có cột CUSTOMER là "—" không xuất hiện.

### TC-ORD-006 — Tìm kiếm không khớp hiển thị trạng thái rỗng

**Ưu tiên:** High | **Loại:** Edge

**Điều kiện tiên quyết:** Đang ở Orders với dữ liệu mặc định.

**Các bước:**

1. Nhập một chuỗi chắc chắn không khớp bất kỳ order/khách hàng nào (vd. `zzz_no_such_order_zzz`).
2. Chờ kết quả cập nhật (**lưu ý:** khi khám phá trực tiếp, ô search có độ trễ debounce — chờ ít nhất 1-2s hoặc nhấn Enter/blur trước khi kiểm tra bảng, vì đợi 1s chưa đủ để phản ánh kết quả rỗng trong lần khám phá này).

**Kết quả mong đợi:** Bảng hiển thị trạng thái rỗng (vd. "No orders found" hoặc tương đương) thay vì danh sách mặc định; nút Previous/Next bị ẩn hoặc disabled. _(Cần xác minh trực tiếp nội dung chính xác của thông báo rỗng — chưa quan sát được do độ trễ debounce khi khám phá.)_

---

## Bộ lọc Quick Filter

### TC-ORD-007 — Danh sách option của Quick filter

**Ưu tiên:** Medium | **Loại:** UI

**Điều kiện tiên quyết:** Đang ở Orders.

**Các bước:**

1. Click combobox Quick filter (mặc định "Today").

**Kết quả mong đợi:** Hiển thị đúng 4 option: "Today", "Yesterday", "Last 7 Days", "Last 30 Days" (xác nhận bằng khám phá trực tiếp — không có option "Custom" trong chính combobox này; khoảng ngày tuỳ chỉnh được set qua nút Date Picker riêng).

### TC-ORD-008 — Chọn "Last 7 Days" cập nhật cả bảng và nút ngày

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Đang ở Orders, Quick filter = "Today".

**Các bước:**

1. Chọn "Last 7 Days" trong Quick filter.

**Kết quả mong đợi:** Query `dateAfter`/`dateBefore` trên URL cập nhật để phủ 7 ngày gần nhất; nút hiển thị ngày cập nhật theo khoảng mới; bảng nạp lại dữ liệu trong khoảng 7 ngày đó.

---

## Bộ lọc Date Picker (tuỳ chỉnh)

### TC-ORD-009 — Mở Date Picker hiển thị lịch chọn ngày

**Ưu tiên:** Medium | **Loại:** UI

**Điều kiện tiên quyết:** Đang ở Orders.

**Các bước:**

1. Click nút hiển thị ngày (vd. "Jul 7, 2026").

**Kết quả mong đợi:** Một dialog lịch (`role="dialog"`) xuất hiện, xác nhận bằng khám phá trực tiếp (đếm dialog = 1 sau khi click).

### TC-ORD-010 — Chọn khoảng ngày tuỳ chỉnh cập nhật bảng

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Date Picker đang mở.

**Các bước:**

1. Chọn ngày bắt đầu và ngày kết thúc khác với mặc định.
2. Xác nhận/áp dụng.

**Kết quả mong đợi:** `dateAfter`/`dateBefore` trên URL cập nhật đúng khoảng đã chọn, Quick filter combobox không còn phản ánh "Today" (hoặc reset về trạng thái tương ứng), bảng chỉ hiển thị order trong khoảng ngày đó.

---

## Bộ lọc Staff

### TC-ORD-011 — Mở bộ lọc Staff hiển thị danh sách nhân viên

**Ưu tiên:** Medium | **Loại:** UI

**Điều kiện tiên quyết:** Đang ở Orders.

**Các bước:**

1. Click nút "All staff".

**Kết quả mong đợi:** Một panel/menu xuất hiện với item đầu "All staff" theo sau là danh sách nhân viên riêng lẻ (xác nhận trực tiếp gồm: Mr. Kevin Vu, Linda, Andy, Jackie, Tony, Annie, Mai, Val, Ryan, Evon, Wendy, Bob, Hugo, Vincent).

### TC-ORD-012 — Danh sách staff xuất hiện tên trùng lặp (Mr. Kevin Vu) — cần xác minh

**Ưu tiên:** Low | **Loại:** Edge

**Điều kiện tiên quyết:** Bộ lọc Staff đang mở.

**Các bước:**

1. Quan sát toàn bộ danh sách item trong panel Staff.

**Kết quả mong đợi:** _(Ghi nhận bất thường khi khám phá trực tiếp)_ — "Mr. Kevin Vu" xuất hiện 2 lần trong danh sách. Cần xác minh đây là 2 nhân viên khác nhau trùng tên hiển thị (nên có thêm định danh phụ như email/role) hay là lỗi render trùng lặp DOM.

### TC-ORD-013 — Chọn một staff cụ thể lọc đúng order của staff đó

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Bộ lọc Staff đang mở; biết trước tên staff xuất hiện trong ít nhất 1 order (vd. "Mai").

**Các bước:**

1. Bỏ chọn "All staff" (nếu cần) và chọn riêng "Mai".
2. Áp dụng bộ lọc.

**Kết quả mong đợi:** Bảng chỉ hiển thị các order có cột STAFF chứa "Mai" (order có nhiều staff đồng phục vụ vẫn hiển thị nếu "Mai" là một trong số đó).

---

## Bộ lọc Payment Method

### TC-ORD-014 — Danh sách option của Payment Method

**Ưu tiên:** Medium | **Loại:** UI

**Điều kiện tiên quyết:** Đang ở Orders.

**Các bước:**

1. Click combobox "All method".

**Kết quả mong đợi:** Hiển thị đúng 5 option (xác nhận trực tiếp): "All method", "Card", "Cash", "Gift Card", "Other".

### TC-ORD-015 — Lọc theo "Cash" chỉ hiển thị order thanh toán tiền mặt

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Có ít nhất 1 order thanh toán bằng Cash trong khoảng ngày đang lọc.

**Các bước:**

1. Chọn "Cash" trong combobox Payment Method.

**Kết quả mong đợi:** Cột PAYMENT METHOD của mọi dòng còn lại hiển thị "Cash"; query `paymentMethod` trên URL cập nhật tương ứng.

---

## Bộ lọc Status

### TC-ORD-016 — Danh sách option của Status

**Ưu tiên:** Medium | **Loại:** UI

**Điều kiện tiên quyết:** Đang ở Orders.

**Các bước:**

1. Click combobox "All status".

**Kết quả mong đợi:** Hiển thị đúng 11 option (xác nhận trực tiếp): "All status", "Cancel Issue", "Canceled", "Canceling", "Partial Refunded", "Refund Issue", "Refunded", "Refunding", "Successful - Settled", "Successful - Unsettled", "Re-opened".

### TC-ORD-017 — Lọc theo "Canceled" chỉ hiển thị order đã huỷ

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Có ít nhất 1 order ở trạng thái Canceled trong khoảng ngày đang lọc.

**Các bước:**

1. Chọn "Canceled" trong combobox Status.

**Kết quả mong đợi:** Badge STATUS của mọi dòng còn lại hiển thị "Canceled"; query `status` trên URL cập nhật tương ứng.

---

## Kết hợp nhiều bộ lọc

### TC-ORD-018 — Kết hợp Search + Status + Payment Method đồng thời

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Có dữ liệu thoả cả 3 điều kiện lọc dự kiến.

**Các bước:**

1. Nhập một từ khoá search.
2. Đồng thời chọn một Status cụ thể và một Payment Method cụ thể.

**Kết quả mong đợi:** Bảng chỉ hiển thị các order thoả **đồng thời** cả 3 điều kiện (AND, không phải OR); URL phản ánh đủ cả 3 query param.

### TC-ORD-019 — Xoá từng bộ lọc trả bảng về trạng thái rộng hơn

**Ưu tiên:** Medium | **Loại:** Functional

**Điều kiện tiên quyết:** Đã áp dụng nhiều bộ lọc như TC-ORD-018.

**Các bước:**

1. Đặt lại Status về "All status".
2. Đặt lại Payment Method về "All method".
3. Xoá nội dung ô search.

**Kết quả mong đợi:** Sau mỗi bước, tập kết quả nới rộng ra tương ứng; sau khi xoá hết, bảng trở về đúng danh sách mặc định theo khoảng ngày hiện tại (không bị kẹt ở trạng thái rỗng).

---

## Bảng dữ liệu Order History

### TC-ORD-020 — Định dạng OD ID đúng chuẩn

**Ưu tiên:** Medium | **Loại:** Data

**Điều kiện tiên quyết:** Bảng có ít nhất 1 dòng.

**Các bước:**

1. Kiểm tra giá trị cột OD ID của các dòng.

**Kết quả mong đợi:** Mỗi giá trị có dạng `#OD<YYMMDD>-<digits>` (vd. `#OD260707-12050342`).

### TC-ORD-021 — Định dạng AMOUNT là tiền tệ USD hợp lệ

**Ưu tiên:** Medium | **Loại:** Data

**Điều kiện tiên quyết:** Bảng có ít nhất 1 dòng.

**Các bước:**

1. Kiểm tra giá trị cột AMOUNT.

**Kết quả mong đợi:** Mọi giá trị có dạng `$X.XX` (2 chữ số thập phân), không âm, không hiển thị `NaN`/`undefined`.

### TC-ORD-022 — Cột CUSTOMER hiển thị "—" khi order không gắn khách hàng

**Ưu tiên:** Medium | **Loại:** Data

**Điều kiện tiên quyết:** Có ít nhất 1 order walk-in không gắn khách hàng.

**Các bước:**

1. Xác định dòng tương ứng và kiểm tra cột CUSTOMER.

**Kết quả mong đợi:** Ô hiển thị ký tự "—" (không phải chuỗi rỗng, "null", hay "undefined").

### TC-ORD-023 — Cột STAFF hiển thị đúng danh sách nhân viên đồng phục vụ

**Ưu tiên:** Medium | **Loại:** Data

**Điều kiện tiên quyết:** Có order với nhiều hơn 1 staff phục vụ (vd. "Val, Tony, Bob").

**Các bước:**

1. Kiểm tra cột STAFF của order đó.

**Kết quả mong đợi:** Tên các staff được nối bằng dấu phẩy + khoảng trắng, đúng thứ tự/đầy đủ so với dữ liệu gốc của order.

### TC-ORD-024 — Cột PAYMENT METHOD hiển thị đúng icon thẻ + 4 số cuối cho thanh toán thẻ

**Ưu tiên:** Low | **Loại:** UI

**Điều kiện tiên quyết:** Có order thanh toán bằng thẻ (Mastercard/Visa...).

**Các bước:**

1. Kiểm tra ô PAYMENT METHOD của order đó.

**Kết quả mong đợi:** Hiển thị icon thương hiệu thẻ (vd. "Mastercard") kèm text "•••• <4 số cuối>"; order thanh toán Cash/Other chỉ hiển thị text tương ứng, không có icon thẻ.

---

## Phân trang

### TC-ORD-025 — Previous/Next bị disabled khi chỉ có 1 trang

**Ưu tiên:** High | **Loại:** Edge

**Điều kiện tiên quyết:** Tổng số kết quả ≤ số dòng/trang (quan sát trực tiếp: 10 kết quả → 1 trang).

**Các bước:**

1. Quan sát trạng thái nút Previous và Next, cùng chỉ số trang (vd. "1 / 1").

**Kết quả mong đợi:** Cả hai nút đều ở trạng thái disabled; text "Showing 1 to N of N results" khớp tổng số dòng hiển thị.

### TC-ORD-026 — Next chuyển sang trang kế tiếp khi có nhiều hơn 1 trang

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Tổng số order trong khoảng ngày lọc vượt quá số dòng/trang (vd. chọn "Last 30 Days" để có nhiều dữ liệu hơn).

**Các bước:**

1. Ghi lại OD ID dòng đầu tiên của trang 1.
2. Click "Next".

**Kết quả mong đợi:** Trang chuyển sang trang 2, danh sách OD ID khác hoàn toàn với trang 1, chỉ số trang cập nhật (vd. "2 / N"), query `page` trên URL tăng lên.

### TC-ORD-027 — Previous quay lại đúng trang trước với dữ liệu nhất quán

**Ưu tiên:** Medium | **Loại:** Functional

**Điều kiện tiên quyết:** Đang ở trang 2 trở lên (tiếp nối TC-ORD-026).

**Các bước:**

1. Click "Previous".

**Kết quả mong đợi:** Trang quay lại trang trước đó với đúng danh sách order đã thấy trước khi bấm Next (không bị xáo trộn thứ tự do sort không ổn định).

---

## Điều hướng sang Order Detail

### TC-ORD-028 — Click vào một dòng order điều hướng sang trang chi tiết (không phải modal)

**Ưu tiên:** High | **Loại:** Navigation

**Điều kiện tiên quyết:** Bảng có ít nhất 1 dòng.

**Các bước:**

1. Click vào một dòng bất kỳ trong bảng (không click trực tiếp vào link/nút con nếu có).

**Kết quả mong đợi:** _(Xác nhận bằng khám phá trực tiếp — đây là điều hướng full-page, KHÔNG mở dialog/modal)_ Trình duyệt điều hướng sang `/pos/<storeId>/orders/<orderId>` (orderId dạng UUID), hiển thị trang "Order #<OD ID>".

### TC-ORD-029 — Nút "Back to orders" quay lại danh sách với bộ lọc trước đó

**Ưu tiên:** Medium | **Loại:** Navigation

**Điều kiện tiên quyết:** Đang ở trang Order Detail, đã điều hướng tới từ danh sách có áp dụng bộ lọc.

**Các bước:**

1. Click link "Back to orders" trong sidebar/breadcrumb.

**Kết quả mong đợi:** Quay lại `/pos/<storeId>/orders`. _(Cần xác minh trực tiếp: liệu bộ lọc/trang trước đó có được khôi phục hay bị reset về mặc định — hành vi chưa được xác nhận trong lần khám phá này.)_

---

## Trang Order Detail

### TC-ORD-030 — Trang chi tiết hiển thị đủ các khối thông tin

**Ưu tiên:** High | **Loại:** UI

**Điều kiện tiên quyết:** Đã điều hướng tới `/pos/<storeId>/orders/<orderId>` của một order đã huỷ (Canceled) có credit note.

**Các bước:**

1. Quan sát toàn bộ trang.

**Kết quả mong đợi:** _(Xác nhận bằng khám phá trực tiếp)_ Hiển thị đủ: header "Order #<OD ID>" kèm badge trạng thái (vd. "Canceled"), nút "Receipt" và "Re-Open Order"; khối "Order Information" (Order ID, Order Date, Customer, Order Note); khối "Service Details & Tip" (bảng Staff/Service/Price + Tip Breakdown); khối "Payment Details" (danh sách giao dịch với phương thức, trạng thái voided, received/change, thời gian, số tiền); khối "Activity Log"; khối "Order Summary" (Subtotal, Total Discount, Tax, Tip, Total); và khối "Cancel Information" liệt kê từng credit note (mã CN, Voided Amount, Date & Time, By Staff, Reason).

### TC-ORD-031 — Nút "Re-Open Order" bị disabled cho order đã có credit note đầy đủ

**Ưu tiên:** Medium | **Loại:** UI

**Điều kiện tiên quyết:** Order đã huỷ với toàn bộ số tiền đã được hoàn qua credit note (xác nhận trực tiếp trên 1 order mẫu).

**Các bước:**

1. Quan sát trạng thái nút "Re-Open Order".

**Kết quả mong đợi:** Nút ở trạng thái disabled _(quan sát trực tiếp: `[disabled]` trong accessibility tree)_. _(Cần xác minh thêm điều kiện chính xác khi nào nút này được enable.)_

### TC-ORD-032 — Order không có khách hàng/ghi chú hiển thị placeholder rõ ràng

**Ưu tiên:** Medium | **Loại:** Data

**Điều kiện tiên quyết:** Order không gắn khách hàng và không có ghi chú.

**Các bước:**

1. Kiểm tra khối "Order Information".

**Kết quả mong đợi:** Trường Customer hiển thị "No customer is available"; trường Order Note hiển thị "No note is available." — không hiển thị rỗng, "null" hay "undefined" _(xác nhận trực tiếp)_.

### TC-ORD-033 — Nút "Receipt" mở/hiển thị hoá đơn của order

**Ưu tiên:** Medium | **Loại:** Functional

**Điều kiện tiên quyết:** Đang ở trang Order Detail.

**Các bước:**

1. Click nút "Receipt".

**Kết quả mong đợi:** Mở modal/tab hiển thị hoá đơn (receipt) khớp với thông tin order (OD ID, dịch vụ, số tiền). _(Cần xác minh trực tiếp hành vi cụ thể — chưa click thử trong lần khám phá này.)_

### TC-ORD-034 — Order thành công (không huỷ/hoàn) không hiển thị khối "Cancel Information"

**Ưu tiên:** Medium | **Loại:** UI

**Điều kiện tiên quyết:** Điều hướng tới chi tiết của một order "Successful - Settled" (không bị huỷ/hoàn).

**Các bước:**

1. Quan sát trang chi tiết.

**Kết quả mong đợi:** Không xuất hiện khối "Cancel Information" hay bất kỳ mã CN nào; các khối còn lại (Order Information, Service Details & Tip, Payment Details, Activity Log, Order Summary) vẫn hiển thị đầy đủ.

---

## Ghi chú độ bao phủ

- Route con Order Detail (`/pos/<storeId>/orders/<orderId>`) được phát hiện qua khám phá trực tiếp (click row), **không** xuất hiện trong scan tĩnh ban đầu — đã bổ sung scan riêng (`order-detail.json`).
- Danh sách option của Quick filter, Status, Payment Method và Staff đã được xác nhận bằng tương tác DOM thật (không suy đoán).
- Các case liên quan tới: nội dung chính xác của trạng thái rỗng khi search không khớp (TC-ORD-006), hành vi giữ/reset bộ lọc khi back từ Order Detail (TC-ORD-029), hành vi nút "Receipt" (TC-ORD-033), và điều kiện enable của "Re-Open Order" (TC-ORD-031) — cần xác minh thêm trực tiếp, đã ghi chú rõ trong từng case thay vì suy đoán.
- Chưa seed được dữ liệu số lượng lớn (10k+ order) hoặc giả lập lỗi API/offline trong phiên khám phá này — các case dạng "performance dưới tải lớn" và "network failure" bị lược khỏi bộ lean core, có thể bổ sung khi có môi trường mock phù hợp.
- Không phát hiện chức năng tạo mới order, chỉnh sửa order, hay bulk action nào trên màn hình này — do đó không có case Create/Edit/Bulk (khác với các bảng dữ liệu khác trong hệ thống).
