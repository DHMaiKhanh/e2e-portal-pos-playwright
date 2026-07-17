# Test Case — Màn hình Overview (Lean Core)

> Portal POS merchant portal. Bộ **lean core** được chọn lọc — các case có giá trị cao, xác định (deterministic),
> chạy trực tiếp trên DOM thật với session đã đăng nhập được tái sử dụng. Được lọc từ bộ scan đầy đủ
> 33 case (xem `docs/test-cases/_scan/overview.json`); các case chỉ mang tính scaffold cần mock response,
> dữ liệu seed sẵn, chuyển đổi role, đọc clipboard, giả lập thiết bị thực, hoặc đo hiệu năng
> đã được chủ động loại bỏ. TC id gốc được giữ nguyên để truy vết về bộ scan đầy đủ.

|                       |                                                     |
| --------------------- | --------------------------------------------------- |
| **Màn hình**          | Overview                                            |
| **Route**             | `/pos/<id>/overview`                                |
| **Tổng số test case** | 32                                                  |
| **Lựa chọn**          | Lean core (Ưu tiên cao, chạy được, không trùng lặp) |
| **Ngày tạo**          | 2026-07-07                                          |
| **Nguồn scan**        | `docs/test-cases/_scan/overview.json`               |

## Tổng quan độ bao phủ

**Theo mức ưu tiên:** High 31 · Medium 1 · Low 0

**Theo loại:** UI 11 · Navigation 7 · Data 7 · Functional 5 · Edge 1 · Security 1

**Theo khu vực:**

| #   | Khu vực                                 | Số case |
| --- | --------------------------------------- | ------- |
| 1   | Tải trang & Bố cục (Page Load & Layout) | 5       |
| 2   | Header & Ngữ cảnh cửa hàng              | 3       |
| 3   | Thanh App Switcher                      | 2       |
| 4   | Điều hướng Sidebar                      | 4       |
| 5   | Today's Summary (Thẻ chỉ số)            | 3       |
| 6   | Thông tin Merchant                      | 3       |
| 7   | Tổng quan thiết bị (Device Summary)     | 4       |
| 8   | Lịch sử Batch                           | 3       |
| 9   | Tạo Token                               | 2       |
| 10  | Menu người dùng & Đăng xuất             | 1       |
| 11  | Responsive / Đa thiết bị                | 1       |
| 12  | Bảo mật & Phân quyền                    | 1       |

---

## Tải trang & Bố cục

### TC-OVW-001 — Vào Overview qua route theo store /pos/<id>/overview

**Ưu tiên:** High | **Loại:** Navigation

**Điều kiện tiên quyết:** Session đã đăng nhập được tái sử dụng (storageState hợp lệ). STORE_ID = 14.

**Các bước:**

1. Mở trình duyệt trực tiếp tới /pos/14/overview.
2. Chờ trang tải xong (domcontentloaded + app shell sẵn sàng).

**Kết quả mong đợi:** URL chính xác là /pos/14/overview (khớp /pos/\d+/overview), không bị đá về /login. Mục "Overview" trên sidebar hiển thị, xác nhận app shell đã render đúng cách khi đã đăng nhập. Không hiển thị trang lỗi/trắng.

### TC-OVW-002 — Chuyển hướng user đã đăng nhập từ root / sang Overview theo store

**Ưu tiên:** High | **Loại:** Navigation

**Điều kiện tiên quyết:** Session đã đăng nhập được tái sử dụng. STORE_ID = 14.

**Các bước:**

1. Điều hướng tới / (root).
2. Chờ app ổn định / các redirect hoàn tất.

**Kết quả mong đợi:** Trình duyệt được chuyển hướng tới /pos/14/overview (khớp /pos/\d+/overview). Nội dung Overview hiển thị. User KHÔNG bị kẹt ở / và KHÔNG bị đưa tới /login.

### TC-OVW-003 — Render đủ bốn khối nội dung của Overview khi tải lần đầu

**Ưu tiên:** High | **Loại:** UI

**Điều kiện tiên quyết:** Session đã đăng nhập được tái sử dụng. Đang ở /pos/14/overview.

**Các bước:**

1. Điều hướng tới /pos/14/overview.
2. Chờ app shell sẵn sàng.
3. Quét khu vực nội dung chính để tìm bốn tiêu đề khối (section header).

**Kết quả mong đợi:** Cả bốn khối đều hiện diện và hiển thị: "Today's Summary", "Merchant Information", "Device Summary", và "Batch History". Không có khối nào bị thiếu, trùng lặp, hoặc thiếu tiêu đề.

### TC-OVW-004 — Render các chỉ số Today's Summary bao gồm Total Payment khi tải trang

**Ưu tiên:** High | **Loại:** Data

**Điều kiện tiên quyết:** Session đã đăng nhập được tái sử dụng. Đang ở /pos/14/overview với dữ liệu tổng hợp mặc định (có thể bằng 0).

**Các bước:**

1. Điều hướng tới /pos/14/overview.
2. Chờ khối Today's Summary tải xong.
3. Kiểm tra các thẻ chỉ số/nhãn trong Today's Summary.

**Kết quả mong đợi:** Khối "Today's Summary" hiển thị các nhãn chỉ số bao gồm "Total Payment", mỗi nhãn đi kèm một giá trị đã render (tiền tệ/số, ví dụ 0 hoặc số đã định dạng). Không có nhãn chỉ số nào để trống, hiển thị "undefined", hoặc giữ mãi placeholder.

### TC-OVW-011 — Đảm bảo bố cục nguyên vẹn, không cuộn ngang hoặc chồng chéo khối ở viewport mặc định

**Ưu tiên:** Medium | **Loại:** UI

**Điều kiện tiên quyết:** Session đã đăng nhập được tái sử dụng. Viewport desktop mặc định (ví dụ 1280x720). Đang ở /pos/14/overview.

**Các bước:**

1. Điều hướng tới /pos/14/overview.
2. Chờ cả bốn khối render xong.
3. Kiểm tra scroll width của document so với chiều rộng viewport.
4. Kiểm tra trực quan cách sắp xếp bốn khối nội dung.

**Kết quả mong đợi:** Phần body của trang không cuộn ngang (document scrollWidth <= chiều rộng viewport). Bốn khối được sắp xếp đúng theo dạng grid/stack dự kiến, không chồng chéo, không bị cắt, và không tràn ra ngoài khu vực nội dung. Sidebar và nội dung chính không va chạm trực quan.

---

## Header & Ngữ cảnh cửa hàng

### TC-OVW-017 — Hiển thị cửa hàng hiện tại trong bộ chuyển đổi cửa hàng ở top-bar

**Ưu tiên:** High | **Loại:** UI

**Điều kiện tiên quyết:** Đã đăng nhập với session tái sử dụng; STORE_ID=14; trình duyệt đang ở /pos/14/overview.

**Các bước:**

1. Tải trang Overview cho store 14.
2. Xác định control chuyển đổi cửa hàng trên top bar (phía trên header ngữ cảnh cửa hàng).

**Kết quả mong đợi:** Một nút chuyển đổi cửa hàng có thể click hiển thị trên top bar với nhãn tên và id cửa hàng hiện tại: "Volt POS 14 Dev - Update #14". Nhãn khớp với cửa hàng đang được URL trỏ tới (id 14).

### TC-OVW-018 — Mở dropdown chuyển đổi cửa hàng và liệt kê các cửa hàng có sẵn

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Đang ở /pos/14/overview; tài khoản có quyền truy cập nhiều hơn một cửa hàng.

**Các bước:**

1. Click nút chuyển đổi cửa hàng "Volt POS 14 Dev - Update #14".
2. Quan sát panel được mở ra.

**Kết quả mong đợi:** Một dropdown/menu mở ra liệt kê các cửa hàng mà tài khoản có thể truy cập. Cửa hàng hiện tại ("Volt POS 14 Dev - Update #14") xuất hiện trong danh sách và được đánh dấu trực quan là mục đang chọn/active.

### TC-OVW-022 — Hiển thị tên cửa hàng hiện tại kèm badge trạng thái Active trong header

**Ưu tiên:** High | **Loại:** UI

**Điều kiện tiên quyết:** Đang ở /pos/14/overview cho cửa hàng active "Volt POS 14 Dev - Update".

**Các bước:**

1. Xem hàng header ngữ cảnh cửa hàng ngay trước nút "Generate Token".
2. Đọc tên cửa hàng và nội dung badge trạng thái.

**Kết quả mong đợi:** Header hiển thị tên cửa hàng "Volt POS 14 Dev - Update" ngay sau đó là badge trạng thái "Active", nhất quán với thông tin "Active since Apr 24, 2026" trong Merchant Information.

---

## Thanh App Switcher

### TC-OVW-033 — Kiểm tra thanh icon bên trái render đúng logo, bốn nút app-switcher, và menu người dùng theo đúng thứ tự

**Ưu tiên:** High | **Loại:** UI

**Điều kiện tiên quyết:** Đã đăng nhập (session tái sử dụng); đang ở màn hình Overview tại /pos/14/overview.

**Các bước:**

1. Xác định thanh icon bên trái (landmark complementary / <aside>).
2. Đọc các phần tử tương tác từ trên xuống dưới trong thanh.
3. Xác nhận các nút app-switcher được nhóm trong một vùng navigation.

**Kết quả mong đợi:** Thanh hiển thị theo thứ tự: link 'FastboyPay home' (chứa ảnh 'FastboyPay'), một nhóm navigation với các nút 'POS', 'Portal', 'Business', 'Gift Card' theo đúng thứ tự đó, và nút avatar 'Open user menu'. Tất cả đều hiển thị và enable; không thiếu hoặc trùng nút nào.

### TC-OVW-034 — Click logo FastboyPay home đưa user trở về store overview

**Ưu tiên:** High | **Loại:** Navigation

**Điều kiện tiên quyết:** Đã đăng nhập; đã điều hướng khỏi Overview sang /pos/14/orders.

**Các bước:**

1. Từ /pos/14/orders, click link 'FastboyPay home' trong thanh rail.
2. Chờ điều hướng hoàn tất.

**Kết quả mong đợi:** Link trỏ tới href '/'; do user đã đăng nhập, '/' sẽ chuyển hướng tới store overview và trình duyệt sẽ tới /pos/14/overview với nội dung Overview được render. Không có lỗi 404 hoặc trang trắng.

---

## Điều hướng Sidebar

### TC-OVW-049 — Kiểm tra mọi link sidebar có đúng href mong đợi

**Ưu tiên:** High | **Loại:** Data

**Điều kiện tiên quyết:** Đã đăng nhập với session tái sử dụng; STORE_ID=14; đang ở trang Overview tại /pos/14/overview.

**Các bước:**

1. Kiểm tra ba nhóm sidebar (POS, Management, Admin) trong DOM.
2. Đọc thuộc tính href của từng link nav (role=link) trong mỗi nhóm.
3. So sánh từng href với giá trị mong đợi.

**Kết quả mong đợi:** Tất cả 17 href khớp chính xác: nhóm POS -> Overview /pos/14/overview, Orders /pos/14/orders, Payroll /pos/14/payroll, Batch History /pos/14/batch; Management -> Staffs /pos/14/staffs, Services /pos/14/services, Customers /pos/14/customers, Customer Groups /pos/14/customer-groups, Income Reports /pos/14/income, Settings /pos/14/setting; Admin -> Onboarding /pos/onboarding, Merchants /pos/merchants, Orders /pos/admin/orders, Packages /pos/admin/packages, Devices /pos/admin/devices, Monitor /pos/admin/monitor, Versions /pos/admin/versions. Không có link nào bị thiếu, rỗng, hoặc là placeholder (#).

### TC-OVW-050 — Điều hướng mọi link trong nhóm POS tới đúng route theo store

**Ưu tiên:** High | **Loại:** Navigation

**Điều kiện tiên quyết:** Đã đăng nhập; STORE_ID=14; đang ở /pos/14/overview.

**Các bước:**

1. Click link sidebar 'Overview' và quan sát URL.
2. Click 'Orders' (link theo store, href /pos/14/orders) và quan sát URL.
3. Click 'Payroll' và quan sát URL.
4. Click 'Batch History' và quan sát URL.
5. Sau mỗi lần click, xác nhận trang tương ứng render đúng, không lỗi 404/error.

**Kết quả mong đợi:** URL lần lượt trở thành /pos/14/overview, /pos/14/orders, /pos/14/payroll, và /pos/14/batch; mỗi trang đích tải đúng nội dung của nó, không hiển thị lỗi/404.

### TC-OVW-051 — Điều hướng mọi link trong nhóm Management tới đúng route theo store

**Ưu tiên:** High | **Loại:** Navigation

**Điều kiện tiên quyết:** Đã đăng nhập; STORE_ID=14; đang ở /pos/14/overview.

**Các bước:**

1. Click 'Staffs' và quan sát URL.
2. Click 'Services' và quan sát URL.
3. Click 'Customers' và quan sát URL.
4. Click 'Customer Groups' và quan sát URL.
5. Click 'Income Reports' và quan sát URL.
6. Click 'Settings' và quan sát URL.

**Kết quả mong đợi:** URL lần lượt trở thành /pos/14/staffs, /pos/14/services, /pos/14/customers, /pos/14/customer-groups, /pos/14/income, và /pos/14/setting; mỗi trang tải không lỗi/404.

### TC-OVW-055 — Kiểm tra highlight mục đang active khớp với route hiện tại trên Overview

**Ưu tiên:** High | **Loại:** UI

**Điều kiện tiên quyết:** Đã đăng nhập; đang ở /pos/14/overview.

**Các bước:**

1. Quan sát sidebar khi tải lần đầu trang Overview.
2. Xác định link nav nào có style active/selected (ví dụ aria-current hoặc trạng thái highlight).

**Kết quả mong đợi:** Link 'Overview' (/pos/14/overview) được render ở trạng thái active/highlight; không có link nav nào khác hiển thị style active.

---

## Today's Summary (Thẻ chỉ số)

### TC-OVW-064 — Render đủ sáu thẻ chỉ số của Today's Summary với đúng nhãn và thứ tự

**Ưu tiên:** High | **Loại:** UI

**Điều kiện tiên quyết:** Đã đăng nhập với session tái sử dụng; store #14 có dữ liệu tổng hợp. Đang ở /pos/14/overview.

**Các bước:**

1. Mở /pos/14/overview và chờ app shell tải xong.
2. Xác định khối có tiêu đề 'Today's Summary'.
3. Đọc nhãn từng thẻ chỉ số theo thứ tự hiển thị.

**Kết quả mong đợi:** Đúng sáu thẻ được render dưới 'Today's Summary' với các nhãn: Total Order, Sale, Appointments, Total Tip, Total Payment, Gross Sale. Không có nhãn nào bị thiếu, trùng lặp, hoặc cắt ngắn; mỗi thẻ hiển thị một giá trị, một % thay đổi (delta), và icon thông tin (i).

### TC-OVW-066 — Các chỉ số tiền tệ hiển thị theo USD với ký hiệu $, dấu phân cách hàng nghìn, và hai chữ số thập phân

**Ưu tiên:** High | **Loại:** Data

**Điều kiện tiên quyết:** Đang ở /pos/14/overview với dữ liệu tổng hợp đã tải (Sale = $5,588.04, Total Tip = $243.94, Total Payment = $6,055.49, Gross Sale = $6,167.98).

**Các bước:**

1. Đọc giá trị trên thẻ 'Sale'.
2. Đọc giá trị trên thẻ 'Total Tip'.
3. Đọc giá trị trên thẻ 'Total Payment'.
4. Đọc giá trị trên thẻ 'Gross Sale'.

**Kết quả mong đợi:** Mỗi thẻ tiền tệ hiển thị dấu '$' ở đầu, đúng hai chữ số thập phân, và dấu phẩy phân cách hàng nghìn khi cần: Sale = $5,588.04, Total Tip = $243.94, Total Payment = $6,055.49, Gross Sale = $6,167.98. Không có thẻ tiền tệ nào hiển thị dạng số nguyên trần hoặc với 0/1/3+ chữ số thập phân.

### TC-OVW-073 — 'View All' trong Today's Summary điều hướng tới báo cáo Income (/pos/14/income)

**Ưu tiên:** High | **Loại:** Navigation

**Điều kiện tiên quyết:** Đang ở /pos/14/overview; link 'View All' trong khối 'Today's Summary' đang hiển thị.

**Các bước:**

1. Xác định link 'View All' trong khối 'Today's Summary' (không phải link của Batch History).
2. Click link 'View All'.
3. Quan sát URL và trang kết quả.

**Kết quả mong đợi:** Trình duyệt điều hướng cùng tab tới /pos/14/income (trang Income Reports). URL khớp /pos/\d+/income và màn hình income report tải thành công; không lỗi hoặc 404.

---

## Thông tin Merchant

### TC-OVW-080 — Kiểm tra khối Merchant Information render đủ mọi trường có nhãn

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Đã đăng nhập (session tái sử dụng). Merchant "Volt POS 14 Dev - Update" (POS id 14) tồn tại với dữ liệu profile đầy đủ.

**Các bước:**

1. Điều hướng tới /pos/14/overview.
2. Xác định khối "Merchant Information" trên trang Overview.
3. Kiểm tra trực quan khối cho từng trường: tên doanh nghiệp, số điện thoại, email, địa chỉ, Timezone, WHMCS, Package, ngày "Active since", và encryption key (uuid).
4. Xác nhận nút "Copy encryption key" hiện diện trong khối.

**Kết quả mong đợi:** Khối "Merchant Information" hiển thị và chứa đủ chín trường dữ liệu cộng với nút "Copy encryption key". Không trường nào bị trống, và không xuất hiện placeholder thô như "null", "undefined", hoặc "NaN".

### TC-OVW-081 — Kiểm tra Name, Phone, Email, và Address của merchant hiển thị đúng giá trị

**Ưu tiên:** High | **Loại:** Data

**Điều kiện tiên quyết:** Đang ở /pos/14/overview cho merchant "Volt POS 14 Dev - Update".

**Các bước:**

1. Đọc tên doanh nghiệp hiển thị ở đầu khối Merchant Information.
2. Đọc giá trị số điện thoại.
3. Đọc giá trị email.
4. Đọc giá trị địa chỉ.
5. So sánh từng giá trị với bản ghi backend của merchant.

**Kết quả mong đợi:** Name = "Volt POS 14 Dev - Update", Phone = "(205) 222-0000", Email = "test@email.cc", Address = "56A Le Khoi, Phu Thanh Ward, HCM, WY, 70111, US". Mỗi giá trị khớp chính xác với bản ghi backend, định dạng đúng.

### TC-OVW-086 — Kiểm tra encryption key hiển thị đúng dạng UUID hợp lệ

**Ưu tiên:** High | **Loại:** Data

**Điều kiện tiên quyết:** Đang ở /pos/14/overview.

**Các bước:**

1. Trong khối Merchant Information, xác định chuỗi encryption key hiển thị gần nút "Copy encryption key".
2. Kiểm tra chuỗi này theo mẫu UUID chuẩn 8-4-4-4-12 ký tự hex.

**Kết quả mong đợi:** Encryption key hiển thị là "019dcd1e-140a-7205-b548-64abeecadea9", khớp định dạng UUID /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i. Hiển thị đầy đủ (không bị ẩn/mask) và khớp với encryption key lưu trữ của merchant.

---

## Tổng quan thiết bị (Device Summary)

### TC-OVW-095 — Kiểm tra số lượng "Total Devices" hiển thị đúng bằng tổng số thiết bị thực tế

**Ưu tiên:** High | **Loại:** Data

**Điều kiện tiên quyết:** Đã đăng nhập; đang ở Overview tại /pos/14/overview cho merchant "Volt POS 14 Dev - Update"; khối "Device Summary" hiển thị "336 Total Devices".

**Các bước:**

1. Xác định tiêu đề khối "Device Summary".
2. Đọc giá trị số trong nhãn "N Total Devices" (quan sát: "336 Total Devices").
3. Cuộn danh sách thẻ thiết bị cho tới khi tải hết, sau đó đếm số thẻ "POS #n" riêng biệt được render.
4. So sánh số thẻ đã đếm với số "Total Devices".

**Kết quả mong đợi:** Số "N Total Devices" render dưới dạng số nguyên không âm, ngay dưới/cạnh badge offline, và bằng đúng tổng số thẻ thiết bị "POS #n" có sẵn trong danh sách khi đã tải hết. Nếu danh sách chỉ hiển thị 30 thẻ trong khi nhãn ghi 336, đây là lỗi (không khớp số lượng/danh sách) cần báo cáo.

### TC-OVW-096 — Kiểm tra badge cảnh báo "M offline" bằng đúng số thẻ ở trạng thái Offline

**Ưu tiên:** High | **Loại:** Data

**Điều kiện tiên quyết:** Đã đăng nhập; đang ở /pos/14/overview; "Device Summary" hiển thị badge cảnh báo "21 offline".

**Các bước:**

1. Đọc số trong badge cảnh báo "M offline" (quan sát: "21 offline").
2. Cuộn qua danh sách thẻ thiết bị và đếm mọi thẻ có text trạng thái đúng là "Offline".
3. So sánh số thẻ offline đã đếm với số trên badge.

**Kết quả mong đợi:** Số trên badge offline khớp chính xác với số thẻ hiển thị trạng thái "Offline" (quan sát 21: POS #10 đến POS #30). Badge được style dạng cảnh báo (màu/icon riêng biệt) và chỉ phản ánh thiết bị offline, không phải tổng số thiết bị.

### TC-OVW-099 — Kiểm tra một thẻ thiết bị hiển thị đủ các trường bắt buộc với đúng nhãn

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Đã đăng nhập; đang ở /pos/14/overview; "Device Summary" hiển thị thẻ "POS #1".

**Các bước:**

1. Xác định thẻ thiết bị "POS #1".
2. Đọc từng trường trên thẻ theo thứ tự: tiêu đề, trạng thái, Device ID, OS, App Version, terminal, printer.

**Kết quả mong đợi:** Thẻ hiển thị đủ bảy trường: tiêu đề "POS #1"; trạng thái "Online"; "Device ID: 019f3a8f-4879-7920-af09-7820a2740452"; "OS: Windows 10.0.26200"; "App Version: 0.1.0"; terminal "No terminal"; printer "No printer". Các nhãn hiện diện đầy đủ, không thiếu hoặc trống trường nào, và thẻ được expose như một nút có tên "Open POS #1 details".

### TC-OVW-105 — Kiểm tra "Open POS #1 details" mở modal/drawer chi tiết thiết bị

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Đã đăng nhập; đang ở /pos/14/overview; "Device Summary" hiển thị; hiện không có dialog nào đang mở.

**Các bước:**

1. Click thẻ "POS #1" / nút "Open POS #1 details" của nó.
2. Quan sát UI kết quả.
3. Xác minh nội dung view chi tiết tương ứng với POS #1 (Device ID 019f3a8f-4879-7920-af09-7820a2740452, Online, Windows 10.0.26200, App Version 0.1.0).

**Kết quả mong đợi:** Một modal hoặc drawer chi tiết mở ra (một dialog được thêm vào DOM — scan trước đó cho thấy 0 dialog trước khi tương tác) hiển thị đầy đủ chi tiết cho POS #1 khớp với giá trị trên thẻ; view chi tiết có tiêu đề/nút đóng rõ ràng và chỉ giới hạn ở thiết bị đã click, không phải POS khác.

---

## Lịch sử Batch (Batch History)

### TC-OVW-111 — Kiểm tra khối Batch History render với nhãn phạm vi 7 ngày

**Ưu tiên:** High | **Loại:** UI

**Điều kiện tiên quyết:** User đã đăng nhập đang ở màn hình Overview (/pos/<id>/overview) cho store có ít nhất một batch trong 7 ngày gần nhất.

**Các bước:**

1. Điều hướng tới /pos/<id>/overview.
2. Chờ app shell của Overview tải xong (mục sidebar 'Overview' hiển thị).
3. Xác định thẻ/khối Batch History trên trang.

**Kết quả mong đợi:** Khối 'Batch History' hiển thị với subtitle/nhãn cho biết phạm vi 'Last 7 days'. Khối chứa một bảng (không phải spinner hoặc lỗi) sau khi dữ liệu tải xong.

### TC-OVW-112 — Kiểm tra bảng Batch History hiển thị đúng các cột DATE, BATCH #, AMOUNT, STATUS

**Ưu tiên:** High | **Loại:** UI

**Điều kiện tiên quyết:** Đang ở màn hình Overview với ít nhất một dòng batch có dữ liệu trong 7 ngày gần nhất.

**Các bước:**

1. Điều hướng tới /pos/<id>/overview.
2. Xác định bảng Batch History.
3. Đọc dòng header của bảng.

**Kết quả mong đợi:** Dòng header hiển thị đúng bốn cột theo thứ tự: DATE, BATCH #, AMOUNT, STATUS. Không có cột thừa hoặc thiếu.

### TC-OVW-115 — Kiểm tra link View All điều hướng tới trang batch /pos/<id>/batch

**Ưu tiên:** High | **Loại:** Navigation

**Điều kiện tiên quyết:** Đang ở màn hình Overview; khối Batch History hiện diện (có dữ liệu hoặc rỗng).

**Các bước:**

1. Điều hướng tới /pos/<id>/overview.
2. Xác định link 'View All' trong/gần khối Batch History.
3. Click 'View All'.

**Kết quả mong đợi:** Trình duyệt điều hướng tới /pos/<id>/batch (cùng store id với Overview), và trang danh sách batch đầy đủ được tải.

---

## Tạo Token (Generate Token)

### TC-OVW-127 — Kiểm tra nút Generate Token hiển thị và enable trên Overview

**Ưu tiên:** High | **Loại:** UI

**Điều kiện tiên quyết:** User merchant đã đăng nhập có quyền quản lý token đang ở Overview tại /pos/14/overview; thẻ header merchant hiển thị "Volt POS 14 Dev - Update" với trạng thái "Active".

**Các bước:**

1. Điều hướng tới /pos/14/overview và chờ Overview render (mục sidebar "Overview" hiển thị).
2. Xác định thẻ header merchant chứa tên cửa hàng "Volt POS 14 Dev - Update" và trạng thái "Active".
3. Quan sát nút "Generate Token" trong thẻ đó.

**Kết quả mong đợi:** Một nút với accessible name "Generate Token" hiển thị trong thẻ header merchant, được enable (không bị mờ/disable), và có thể focus bằng phím Tab.

### TC-OVW-128 — Tạo token mở modal token với giá trị token đã được tạo

**Ưu tiên:** High | **Loại:** Functional

**Điều kiện tiên quyết:** Đang ở /pos/14/overview; hiện không có dialog nào đang mở (dialogs = 0 khi tải); endpoint tạo token của backend hoạt động bình thường.

**Các bước:**

1. Click nút "Generate Token".
2. Chờ request tạo token hoàn tất.
3. Quan sát UI kết quả.

**Kết quả mong đợi:** Một modal/dialog (role=dialog) mở ra và hiển thị chuỗi token vừa được tạo cho store 14 kèm chức năng copy; token không rỗng. Trang Overview phía sau modal vẫn giữ nguyên tại /pos/14/overview và không điều hướng đi nơi khác.

---

## Menu người dùng & Đăng xuất

### TC-OVW-143 — Kiểm tra các mục hiển thị trong menu người dùng khi mở

**Ưu tiên:** High | **Loại:** UI

**Điều kiện tiên quyết:** Đã đăng nhập và đang ở Overview; nút 'Open user menu' hiện diện.

**Các bước:**

1. Click nút 'Open user menu' để mở menu.
2. Liệt kê các menuitem hiển thị trong popup.
3. Xác nhận có mục Logout (nhãn khớp 'Log out' hoặc 'Sign out').
4. Xác nhận mọi mục account/profile (nếu có) đều đọc được rõ ràng, không bị cắt/chồng chéo.

**Kết quả mong đợi:** Menu hiển thị mục Logout được gắn nhãn rõ ràng ('Log out'/'Sign out') cùng các mục account/profile (nếu có); mọi mục đều có nhãn text hiển thị, không bị cắt, và có thể nhận diện duy nhất.

---

## Responsive / Đa thiết bị

### TC-OVW-196 — Kiểm tra không có cuộn ngang tại mốc màn hình hẹp 320px

**Ưu tiên:** High | **Loại:** Edge

**Điều kiện tiên quyết:** Đang ở /pos/14/overview; viewport đặt ở mốc hẹp 320x568.

**Các bước:**

1. Tải /pos/14/overview ở chiều rộng 320px.
2. Đo document.documentElement.scrollWidth so với window.innerWidth.
3. Kiểm tra các chuỗi dài không ngắt: encryption key '019dcd1e-140a-7205-b548-64abeecadea9', device ID, email 'test@email.cc', và địa chỉ '56A Le Khoi, Phu Thanh Ward, HCM, WY, 70111, US'.

**Kết quả mong đợi:** document scrollWidth nhỏ hơn hoặc bằng window.innerWidth (không có thanh cuộn ngang). Tất cả chuỗi dài đều xuống dòng, rút gọn (ellipsize), hoặc ngắt trong container của chúng thay vì đẩy layout rộng hơn viewport. Không có card, bảng, hoặc panel nào tràn ra ngoài mép phải.

---

## Bảo mật & Phân quyền

### TC-OVW-235 — Chuyển hướng user chưa đăng nhập từ deep link Overview về /login

**Ưu tiên:** High | **Loại:** Security

**Điều kiện tiên quyết:** Không có Portal session hợp lệ: cookie và localStorage cho Portal origin (dev.v2.fastboypay.com) đã được xóa hoàn toàn / một incognito context không có storageState nào được lưu.

**Các bước:**

1. Mở một browser context mới hoàn toàn không có dữ liệu session.
2. Điều hướng trực tiếp tới deep link Overview /pos/14/overview.
3. Quan sát URL đã resolve và nội dung được render.

**Kết quả mong đợi:** App ngay lập tức chuyển hướng tới /login và không render nội dung Overview nào — mục sidebar 'Overview', các thẻ POS ('Open POS #1 details'), số liệu 'Total Payment', encryption key, và control 'Generate Token' không bao giờ được hiển thị. Không có dữ liệu store nào được fetch hoặc lóe lên trước khi chuyển hướng.

---
