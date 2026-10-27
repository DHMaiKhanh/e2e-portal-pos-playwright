# Tổng hợp test case theo tính năng — Portal POS E2E

> Tự sinh từ các file spec trong `tests/e2e/` (nguồn sự thật). Mỗi dòng là một test case `test(...)` thực tế.
> Gộp theo 21 tính năng của Portal; các file `docs/test-cases/*.md` liên quan được liệt kê ở từng mục.

## Tổng quan

**1295 test · 212 file spec · 21 nhóm tính năng.**

| Tính năng                                                               | Page object                                                                          |   #File |    #Test | Docs                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------: | -------: | ------------------------------------------------------- |
| 01 — Overview                                                           | `dashboard/DashboardPage`                                                            |      11 |       27 | overview.md                                             |
| 02 — Orders (+ Edit Order)                                              | `orders/OrdersPage, orders/OrderDetailPage`                                          |      23 |      139 | orders.md, edit-order.md, edit-order-linear.md          |
| 03 — Batches                                                            | `batch/BatchHistoryPage`                                                             |      11 |       54 | batch-history.md                                        |
| 04 — Payroll                                                            | `payroll/PayrollPage`                                                                |      10 |       53 | payroll.md                                              |
| 05 — Staff Members                                                      | `staffs/StaffsPage`                                                                  |       8 |       48 | staffs.md                                               |
| 06 — Services                                                           | `products/ProductsPage`                                                              |      10 |       41 | services.md                                             |
| 07 — Customers                                                          | `customers/CustomersPage, customers/CustomerDetailPage`                              |      12 |       77 | customers.md                                            |
| 08 — Store Settings                                                     | `settings/SettingsPage, settings/CheckoutSettingPage`                                |       7 |       48 | settings.md, checkout-type-setting.md                   |
| 09–11 — Reports V1 (Daily Sale · Income Summary · Staff Income/Payroll) | `reports/ReportPagesPage, income/IncomePage`                                         |      30 |      275 | reports.md, income.md                                   |
| 12 — Report Configuration                                               | `report-config/ReportConfigPage`                                                     |      13 |       85 | report-config.md                                        |
| 13 — Reports V4 & Report Config V4                                      | `reports-v4/ReportsV4Page, reports-v4/ReportConfigV4Page, report-config-v4/RcV4Page` |      18 |      143 | reports-v4.md, report-config-v4.md, report-v4-master.md |
| 14 — Merchants (Internal)                                               | `merchants/MerchantsPage`                                                            |      14 |       81 | merchants.md                                            |
| 15 — Onboarding                                                         | `onboarding/OnboardingPage`                                                          |      15 |      138 | onboarding.md                                           |
| 16 — Packages                                                           | `packages/PackagesPage`                                                              |       3 |       10 | packages.md                                             |
| 17 — All Orders (Internal)                                              | `orders/AllOrdersPage`                                                               |       4 |       13 | all-orders.md                                           |
| 18 — Devices                                                            | `devices/DevicesPage`                                                                |       4 |       12 | devices.md                                              |
| 19 — System (Versions · Settings · Feature Flags)                       | `system/SystemPage`                                                                  |       4 |       14 | system.md, versions.md                                  |
| 20 — Monitoring (Remote Actions · Change Logs)                          | `monitor/RemoteActionsPage, monitor/ChangeLogsPage, monitor/MonitorPage`             |       4 |       14 | monitoring.md, monitor.md                               |
| 21 — Users & Roles                                                      | `users-roles/UsersRolesPage`                                                         |       4 |       12 | users-roles.md, admin-access.md                         |
| 00 — Regression (Linear bug re-tests, xuyên tính năng)                  | `(nhiều page object)`                                                                |       5 |        7 | regression-bugs-linear.md                               |
| 00 — Auth & Dashboard (hạ tầng)                                         | `auth/LoginPage, dashboard/DashboardPage`                                            |       2 |        4 | —                                                       |
| **Tổng**                                                                |                                                                                      | **212** | **1295** |                                                         |

## 01 — Overview

- **Page object:** `dashboard/DashboardPage`
- **Spec:** `tests/e2e/overview/`
- **Docs:** `docs/test-cases/overview.md`
- **Số test:** 27

### `overview/app-switcher-rail.e2e.spec.ts` (1)

- TC-OVW-033 — app switcher lists the Fastboy apps, and the user menu is present

### `overview/bao-mat-phan-quyen.e2e.spec.ts` (1)

- TC-OVW-235 — chuyển hướng user chưa đăng nhập từ deep link Overview về /login

### `overview/batch-history.e2e.spec.ts` (3)

- TC-OVW-111 — renders the Batch history section (7-day scope) with a table or empty state
- TC-OVW-112 — the table shows Date, Batch #, Amount, Status columns with formatted rows
- TC-OVW-115 — "View all" navigates to the batch page /pos/<id>/batch

### `overview/device-summary.e2e.spec.ts` (3)

- TC-OVW-095 — device count is a non-negative integer consistent with the rows
- TC-OVW-099 — a device row shows OS, version, terminal, printer and status
- TC-OVW-105 — "Open POS #1 details" opens the device detail dialog

### `overview/header-store-context.e2e.spec.ts` (3)

- TC-OVW-017 — displays the current store in the store switcher
- TC-OVW-018 — opens the store switcher listing stores with the current one marked
- TC-OVW-022 — shows the current store name with a status badge in the header

### `overview/merchant-information.e2e.spec.ts` (2)

- TC-OVW-080 — renders the Merchant information block with all its fields
- TC-OVW-081 — Name, Phone, Email, Address render in the expected formats

### `overview/page-load-layout.e2e.spec.ts` (5)

- TC-OVW-001 — lands on the store-scoped /pos/<id>/overview route
- TC-OVW-002 — redirects authenticated root / to the store Overview
- TC-OVW-003 — renders all Overview sections on load
- TC-OVW-004 — Today's summary renders today's orders and sales with values
- TC-OVW-011 — no horizontal page scroll at the default viewport

### `overview/responsive-da-thiet-bi.e2e.spec.ts` (1)

- TC-OVW-196 — không có cuộn ngang ở viewport 320px

### `overview/sidebar-navigation.e2e.spec.ts` (4)

- TC-OVW-049 — every sidebar link exposes its exact expected href
- TC-OVW-050 — POS-group links navigate to their store-scoped routes
- TC-OVW-051 — Management-group links navigate to their store-scoped routes
- TC-OVW-055 — Overview is the sole active item on the Overview route

### `overview/today-s-summary-metric-cards.e2e.spec.ts` (3)

- TC-OVW-064 — renders today's order count and sales in the header
- TC-OVW-066 — currency metric renders as USD with $, thousands separator, two decimals
- TC-OVW-073 — Today's Summary 'View report' navigates to the Income report

### `overview/user-menu-logout.e2e.spec.ts` (1)

- TC-OVW-143 — opens the user menu and lists a clearly labeled Logout item

## 02 — Orders (+ Edit Order)

- **Page object:** `orders/OrdersPage, orders/OrderDetailPage`
- **Spec:** `tests/e2e/orders/`, `tests/e2e/edit-order/`, `tests/e2e/edit-order-linear/`
- **Docs:** `docs/test-cases/orders.md`, `docs/test-cases/edit-order.md`, `docs/test-cases/edit-order-linear.md`
- **Số test:** 139

### `orders/combined-filters.e2e.spec.ts` (2)

- TC-ORD-018 — search + status + payment method combined (AND) filtering
- TC-ORD-019 — clearing filters one by one widens results back to default

### `orders/date-picker.e2e.spec.ts` (2)

- TC-ORD-009 — mở Date Picker hiển thị lịch chọn ngày
- TC-ORD-010 — chọn khoảng ngày tuỳ chỉnh cập nhật bảng

### `orders/order-detail-navigation.e2e.spec.ts` (2)

- TC-ORD-028 — click row navigates full-page to order detail (not modal)
- TC-ORD-029 — "Back to orders" đưa về danh sách (bộ lọc reset về mặc định)

### `orders/order-detail-page.e2e.spec.ts` (5)

- TC-ORD-030 — trang chi tiết hiển thị đủ các khối thông tin
- TC-ORD-031 — nút "Re-Open Order" bị disabled cho order đã có credit note đầy đủ
- TC-ORD-032 — order không có khách hàng/ghi chú hiển thị placeholder rõ ràng
- TC-ORD-033 — nút "Receipt" mở/hiển thị hoá đơn của order
- TC-ORD-034 — order thành công (không huỷ/hoàn) không hiển thị khối "Cancel Information"

### `orders/order-table-data.e2e.spec.ts` (5)

- TC-ORD-020 — định dạng OD ID đúng chuẩn
- TC-ORD-021 — định dạng AMOUNT là tiền tệ USD hợp lệ
- TC-ORD-022 — cột CUSTOMER hiển thị "—" khi order không gắn khách hàng
- TC-ORD-023 — cột STAFF hiển thị đúng danh sách nhân viên đồng phục vụ
- TC-ORD-024 — cột PAYMENT METHOD hiển thị đúng icon thẻ + 4 số cuối cho thanh toán thẻ

### `orders/orders-mocked.e2e.spec.ts` (1)

- renders exactly the mocked orders

### `orders/orders.e2e.spec.ts` (3)

- renders the orders table
- filters orders by status
- searches for an order

### `orders/page-load-layout.e2e.spec.ts` (3)

- TC-ORD-001 — vào Orders qua route theo store /pos/<id>/orders
- TC-ORD-002 — render đủ các khối chính khi tải lần đầu
- TC-ORD-003 — reload (F5) giữ nguyên bộ lọc trên URL

### `orders/pagination.e2e.spec.ts` (3)

- TC-ORD-025 — Previous/Next disabled khi chỉ có 1 trang
- TC-ORD-026 — Next chuyển sang trang kế tiếp khi có nhiều hơn 1 trang
- TC-ORD-027 — Previous quay lại đúng trang trước với dữ liệu nhất quán

### `orders/payment-method-filter.e2e.spec.ts` (2)

- TC-ORD-014 — Payment Method combobox lists exactly 4 options
- TC-ORD-015 — filtering by "Cash" shows only cash-paid orders

### `orders/quick-filter.e2e.spec.ts` (2)

- TC-ORD-007 — Danh sách option của Quick filter
- TC-ORD-008 — Chọn "Last 7 Days" cập nhật cả bảng và nút ngày

### `orders/search.e2e.spec.ts` (3)

- TC-ORD-004 — search by Order ID returns matching rows
- TC-ORD-005 — search by customer name or phone filters CUSTOMER column
- TC-ORD-006 — search with no match shows empty state

### `orders/staff-filter.e2e.spec.ts` (3)

- TC-ORD-011 — mở bộ lọc Staff hiển thị danh sách nhân viên
- TC-ORD-012 — 2 staff trùng tên hiển thị vẫn được liệt kê riêng biệt
- TC-ORD-013 — chọn một staff cụ thể lọc đúng order của staff đó

### `orders/status-filter.e2e.spec.ts` (2)

- TC-ORD-016 — danh sách option của Status combobox
- TC-ORD-017 — lọc theo "Canceled" chỉ hiển thị order đã huỷ

### `edit-order/amount-invariants.e2e.spec.ts` (1)

- TC-EO-054 — Không có field tiền nào sửa được

### `edit-order/edit-customer.e2e.spec.ts` (1)

- TC-EO-010 — Mở dialog Edit customer

### `edit-order/edit-staff.e2e.spec.ts` (4)

- TC-EO-015 — Bố cục dialog Edit service details
- TC-EO-017 — Tick nhiều dòng rồi Move to…
- TC-EO-021 — Thêm staff
- TC-EO-024 — Nhóm rỗng chặn Save

### `edit-order/eligibility.e2e.spec.ts` (4)

- TC-EO-001 — Nút edit hiện với order Successful - Unsettled
- TC-EO-002 — Nút edit hiện với order Successful - Settled
- TC-EO-005 — Order Canceled không có nút edit
- TC-EO-006 — Status không hợp lệ khác không có nút edit

### `edit-order/save-confirm-popup.e2e.spec.ts` (3)

- TC-EO-059 — Save disabled khi chưa có thay đổi hợp lệ
- TC-EO-061 — Cancel trên popup
- TC-EO-063 — Đóng dialog không lưu

### `edit-order/service-name-note.e2e.spec.ts` (4)

- TC-EO-026 — Gõ tay tên service
- TC-EO-027 — Chọn tên từ catalog
- TC-EO-031 — Thêm Service note
- TC-EO-032 — Cập nhật Order note

### `edit-order/tip-allocation.e2e.spec.ts` (8)

- TC-EO-044 — Bố cục Tip allocation
- TC-EO-045 — Split evenly
- TC-EO-046 — Proportion
- TC-EO-047 — Manual phân bổ hợp lệ
- TC-EO-048 — Manual lệch tổng thì chặn Save
- TC-EO-049 — Total Tip bị khoá
- TC-EO-050 — Người nhận tip = staff đang làm service
- TC-EO-051 — Đổi staff thì tip đi theo

### `edit-order-linear/vp-2591.e2e.spec.ts` (28)

- VP-2591-TC01 — Button Edit Order hiển thị với order ở trạng thái hợp lệ
- VP-2591-TC02 — Button Edit Order bị disable với order Canceled
- VP-2591-TC03 — Button Edit Order bị disable với order Refunded
- VP-2591-TC08 — Đổi sang service cùng giá → cho phép, line item giữ nguyên giá
- VP-2591-TC09 — Chọn service giá khác → giữ nguyên giá trị tiền của line item
- VP-2591-TC11 — Cập nhật Order description/note thành công
- VP-2591-TC12 — Cập nhật Service note cho từng item thành công
- VP-2591-TC13 — Đổi Tip Split Method, Total Tip trước/sau không đổi
- VP-2591-TC14 — Đổi staff nhận Tip
- VP-2591-TC15 — Điều chỉnh số Tip phân bổ cho từng người, Total Tip giữ nguyên
- VP-2591-TC16 — Phân bổ Tip có tổng khác Total Tip → chặn, không cho Save
- VP-2591-TC17 — Field amount/fee/discount/tip value/payment không thể chỉnh sửa
- VP-2591-TC20 — Bấm Save → popup đúng Title "Confirm Order Update?" và Message theo spec
- VP-2591-TC21 — Bấm Cancel trên popup → không lưu thay đổi, quay lại trạng thái trước
- VP-2591-TC04 — Đổi Customer của order thành công, tổng tiền order không đổi
- VP-2591-TC05 — Đổi Staff cho 1 line item, sale/tip/income chuyển sang staff mới
- VP-2591-TC06 — Đổi Staff qua lại giữa 2 service trong cùng order
- VP-2591-TC07 — Sau khi đổi Staff, report hiển thị đúng Staff mới, số tiền giữ nguyên
- VP-2591-TC10 — Sau khi đổi Service, report Service hiển thị đúng service mới
- VP-2591-TC18 — Tổng tiền order trước và sau khi update là giống nhau
- VP-2591-TC19 — Sau khi update, không phát sinh payment transaction mới
- VP-2591-TC22 — Bấm Confirm Update → lưu thành công, đóng popup, hiển thị thông tin mới
- VP-2591-TC23 — Activity log ghi đủ user, thời gian, field, giá trị cũ, giá trị mới
- VP-2591-TC24 — Update nhiều field cùng lúc → activity log ghi đủ từng field
- VP-2591-TC25 — Order Detail hiển thị tag Updated sau khi edit thành công
- VP-2591-TC26 — Order Listing hiển thị tag Updated cho order đã chỉnh sửa
- VP-2591-TC27 — Edit Order nhiều lần liên tiếp, dữ liệu và activity log vẫn chính xác
- VP-2591-TC30 — Lỗi network khi Confirm Update → không cập nhật một phần, hiện lỗi

### `edit-order-linear/vp-2593.e2e.spec.ts` (48)

- VP-2593-TC01 — Nút ✏️ hiện ở order Successful – Unsettled
- VP-2593-TC02 — Nút ✏️ hiện ở order Successful – Settled
- VP-2593-TC03 — Nút ✏️ hiện với order Partial Refunded
- VP-2593-TC04 — Nút ✏️ không hiện với order Refunded
- VP-2593-TC05 — Nút ✏️ không hiện ở order Canceled
- VP-2593-TC06 — Nút ✏️ không hiện ở các status không hợp lệ khác
- VP-2593-TC08 — Tick chọn nhiều item → Move to thợ khác thành công
- VP-2593-TC10 — Thêm thợ vào 1 service
- VP-2593-TC13 — Sau đổi thợ: tổng tiền dòng và tổng order giữ nguyên
- VP-2593-TC14 — Gõ tay tự do tên service → lưu đúng name mới
- VP-2593-TC15 — Chọn tên từ catalog → chỉ điền tên
- VP-2593-TC16 — Sau đổi name: giá dòng giữ nguyên
- VP-2593-TC17 — Sửa Service note → lưu đúng
- VP-2593-TC20 — Refunded item được highlight đỏ + label "Refunded"
- VP-2593-TC27 — Split method Evenly phân bổ đúng
- VP-2593-TC28 — Split method Proportion phân bổ đúng
- VP-2593-TC29 — Split method Manual phân bổ từng người đúng
- VP-2593-TC30 — Total Tip khóa — không sửa được tổng tip
- VP-2593-TC31 — Recipient = staff đang làm service (không có checkbox chọn tay)
- VP-2593-TC32 — Đổi staff → tip đi theo staff mới
- VP-2593-TC36 — Không sửa được field tiền / giá dòng
- VP-2593-TC37 — Không sửa được discount / phí / payment
- VP-2593-TC39 — Nút Save disabled đến khi thay đổi hợp lệ
- VP-2593-TC40 — Click Save → hiện popup "Confirm Order Update?"
- VP-2593-TC42 — Hủy popup → không lưu, giữ nguyên dữ liệu cũ
- VP-2593-TC47 — Mở Edit rồi thoát không lưu → dữ liệu giữ nguyên
- VP-2593-TC49 — Kiểm tra hiển thị trên nhiều size màn hình (responsive)
- VP-2593-TC07 — Kéo-thả 1 thợ từ dòng này sang dòng khác thành công
- VP-2593-TC09 — Đổi cả nhóm (group) sang thợ khác thành công
- VP-2593-TC11 — Bớt (xóa) thợ khỏi 1 service
- VP-2593-TC18 — Để trống name / name không hợp lệ → validate chặn Save
- VP-2593-TC21 — Refunded item không được tính vào tip
- VP-2593-TC23 — Store item read-only: không kéo được
- VP-2593-TC24 — Store item không chọn/tick được, không sửa được
- VP-2593-TC25 — Store item không nhận tip
- VP-2593-TC12 — Sau đổi thợ: sale + tip + income chuyển sang thợ mới (report)
- VP-2593-TC26 — Store item không nằm trong payload khi Save
- VP-2593-TC33 — Total Tip trước = sau
- VP-2593-TC34 — Tip lưu gom vào 1 API edit-order (không gọi PUT /split_tip riêng)
- VP-2593-TC35 — Tổng tiền order trước = sau khi lưu
- VP-2593-TC38 — Không tạo transaction mới (check DB/transaction list)
- VP-2593-TC41 — Confirm → lưu thành công
- VP-2593-TC43 — Sau lưu: order gắn tag Updated ở Listing
- VP-2593-TC44 — Sau lưu: order gắn tag Updated ở Detail
- VP-2593-TC45 — Activity log ghi nhận thay đổi qua entity_history
- VP-2593-TC46 — Đổi nhiều thứ cùng lúc (staff + name + tip) trong 1 lần Save
- VP-2593-TC48 — Reload sau khi lưu → dữ liệu mới hiển thị đúng (persist)
- VP-2593-TC50 — API lỗi khi Save → hiện thông báo lỗi, không mất dữ liệu đang sửa

## 03 — Batches

- **Page object:** `batch/BatchHistoryPage`
- **Spec:** `tests/e2e/batch-history/`
- **Docs:** `docs/test-cases/batch-history.md`
- **Số test:** 54

### `batch-history/bang-du-lieu-phan-trang.e2e.spec.ts` (8)

- TC-BH-023 — header bảng hiển thị đúng nhãn và đúng thứ tự
- TC-BH-024 — giá trị từng dòng khớp với dữ liệu nguồn
- TC-BH-025 — nút Next/Previous chuyển trang đúng
- TC-BH-026 — nút phân trang disable đúng ở trang đầu/cuối
- TC-BH-027 — footer "X–Y of Z" chính xác qua các trang
- TC-BH-028 — phân trang ẩn/disable đúng khi kết quả chỉ có 1 trang
- TC-BH-029 — đổi filter khi đang ở trang 2+ reset về trang 1
- TC-BH-030 — click vào bất kỳ ô nào trong dòng mở dialog "Batch Close Review"

### `batch-history/bao-mat-phan-quyen.e2e.spec.ts` (3)

- TC-BH-052 — direct access when unauthenticated redirects to login
- TC-BH-054 — cross-store access is blocked
- TC-BH-055 — no sensitive data leaked via URL/query params

### `batch-history/dinh-dang-du-lieu.e2e.spec.ts` (6)

- TC-BH-031 — BATCH DATE hiển thị kèm chú thích timezone
- TC-BH-032 — AMOUNT hiển thị đúng định dạng tiền tệ USD
- TC-BH-033 — TOTAL PAYMENT hiển thị dạng số nguyên thường, không định dạng tiền tệ
- TC-BH-034 — Style badge STATUS khớp với giá trị ("Open" vs "Closed")
- TC-BH-035 — Định dạng BATCH NUMBER nhất quán, dạng chuỗi số có padding 0
- TC-BH-036 — TOTAL PAYMENT/AMOUNT bằng 0 hiển thị là 0, không để trống

### `batch-history/filter-clear-reset.e2e.spec.ts` (2)

- TC-BH-021 — "Clear filters" chỉ xuất hiện khi filter khác mặc định
- TC-BH-022 — "Clear filters" reset về khoảng ngày và status mặc định

### `batch-history/filter-khoang-ngay.e2e.spec.ts` (6)

- TC-BH-010 — default date range is last 7 days
- TC-BH-011 — selecting new date range filters table and updates URL
- TC-BH-012 — date range with no matching batches shows empty state
- TC-BH-013 — selecting end date before start date is blocked or auto-corrected
- TC-BH-014 — single-day range (start = end) is valid
- TC-BH-015 — deep-linked date range query params apply filter on load

### `batch-history/filter-trang-thai-status.e2e.spec.ts` (5)

- TC-BH-016 — Open filter shows only open batches
- TC-BH-017 — Closed filter shows only closed batches
- TC-BH-018 — All status shows both Open and Closed batches
- TC-BH-019 — status filter combined with date range applies both (AND)
- TC-BH-020 — status filter with no matches renders empty state

### `batch-history/kha-nang-tiep-can-accessibility.e2e.spec.ts` (4)

- TC-BH-048 — toàn bộ màn hình duyệt tuần tự bằng Tab
- TC-BH-049 — date picker và status filter thao tác được bằng bàn phím
- TC-BH-050 — nút phân trang thao tác được bằng bàn phím
- TC-BH-051 — badge trạng thái không chỉ dựa vào màu sắc để phân biệt

### `batch-history/responsive.e2e.spec.ts` (4)

- TC-BH-044 — correct layout at standard desktop width (1920x1080)
- TC-BH-045 — correct layout at laptop width (1366x768)
- TC-BH-046 — table switches to scroll/stacked at mobile width (375px)
- TC-BH-047 — no horizontal overflow at minimum mobile width (320px)

### `batch-history/sidebar-dieu-huong-chinh.e2e.spec.ts` (5)

- TC-BH-006 — link "Batch History" trên sidebar điều hướng đúng và highlight active
- TC-BH-007 — trạng thái active vẫn giữ nguyên sau khi reload
- TC-BH-008 — nút Back/Forward của trình duyệt khôi phục đúng trạng thái filter
- TC-BH-009 — thu gọn/mở sidebar hoạt động đúng trên màn hình này
- TC-BH-009b — ở mobile, nút thu gọn mở/đóng sidebar và giữ highlight Batch History

### `batch-history/tai-trang-bo-cuc.e2e.spec.ts` (5)

- TC-BH-001 — direct navigation loads Batch History correctly
- TC-BH-002 — all main areas render on first load
- TC-BH-003 — shows loading state before data returns
- TC-BH-004 — browser refresh re-renders same state
- TC-BH-005 — initial API load error shows error state, layout not broken

### `batch-history/truong-hop-tieu-cuc-bien.e2e.spec.ts` (6)

- TC-BH-037 — empty state renders correctly, no console errors
- TC-BH-038 — invalid/malformed date query params handled safely
- TC-BH-039 — invalid status query param falls back to "All status"
- TC-BH-040 — slow API shows loading state, UI not stuck
- TC-BH-042 — expired session mid-flow redirects to login
- TC-BH-043 — large all-time date range loads and paginates without errors

## 04 — Payroll

- **Page object:** `payroll/PayrollPage`
- **Spec:** `tests/e2e/payroll/`
- **Docs:** `docs/test-cases/payroll.md`
- **Số test:** 53

### `payroll/bank-accounts-tab.e2e.spec.ts` (7)

- TC-PAY-080 — bank accounts table masks sensitive fields
- TC-PAY-081 — bank link opens linked banking URL
- TC-PAY-082 — create new opens the add-bank-account form
- TC-PAY-083 — edit updates an existing bank account
- TC-PAY-084 — delete removes a bank account after confirmation
- TC-PAY-086 — search by bank or account name filters the list
- TC-PAY-087 — empty state when no bank accounts exist

### `payroll/check-history-tab.e2e.spec.ts` (7)

- TC-PAY-100 — Check History table lists all past checks with date-only timestamps
- TC-PAY-101 — Pagination across multiple pages of check history
- TC-PAY-102 — Filter by status narrows the check list
- TC-PAY-103 — Filter by date range narrows the check list
- TC-PAY-104 — Search by staff name filters check history
- TC-PAY-105 — Clicking a check row opens its history detail panel
- TC-PAY-106 — No results after filtering shows an empty state

### `payroll/checks-tab-table-actions.e2e.spec.ts` (12)

- TC-PAY-020 — checks table columns and data formats
- TC-PAY-021 — search by staff name filters table
- TC-PAY-022 — search with no matches shows empty state
- TC-PAY-023 — "Created" status selector changes the listed checks
- TC-PAY-024 — "All dates" preset filter narrows results by date range
- TC-PAY-025 — "Pick a date range" opens a custom range picker
- TC-PAY-026 — select all checkbox selects every visible row
- TC-PAY-027 — selecting individual rows works independently of Select all
- TC-PAY-028 — print button on a row triggers print for that check
- TC-PAY-029 — Create check (formerly Add Staff) button opens the create-checks flow
- TC-PAY-030 — Edit Signature button opens the signature editor
- TC-PAY-031 — pagination Next/Previous navigate pages of checks

### `payroll/data-formatting-consistency.e2e.spec.ts` (3)

- TC-PAY-120 — currency values formatted consistently across tabs
- TC-PAY-121 — CREATED AT format differs: Checks (with time) vs Check History (date only)
- TC-PAY-122 — MEMO date range format consistent across Checks, Quick-Book, and Check History

### `payroll/page-load-layout.e2e.spec.ts` (5)

- TC-PAY-001 — lands on payroll with Checks tab active by default
- TC-PAY-002 — all layout regions render on initial load
- TC-PAY-003 — deep link directly into a non-default tab
- TC-PAY-004 — reloading the page preserves the active tab and filters
- TC-PAY-005 — unauthenticated access redirects to login

### `payroll/quick-book-tab.e2e.spec.ts` (6)

- TC-PAY-040 — Quick Book form renders all required fields
- TC-PAY-041 — Selecting a bank account updates the Ending Balance
- TC-PAY-042 — Entering an amount auto-populates the spelled-out DOLLAR text
- TC-PAY-043 — Create stays disabled and names the missing fields until the form is valid
- TC-PAY-046 — Non-numeric or negative amount is rejected by the input mask
- TC-PAY-047 — Memo field accepts free text and enforces any max length

### `payroll/responsive-accessibility.e2e.spec.ts` (3)

- TC-PAY-131 — All interactive controls are keyboard-navigable
- TC-PAY-132 — Table checkboxes and buttons expose accessible names
- TC-PAY-130 — Payroll screen adapts at ${label}

### `payroll/security-permissions.e2e.spec.ts` (2)

- TC-PAY-140 — bank account numbers never exposed unmasked
- TC-PAY-141 — payroll data scoped to current store only

### `payroll/staff-payroll-tab.e2e.spec.ts` (5)

- TC-PAY-060 — staff payroll table lists staff with income summary
- TC-PAY-061 — selecting a pay period reloads the staff summary
- TC-PAY-064 — clicking a staff row opens their payroll detail panel
- TC-PAY-065 — search by staff name filters the Staff Payroll table
- TC-PAY-066 — staff with zero orders/income still displays correctly

### `payroll/tab-navigation.e2e.spec.ts` (3)

- TC-PAY-010 — switching between all 5 tabs updates content and URL
- TC-PAY-011 — each tab retains its own filter/pagination state independently
- TC-PAY-012 — browser back/forward navigates away from and back into the payroll page

## 05 — Staff Members

- **Page object:** `staffs/StaffsPage`
- **Spec:** `tests/e2e/staffs/`
- **Docs:** `docs/test-cases/staffs.md`
- **Số test:** 48

### `staffs/TC1-page-load-layout.e2e.spec.ts` (4)

- TC-STF-001 — lands on /pos/<id>/staffs with default query params
- TC-STF-002 — navigates to Staffs from sidebar Management group
- TC-STF-003 — reload (F5) preserves filter/search query params
- TC-STF-004 — layout has no overlap/clipping at wide and narrow viewport widths

### `staffs/TC2-employee-list-table.e2e.spec.ts` (6)

- TC-STF-010 — header cột đúng thứ tự và nhãn
- TC-STF-011 — dữ liệu dòng khớp với thông tin nhân viên thực tế
- TC-STF-012 — trường Phone/Email trống hiển thị placeholder "-"
- TC-STF-013 — phân trang tới/lui hoạt động đúng
- TC-STF-014 — điều hướng tới trang cuối
- TC-STF-015 — click vào dòng điều hướng sang trang chi tiết đúng nhân viên

### `staffs/TC3-search-filter.e2e.spec.ts` (9)

- TC-STF-020 — search by nick name returns matching results
- TC-STF-021 — search with no match shows empty state
- TC-STF-022 — clearing search restores full list
- TC-STF-023 — filter by Status = Inactive
- TC-STF-024 — change sort order to Oldest first
- TC-STF-025 — combine search + status filter (AND)
- TC-STF-026 — changing filter/search resets to page 1
- TC-STF-027 — search with special characters does not error
- TC-STF-028 — reload with existing filter/sort/search query params

### `staffs/TC4-create-employee.e2e.spec.ts` (10)

- TC-STF-030 — opens "Create New Staff" dialog with all fields
- TC-STF-031 — creates staff successfully with valid data
- TC-STF-032 — leaving required field empty blocks submit
- TC-STF-033 — invalid email/phone format blocks submit
- TC-STF-034 — uploads valid avatar image (JPG/PNG < 5MB)
- TC-STF-035 — rejects avatar upload over 5MB or invalid format
- TC-STF-036 — selects Staff Role and Status in Create dialog
- TC-STF-037 — Country selection filters dependent State options
- TC-STF-038 — Cancel or Close (X) discards staff creation
- TC-STF-039 — closes Create dialog with Esc key

### `staffs/TC5-export-data.e2e.spec.ts` (7)

- TC-STF-050 — mở dialog Export Employee
- TC-STF-051 — xuất file Excel với cột mặc định
- TC-STF-052 — xuất file CSV
- TC-STF-053 — bỏ chọn tất cả các cột trước khi Export
- TC-STF-054 — áp dụng bộ lọc Status/Role/Compensation Type trước khi Export
- TC-STF-055 — đóng dialog Export bằng Cancel/X không xuất file
- TC-STF-056 — export khi danh sách rỗng (đã áp filter/search không có kết quả)

### `staffs/TC6-employee-detail-profile-tab.e2e.spec.ts` (6)

- TC-STF-060 — mở trang chi tiết mặc định vào tab Profile
- TC-STF-061 — chuyển đổi giữa các tab cập nhật URL và nội dung
- TC-STF-063 — sửa thông tin nhưng không lưu, điều hướng ra khỏi trang
- TC-STF-068 — tab "Role & Permissions" — Expand All mở rộng các nhóm quyền
- TC-STF-069 — truy cập trực tiếp URL chi tiết với ID không tồn tại
- TC-STF-070 — truy cập trang chi tiết với `?tab=` giá trị không hợp lệ

### `staffs/TC7-permission-security.e2e.spec.ts` (2)

- TC-STF-080 — chưa đăng nhập redirect login
- TC-STF-082 — không rò rỉ dữ liệu store khác

### `staffs/TC8-data-format-edge-case.e2e.spec.ts` (4)

- TC-STF-090 — JOINED AT date format consistent across rows
- TC-STF-091 — Status badge colors differ Active vs Inactive
- TC-STF-092 — long staff name truncated with ellipsis, tooltip shows full name
- TC-STF-093 — empty state when the list has no staff to show

## 06 — Services

- **Page object:** `products/ProductsPage`
- **Spec:** `tests/e2e/services/`
- **Docs:** `docs/test-cases/services.md`
- **Số test:** 41

### `services/TC1-page-load-layout.e2e.spec.ts` (4)

- TC-SVC-001 — lands on Services page with all sections rendered
- TC-SVC-002 — navigates to Services from sidebar Management group
- TC-SVC-003 — reload (F5) preserves tab/search state
- TC-SVC-004 — layout renders correctly at common desktop widths

### `services/TC10-performance.e2e.spec.ts` (1)

- TC-SVC-090 — page loads 259 services across 9 pages without jank/hang

### `services/TC2-category-management.e2e.spec.ts` (9)

- TC-SVC-010 — category list shows correct names and "Other" is always last
- TC-SVC-013 — first category disables "to first" and "up" buttons
- TC-SVC-014 — last category (before "Other") disables "down" and "to last" buttons
- TC-SVC-017 — adding a category with an empty name is blocked
- TC-SVC-011 — "Move ... up/down" swaps adjacent category order and persists
- TC-SVC-012 — "Move ... to first / to last" moves category to boundary positions
- TC-SVC-015 — drag handle reorders category list
- TC-SVC-016 — "Add Category" opens the add-category form (fill + cancel, nothing saved)
- TC-SVC-018 — "Edit <category>" opens edit form and updates the category name

### `services/TC3-search.e2e.spec.ts` (4)

- TC-SVC-020 — search by real service name returns matching results
- TC-SVC-021 — search with nonexistent keyword returns empty table
- TC-SVC-022 — clearing search keyword restores full list
- TC-SVC-023 — search with special characters does not error

### `services/TC4-status-tabs.e2e.spec.ts` (3)

- TC-SVC-030 — chuyển sang tab Inactive lọc đúng dữ liệu
- TC-SVC-031 — chuyển tab khi đang có từ khóa tìm kiếm
- TC-SVC-032 — tab Active là tab mặc định khi tải trang

### `services/TC5-table-pagination.e2e.spec.ts` (8)

- TC-SVC-040 — header bảng đúng thứ tự và nhãn cột
- TC-SVC-041 — định dạng cột PRICE và SUPPLY FEE hiển thị đúng tiền USD
- TC-SVC-042 — cột DURATION hiển thị "—" khi không đặt thời gian
- TC-SVC-043 — NAME & DESCRIPTION hiển thị mô tả phụ khi có
- TC-SVC-044 — phân trang hiển thị đúng tổng số kết quả và số trang
- TC-SVC-045 — click "Next"/"Previous" chuyển trang đúng dữ liệu
- TC-SVC-046 — trang cuối cùng disable nút "Next" và hiển thị đủ số dòng còn lại
- TC-SVC-047 — click vào một dòng dịch vụ mở chi tiết/sửa dịch vụ

### `services/TC6-add-service-manage-order.e2e.spec.ts` (4)

- TC-SVC-050 — Click "Add Service" mở form thêm dịch vụ mới
- TC-SVC-051 — Thêm dịch vụ thiếu trường bắt buộc bị chặn
- TC-SVC-052 — Thêm dịch vụ với giá âm hoặc không hợp lệ bị chặn
- TC-SVC-053 — Click "Manage Order" mở màn hình quản lý thứ tự

### `services/TC7-negative-edge-cases.e2e.spec.ts` (4)

- TC-SVC-060 — category không có dịch vụ vẫn hiển thị đúng, không lỗi
- TC-SVC-061 — tải trang khi API services trả lỗi/timeout
- TC-SVC-062 — tên dịch vụ/category dài hoặc đặc biệt không vỡ layout
- TC-SVC-063 — điều hướng trực tiếp tới trang phân trang không hợp lệ

### `services/TC8-security.e2e.spec.ts` (2)

- TC-SVC-070 — unauthenticated user redirected to login on direct access
- TC-SVC-071 — cross-store Services route access is blocked

### `services/TC9-accessibility.e2e.spec.ts` (2)

- TC-SVC-080 — keyboard navigation through category action buttons
- TC-SVC-081 — table has correct HTML/ARIA semantics

## 07 — Customers

- **Page object:** `customers/CustomersPage, customers/CustomerDetailPage`
- **Spec:** `tests/e2e/customers/`
- **Docs:** `docs/test-cases/customers.md`
- **Số test:** 77

### `customers/TC1-page-load-layout.e2e.spec.ts` (12)

- TC-CUS-001 — lands on /pos/<id>/customers with default query params
- TC-CUS-002 — all content regions render on first load
- TC-CUS-003 — global chrome renders with Customers marked active
- TC-CUS-004 — table renders exactly 30 rows with all columns on first page
- TC-CUS-005 — loading/skeleton state renders before table data resolves
- TC-CUS-006 — pagination controls show correct initial state on page 1
- TC-CUS-007 — direct navigation to a specific page renders correct content
- TC-CUS-008 — table layout does not break when shrinking the viewport
- TC-CUS-009 — layout and title persist after browser reload
- TC-CUS-010 — LAST VISIT column reflects default descending sort
- TC-CUS-011 — out-of-range page param does not crash the table
- TC-CUS-012 — cells with missing data show placeholders without breaking row layout

### `customers/TC10-accessibility.e2e.spec.ts` (5)

- TC-CUS-066 — Tab moves through chrome and page content in logical order
- TC-CUS-067 — search input is keyboard-operable with a proper accessible name
- TC-CUS-068 — table exposes proper table semantics (role, headers, rows)
- TC-CUS-069 — pagination controls are keyboard-operable with correct disabled states
- TC-CUS-070 — active "Customers" sidebar item exposes aria-current="page"

### `customers/TC11-performance.e2e.spec.ts` (3)

- TC-CUS-071 — first load renders the full 30-row table within budget
- TC-CUS-072 — pagination (Next) from page 1 to 2 performs well
- TC-CUS-073 — search results render quickly without layout shift

### `customers/TC12-security.e2e.spec.ts` (4)

- TC-CUS-074 — unauthenticated access redirects to /login
- TC-CUS-075 — mid-session expiry redirects to /login on next action
- TC-CUS-076 — switching to an unauthorized store id blocks customer data access
- TC-CUS-077 — switching stores via the store switcher scopes customer data to the new store

### `customers/TC2-navigation.e2e.spec.ts` (7)

- TC-CUS-013 — navigates to Customers from sidebar Management group
- TC-CUS-014 — only the Customers sidebar item is highlighted
- TC-CUS-015 — navigating away updates sidebar highlight and URL
- TC-CUS-016 — browser Back after pagination restores previous page state
- TC-CUS-017 — Toggle Sidebar collapses/expands without leaving Customers
- TC-CUS-018 — direct URL navigation with query param preserves state and sidebar highlight
- TC-CUS-019 — reload on a paginated URL keeps the page and sidebar state

### `customers/TC3-core-actions.e2e.spec.ts` (7)

- TC-CUS-020 — opening the Group filter and selecting a group filters the table
- TC-CUS-021 — resetting Group filter to "All Groups" restores full dataset
- TC-CUS-022 — "Previous" is disabled on page 1
- TC-CUS-023 — "Next" navigates to page 2 and updates URL/table
- TC-CUS-024 — "Next" is disabled on the last page
- TC-CUS-025 — clicking a customer row navigates to (or does not error on) detail
- TC-CUS-026 — LAST VISIT header is not click-to-sort

### `customers/TC4-search.e2e.spec.ts` (10)

- TC-CUS-027 — search by full name returns matching rows
- TC-CUS-028 — search by phone number returns matching row
- TC-CUS-029 — searching with different phone formats returns the same result
- TC-CUS-030 — clearing the search input restores the full list
- TC-CUS-031 — search with no match shows empty state
- TC-CUS-032 — search input accepts special characters present in real data
- TC-CUS-033 — leading/trailing whitespace in search is trimmed
- TC-CUS-034 — search results update as the user types without pressing Enter
- TC-CUS-035 — combining search with an active Group filter narrows by both
- TC-CUS-036 — search keyword and group filter are preserved across pagination

### `customers/TC5-table-pagination.e2e.spec.ts` (6)

- TC-CUS-037 — table header renders all columns in the correct order
- TC-CUS-038 — a fully populated customer row formats each column correctly
- TC-CUS-039 — TOTAL VISITS and POINTS render zero consistently
- TC-CUS-040 — direct navigation to a middle page shows correct data and controls
- TC-CUS-041 — last page shows the correct remaining row count (partial page)
- TC-CUS-042 — empty state renders when search matches nothing

### `customers/TC6-data-formatting.e2e.spec.ts` (9)

- TC-CUS-043 — PHONE column renders as (XXX) XXX-XXXX
- TC-CUS-044 — CASHBACK BALANCE renders as USD currency with 2 decimals
- TC-CUS-045 — POINTS renders as a plain integer, defaulting to 0
- TC-CUS-046 — LAST VISIT renders as "MMM D, YYYY (UTC+7)" when a visit exists
- TC-CUS-047 — LAST VISIT renders "-" for customers who never visited
- TC-CUS-048 — NAME renders "—" for phone-only customers
- TC-CUS-049 — GROUP renders "—" when unassigned, and the group name otherwise
- TC-CUS-050 — TOTAL VISITS uses a single consistent representation for "0/unknown"
- TC-CUS-051 — customer name with special characters renders correctly, without breaking layout

### `customers/TC7-detail-modal.e2e.spec.ts` (4)

- TC-CUS-052 — row click opens the customer detail page
- TC-CUS-053 — detail content matches row data exactly
- TC-CUS-054 — leaving the detail restores the list and its query state
- TC-CUS-055 — Escape does not discard the detail page

### `customers/TC8-negative-edge.e2e.spec.ts` (6)

- TC-CUS-056 — search with no match shows an explicit empty state, not a blank table
- TC-CUS-057 — last page handles a partial (non-full) row count
- TC-CUS-058 — page param beyond the valid range is handled safely
- TC-CUS-059 — invalid page params (0 or non-numeric) are handled safely
- TC-CUS-060 — network error loading the customer list shows a recoverable error state
- TC-CUS-061 — rapid consecutive pagination clicks settle on a single consistent page

### `customers/TC9-responsive.e2e.spec.ts` (4)

- TC-CUS-062 — desktop width (1920x1080) has no horizontal overflow
- TC-CUS-063 — sidebar collapses automatically below the tablet/desktop breakpoint (767x1024)
- TC-CUS-064 — table adapts at mobile portrait width (375x667)
- TC-CUS-065 — no horizontal overflow when resizing dynamically across breakpoints

## 08 — Store Settings

- **Page object:** `settings/SettingsPage, settings/CheckoutSettingPage`
- **Spec:** `tests/e2e/settings/`
- **Docs:** `docs/test-cases/settings.md`, `docs/test-cases/checkout-type-setting.md`
- **Số test:** 48

### `settings/checkout-setting/display-defaults.e2e.spec.ts` (8)

- CHK-PTL-001 — Hiển thị section Checkout setting ngay dưới Setting point config
- CHK-PTL-002 — Default khi tiệm chưa lưu Checkout setting: Manual, Point Bonus = 0
- CHK-PTL-003 — Load đúng setting đã lưu sau reload
- CHK-PTL-004 — Text 3 thẻ khớp spec
- CHK-PTL-005 — Manual không có ô Point Bonus
- ${id} — ${CheckoutTypeText[type].label} có ô Point Bonus và text đúng
- CHK-PTL-008 — Khung Point Config bên dưới các thẻ hiện đúng tỉ lệ đang lưu
- CHK-PTL-009 — Click vùng thẻ (không click radio) chọn được thẻ

### `settings/checkout-setting/integration.e2e.spec.ts` (5)

- CHK-PTL-036 — Đổi merchant load đúng setting của từng tiệm
- CHK-PTL-037 — User không có quyền chỉnh setting
- CHK-PTL-038 — POS nhận đúng type + bonus từ Portal
- CHK-PTL-039 — Check-in đã checkout trước khi đổi setting không bị tính lại
- CHK-PTL-040 — Responsive / mobile width 375px

### `settings/checkout-setting/persistence.e2e.spec.ts` (7)

- CHK-PTL-003 — Load đúng setting đã lưu (Hybrid / 7) sau reload
- CHK-PTL-022 — Đổi Checkout Type và Save: reload thấy Auto
- CHK-PTL-023 — Đổi Point Bonus và Save: reload thấy Hybrid / 7
- CHK-PTL-024 — Chọn Manual rồi Save vẫn giữ bonus cũ (reload)
- CHK-PTL-030 — Lưu Checkout setting không làm mất Point Config (reload)
- CHK-PTL-031 — Lưu Point Config không làm mất Checkout setting (reload)
- CHK-PTL-034 — Khung Point Config cập nhật sau khi lưu Point Config (reload)

### `settings/checkout-setting/point-bonus-validation.e2e.spec.ts` (9)

- CHK-PTL-010 — Point Bonus rỗng không lưu được
- CHK-PTL-011 — Point Bonus âm không lưu được
- CHK-PTL-012 — Point Bonus số lẻ không lưu được (${value})
- CHK-PTL-013 — Point Bonus = 0 lưu được
- CHK-PTL-014 — Giới hạn giá trị lớn nhất (999999 OK, 99999999999 lỗi)
- CHK-PTL-015 — Ký tự không hợp lệ bị chặn (${value})
- CHK-PTL-015 — Giá trị có khoảng trắng " 5 " lưu = 5
- CHK-PTL-016 — Số có 0 ở đầu "007" lưu = 7
- CHK-PTL-017 — Giá trị lỗi ở Auto rồi chuyển Manual và Save: lưu bonus cũ

### `settings/checkout-setting/point-config-coexistence.e2e.spec.ts` (6)

- CHK-PTL-030 — Lưu Checkout setting không làm mất Point Config
- CHK-PTL-031 — Lưu Point Config không làm mất Checkout setting
- CHK-PTL-032 — Sửa cả 2 form và Save 1 lần: 1 PUT chứa đủ cả 2
- CHK-PTL-033 — Gift card No points giữ đúng khi đổi Checkout
- CHK-PTL-034 — Khung Point Config cập nhật sau khi lưu Point Config
- CHK-PTL-035 — Sửa Product tax rate không ảnh hưởng Checkout setting

### `settings/checkout-setting/save.e2e.spec.ts` (9)

- CHK-PTL-022 — Đổi Checkout Type và Save: toast "Checkout setting saved."
- CHK-PTL-023 — Đổi Point Bonus và Save
- CHK-PTL-024 — Chọn Manual rồi Save vẫn giữ bonus cũ
- CHK-PTL-025 — Format payload với từng type
- CHK-PTL-026 — Không đổi gì thì không hiện thanh Save
- CHK-PTL-027 — Save lỗi API: báo lỗi, không toast thành công, giữ giá trị đang nhập
- CHK-PTL-028 — Double-click Save chỉ gửi 1 request
- CHK-PTL-029 — Rời trang khi chưa lưu có cảnh báo (Stay / Discard)
- CHK-PTL-041 — Form sync lại sau khi Save thành công

### `settings/checkout-setting/switch-type.e2e.spec.ts` (4)

- CHK-PTL-018 — Auto → Hybrid giữ giá trị bonus
- CHK-PTL-019 — Hybrid → Auto giữ giá trị bonus
- CHK-PTL-020 — Auto → Manual → Auto giữ giá trị bonus
- CHK-PTL-021 — Discard trả về giá trị đã lưu

## 09–11 — Reports V1 (Daily Sale · Income Summary · Staff Income/Payroll)

- **Page object:** `reports/ReportPagesPage, income/IncomePage`
- **Spec:** `tests/e2e/reports/`, `tests/e2e/income/`
- **Docs:** `docs/test-cases/reports.md`, `docs/test-cases/income.md`
- **Số test:** 275

### `reports/accessibility.e2e.spec.ts` (5)

- TC-RPT-096 — every sort header is a named button and th[aria-sort] mirrors its state
- TC-RPT-097 — the no-income switch and the search box have accessible names
- TC-RPT-098 — keyboard: Tab walks search → date → switch → Expand table → Export → sort headers; Enter sorts
- TC-RPT-099 — KPI tiles are focusable buttons that Enter activates
- TC-RPT-100 — each report exposes its name as a page heading

### `reports/daily-sale-date-kpi.e2e.spec.ts` (10)

- TC-RPT-016 — Report Date defaults to Today and opens a one-month calendar with today selected
- TC-RPT-017 — picking a past day writes after/before, relabels the trigger and reloads data
- TC-RPT-018 — an after/before deep link keeps the chosen day across a reload
- TC-RPT-019 — the calendar pages to the previous and next month
- TC-RPT-020 — a future day renders a clean empty state (zero KPIs, no rows)
- TC-RPT-021 — the four KPI tiles render in order with count / currency / percent formats
- TC-RPT-022 — the comparison caption is "vs Yesterday" for today and "vs <Mmm d>" for another day
- TC-RPT-023 — clicking a KPI tile selects it, writes ?metric= and retitles the chart
- TC-RPT-024 — the by-hour chart has 24 hour ticks from 12 AM to 11 PM
- TC-RPT-025 — an unknown ?metric= shows "No Metric Selected" in the chart area

### `reports/daily-sale-table-panels.e2e.spec.ts` (9)

- TC-RPT-026 — Order Details has the five columns in order
- TC-RPT-027 — every row shows an order code link and currency amounts
- TC-RPT-028 — Total = Sale/Refund + Tax + Tip on every row
- TC-RPT-029 — Next / Previous page through orders and keep ?page= in the URL
- TC-RPT-030 — clicking an order code opens its detail dialog; Escape closes it
- TC-RPT-031 — Income Detail lists its rows, totals to its header and collapses
- TC-RPT-032 — Payment Detail: Card + Cash + Others = Amount Collected; + Gift Card = header total
- TC-RPT-033 — KPI Total Payment equals both detail-panel headers
- TC-RPT-034 — an out-of-range ?page= clamps to a valid page

### `reports/export-print.e2e.spec.ts` (11)

- TC-RPT-076 — every data report offers Download CSV and Download Excel
- TC-RPT-077 — Daily Sale CSV is named after the day and carries the table header
- TC-RPT-078 — Daily Sale Excel downloads a real .xlsx (zip) file
- TC-RPT-079 — Income Summary CSV is named after the range and has one line per day
- TC-RPT-080 — Staff Income CSV is named after the range and matches the row count
- TC-RPT-081 — Staff Payroll CSV (current period) is a live-by-staff export with the table header
- TC-RPT-082 — the Staff Payroll file name reflects the selected payroll period
- TC-RPT-083 — CSV export contains every result, not only the visible page
- TC-RPT-084 — Print on a Staff Payroll breakdown prints that staff payslip through a print frame
- TC-RPT-085 — Print on Staff Income prints the staff table
- TC-RPT-086 — Export and Print send no write request (POST/PUT/PATCH/DELETE)

### `reports/income-summary.e2e.spec.ts` (14)

- TC-RPT-035 — defaults: Today in the range trigger, period Day, no breakdown open
- TC-RPT-036 — the range calendar sets start then end and shows one row per day
- TC-RPT-037 — the period combobox offers Day, Week and Month
- TC-RPT-038 — Week groups rows by week and writes period=weekly
- TC-RPT-039 — Month groups rows by month and writes period=monthly
- TC-RPT-040 — the chart legend shows Gross Income, Net Income and Total Tip
- TC-RPT-041 — the table has five columns, date labels and currency cells
- TC-RPT-042 — Total Payment = Sale + Tip + Tax on every row
- TC-RPT-043 — clicking a row selects it and opens the five-group breakdown sheet
- TC-RPT-044 — breakdown Payment details equals the row Total Payment; Sale details = Net Total + Tip + Tax Collected
- TC-RPT-045 — Date sort cycles ascending → descending → none, mirrored in blockSort and aria
- TC-RPT-046 — a numeric column sorts descending first and the values really descend
- TC-RPT-047 — a period + range deep link survives a reload
- TC-RPT-048 — a reversed range (after > before) is swapped or rejected with a message

### `reports/negative-edge.e2e.spec.ts` (6)

- TC-RPT-087 — an unknown report slug shows a not-found message, not a blank page
- TC-RPT-088 — a non-date after/before falls back to the default date instead of an error screen
- TC-RPT-089 — an impossible calendar date (2026-13-45) is rejected, never labelled "Invalid Date"
- TC-RPT-090 — a long-past day (2020-01-01) renders a clean zero state
- TC-RPT-091 — an XSS payload in the staff search is inert and treated as text
- TC-RPT-092 — a 200-char search with special characters does not break the page

### `reports/page-load-layout.e2e.spec.ts` (7)

- TC-RPT-001 — Daily Sale Report loads with title, controls and data footer
- TC-RPT-002 — Income Summary loads with range picker, Group-by chip, chart and table
- TC-RPT-003 — Staff Income loads with search, switch, Print and the summary strip
- TC-RPT-004 — Staff Payroll loads and pins the current period_id into the URL
- TC-RPT-006 — no uncaught JS error while loading every report page
- TC-RPT-007 — /report-pages without a slug redirects to Overview
- TC-RPT-008 — a failing report API shows an error state instead of endless skeletons

### `reports/performance-security.e2e.spec.ts` (5)

- TC-RPT-101 — every data report shows its data within the DEV budget
- TC-RPT-102 — a sort click re-renders the table within 5s
- TC-RPT-103 — a signed-out deep link redirects to /login with a redirect back
- TC-RPT-104 — another merchant's store id is refused with no report rows
- TC-RPT-105 — a session that expires mid-flow sends the user to /login

### `reports/responsive.e2e.spec.ts` (3)

- TC-RPT-093 — no horizontal page scroll and Export stays reachable on every report
- TC-RPT-094 — the mobile drawer exposes the Reports group and navigates to a report
- TC-RPT-095 — tablet: Income Summary table and breakdown sheet render without page overflow

### `reports/sidebar-navigation.e2e.spec.ts` (6)

- TC-RPT-009 — the Reports group is collapsed by default outside the reports
- TC-RPT-010 — expanding Reports lists the report links in order with store-scoped hrefs
- TC-RPT-011 — each report link navigates to its report
- TC-RPT-012 — the open report link is marked current and its group auto-expands
- TC-RPT-013 — collapsing Reports hides its links again
- TC-RPT-014 — Overview's summary 'View report' link opens Income Summary

### `reports/staff-income.e2e.spec.ts` (13)

- TC-RPT-049 — defaults: Today, switch off, empty search, six columns and the summary strip
- TC-RPT-050 — searching an existing staff filters rows, writes search= and scopes the summary strip
- TC-RPT-051 — search is case-insensitive and matches a partial name
- TC-RPT-052 — a search with no match shows the empty state and a zeroed summary
- TC-RPT-053 — clearing the search restores the full list
- TC-RPT-054 — "Show staff with no income" adds zero-income staff and toggles include_no_income
- TC-RPT-055 — a search + include_no_income deep link restores the input and the switch
- TC-RPT-056 — Staff is sorted ascending by default; one click sorts descending
- TC-RPT-057 — sorting by Total Income orders the rows from high to low
- TC-RPT-058 — summary strip totals equal the column sums of a single-page table
- TC-RPT-059 — an after/before deep link labels the trigger with the range
- TC-RPT-060 — Orders cells are integer counts and money cells are currency
- TC-RPT-106 — the range popover lists its presets; Yesterday rewrites after/before and the label

### `reports/staff-payroll.e2e.spec.ts` (12)

- TC-RPT-061 — defaults to the current unclosed period with live figures
- TC-RPT-062 — the period list is newest first, current period on top, ranges well formed
- TC-RPT-063 — choosing a closed period switches period_id and drops the live markers
- TC-RPT-064 — an unknown period_id falls back to the current period
- TC-RPT-065 — search narrows to matching staff; a miss shows the empty state
- TC-RPT-066 — Name sorts ascending by default then descending; Orders sorts descending numerically
- TC-RPT-067 — the staff list pages 30 rows at a time
- TC-RPT-068 — clicking a staff row opens the per-staff payroll breakdown
- TC-RPT-069 — breakdown arithmetic: Subtotal = Sale − Refund, Pay 1 + Pay 2 = Total Income
- TC-RPT-070 — the breakdown never shows raw template placeholders
- TC-RPT-071 — the row Total Income equals the breakdown Total Income
- TC-RPT-107 — a staff with no figures shows the "No data" breakdown without Print

### `income/TC1-page-load-layout.e2e.spec.ts` (5)

- TC-INC-001 — direct visit to /pos/<id>/income normalises to ?tab=daily
- TC-INC-002 — document.title is exactly "Income Reports | Portal"
- TC-INC-003 — every main region of the Daily tab renders with content
- TC-INC-007 — reload preserves tab, date range and search read from the URL
- TC-INC-008 — loading all three tabs raises no application console errors

### `income/TC10-summary-chart-table-panels.e2e.spec.ts` (17)

- TC-INC-089 — chart legend lists exactly the four income series
- TC-INC-090 — Total Income Table headers in order DATE, SALE, TIP, TAX, TOTAL PAYMENT
- TC-INC-091 — entry counter pluralises and matches the footer total
- TC-INC-092 — every row satisfies SALE + TIP + TAX = TOTAL PAYMENT
- TC-INC-093 — right panel opens on the No row selected placeholder
- TC-INC-094 — clicking the first row adds selectedDate and renders the breakdown
- TC-INC-095 — breakdown panel renders all five groups, each with its own total
- TC-INC-096 — SALE DETAILS lists its 17 metrics in order
- TC-INC-097 — STAFF PAYOUT lists its metrics and totals them
- TC-INC-098 — SPLIT PAY rows add up to TOTAL STAFF PAYOUT
- TC-INC-099 — SALON EARNINGS lists its 18 metrics in order
- TC-INC-100 — SUPPLY FEE splits into the staff and salon shares
- TC-INC-101 — switching rows moves selectedDate, the highlight and the panel
- TC-INC-102 — a selectedDate deep link restores the panel and the highlight
- TC-INC-103 — a selectedDate outside the filtered range resolves cleanly
- TC-INC-104 — selecting a Week and a Month row shows that bucket aggregate
- TC-INC-105 — changing the period drops or re-points the selected row

### `income/TC11-staff-filters-search.e2e.spec.ts` (14)

- TC-INC-106 — Staff tab opens on Today with both filters idle
- TC-INC-107 — Show staff with no income widens the result set
- TC-INC-108 — unticking the checkbox restores the earlier set
- TC-INC-109 — deep-linked showStaffNoIncome=true loads ticked
- TC-INC-110 — searching a name filters the table, URL and footer
- TC-INC-111 — search matches a substring anywhere in the name
- TC-INC-112 — search is case-insensitive
- TC-INC-113 — a term nothing matches renders the empty state
- TC-INC-114 — clearing the search restores the unfiltered list
- TC-INC-115 — special characters are treated as literal text
- TC-INC-116 — a padded term resolves deterministically
- TC-INC-117 — a 500-character term degrades cleanly
- TC-INC-118 — range, checkbox and search apply together
- TC-INC-119 — Clear filters resets all three Staff filters

### `income/TC12-staff-table-pagination-panels.e2e.spec.ts` (18)

- TC-INC-120 — Staff table renders STAFF, ORDERS, SUBTOTAL, SUPPLY FEE, TIP, TOTAL INCOME in order
- TC-INC-121 — page 1 holds exactly 30 rows and the footer reads Showing 1 to 30 of Z
- TC-INC-122 — Next moves to page=2, footer 31 to 60, indicator 2 / ceil(Z/30)
- TC-INC-123 — total pages equals ceil(total results / 30)
- TC-INC-124 — on the last page Next is disabled, Previous is enabled and Showing ends at Z
- TC-INC-125 — page=999 shows the empty state and must clamp the page counter to a valid page
- TC-INC-126 — page=0 and page=-3 fall back to page 1 and still render
- TC-INC-127 — typing in the search box resets the table from page 3 to page 1
- TC-INC-128 — STAFF SUMMARY carries all six metrics with values
- TC-INC-129 — Total Staff equals the footer result total
- TC-INC-130 — checking Show staff with no income grows Total Staff to the new result total
- TC-INC-131 — STAFF SUMMARY must aggregate the searched subset, not the whole period
- TC-INC-132 — STAFF SUMMARY re-aggregates when the date range changes
- TC-INC-133 — STAFF SUMMARY is unchanged by paging
- TC-INC-134 — Total Subtotal and Total Tip equal the sum of their columns on a single page
- TC-INC-135 — two staff sharing a name stay two separate rows
- TC-INC-136 — a staff member with no income renders 0 and $0.00, never blanks
- TC-INC-137 — negative and very large amounts keep the sign before $ and comma grouping

### `income/TC13-data-formatting.e2e.spec.ts` (8)

- TC-INC-138 — every money value on all 3 tabs is `-?$1,234.56`
- TC-INC-139 — the chart value axis abbreviates, and only the axis does
- TC-INC-140 — single dates read `Aug 21, 2026`, ranges join two of them
- TC-INC-141 — week buckets read `Week N (MMM D – MMM D, YYYY)`
- TC-INC-142 — month buckets read `Jun 2026`, in time order
- TC-INC-143 — dialog timestamps carry one consistent UTC offset
- TC-INC-144 — KPI badges are whole signed percents beside `vs Yesterday`
- TC-INC-145 — `STAFF SUMMARY` counts are thousands-separated

### `income/TC14-negative-edge.e2e.spec.ts` (8)

- TC-INC-146 — a store id that does not exist is refused or redirected, never blank
- TC-INC-147 — a non-numeric store id is handled without an uncaught JS error
- TC-INC-148 — losing the session mid-view stops the screen serving data
- TC-INC-149 — a signed-out visitor is bounced to /login with no figures shown
- TC-INC-152 — the last keyword wins the race and table, footer and URL agree
- TC-INC-153 — a flurry of tab clicks settles on exactly one panel, the last clicked
- TC-INC-154 — Staff/Summary params on ?tab=daily are inert and Daily renders in full
- TC-INC-155 — a week bucket spanning a month boundary names both months, once each

### `income/TC15-responsive.e2e.spec.ts` (8)

- TC-INC-156 — at 1920×1080 the nav is left, the report middle and the detail rail right
- TC-INC-157 — at 1280×800 every region is still present with no sideways scroll
- TC-INC-158 — at 768×1024 the regions relayout without colliding or overflowing
- TC-INC-159 — at 390×844 the nav collapses to Toggle Sidebar and every control stays reachable
- TC-INC-160 — Toggle Sidebar opens a drawer with the whole nav and closes it again
- TC-INC-161 — at 390px the hour ticks thin out instead of crowding the axis
- TC-INC-162 — at 390px the six-column Staff table scrolls itself, never the page
- TC-INC-163 — at 390px the order dialog fits, scrolls to Activity Log and closes by its button

### `income/TC16-accessibility.e2e.spec.ts` (11)

- TC-INC-164 — Tab reaches every Daily control in document order with a focus ring
- TC-INC-165 — Enter and Space on a KPI card switch the chart like a click
- TC-INC-166 — About Sale Income raises its tooltip on focus and wires aria-describedby
- TC-INC-167 — Income period opens, moves and selects by keyboard with correct ARIA
- TC-INC-168 — Space ticks and un-ticks Show staff with no income
- TC-INC-169 — an Order Details row is focusable and opens its dialog on Enter
- TC-INC-170 — all three tables use real table/thead/tbody/th/td markup
- TC-INC-171 — Income Reports is an h1 and section titles are lower-level headings
- TC-INC-172 — every text-less button exposes a descriptive accessible name
- TC-INC-173 — the chart is not an empty canvas and has a text equivalent
- TC-INC-175 — a selected Summary row carries ARIA, not just data-state

### `income/TC17-performance.e2e.spec.ts` (5)

- TC-INC-176 — first load paints KPIs, chart and table, and never waits silently
- TC-INC-177 — each tab switch fetches only its own data, without duplicate bursts
- TC-INC-178 — paging a 200+ row Staff set stays inside budget and does not drift
- TC-INC-179 — ten keystrokes debounce into far fewer than ten requests
- TC-INC-180 — a ~2 year range either paginates or says why, and never hangs

### `income/TC18-security.e2e.spec.ts` (4)

- TC-INC-181 — a store the account cannot see serves no income figures
- TC-INC-182 — filters put nothing but filter params on the URL, and no raw data in the log
- TC-INC-183 — an XSS payload in the staff search is treated as plain text
- TC-INC-185 — the report endpoints refuse a call carrying no session

### `income/TC2-sidebar-navigation.e2e.spec.ts` (4)

- TC-INC-012 — every sidebar link points at the inventoried href
- TC-INC-013 — store switcher opens and closes with Escape
- TC-INC-014 — user menu opens and closes with Escape or an outside click
- TC-INC-015 — browser Back/Forward walks the ?tab= history

### `income/TC3-tabs-deep-link.e2e.spec.ts` (8)

- TC-INC-016 — three tabs render in order with role=tab
- TC-INC-017 — clicking Income Summary switches to ?tab=summary with the day period
- TC-INC-018 — clicking Staff Income switches to ?tab=staff with its 6-column table
- TC-INC-019 — returning to Daily Sale Report restores the chart, KPI cards and table
- TC-INC-020 — each ?tab= deep link opens that tab already selected
- TC-INC-021 — an unknown ?tab= value is normalised back to daily
- TC-INC-022 — only the Staff panel and its single table are visible
- TC-INC-023 — ArrowRight moves tablist focus and selection to the next tab

### `income/TC4-daily-date-picker.e2e.spec.ts` (11)

- TC-INC-024 — trigger defaults to `Today` and the URL carries no `date`
- TC-INC-025 — clicking the trigger opens a one-month calendar popover
- TC-INC-026 — picking a past day writes `date=` and reloads the day
- TC-INC-027 — deep-linked `date=` renders as `MMM D, YYYY`, not `Today`
- TC-INC-028 — Escape closes the calendar, keeps the date and restores focus
- TC-INC-029 — previous-month navigation then a pick lands in that month
- TC-INC-030 — picking today from a past date restores the `Today` label
- TC-INC-031 — an unparseable `date=` falls back to today and still renders
- TC-INC-032 — a future `date=` is handled deterministically
- TC-INC-033 — a date with no data reports zeros and empty states
- TC-INC-034 — the Daily tab exposes no `Clear filters` button

### `income/TC5-daily-kpi-chart.e2e.spec.ts` (13)

- TC-INC-035 — four KPI cards with value, % badge, vs Yesterday and About button
- TC-INC-036 — About Total Orders tooltip text
- TC-INC-037 — About Sale Income tooltip text
- TC-INC-038 — About Total Tip tooltip text
- TC-INC-039 — About Total Payment tooltip text
- TC-INC-040 — clicking Total Tip switches the chart to Total Tip by Hour
- TC-INC-041 — each of the four cards sets its own stat= and chart title
- TC-INC-042 — deep-linked stat=totalTip restores the series and pressed card
- TC-INC-043 — zero-tip day shows the chart empty-state sentence
- TC-INC-044 — default chart is Sale Income by Hour with the Sale legend
- TC-INC-045 — X axis ticks are ascending 12-hour AM/PM labels
- TC-INC-046 — Y axis rescales for large revenue and for negative values
- TC-INC-047 — hovering a bar shows a tooltip with series name and amount

### `income/TC6-daily-order-details-table.e2e.spec.ts` (11)

- TC-INC-049 — Order Details renders ORDER #, SALE/REFUND, TAX, TIP, TOTAL in order
- TC-INC-050 — the "<N> orders" counter equals the footer total
- TC-INC-051 — refund rows carry the " (Refund)" suffix and negative amounts
- TC-INC-052 — every ORDER # matches #OD######-######## with an optional (Refund) suffix
- TC-INC-053 — SALE/REFUND + TAX + TIP equals TOTAL on every row
- TC-INC-054 — the table holds no a[href]; order codes only look like links
- TC-INC-055 — an order-free day shows no rows, "0 to 0 of 0" and both arrows disabled
- TC-INC-056 — on a single-page day both arrows are disabled and the indicator reads 1 / 1
- TC-INC-057 — Next advances the page, the footer range and the URL, with disjoint rows
- TC-INC-058 — Previous restores page 1 with its original rows
- TC-INC-059 — changing the date resets the table to page 1

### `income/TC7-daily-order-detail-dialog.e2e.spec.ts` (10)

- TC-INC-060 — row click opens `Order detail #OD…` for that row
- TC-INC-061 — dialog shows the full `Order Information` block
- TC-INC-062 — refunded order shows the `Refunded` badge
- TC-INC-063 — `Service Details` lists services and a matching `Items subtotal`
- TC-INC-064 — `Payment Details` describes a cash payment in full
- TC-INC-065 — `Activity Log` exposes all sub-tabs and switches content
- TC-INC-066 — empty customer and note render meaningful placeholders
- TC-INC-067 — Escape closes the dialog and leaves the table untouched
- TC-INC-068 — focus stays trapped inside the dialog and leaves it on close
- TC-INC-069 — opening a second order replaces the first order’s data

### `income/TC8-daily-income-payment-panels.e2e.spec.ts` (8)

- TC-INC-070 — INCOME DETAIL panel renders its heading total and all four rows
- TC-INC-071 — PAYMENT DETAIL panel renders its heading total and all six rows
- TC-INC-072 — INCOME DETAIL rows match the Sale Income / Total Tip / Total Payment cards
- TC-INC-073 — INCOME DETAIL adds up: Sale + Tip + Tax Collected = Total Payment
- TC-INC-074 — PAYMENT DETAIL adds up: Card + Cash + Others = Amount Collected, plus gift card = Total Payment
- TC-INC-075 — both panels report the same Total Payment as the KPI card
- TC-INC-076 — INCOME DETAIL chevron collapses/expands the panel
- TC-INC-077 — both panels reload on a date change and still balance

### `income/TC9-summary-filters.e2e.spec.ts` (11)

- TC-INC-078 — Summary tab opens on period Day and a Today range
- TC-INC-079 — picking a two-ended range in one month filters the tab
- TC-INC-080 — Income period listbox offers exactly Day, Week, Month
- TC-INC-081 — period Week buckets the DATE column into weeks
- TC-INC-082 — period Month buckets the same range into its 3 months
- TC-INC-083 — combobox label reflects the period on the URL
- TC-INC-084 — an unknown period falls back to Day
- TC-INC-085 — Clear filters shows once a filter is off default
- TC-INC-086 — Clear filters resets range and period to default
- TC-INC-087 — a range with no transactions renders a clean empty state
- TC-INC-088 — an inverted range resolves deterministically

## 12 — Report Configuration

- **Page object:** `report-config/ReportConfigPage`
- **Spec:** `tests/e2e/report-config/`
- **Docs:** `docs/test-cases/report-config.md`
- **Số test:** 85

### `report-config/accessibility.e2e.spec.ts` (5)

- TC-RCF-140 — every icon-only row action exposes an accessible name
- TC-RCF-141 — filters are named comboboxes operable with Enter / Arrow keys
- TC-RCF-142 — Add Page is a named dialog that moves focus into the Name field
- TC-RCF-143 — closing Add Page should return focus to the Add button (defect D9: focus lands on <body>)
- TC-RCF-144 — the Delete confirmation focuses Cancel, so Enter does not delete

### `report-config/data-formatting.e2e.spec.ts` (5)

- TC-RCF-110 — every row has a name and a key (slug) in the right case convention
- TC-RCF-111 — Pages: layouts are Web/POS window/Mobile badges (+N, Hidden in menu), status badge, "Published vN" or "Draft"
- TC-RCF-112 — Blocks: status badge, kind in {Table, Summary, Chart, Detail}, Source links to its source
- TC-RCF-113 — Sources: known type, Collection|Summary response, integer column count, "MMM D, h:mm AM" updated
- TC-RCF-114 — Columns: type, kind and data type come from closed sets

### `report-config/filters.e2e.spec.ts` (10)

- ${id} — ${REPORT_CONFIG_SCREENS[screen].heading}: filter options are exactly the documented set
- TC-RCF-041 — Pages: filtering by Mobile keeps only pages with a Mobile layout (variant=mobile)
- TC-RCF-043 — Blocks: Kind=Chart keeps only Chart blocks (blockKind=chart)
- TC-RCF-045 — Sources: a Type filter is sent as type[]= and every TYPE cell matches
- TC-RCF-047 — Columns: Kind=Formula keeps only derived columns (kind=derived)
- TC-RCF-048 — Columns: Type and Kind combine (AND) and both land in the URL
- TC-RCF-049 — a selected filter survives a reload
- TC-RCF-050 — Blocks: Kind filter and search combine
- TC-RCF-051 — clearing the filter chip drops the param and restores the total
- TC-RCF-052 — an unknown filter value in the URL yields the empty state, not a crash

### `report-config/load-layout.e2e.spec.ts` (5)

- ${id} — ${spec.heading} loads by direct URL with title, toolbar and rows
- TC-RCF-005 — the bare /report-config route redirects to Pages
- TC-RCF-006 — every screen renders search, its default filters and the Add button
- TC-RCF-007 — table headers match the documented columns in order
- TC-RCF-008 — loading each screen raises no page errors and no failed data requests

### `report-config/navigation.e2e.spec.ts` (3)

- TC-RCF-010 — the Report Configuration accordion expands to Pages, Blocks, Sources, Columns
- TC-RCF-011 — clicking each sidebar link opens that sub-screen
- TC-RCF-012 — the current sub-screen link is marked active and the group is expanded

### `report-config/negative-edge.e2e.spec.ts` (4)

- TC-RCF-120 — a 500 from the list API renders the empty state with no error message (defect D6)
- TC-RCF-121 — unknown record ids: Sources shows a raw 404 error with Retry; Pages builder renders blank (defect D7)
- TC-RCF-122 — a 300-character search term is accepted and returns the empty state
- TC-RCF-123 — HTML and quote characters in search are treated as text, never executed

### `report-config/performance.e2e.spec.ts` (2)

- TC-RCF-150 — each screen shows its first rows within 10 s
- TC-RCF-151 — Pages/Blocks fetch a single itemsPerPage=100 page; totals must stay ≤ 100 (truncation risk)

### `report-config/responsive.e2e.spec.ts` (3)

- TC-RCF-130 — at 390px no screen scrolls horizontally and the compact footer is shown
- TC-RCF-131 — at 390px the sidebar is a drawer that still reaches all four screens
- TC-RCF-132 — at 390px Previous/Next become icon-only buttons with no accessible name (defect D8)

### `report-config/row-actions-blocks-sources-columns.e2e.spec.ts` (12)

- TC-RCF-071 — row actions: Blocks Edit/Clone/Delete, Sources & Columns Edit/Delete
- TC-RCF-082 — confirming a Block delete sends DELETE /report_blocks/<id> (mocked) and keeps the row on failure
- TC-RCF-086 — Add Block dialog: Name, Kind* (default Table), Dataset* (slug · response)
- TC-RCF-087 — submitting Add Block empty is blocked client-side (raw validator text — defect D3)
- TC-RCF-088 — Edit on a block opens the block editor page (not saved)
- TC-RCF-089 — Clone Block proposes "Copy of <name>" and "<slug>-copy"; Cancel saves nothing
- TC-RCF-090 — Add Report Data opens /sources/new with an empty column picker
- TC-RCF-091 — creating an empty Report Data is blocked client-side; Cancel returns to the list
- TC-RCF-092 — Edit on Sources and Columns opens the edit page for that record (not saved)
- TC-RCF-093 — Sources/Columns: Delete is disabled on in-use rows; a free row asks for confirmation
- TC-RCF-094 — Add Column opens /columns/new with Type, Kind, Label, Data Type, Formula, Aggregation
- TC-RCF-095 — creating an empty Column is blocked client-side with the camelCase slug rule

### `report-config/row-actions-pages.e2e.spec.ts` (14)

- TC-RCF-070 — every page row offers Publish, Build layout, Edit, Clone, Delete
- TC-RCF-072 — Add Page dialog shows its fields with the documented defaults
- TC-RCF-073 — typing a name previews a kebab-case slug
- TC-RCF-074 — submitting Add Page empty shows client-side errors and sends nothing
- TC-RCF-075 — a symbols-only name yields no slug and is rejected client-side
- TC-RCF-076 — a valid Add Page posts the expected payload (mocked 422 shown inline)
- TC-RCF-077 — Cancel, Escape and the close button all dismiss Add Page without a request
- TC-RCF-078 — Edit Page is prefilled, shows the fixed slug and publish state, Cancel saves nothing
- TC-RCF-079 — Clone Page proposes "Copy of <name>" and a "<slug>-copy" slug, blocks not cloned by default
- TC-RCF-080 — confirming Clone posts {copyBlocks:false} to /report_pages/<id>/clone (mocked)
- TC-RCF-081 — Delete asks for confirmation naming the page; Cancel keeps it
- TC-RCF-083 — Publish posts /report_pages/<id>/publish on a single click with no confirmation (mocked, D2)
- TC-RCF-084 — Build layout (and clicking the row) opens the Page Builder for that page
- TC-RCF-085 — layout badges open the live report in a new tab (Web / POS Window)

### `report-config/search.e2e.spec.ts` (10)

- TC-RCF-020 — Pages: partial, case-insensitive name search narrows rows and writes ?search=
- TC-RCF-021 — Blocks: searching a block key returns that block; a name fragment narrows the list
- TC-RCF-022 — Sources: name search is server-side (name[]=) and returns matching rows
- TC-RCF-023 — Columns: a label-shaped term is sent as label[]= and matches labels
- TC-RCF-024 — Columns: searching an exact camelCase slug returns only that slug
- TC-RCF-025 — a non-matching term shows the screen-specific empty state (no pagination) on all four screens
- TC-RCF-026 — clearing the search restores the full list and drops ?search
- TC-RCF-027 — whitespace-only search: ignored on Pages/Blocks/Columns, empties Sources (defect D4)
- TC-RCF-028 — a ?search= deep link restores the input and the filtered result set
- TC-RCF-029 — searching from page 2 resets to page 1

### `report-config/security.e2e.spec.ts` (4)

- TC-RCF-160 — signed-out visitors are bounced to /login on all four screens with no table
- TC-RCF-161 — a 401 on the list refetch is handled without a retry storm or stale rows
- TC-RCF-162 — a store outside the account shows "This merchant is not available." and no rows
- TC-RCF-164 — opening and cancelling every dialog on Pages and Blocks issues zero write requests

### `report-config/table-pagination.e2e.spec.ts` (8)

- TC-RCF-060 — footer and page indicator agree with the rows on screen (Pages, Sources, Columns)
- TC-RCF-061 — Columns: Next loads page 2 from the server, Previous returns to page 1
- TC-RCF-062 — Sources: on the last page Next is disabled and the footer ends at the total
- TC-RCF-063 — a ?page=2 deep link opens page 2 and survives a reload
- TC-RCF-064 — Blocks: footer says 1–30 but the table renders every block (defect D1)
- TC-RCF-065 — Blocks: Next updates the footer to 31–60 (rows unchanged — defect D1)
- TC-RCF-066 — an out-of-range ?page shows the empty state with an impossible footer (defect D5)
- TC-RCF-067 — page size is fixed at 30 with no page-size control

## 13 — Reports V4 & Report Config V4

- **Page object:** `reports-v4/ReportsV4Page, reports-v4/ReportConfigV4Page, report-config-v4/RcV4Page`
- **Spec:** `tests/e2e/reports-v4/`, `tests/e2e/report-config-v4/`
- **Docs:** `docs/test-cases/reports-v4.md`, `docs/test-cases/report-config-v4.md`, `docs/test-cases/report-v4-master.md`
- **Số test:** 143

### `reports-v4/config-sync-nonfunctional.e2e.spec.ts` (8)

- RV4-G01 — Daily Sale V4 KPIs equal the legacy report for the same day
- RV4-G04 — the POS client gets its own layout variant (layout=pos) for every V4 page
- RV4-G05 — each V4 page declares the POS permission and passcode gate it needs
- RV4-H01 — no console errors while opening the four pages
- RV4-H02 — at 375px the pages fit the viewport without horizontal page scroll
- RV4-H03 — icon buttons are labelled, sort headers expose aria-sort, dialogs close on Escape
- RV4-H04 — each page shows data within the DEV budget
- RV4-H05 — report data is merchant-scoped: no header → 400, unknown merchant → 400, no rows leak

### `reports-v4/config-write.e2e.spec.ts` (3)

- RV4-A10 — a deactivated V4 page leaves the menu and is no longer served
- RV4-G02 — a merchant-scoped page only exists for that merchant; shared pages stay untouched
- RV4-G03 — Save draft is invisible to readers until Publish (version bumps on publish)

### `reports-v4/daily-sale.e2e.spec.ts` (21)

- RV4-B01 — Report date opens a one-month calendar
- RV4-B02 — picking a day writes after/before and relabels the trigger
- RV4-B03 — Today returns to the store-local current day
- RV4-B04 — an after/before deep link opens that day with its orders
- RV4-B05 — the unsupported ?date= param is ignored (falls back to Today)
- RV4-B06 — a malformed date in the URL does not take the whole page down
- RV4-B07 — a reversed range (after > before) does not crash the page
- RV4-B08 — tile "${kpi.label}" switches the chart and writes metric=${kpi.metric}
- RV4-B09 — an unknown metric shows "No metric selected" and keeps the rest
- RV4-B10 — without metric the chart defaults to Sale Income by Hour
- RV4-B11 — each tile shows a signed % delta "vs Yesterday"
- RV4-B12 — summary tiles reconcile with the Order Details table (refund lines included)
- RV4-B13 — Income Detail = Sale + Tip + Tax Collected
- RV4-B14 — Payment Detail = Card + Cash + Others = Amount Collected
- RV4-B15 — clicking an order opens the Order detail dialog
- RV4-B16 — Order summary Total = Subtotal − Discount + Tax + Tip
- RV4-B17 — Income Detail / Payment Detail headers expand and collapse
- RV4-B18 — Expand table opens the table in a dialog; Escape closes it
- RV4-B19 — a day without orders shows zero tiles and an empty table
- RV4-B20 — hovering the hour chart shows "<hour>" and "<metric> : $x.xx"
- RV4-B21 — Print triggers the browser print without a real dialog

### `reports-v4/data-verification.e2e.spec.ts` (2)

- VP-4862/4864/4865/4866/4867 — ${day}: Order Details, hourly chart and Staff Income reconcile with Daily Summary
- VP-4862 — UI: "N orders" of Order Details equals the Total Orders tile (store #14, 2026-05-12)

### `reports-v4/export-sort.e2e.spec.ts` (6)

- RV4-F01 — Export on ${p.label} offers CSV and Excel
- RV4-F02 — Daily Sale CSV has the table header and one line per order
- RV4-F03 — Excel export downloads a non-empty .xlsx
- RV4-F04 — export respects the current search filter
- RV4-F05 — numeric sort orders rows and keeps the Total row last
- RV4-F06 — money cells use $#,##0.00 (negatives as -$) on every table

### `reports-v4/income-summary.e2e.spec.ts` (11)

- RV4-C01 — range presets write the expected after/before
- RV4-C02 — a custom deep-link range is applied; closing the picker without a choice keeps it
- RV4-C03 — Group by Week writes period=weekly and labels rows "Week n (…)"
- RV4-C04 — changing Group by keeps the selected date range
- RV4-C05 — Day and Month grouping give the same Sale total for a month
- RV4-C06 — one day here equals Daily Sale for that day
- RV4-C07 — clicking a row opens the Breakdown sheet
- RV4-C08 — Breakdown: Σ(Sale + Refund) by method = row Sale; Σ methods = Total Payment
- RV4-C09 — Sort by Sale orders rows and toggles direction
- RV4-C10 — chart legend lists Gross / Net / Total Tip and the tooltip shows all three per date
- RV4-C11 — a one-year daily range loads without hanging

### `reports-v4/page-load-navigation.e2e.spec.ts` (9)

- RV4-A01 — Daily Sale opens with V4 heading, Today date, chart, table and summary
- RV4-A02 — Income Summary opens on Today grouped by Day
- RV4-A03 — Staff Income opens with KPIs, By Staff table and a Total row
- RV4-A04 — Staff Payroll pins the current period_id and flags it as Live
- RV4-A05 — sidebar Reports V4 lists exactly the four pages and highlights the current one
- RV4-A06 — "Open in legacy" on ${p.label} points to /report-pages/${p.slug}
- RV4-A07 — an unknown slug shows a not-found state, not a loading failure
- RV4-A08 — without a session the page redirects to /login and keeps the target
- RV4-A09 — without a session the V4 report API serves nothing (401 on menu, layout and rows)

### `reports-v4/parity.e2e.spec.ts` (8)

- VP-4854 — Staff Income Detail lists orders newest first
- VP-4855 — Clock In / Clock Out use the same empty placeholder
- VP-4850 — Income Summary breakdown sheet has a Print button and real figures
- VP-4853 — payroll percentages are shown without trailing zeros ("20%", not "20.000000%")
- VP-4868 — ${p.label}: Name sort is case-insensitive like legacy
- VP-4874 — ${p.label}: chart Y-axis ticks are distinct values
- VP-4883 (related) — a reversed date range (URL only) shows a readable message, not "Request failed with status code 400"
- VP-4849 / VP-4851 — POS Income Summary blocks return the total and dated rows the POS window shows

### `reports-v4/round3.e2e.spec.ts` (12)

- VP-4879 — Staff Payroll breakdown shows Working Hours with one decimal (3.4, like v1)
- ${c.id} — Staff Income Detail heading has no "\\" separator (${c.label})
- VP-4882 — store #999999: a closed payroll period loads (no 400)
- VP-4883 — ${slug}: a 368-day range shows data or a clear message (no raw 400)
- VP-4884 — "Sale Income by Hour" plots each hour at the STORE time, not the browser time
- VP-4887 — CSV export of ${c.what} (store #14) contains every row, not just page 1
- VP-4888 — Staff Payroll export file is named after the selected payroll period
- VP-4849 — POS Income Summary: Total Income tile shows the amount and "vs" comparison
- VP-4850 / VP-4851 — POS Income Summary: Date column shows dates; breakdown has Print and real figures
- VP-4853 — POS Staff Payroll: no "x 20.000000%" style percentages
- VP-4890 — Mobile Staff Income: column headers are not truncated
- VP-4891 — POS Staff Payroll: a staff without figures shows only "No data" (no $0 day table)

### `reports-v4/staff-income.e2e.spec.ts` (15)

- RV4-D01 — by default only staff with figures are listed
- RV4-D02 — "Show staff with no income" adds staff but keeps the totals
- RV4-D03 — search narrows the table and recomputes the totals
- RV4-D04 — a search with no match shows an empty table
- RV4-D05 — the Total row is the sum of every column
- RV4-D06 — Subtotal and Tip totals match the Income Summary breakdown for the same day
- RV4-D07 — money cells (incl. negative income) are formatted $#,##0.00 / -$
- RV4-D08 — clicking a staff opens Staff Income Detail with staff_id and the range
- RV4-D09 — detail orders reconcile with the staff row (orders, sale, supply, tip)
- RV4-D10 — detail panel: Total = Commission − charges + Tip, and Pay 1 + Pay 2 = Total
- RV4-D11 — Working Days is at least 1 for a staff with orders that day
- RV4-D12 — changing the date on the detail page keeps staff_id
- RV4-D13 — an unknown staff_id does not crash the detail page
- RV4-D14 — long service names are truncated inside the cell without widening the page
- RV4-D15 — Back from the detail page restores search and the no-income switch

### `reports-v4/staff-payroll.e2e.spec.ts` (12)

- RV4-E01 — the period picker lists the current (unclosed) period first, selected
- RV4-E02 — a closed period changes period_id and drops the Live/Estimated note
- RV4-E03 — an invalid period_id does not crash the page
- RV4-E04 — search filters the staff list and writes ?search=
- RV4-E05 — pagination moves by 30 rows; search resets to page 1
- RV4-E06 — clicking a staff opens the By Staff · Breakdown sheet
- RV4-E07 — breakdown reconciles (commission and salary staff): totals, tip by method, Pay 1 + Pay 2
- RV4-E11 — salary staff: Total Income = Salary − Clean Up + Tip − Card Charge Tip for everyone
- RV4-E08 — staff with the same display name can be told apart
- RV4-E09 — Staff Payroll lists every staff (no "hide zero" switch), zero rows included
- RV4-E10 — Print inside the breakdown sheet triggers print
- VP-4852 — every staff breakdown shows "Working Days" (as the legacy payroll does)

### `report-config-v4/block-columns.e2e.spec.ts` (7)

- VP-4869 — renaming a table column keeps focus while typing
- VP-4870 — Value colour Negative (Red) colours the column in the preview
- VP-4873 — Summary tile "Sale Income" with Number (2 decimals) shows dollars (20,382.70), not cents
- VP-4873 — a money column added to the table is formatted (not raw cents)
- VP-4873 — table column Format "Number (2 decimals)" shows 2 decimals of dollars (not cents)
- SIMILAR (VP-4832) — table block Add column lists no response metadata
- VP-4838 — summary block Add column lists each label once (Gift Card Sale)

### `report-config-v4/blocks.e2e.spec.ts` (8)

- VP-4831 — System block: Try query asks for a merchant, then runs with x-merch-id and lists columns
- VP-4832 — Add column lists only dataset columns (no response envelope / metadata)
- VP-4833 — Save changes sends only real dataset columns as items
- VP-4837 — New block: Report list matches Kind, and a shape error shows the API reason
- VP-4842 — New block validation: Report is required, errors clear as soon as the input is valid
- VP-4842 — a block with every column hidden cannot be saved
- VP-4843 — changing a column Format updates the preview immediately
- VP-4847 — Blocks list paginates 30 rows per page

### `report-config-v4/builder.e2e.spec.ts` (5)

- VP-4872 — "+ Filter" offers the params the Daily Sale blocks accept
- VP-4876 (builder) — closing "${d.name}" with Escape leaves the page clickable
- VP-4876 (builder) — closing "Block settings" with Escape leaves the page clickable
- VP-4875 — after closing a settings panel, ONE click on Save draft saves
- VP-4871 — Block style Text colour is applied (builder canvas and Report V4)

### `report-config-v4/fields.e2e.spec.ts` (4)

- VP-4830 — Save as report (${scope} scope) sends a payload the API accepts (no "required" key)
- VP-4838 — Store income fields have unique labels
- VP-4840 — System scope: Run preview is disabled with no field and the error names the real cause
- VP-4841 — changing the merchant keeps data source, picked fields and date range

### `report-config-v4/pages-write.e2e.spec.ts` (4)

- VP-4845 — Publish asks for confirmation before going live
- VP-4839 — "Open in legacy" is hidden (or works) on a page that only exists in V4
- VP-4846 — a builder "Report date" filter blocks future dates like Daily Sale does
- VP-4834 — Copy for merchant of a Draft page stays Draft (not live in the merchant menu)

### `report-config-v4/reports-dialogs.e2e.spec.ts` (5)

- VP-4835 — System report: Run preview lets you pick a merchant (no misleading E_PARAM error)
- VP-4835 — merchant report copy: Run preview sends that merchant and returns rows
- VP-4836 — a filter marked Required keeps its parameter input in Preview
- VP-4844 — Copy for merchant: one click on Copy sends the copy request
- VP-4876 — ${d.tab}: closing "${d.item.source.replace(/[\^/]/g, '')}" with ${close} leaves the page clickable

### `report-config-v4/round3-config.e2e.spec.ts` (3)

- VP-4881 — Staff Income block Totals row reflects what Report V4 sums (or says so)
- VP-4886 — renaming a page changes its heading on Report V4 (not only menu/breadcrumb)
- VP-4885 — a column set to "Opens: Staff info" opens Staff info even when Row click is on

## 14 — Merchants (Internal)

- **Page object:** `merchants/MerchantsPage`
- **Spec:** `tests/e2e/merchants/`
- **Docs:** `docs/test-cases/merchants.md`
- **Số test:** 81

### `merchants/TC1-page-load-layout.e2e.spec.ts` (6)

- TC-MCH-001 — direct navigation renders the merchant list, no login redirect
- TC-MCH-002 — bare route stays unqueried with no tab strip on the list
- TC-MCH-003 — page title "Merchants" renders in the page header
- TC-MCH-004 — toolbar exposes exactly the search box and the status filter, both enabled
- TC-MCH-005 — reload keeps the URL, the session and the rendered table
- TC-MCH-006 — page load produces no uncaught errors and no unexpected 4xx/5xx

### `merchants/TC10-negative-edge.e2e.spec.ts` (7)

- TC-MCH-090 — a 300-character keyword yields a normal empty state, no 414/500, no overflow
- TC-MCH-091 — a whitespace-only keyword behaves like an empty search
- TC-MCH-092 — a 500 from the list API degrades without crashing (no error message shown)
- TC-MCH-093 — a slow response keeps the frame and an aborted one does not crash the page
- TC-MCH-094 — an out-of-range page does not crash or 500 (but is not clamped either)
- TC-MCH-095 — an XSS payload in the search box is treated as plain text
- TC-MCH-096 — the table settles on the final control state, with no duplicated rows

### `merchants/TC11-responsive.e2e.spec.ts` (4)

- TC-MCH-100 — at 1920px all eight columns fit with no horizontal scrolling
- TC-MCH-101 — at 1366px the table scrolls in its own container, not the page
- TC-MCH-102 — at 1024px both toolbar controls stay usable and the headers still line up
- TC-MCH-103 — at 768px the table scrolls inside its frame and the controls still work

### `merchants/TC12-accessibility.e2e.spec.ts` (6)

- TC-MCH-110 — tab order runs search → status filter, with no focus trap
- TC-MCH-111 — the search box has an accessible name (from its placeholder)
- TC-MCH-112 — the status filter opens, selects and closes entirely by keyboard
- TC-MCH-113 — the table is native semantic markup, not a grid of divs
- TC-MCH-114 — status is not conveyed by colour alone; badge contrast is measured
- TC-MCH-115 — focusing a control produces a visible ring

### `merchants/TC13-performance.e2e.spec.ts` (3)

- TC-MCH-120 — median time to the first rendered row stays within the DEV budget
- TC-MCH-121 — search results settle within ~2s of the last keystroke
- TC-MCH-122 — the list endpoint is called exactly once on first render

### `merchants/TC14-security.e2e.spec.ts` (4)

- TC-MCH-130 — an unauthenticated visitor is bounced to /login with no merchant data
- TC-MCH-131 — a mid-session 401 is handled without a retry storm or stale data
- TC-MCH-133 — the list payload carries no credentials or secrets
- TC-MCH-134 — no access or refresh token is logged to the console or embedded in the HTML

### `merchants/TC2-navigation.e2e.spec.ts` (6)

- TC-MCH-010 — reaches Merchants from the Internal sidebar group
- TC-MCH-011 — the Merchants item is the only active Internal item
- TC-MCH-012 — sidebar shows the three groups, five Internal links and the submenu buttons
- TC-MCH-013 — round trip to another Internal screen and back reloads the list cleanly
- TC-MCH-014 — browser Back/Forward restores the list and the Devices screen
- TC-MCH-015 — the desktop sidebar collapses/expands keeping the active item; the mobile drawer opens at 375px

### `merchants/TC3-search.e2e.spec.ts` (9)

- TC-MCH-020 — partial name search narrows the list to matching merchants only
- TC-MCH-021 — searching a WHMCS id returns that merchant
- TC-MCH-022 — search is case-insensitive
- TC-MCH-023 — a term with no match shows the "No merchants found." empty state
- TC-MCH-024 — clearing the search restores the full list and its default order
- TC-MCH-025 — leading/trailing whitespace does not change the result set
- TC-MCH-026 — quotes, spaces and dashes in a term all match without server errors
- TC-MCH-027 — typing eight characters fires far fewer than eight list requests
- TC-MCH-028 — the keyword is written to ?q= and the URL is deep-linkable

### `merchants/TC4-status-filter.e2e.spec.ts` (6)

- TC-MCH-030 — the status dropdown offers exactly All statuses / Active / Inactive
- TC-MCH-031 — filtering by Active leaves only Active rows
- TC-MCH-032 — filtering by Inactive shows only Inactive rows, or a proper empty state
- TC-MCH-033 — keyword and status apply together as AND, neither clearing the other
- TC-MCH-034 — resetting to All statuses restores the full list
- TC-MCH-035 — the status filter is written to the URL and survives a reload

### `merchants/TC5-table.e2e.spec.ts` (8)

- TC-MCH-040 — the table has exactly the eight documented columns, in order
- TC-MCH-041 — every rendered row has exactly eight cells
- TC-MCH-042 — unset PACKAGE cells render an em dash, never a blank or null
- TC-MCH-043 — STATUS renders as a rounded, filled badge carrying a text label
- TC-MCH-044 — rows default to newest JOINED AT first
- TC-MCH-045 — column headers are not sortable and clicking one changes nothing
- TC-MCH-046 — the longest values stay inside their cells without scrolling the page
- TC-MCH-047 — the empty state keeps the headers and shows no hanging skeleton

### `merchants/TC6-pagination.e2e.spec.ts` (6)

- TC-MCH-050 — the list paginates with a results footer, Previous/Next and a page indicator
- TC-MCH-051 — the rendered row count matches the footer range and respects the page size
- TC-MCH-052 — Next/Previous move between disjoint pages
- TC-MCH-053 — Previous is disabled on the first page, Next on the last
- TC-MCH-054 — a ?page= deep link loads without crashing
- TC-MCH-055 — paging keeps the active search/filter applied

### `merchants/TC7-data-formatting.e2e.spec.ts` (7)

- TC-MCH-060 — every JOINED AT value matches "MMM D, YYYY, h:mm A (UTC±H)"
- TC-MCH-061 — OWNER PHONE is US-formatted or the em-dash placeholder
- TC-MCH-062 — OWNER EMAIL keeps its domain intact, or shows the placeholder
- TC-MCH-063 — every TIMEZONE is an IANA zone Intl accepts
- TC-MCH-064 — the # column holds bare integers with no thousands separator
- TC-MCH-065 — assigned PACKAGE names render their product name uppercase
- TC-MCH-066 — JOINED AT uses one viewer-zone offset for every row

### `merchants/TC8-row-actions-detail.e2e.spec.ts` (5)

- TC-MCH-070 — clicking a row opens the in-place merchant detail view via ?merchantId=
- TC-MCH-071 — the # and name cells are not links; either one opens the same detail view
- TC-MCH-072 — selecting a merchant does not switch the store-scoped context
- TC-MCH-073 — the list screen exposes no create/add/export/delete action
- TC-MCH-074 — rows advertise their interactivity with a pointer cursor

### `merchants/TC9-url-state.e2e.spec.ts` (4)

- TC-MCH-080 — explicit ?tab=overview and the bare route render the same list
- TC-MCH-081 — an unknown tab value is stripped back to the bare route without errors
- TC-MCH-082 — a tab + q + status deep link restores both controls and the filtered table
- TC-MCH-083 — unknown and malformed params are ignored safely

## 15 — Onboarding

- **Page object:** `onboarding/OnboardingPage`
- **Spec:** `tests/e2e/onboarding/`
- **Docs:** `docs/test-cases/onboarding.md`
- **Số test:** 138

### `onboarding/TC1-page-load-layout.e2e.spec.ts` (11)

- TC-ONB-001 — direct navigation renders the wizard, no login redirect
- TC-ONB-002 — bare route normalises to ?step=validate with step 1 current
- TC-ONB-003 — page header reads exactly "Onboarding"
- TC-ONB-004 — stepper lists the seven steps in order, numbered 1–7
- TC-ONB-005 — step 1 is current, steps 2–7 are pending and none is ticked
- TC-ONB-006 — steps 1–5 show success ticks when deep-linking step 6
- TC-ONB-007 — only the Internal "Onboarding" link is marked current
- TC-ONB-008 — the Internal group holds all five admin links
- TC-ONB-009 — the admin sidebar carries no broken "/pos/nail/undefined/" store links
- TC-ONB-010 — the app switcher shows Volt POS and lists the four product contexts; user menu present
- TC-ONB-011 — desktop collapse/expand and the 375px nav drawer keep the wizard intact

### `onboarding/TC10-step7-complete.e2e.spec.ts` (8)

- TC-ONB-125 — completion panel shows the h2 heading and its description
- TC-ONB-126 — summary block shows Business Name, WHMCS ID and a formatted Created stamp
- TC-ONB-127 — View Merchant links to /pos/<whmcsId>/setting and opens it
- TC-ONB-128 — Go to Dashboard points at / and lands on the portal home
- TC-ONB-129 — Add Services card carries its subtitle and opens /pos/<whmcsId>/services
- TC-ONB-130 — Add Staff card carries its subtitle and opens /pos/<whmcsId>/staffs
- TC-ONB-131 — first six steps are ticked and Complete is the current step
- TC-ONB-132 — step 7 ships one button and four links, and no wizard footer

### `onboarding/TC11-negative-edge.e2e.spec.ts` (9)

- TC-ONB-133 — whmcsId=0 either reaches the panel or is blocked with a message
- TC-ONB-134 — a negative whmcsId on the URL is rejected the way the form rejects it
- TC-ONB-135 — a 20-digit whmcsId renders a controlled result with no NaN or rounding
- TC-ONB-136 — a validate submit while offline fails visibly instead of hanging
- TC-ONB-137 — a 500 from merchant_onboarding shows Failed Connect with Create Merchant disabled
- TC-ONB-138 — a 500 from merchant_settings on step 2 leaves the screen readable and escapable
- TC-ONB-139 — losing the session mid-wizard bounces to /login, not a blank or raw 401 screen
- TC-ONB-140 — two tabs on different whmcsIds keep their own state
- TC-ONB-141 — a 1000-character Business Name is length-limited with a clear message

### `onboarding/TC12-responsive.e2e.spec.ts` (6)

- TC-ONB-142 — at 1920×1080 every step keeps the stepper a left column with content beside it
- TC-ONB-143 — at 1366×768 step 6 scrolls vertically with the tax fields apart and the footer reachable
- TC-ONB-144 — below the md breakpoint the stepper turns horizontal and keeps only the current label
- TC-ONB-145 — at 375px the package grid collapses to one column with its buttons uncut
- TC-ONB-146 — at 375px the feature dialog fits the viewport and scrolls its own content
- TC-ONB-147 — at 375px the tip preset chips wrap instead of scrolling the page sideways

### `onboarding/TC13-accessibility.e2e.spec.ts` (8)

- TC-ONB-148 — #whmcsId exposes a descriptive accessible name
- TC-ONB-149 — the validate error is announced via role="alert" and wired to the input
- TC-ONB-150 — each Work Hours switch carries a unique "<Day> open status" name
- TC-ONB-151 — the tip radiogroup is named "Tip timing" and holds two labelled radios
- TC-ONB-152 — preset delete controls are named "Remove <n>% tip preset"
- TC-ONB-153 — the feature dialog traps Tab and hands focus back on Escape
- TC-ONB-155 — headings start at h1, never skip a level, and keep one card level
- TC-ONB-157 — Create Merchant and Current Plan carry a real disabled attribute

### `onboarding/TC14-performance.e2e.spec.ts` (5)

- TC-ONB-158 — median time from goto to the Enter WHMCS ID heading is recorded
- TC-ONB-159 — Validate answers within the 5s budget and spins while it waits
- TC-ONB-160 — the package grid renders every card and scrolls without shedding any
- TC-ONB-161 — toggling stays responsive with the long preset list mounted
- TC-ONB-162 — walking all seven steps logs no console error and no pageerror

### `onboarding/TC15-security.e2e.spec.ts` (6)

- TC-ONB-163 — an unauthenticated visit is bounced to /login with no wizard content
- TC-ONB-165 — the error boundary leaks no zod schema detail and keeps the app shell
- TC-ONB-166 — an XSS payload typed into Business Name stays inert text
- TC-ONB-167 — hostile whmcsId values are rejected and never executed
- TC-ONB-168 — neither the status panel nor the summary prints credential-shaped text
- TC-ONB-169 — deep-linking an onboarded merchant must still hit the duplicate guard

### `onboarding/TC2-navigation-routing-guard.e2e.spec.ts` (12)

- TC-ONB-012 — step=merchant-info without whmcsId is bounced to ?step=validate
- TC-ONB-013 — all six guarded steps fall back to ?step=validate without whmcsId
- TC-ONB-014 — deep-linking each step with a valid whmcsId renders that step
- TC-ONB-015 — jumping straight to ?step=complete is not forced back a step
- TC-ONB-016 — an invalid step slug lands on the error boundary, app still framed
- TC-ONB-017 — Try again on the error boundary recovers instead of looping
- TC-ONB-018 — reload keeps the current step and reloads its data
- TC-ONB-019 — browser Back/Forward walks the wizard steps and updates the stepper
- TC-ONB-020 — the wizard Back button steps photos → work-hours and keeps whmcsId
- TC-ONB-021 — the stepper is display-only and clicking a label does not navigate
- TC-ONB-022 — leaving via the sidebar and coming back resets the wizard to step 1
- TC-ONB-023 — Onboard Another resets to ?step=validate with an empty form

### `onboarding/TC3-step1-validate-form.e2e.spec.ts` (15)

- TC-ONB-024 — the form renders heading, description, #whmcsId and Validate
- TC-ONB-025 — #whmcsId carries id/name/placeholder, aria-invalid=false, enabled and empty
- TC-ONB-026 — Validate stays enabled while the input is empty
- TC-ONB-027 — an empty submit alerts "WHMCS ID must be numeric" without calling the API
- TC-ONB-028 — submitting "abc" errors, keeps the typed value and calls nothing
- TC-ONB-029 — typing letters is not masked and raises no error before submit
- TC-ONB-030 — all seven mixed alphanumeric values are rejected as non-numeric
- TC-ONB-031 — " 3660 " with surrounding spaces is rejected as non-numeric
- TC-ONB-032 — leading zeros (`0003660`) clear the regex and reach the lookup
- TC-ONB-033 — editing the field after an error clears the alert and aria-invalid
- TC-ONB-034 — Enter submits the form and reaches the Integration Status panel
- TC-ONB-035 — an already-onboarded id is blocked on the form with no whmcsId on the URL
- TC-ONB-036 — a not-onboarded id opens Integration Status and adds whmcsId to the URL
- TC-ONB-037 — Validate shows a spinner and is disabled while the lookup is in flight
- TC-ONB-038 — three rapid Validate clicks fire only one request chain

### `onboarding/TC4-step1-integration-status.e2e.spec.ts` (16)

- TC-ONB-039 — WHMCS ID chip mirrors the id on the URL
- TC-ONB-040 — panel heads with Integration Status and lists the three systems in order
- TC-ONB-041 — DTS badge reads Optional when DTS is not configured
- TC-ONB-042 — DTS badge reads Ready when the merchant exists in DTS
- TC-ONB-043 — Business App badge reads Ready
- TC-ONB-044 — Business App badge reads Not Ready
- TC-ONB-045 — Fastboypay badge reads Ready
- TC-ONB-046 — Fastboypay is Not Ready with the API reason "Whmcs ID not found."
- TC-ONB-047 — Fastboypay prints the backend reason "Merchant not found." verbatim
- TC-ONB-049 — ready summary sentence is shown
- TC-ONB-050 — not-ready summary sentence is shown
- TC-ONB-051 — Create Merchant stays disabled while a required system is not ready
- TC-ONB-052 — Create Merchant is enabled when Business App and Fastboypay are ready
- TC-ONB-053 — DTS Optional does not block merchant creation
- TC-ONB-054 — Check Again refetches the integration status without changing the URL
- TC-ONB-055 — Back returns to the Enter WHMCS ID form and drops whmcsId

### `onboarding/TC5-step2-business-information.e2e.spec.ts` (8)

- TC-ONB-059 — renders both blocks and all 10 controls
- TC-ONB-060 — each field carries its documented placeholder and type
- TC-ONB-061 — the form is prefilled from the merchant record
- TC-ONB-062 — the State combobox opens a searchable dialog
- TC-ONB-063 — the state list holds 60+ entries A→Z including territories
- TC-ONB-064 — typing filters the state list and picking one closes the dialog
- TC-ONB-065 — a non-matching search empties the list without crashing
- TC-ONB-073 — the footer holds only Save Changes & Continue

### `onboarding/TC6-step3-work-hours.e2e.spec.ts` (9)

- TC-ONB-075 — renders Business Hours with 7 day rows, Monday to Sunday
- TC-ONB-076 — each day switch exposes "<Day> open status" and a readable checked state
- TC-ONB-077 — open/close labels use 12-hour format
- TC-ONB-078 — time picker opens with hour / minute / meridiem wheels
- TC-ONB-079 — picking a time updates that trigger and leaves other days alone
- TC-ONB-080 — the minute wheel offers only the four 15-minute steps
- TC-ONB-081 — turning a day off hides or disables its time triggers
- TC-ONB-083 — footer shows Back, Skip, Save Changes, all enabled
- TC-ONB-084 — Skip advances to the Photos step without saving

### `onboarding/TC7-step4-photos.e2e.spec.ts` (4)

- TC-ONB-086 — renders Business Photos with both upload slots
- TC-ONB-087 — each slot shows its PNG/JPG max-5MB hint
- TC-ONB-088 — both file inputs are present by id and enabled
- TC-ONB-092 — Skip advances to pos-package without saving photos

### `onboarding/TC8-step5-package.e2e.spec.ts` (9)

- TC-ONB-095 — package grid renders cards with preview features and controls
- TC-ONB-096 — exactly one card is Current with a disabled Current Plan button
- TC-ONB-097 — "View all N features" opens the package dialog
- TC-ONB-098 — the feature dialog lists all 14 groups
- TC-ONB-099 — dialog feature count matches the N on the trigger
- TC-ONB-100 — Close button and Escape both dismiss the dialog and restore focus
- TC-ONB-101 — Select Plan moves the selection to that card only
- TC-ONB-102 — Select This Package inside the dialog selects the same way
- TC-ONB-103 — footer shows Back, Skip, Save Changes in order, all enabled

### `onboarding/TC9-step6-payment-transactions.e2e.spec.ts` (12)

- TC-ONB-106 — Payment Methods renders 4 tender switches with wire names and descriptions
- TC-ONB-107 — each tender switch toggles independently
- TC-ONB-109 — Tax & Pricing renders 3 labelled percentage fields, prefilled
- TC-ONB-113 — turning Tip Acceptance off hides or disables Tip Timing and Tip Presets
- TC-ONB-114 — Tip Timing offers exactly 2 radios with one selected
- TC-ONB-115 — each tip-timing card prints its description and processor chain
- TC-ONB-116 — picking Before Payment deselects After Payment
- TC-ONB-117 — the Tip type toggle swaps pressed state and reformats the chips
- TC-ONB-118 — Add creates a new 30% preset chip with its Remove control
- TC-ONB-119 — removing a preset drops exactly one chip and leaves the rest
- TC-ONB-120 — preset values are unique (3660 renders ~40 duplicates)
- TC-ONB-123 — footer shows Back, Skip, Save Changes in order, all enabled

## 16 — Packages

- **Page object:** `packages/PackagesPage`
- **Spec:** `tests/e2e/packages/`
- **Docs:** `docs/test-cases/packages.md`
- **Số test:** 10

### `packages/page-load-layout.e2e.spec.ts` (5)

- TC-PKG-001 — direct navigation renders the package catalogue
- TC-PKG-002 — package table renders Package / Description / Enabled features / Last updated
- TC-PKG-003 — toolbar exposes an enabled Add package action
- TC-PKG-004 — reload keeps the URL, the session and the table
- TC-PKG-005 — page load produces no uncaught errors and no unexpected 4xx/5xx

### `packages/security.e2e.spec.ts` (1)

- TC-PKG-130 — unauthenticated visitor is redirected to /login with no package data

### `packages/table-search-safety.e2e.spec.ts` (4)

- TC-PKG-010 — the Enabled features column is formatted as "N / 62"
- TC-PKG-011 — search narrows the catalogue to matching packages
- TC-PKG-012 — the row Actions menu offers Edit and Clone without firing a write
- TC-PKG-013 — browsing and searching the catalogue issues no mutating request

## 17 — All Orders (Internal)

- **Page object:** `orders/AllOrdersPage`
- **Spec:** `tests/e2e/all-orders/`
- **Docs:** `docs/test-cases/all-orders.md`
- **Số test:** 13

### `all-orders/filters-search.e2e.spec.ts` (5)

- TC-AOR-010 — the Status filter opens and offers options
- TC-AOR-011 — the Merchant filter is present and enabled
- TC-AOR-012 — search narrows the list to matching orders or shows the empty state
- TC-AOR-013 — totalResults() resolves to a number ≥ 0
- TC-AOR-014 — browsing and searching the list issues no mutating request

### `all-orders/order-detail-navigation.e2e.spec.ts` (2)

- TC-AOR-020 — opening a row navigates to the store-scoped Order detail
- TC-AOR-021 — opening a row fires no money action

### `all-orders/page-load-layout.e2e.spec.ts` (5)

- TC-AOR-001 — direct navigation renders the All Orders list, no login redirect
- TC-AOR-002 — order table renders Order ID / Merchant / Status / Amount / Date
- TC-AOR-003 — toolbar exposes the search box and the Merchant / Status filters
- TC-AOR-004 — reload keeps the URL, the session and the table
- TC-AOR-005 — page load produces no uncaught errors and no unexpected 4xx/5xx

### `all-orders/security.e2e.spec.ts` (1)

- TC-AOR-130 — unauthenticated visitor is redirected to /login with no order data

## 18 — Devices

- **Page object:** `devices/DevicesPage`
- **Spec:** `tests/e2e/devices/`
- **Docs:** `docs/test-cases/devices.md`
- **Số test:** 12

### `devices/page-load-layout-tabs.e2e.spec.ts` (5)

- TC-DEV-001 — open(DEVICES) renders the device list, no login redirect
- TC-DEV-002 — the page header renders the "Devices" title
- TC-DEV-003 — the Devices / Pending registrations / Device history tabs are visible
- TC-DEV-004 — reload keeps the URL, the session and the table
- TC-DEV-005 — page load produces no uncaught errors and no unexpected 4xx/5xx

### `devices/row-menu-safety.e2e.spec.ts` (2)

- TC-DEV-020 — the row ⋯ menu offers change history / remote action / (de)activate
- TC-DEV-021 — opening the row ⋯ menu fires no approve/deactivate write

### `devices/security.e2e.spec.ts` (1)

- TC-DEV-130 — unauthenticated visitor is redirected to /login with no device data

### `devices/tabs-content.e2e.spec.ts` (4)

- TC-DEV-010 — open(PENDING) shows "No pending registrations." or a pending table
- TC-DEV-011 — open(HISTORY) shows the assignment table with rows or empty
- TC-DEV-012 — open(DEVICES) exposes the Status filter
- TC-DEV-013 — totalResults() returns a number ≥ 0 when rows exist

## 19 — System (Versions · Settings · Feature Flags)

- **Page object:** `system/SystemPage`
- **Spec:** `tests/e2e/system/`
- **Docs:** `docs/test-cases/system.md`, `docs/test-cases/versions.md`
- **Số test:** 14

### `system/feature-flags-safety.e2e.spec.ts` (3)

- TC-SYS-020 — direct navigation renders the feature-flag list, no login redirect
- TC-SYS-021 — a feature-flag row exposes a switch control (never toggled)
- TC-SYS-022 — browsing feature flags toggles nothing and issues no write

### `system/security.e2e.spec.ts` (1)

- TC-SYS-130 — unauthenticated visitor is redirected to /login with no version data

### `system/settings.e2e.spec.ts` (4)

- TC-SYS-010 — direct navigation renders the system settings table, no login redirect
- TC-SYS-011 — a known system setting row is listed
- TC-SYS-012 — a setting row exposes a Global / Merchant scope label
- TC-SYS-013 — browsing system settings issues no mutating request

### `system/versions.e2e.spec.ts` (6)

- TC-SYS-001 — direct navigation renders the App Versions list, no login redirect
- TC-SYS-002 — Windows and Android platform tabs are visible
- TC-SYS-003 — Android tab shows builds with an Upload KPP action when one is waiting
- TC-SYS-004 — the Fetch versions action is visible
- TC-SYS-005 — row actions menu offers Pause / Download / change history / Deprecate, no write
- TC-SYS-006 — browsing App Versions issues no mutating request

## 20 — Monitoring (Remote Actions · Change Logs)

- **Page object:** `monitor/RemoteActionsPage, monitor/ChangeLogsPage, monitor/MonitorPage`
- **Spec:** `tests/e2e/monitoring/`
- **Docs:** `docs/test-cases/monitoring.md`, `docs/test-cases/monitor.md`
- **Số test:** 14

### `monitoring/change-logs.e2e.spec.ts` (4)

- TC-CHL-001 — direct navigation renders the change-log feed, no login redirect
- TC-CHL-002 — toolbar exposes the Merchant / Entity type / Operation filters
- TC-CHL-003 — the results footer reports a total entry count
- TC-CHL-004 — pagination is present when the feed has rows

### `monitoring/remote-actions.e2e.spec.ts` (5)

- TC-RMA-001 — direct navigation renders the remote-actions list, no login redirect
- TC-RMA-002 — toolbar exposes the Merchant / Action / Result filters and Refresh
- TC-RMA-003 — clicking a row opens the detail sheet showing its Result
- TC-RMA-004 — reload keeps the URL, the session and the table
- TC-RMA-005 — page load produces no uncaught errors and no unexpected 4xx/5xx

### `monitoring/security.e2e.spec.ts` (2)

- TC-MON-130 — unauthenticated Remote Actions visit redirects to /login with no data
- TC-MON-131 — unauthenticated Change Logs visit redirects to /login with no data

### `monitoring/send-action-safety.e2e.spec.ts` (3)

- TC-RMA-020 — the send-action form renders at /remote-actions/send-action
- TC-RMA-021 — Send action stays disabled until an Action is chosen
- TC-RMA-022 — viewing the send-action form fires no remote-action write

## 21 — Users & Roles

- **Page object:** `users-roles/UsersRolesPage`
- **Spec:** `tests/e2e/users-roles/`
- **Docs:** `docs/test-cases/users-roles.md`, `docs/test-cases/admin-access.md`
- **Số test:** 12

### `users-roles/page-load-tabs.e2e.spec.ts` (5)

- TC-USR-001 — direct navigation renders the Users list, no login redirect
- TC-USR-002 — the RBAC scope tab strip renders
- TC-USR-003 — a tab exposes its count badge
- TC-USR-004 — reload keeps the URL, the session and the page header
- TC-USR-005 — page load produces no uncaught errors and no unexpected 4xx/5xx

### `users-roles/roles-list.e2e.spec.ts` (4)

- TC-USR-010 — Roles scope renders a roles table at /roles
- TC-USR-011 — toolbar exposes an enabled Add role action
- TC-USR-012 — roles table shows rows or an empty state
- TC-USR-013 — browsing the roles list issues no mutating request

### `users-roles/security.e2e.spec.ts` (1)

- TC-USR-130 — unauthenticated visitor is redirected to /login with no user data

### `users-roles/user-detail-safety.e2e.spec.ts` (2)

- TC-USR-020 — opening a user row reveals its role / permission detail
- TC-USR-021 — viewing a user detail issues no mutating request

## 00 — Regression (Linear bug re-tests, xuyên tính năng)

- **Page object:** `(nhiều page object)`
- **Spec:** `tests/e2e/regression-linear/`
- **Docs:** `docs/test-cases/regression-bugs-linear.md`
- **Số test:** 7

### `regression-linear/vp-2687.e2e.spec.ts` (1)

- TC-VP2687-01 — import 1 dòng trùng code: server báo lỗi Employee Code, không import, staff không đổi

### `regression-linear/vp-2688.e2e.spec.ts` (1)

- ${c.id} — phone ${c.note}: server báo lỗi Employee Phone, không tạo staff

### `regression-linear/vp-3787.e2e.spec.ts` (1)

- ${c.id} — ${c.title}

### `regression-linear/vp-4086.e2e.spec.ts` (1)

- ${c.id} — tab ${c.name}: Merchant trong sheet khác "—" và khớp dòng

### `regression-linear/vp-4093.e2e.spec.ts` (3)

- TC-VP4093-01 — không có id nào bị dùng cho 2 phần tử
- TC-VP4093-02 — mỗi label[for] trỏ tới đúng một control
- TC-VP4093-03 — nhãn "Cash" của Point value gắn với ô nhập, không phải switch Cash

## 00 — Auth & Dashboard (hạ tầng)

- **Page object:** `auth/LoginPage, dashboard/DashboardPage`
- **Spec:** `tests/e2e/auth/`, `tests/e2e/dashboard/`
- **Số test:** 4

### `auth/login.e2e.spec.ts` (2)

- offers federated sign-in only — no credential form is rendered
- deep link while signed out bounces to /login and preserves the target

### `dashboard/dashboard.e2e.spec.ts` (2)

- renders the overview for an authenticated user
- navigates to Orders via the sidebar

## Doc chưa gắn spec (tham chiếu)

- `docs/test-cases/appointment.md`
