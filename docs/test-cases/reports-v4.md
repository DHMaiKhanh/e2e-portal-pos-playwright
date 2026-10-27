# Test case: Reports V4 (Daily Sale / Income Summary / Staff Income / Staff Payroll)

- **Route**: `/pos/<seg>/<id>/v4/reports/<slug>` (DEV: `/pos/nail/100004/v4/reports/...`)
- **Slug**: `daily-sale-report`, `income-summary`, `staff-income`, `staff-payroll`; trang con `staff-income-detail` (mở từ Staff Income, không có trong menu)
- **Nhóm sidebar**: `Management` → accordion `Reports V4`
- **Ngày quét**: 2026-10-20 · **Môi trường**: `ENV=stage` (`https://v2.dev-fastboypay.com`), store `100004` (timezone UTC-5 → "Today" = 2026-10-19)
- **Cấu hình nguồn**: các page/block/report trong [report-config-v4.md](report-config-v4.md). Bản V3 cũ: [reports.md](reports.md) (mỗi trang V4 có link `Open in legacy` → `/report-pages/<slug>`)
- **Ngày có dữ liệu ổn định**: 2026-08-18 (15 đơn ở Daily Sale) — ưu tiên pin ngày này cho assert số liệu; dữ liệu "Today" thay đổi liên tục

## 1. Tính năng này dùng để làm gì

Reports V4 là **bộ báo cáo doanh thu/lương cho chủ tiệm**, được render hoàn toàn từ cấu hình Report Configuration V4 (page → block → report). So với V3, nó thêm drill-down (click tile/dòng mở panel chi tiết), deep-link toàn bộ trạng thái qua URL, export CSV/Excel, in, và layout riêng cho POS window.

| Trang                   | Dùng để                                   | Thành phần chính                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Daily Sale Report**   | Doanh thu 1 ngày theo giờ + danh sách đơn | Date picker 1 ngày + `Today`; chart "<metric> by Hour"; bảng Order Details (Export, Expand); Daily Summary 4 tile có % "vs Yesterday" (Total Orders / Sale Income / Total Tip / Total Payment) — click tile đổi chart (`?metric=`); Income Detail (Sale/Tip/Tax Collected); Payment Detail (Card/Cash/Others/Amount Collected/Gift Card Redemption); click đơn → drawer **Order detail** |
| **Income Summary**      | Tổng hợp thu nhập theo khoảng ngày        | Date range (Today, Yesterday, Last 7/30 days, This month, Last month + 2 lịch, Apply/Cancel); Group by Day/Week/Month (`?period=weekly`); chart Gross/Net/Total Tip; bảng Date/Sale/Tip/Tax/Total Payment (sort, Export); click dòng → panel **Breakdown** (Payment details theo Cash/Card/Others/Gift Card; Sale details…)                                                              |
| **Staff Income**        | Thu nhập từng thợ trong khoảng ngày       | Date range; switch `Show staff with no income` (`?include_no_income=true`); search staff (`?search=`); KPI Staff/Orders/Subtotal/Supply Fee/Tip/Income; bảng By Staff + dòng Total; click thợ → trang **Staff Income Detail**                                                                                                                                                            |
| **Staff Income Detail** | Chi tiết 1 thợ                            | `?staff_id=&after=&before=`; bảng Orders (Order #, Date, Customer, Services, Sale/Refund, Supply, Tip); panel tổng: Working Days, Sale, Refund, Subtotal, Supply Fee, Staff Commission (+ Commission Rate %), Card Charge Commission, Clean Up Fee, Discount Charge, Tip, Card Charge Tip, Split Pay (Pay 1 % / Pay 2)                                                                   |
| **Staff Payroll**       | Bảng lương theo kỳ payroll                | Picker kỳ (`?period_id=`; kỳ hiện tại "Current Period (Unclosed)" + nhãn `Live` "Estimated figures…"); search; bảng By Staff (avatar chữ cái, phân trang 30); click thợ → panel **Breakdown** theo ngày + tổng (Commission, Card Charge, Clean Up Fee/Deduction, Tip theo Card/Cash/Gift Card/Other, Total Income, Pay 1/Pay 2) + Print                                                  |

Chung cho mọi trang: heading + badge `V4`, `Open in legacy`, `Print` (Daily Sale, Staff Income, panel payroll), `Expand table`, `Export` → `Download CSV` / `Download Excel`, sort header (`Sort by <col>`).

## 2. Test case

### A. Tải trang & điều hướng

| ID      | Tiêu đề                  | Bước                                                                | Kết quả mong đợi                                                                                                                   | Ưu tiên |
| ------- | ------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------- |
| RV4-A01 | Mở Daily Sale            | `/v4/reports/daily-sale-report`                                     | Heading `Daily Sale Report` + `V4`; title `Daily Sale Report \| Portal`; date = `Today`; chart + bảng + summary render             | P1      |
| RV4-A02 | Mở Income Summary        | `/income-summary`                                                   | Heading; `Today`, Group by `Day`; chart + bảng                                                                                     | P1      |
| RV4-A03 | Mở Staff Income          | `/staff-income`                                                     | KPI + bảng By Staff + dòng Total                                                                                                   | P1      |
| RV4-A04 | Mở Staff Payroll         | `/staff-payroll`                                                    | Tự gắn `?period_id=<kỳ hiện tại>`; nhãn `Live` + "Estimated figures…"                                                              | P1      |
| RV4-A05 | Sidebar Reports V4       | Mở accordion, click từng mục                                        | Đúng 4 link, đúng href, mục hiện hành active; `Staff Income Detail`/`Today's Summary` không nằm trong menu                         | P1      |
| RV4-A06 | Open in legacy           | Click trên từng trang                                               | Đi tới `/report-pages/<slug>` tương ứng                                                                                            | P2      |
| RV4-A07 | Slug không tồn tại       | `/v4/reports/not-a-slug`                                            | **Hiện tại**: "Unable to load reports — a loading failure, not an empty configuration". Mong đợi: trang 404 "report không tồn tại" | P2      |
| RV4-A08 | Chưa đăng nhập           | Mở URL khi không có session                                         | Về `/login?redirect=…`, login xong quay lại đúng URL kèm query                                                                     | P1      |
| RV4-A09 | Không có phiên đăng nhập | Gọi API V4 (menu, layout, rows) không kèm cookie                    | Tất cả `401`, không trả dữ liệu. _(Thay cho "user không thuộc store": suite chỉ có tài khoản admin nội bộ.)_                       | P1      |
| RV4-A10 | Page bị Deactivate       | Tạo page `e2e-rv4-…` (This merchant) + block → Publish → Deactivate | Trước: có trong menu, trang V4 hiện heading. Sau: biến khỏi menu, layout `404`, trang V4 không còn dữ liệu                         | P2      |

### B. Daily Sale Report

| ID      | Tiêu đề                     | Bước                                                              | Kết quả mong đợi                                                                                                                                                                   | Ưu tiên |
| ------- | --------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| RV4-B01 | Date picker                 | Click `Report date`                                               | Lịch 1 tháng, ngày hiện tại đánh dấu; ngày tương lai bị chặn (xác minh)                                                                                                            | P1      |
| RV4-B02 | Chọn ngày                   | Chọn 18                                                           | URL `?after=2026-10-18&before=2026-10-18`; nhãn `Oct 18, 2026`; bảng/summary đổi theo ngày                                                                                         | P1      |
| RV4-B03 | Nút Today                   | Ở ngày khác bấm `Today`                                           | Về ngày hôm nay theo **timezone store** (UTC-5)                                                                                                                                    | P1      |
| RV4-B04 | Deep-link ngày có dữ liệu   | `?after=2026-08-18&before=2026-08-18`                             | `Aug 18, 2026`, `15 orders`                                                                                                                                                        | P1      |
| RV4-B05 | Param `date=` không hỗ trợ  | `?date=2026-08-18`                                                | Bị bỏ qua, hiển thị Today (ghi nhận; chỉ `after/before` hợp lệ)                                                                                                                    | P3      |
| RV4-B06 | Ngày sai định dạng          | `?after=2026-13-45&before=abc`                                    | **Hiện tại**: cả trang lỗi "We couldn't load this merchant — Check your connection". Mong đợi: bỏ qua param, về Today hoặc báo ngày không hợp lệ                                   | P1      |
| RV4-B07 | after > before              | `?after=2026-10-19&before=2026-10-01`                             | Báo lỗi hoặc tự hoán đổi, không crash                                                                                                                                              | P2      |
| RV4-B08 | Tile đổi chart              | Click `Total Orders`, `Total Tip`, `Total Payment`, `Sale Income` | Chart đổi tiêu đề "<metric> by Hour"; URL `?metric=numberOfOrders` / `dailySaleTip` / `dailySaleTotalPayment` / `dailySaleSale`; tile chọn được highlight                          | P1      |
| RV4-B09 | metric không hợp lệ         | `?metric=bogus`                                                   | "No metric selected — Pick a metric above to see its chart."; phần còn lại vẫn render                                                                                              | P2      |
| RV4-B10 | Tile mặc định               | Mở không có `metric`                                              | Chart `Sale Income by Hour` (default tile `Daily Sale Sale`)                                                                                                                       | P2      |
| RV4-B11 | % vs Yesterday              | So với dữ liệu ngày trước                                         | % = (hôm nay − hôm qua)/hôm qua, làm tròn; dấu +/− và màu đúng; hôm qua = 0 → hiển thị hợp lý (không `Infinity`)                                                                   | P1      |
| RV4-B12 | Đối soát Summary vs bảng    | Cộng cột bảng Order Details                                       | Total Orders = số dòng; Sale Income = Σ Sale/Refund; Total Tip = Σ Tip; Total Payment = Σ Total                                                                                    | P1      |
| RV4-B13 | Đối soát Income Detail      |                                                                   | Income Detail = Sale + Tip + Tax Collected (1,286.93 + 103.55 + 141.25 = 1,531.73)                                                                                                 | P1      |
| RV4-B14 | Đối soát Payment Detail     |                                                                   | Card + Cash + Others = Total (1,176.28 + 355.45 + 0 = 1,531.73) = Amount Collected                                                                                                 | P1      |
| RV4-B15 | Click đơn → Order detail    | Click `#OD…`                                                      | Drawer: trạng thái (Successful - Settled), thời gian 2 timezone, merchant, customer, service theo staff, payment (thẻ •••• 4 số, Auth, Ref), Order summary, Tip breakdown; `Close` | P1      |
| RV4-B16 | Đối soát Order detail       |                                                                   | Items subtotal = Σ dịch vụ; Total = Subtotal − Discount + Tax + Tip; Tip breakdown cộng = Tip                                                                                      | P1      |
| RV4-B17 | Panel Income/Payment Detail | Click `Income Detail` / `Payment Detail`                          | Hành vi xác định (mở breakdown hoặc không làm gì) và nhất quán                                                                                                                     | P3      |
| RV4-B18 | Expand table                | `Expand table`                                                    | Bảng mở rộng toàn màn/dialog, Esc đóng                                                                                                                                             | P2      |
| RV4-B19 | Ngày không có đơn           | Chọn ngày không có dữ liệu                                        | Empty state bảng; summary = 0; chart trống không lỗi                                                                                                                               | P2      |
| RV4-B20 | Chart tooltip               | Hover biểu đồ ở nhiều vị trí; đổi tile Total Orders               | Tooltip `<giờ AM/PM>` + `Sale : $x.xx`, đổi theo vị trí chuột; sau khi đổi tile hiện `Orders : n`                                                                                  | P3      |
| RV4-B21 | Print                       | `Print`                                                           | Mở hộp in, layout in đủ dữ liệu (block thu gọn được in đầy đủ)                                                                                                                     | P3      |

### C. Income Summary

| ID      | Tiêu đề                      | Bước                                     | Kết quả mong đợi                                                                                                                                               | Ưu tiên |
| ------- | ---------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| RV4-C01 | Preset khoảng ngày           | Chọn từng preset → Apply                 | Last 30 days → `?after=2026-09-20&before=2026-10-19` (30 ngày tính cả 2 đầu); nhãn nút đổi theo preset                                                         | P1      |
| RV4-C02 | Custom range                 | Chọn 2 ngày trên lịch → Apply            | URL after/before đúng; Cancel không áp dụng                                                                                                                    | P1      |
| RV4-C03 | Group by Week                | Group by → Week                          | URL `period=weekly`; dòng `Week n (Dec 29 – Jan 4, 2026)`                                                                                                      | P1      |
| RV4-C04 | Group by làm mất khoảng ngày | Đang Last 30 days → đổi Week             | **Hiện tại** range bị đổi thành cả năm (`after=2025-12-29&before=2026-10-25`, gồm tuần tương lai). Xác nhận đúng thiết kế hay bug                              | P2      |
| RV4-C05 | Group by Month               | Month                                    | Dòng theo tháng; tổng toàn kỳ không đổi so với Day                                                                                                             | P1      |
| RV4-C06 | Đối soát với Daily Sale      | Today                                    | Sale/Tip/Tax/Total của ngày = Daily Sale cùng ngày (1,286.93 / 103.55 / 141.25 / 1,531.73)                                                                     | P1      |
| RV4-C07 | Click dòng → Breakdown       | Click `Oct 19, 2026`                     | Panel "Total Income Table · Breakdown": Cash/Card/Others/Gift Card (Sale/Refund/Tip/Tax), Sale details                                                         | P1      |
| RV4-C08 | Đối soát Breakdown           |                                          | Cash Sale + Card Sale (+Others) = Sale (315.50 + 971.43 = 1,286.93); Tip, Tax tương tự                                                                         | P1      |
| RV4-C09 | Sort cột                     | `Sort by Sale` 2 lần                     | Tăng/giảm; aria-sort cập nhật                                                                                                                                  | P2      |
| RV4-C10 | Chart                        | Legend + hover                           | Legend đúng 3 mục Gross Income / Net Income / Total Tip, 3 series cột; tooltip theo ngày hiện đủ 3 giá trị tiền. (Legend chỉ hiển thị — click không ẩn series) | P3      |
| RV4-C11 | Khoảng ngày dài              | Last 12 months / custom 1 năm, group Day | Tải được, có phân trang/không treo                                                                                                                             | P3      |

### D. Staff Income & Staff Income Detail

| ID      | Tiêu đề                          | Bước                                   | Kết quả mong đợi                                                                                                                                                                                                    | Ưu tiên |
| ------- | -------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| RV4-D01 | Mặc định ẩn staff không thu nhập | Mở trang                               | Chỉ thợ có số liệu (13); KPI Staff = 13                                                                                                                                                                             | P1      |
| RV4-D02 | Show staff with no income        | Bật switch                             | `?include_no_income=true`; Staff = 99; tổng tiền không đổi                                                                                                                                                          | P1      |
| RV4-D03 | Search staff                     | Gõ `Bob`                               | `?search=Bob`; 1 dòng; KPI tính lại theo kết quả lọc                                                                                                                                                                | P1      |
| RV4-D04 | Search không kết quả             | `zzz`                                  | Empty state, KPI = 0                                                                                                                                                                                                | P2      |
| RV4-D05 | Dòng Total                       |                                        | Total = Σ từng cột (Orders 24, Subtotal 1,043.95, Supply 55.00, Tip 103.55, Income 766.71)                                                                                                                          | P1      |
| RV4-D06 | Đối soát với Income Summary      |                                        | Subtotal tổng = Service Sale bên Income Summary (1,043.95); Tip = Total Tip                                                                                                                                         | P1      |
| RV4-D07 | Thợ thu nhập âm / 0 đơn có lương | Xem Kevin (−$10), Evon (0 đơn, $87.50) | Giá trị đúng công thức (salary / discount charge…), định dạng âm `-$10.00`                                                                                                                                          | P2      |
| RV4-D08 | Click thợ → Detail               | Click `Bob`                            | URL `/staff-income-detail?staff_id=…&after=…&before=…`; heading `Staff Income Detail \ Bob`                                                                                                                         | P1      |
| RV4-D09 | Detail – bảng đơn                |                                        | 7 orders = cột Orders ở trang ngoài; Σ Sale = Subtotal 398.00; Σ Supply = 23.00; Σ Tip = 43.07                                                                                                                      | P1      |
| RV4-D10 | Detail – công thức               |                                        | Commission = (Subtotal − Supply) × rate (375 × 60% = 225.00); Total = Commission − Card Charge Commission − Clean Up Fee − Discount Charge + Tip − Card Charge Tip = 254.01; Pay 1 + Pay 2 = Total (76.20 + 177.81) | P1      |
| RV4-D11 | Working Days                     | Thợ có đơn trong ngày                  | **Hiện tại** `Working Days 0` dù có 7 đơn — xác minh nguồn (clock-in)                                                                                                                                               | P2      |
| RV4-D12 | Detail – đổi ngày giữ staff      | Đổi range ở trang Detail               | Giữ `staff_id`, dữ liệu cập nhật                                                                                                                                                                                    | P2      |
| RV4-D13 | Detail – staff_id sai            | `?staff_id=abc`                        | Thông báo không tìm thấy, không crash                                                                                                                                                                               | P2      |
| RV4-D14 | Tên dịch vụ dài                  | Mở Detail của các thợ ngày cố định     | Ô Services không tràn khỏi bảng; trang không cuộn ngang                                                                                                                                                             | P3      |
| RV4-D15 | Back từ Detail                   | Browser back                           | Về Staff Income giữ nguyên filter/search                                                                                                                                                                            | P2      |

### E. Staff Payroll

| ID      | Tiêu đề                  | Bước                                                | Kết quả mong đợi                                                                                                                                     | Ưu tiên |
| ------- | ------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| RV4-E01 | Picker kỳ                | Mở `Payroll period`                                 | Kỳ hiện tại đứng đầu kèm "Current Period (Unclosed)", các kỳ cũ giảm dần                                                                             | P1      |
| RV4-E02 | Chọn kỳ đã đóng          | Chọn `Oct 8 – Oct 15, 2026`                         | `period_id` đổi; không còn nhãn `Live`/Estimated                                                                                                     | P1      |
| RV4-E03 | period_id sai            | `?period_id=abc`                                    | Báo lỗi / về kỳ hiện tại, không crash                                                                                                                | P2      |
| RV4-E04 | Search                   | `Bob`                                               | `&search=Bob`, 1 dòng (17 orders, 2,062.50, 56.00, 98.59, 1,264.25)                                                                                  | P1      |
| RV4-E05 | Phân trang               | 99 staff → Next                                     | `31–60 of 99`; search reset về trang 1                                                                                                               | P2      |
| RV4-E06 | Click thợ → Breakdown    | Click `Bob`                                         | Panel "By Staff · Breakdown": bảng theo ngày trong kỳ + tổng + Print + Close                                                                         | P1      |
| RV4-E07 | Đối soát Breakdown       |                                                     | Σ theo ngày = dòng tổng; ngày 19/10 khớp Staff Income Detail (398 / 23 / 43.07); Tip = Card + Cash + Gift Card + Other; Pay 1 + Pay 2 = Total Income | P1      |
| RV4-E08 | Staff trùng tên          | Duyệt các trang, tìm tên trùng (`Beo`)              | Mỗi dòng trùng tên có thông tin phân biệt (code…) — **hiện không có** (`test.fail`)                                                                  | P3      |
| RV4-E09 | Staff 0 đồng             | Mở Payroll                                          | Thiết kế hiện tại: không có switch ẩn staff 0; liệt kê toàn bộ staff (= số staff của Staff Income khi bật "no income")                               | P3      |
| RV4-E10 | Print breakdown          | Print trong panel                                   | Chỉ in breakdown của thợ đó                                                                                                                          | P3      |
| RV4-E11 | Công thức thợ lương cứng | Kỳ đã đóng, mở breakdown các thợ có `Salary Amount` | Total Income = Salary Amount − Clean Up Fee/Deduction + Tip − Card Charge Tip cho **mọi** thợ (hiện Evon không cộng tip — xem mục 3.5)               | P1      |

### F. Export, sort, bảng chung

| ID      | Tiêu đề            | Bước                       | Kết quả mong đợi                                                                                                        | Ưu tiên |
| ------- | ------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------- |
| RV4-F01 | Menu Export        | Click `Export`             | `Download CSV`, `Download Excel`                                                                                        | P1      |
| RV4-F02 | CSV                | Download CSV               | Tên file chứa slug + ngày; header = cột hiển thị; số dòng = tổng (không chỉ trang hiện tại); có dòng Totals nếu bảng có | P1      |
| RV4-F03 | Excel              | Download Excel             | Mở được, số là kiểu number (không phải chuỗi `$`)                                                                       | P2      |
| RV4-F04 | Export theo filter | Đang search `Bob` → Export | File chỉ chứa kết quả lọc                                                                                               | P2      |
| RV4-F05 | Sort               | Mọi cột có `Sort by`       | Asc/desc đúng kiểu số/tiền/ngày; dòng Total luôn ở cuối                                                                 | P2      |
| RV4-F06 | Định dạng tiền     |                            | `$1,531.73`, 2 số lẻ, âm `-$`, trục chart rút gọn `$1.2K`                                                               | P2      |

### G. Đồng bộ với cấu hình & legacy

| ID      | Tiêu đề                | Bước                                                                       | Kết quả mong đợi                                                                                                                                             | Ưu tiên |
| ------- | ---------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| RV4-G01 | V4 = Legacy            | So số liệu cùng ngày giữa `/v4/reports/<slug>` và `/report-pages/<slug>`   | Các chỉ số chính trùng khớp                                                                                                                                  | P1      |
| RV4-G02 | Cấu hình theo merchant | Tạo + publish page `e2e-rv4-…` scope This merchant (100004)                | Menu/layout của 100004 có page; merchant 14 không có (`404`); version page dùng chung Daily Sale không đổi                                                   | P1      |
| RV4-G03 | Draft không lộ ra      | Page `e2e-rv4-…` đã publish → thêm block Supply Fee → Save draft → Publish | Sau Save draft: layout phục vụ chưa có block, version giữ nguyên; sau Publish: có block, `Published v(N+1)`                                                  | P1      |
| RV4-G04 | Layout POS window      | API `menu?layout=pos` và `<slug>/layout?layout=pos`                        | Menu POS đủ 4 trang; `resolvedLayout=pos`; Daily Sale có cây layout riêng (block `-pos`) và không có action Print                                            | P2      |
| RV4-G05 | Permission / passcode  | API layout web + pos của 4 trang                                           | `required` = `daily_income` / `summary_income` / `staff_income` / `staff_payroll` (cả permission và passcode) — hợp đồng POS dùng để ẩn trang / hỏi passcode | P2      |

### H. Phi chức năng

| ID      | Tiêu đề          | Bước                                                                   | Kết quả mong đợi                                                                                         | Ưu tiên |
| ------- | ---------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------- |
| RV4-H01 | Console          | Mở 5 trang                                                             | Không console error                                                                                      | P2      |
| RV4-H02 | Responsive 375px | Mobile viewport                                                        | KPI tile xuống dòng, bảng cuộn ngang, picker dùng được                                                   | P2      |
| RV4-H03 | A11y             |                                                                        | Nút icon có label (`Expand table`, `Report date`…); sort header có aria-sort; drawer bẫy focus, Esc đóng | P3      |
| RV4-H04 | Hiệu năng        | Đo LCP mỗi trang                                                       | < 3s trên DEV                                                                                            | P3      |
| RV4-H05 | Cô lập merchant  | API không có `x-merch-id`; merchant không tồn tại; mở URL store 999998 | `400 needs the x-merch-id header`; `400 Merchant account id not registered`; UI không hiện bảng dữ liệu  | P1      |

## 3. Điểm bất thường phát hiện khi quét (2026-10-20)

1. ~~Ngày sai định dạng làm sập cả trang~~ — **không tái hiện** khi chạy suite: `?after=2026-13-45&before=abc` vẫn render trang. Lỗi "We couldn't load this merchant" thấy lúc quét trùng thời điểm token được làm mới (401). → RV4-B06 để là test thường.
2. **Slug không tồn tại** báo "Unable to load reports… a loading failure" thay vì 404. → RV4-A07 (`test.fail`)
3. **Income Summary: đổi Group by xoá khoảng ngày** người dùng chọn, nhảy sang cả năm và gồm cả tuần tương lai. → RV4-C04 (`test.fail`)
4. **Staff Income Detail: `Working Days 0`** dù thợ có đơn trong ngày. → RV4-D11 (`test.fail`)
5. **Staff Payroll – thợ lương cứng tính Total Income không nhất quán** (kỳ Aug 7–20, 2026): Andy = Salary 100 − Clean Up 21 + Tip 66.33 − Card Charge Tip 0.34 = **144.99** (có cộng tip); Evon = Salary 700 − Clean Up 84 = **616.00**, **không cộng** Tip 220.64. → RV4-E11 (`test.fail`)
6. **Dấu âm không thống nhất**: bảng/panel dùng dấu trừ Unicode `−$315.00` (U+2212), KPI tile dùng `-$315.00` (ASCII). Ảnh hưởng copy/export và so khớp chuỗi.
7. **Dòng refund**: Daily Sale ghi `#OD… (Refund)` thành dòng riêng; Staff Income Detail liệt kê refund cùng mã đơn **không có hậu tố** (trùng mã) — `Orders` = số mã đơn khác nhau. Daily Sale còn hiện đơn ngày khác bị refund trong ngày (vd. `#OD260812-… (Refund)` trên ngày 18/8) và 1 đơn `#OD260819-…` trên ngày 18/8 (lệch timezone?).
8. Daily Sale `Total Orders` chỉ đếm đơn bán (bỏ dòng refund) ≠ số dòng bảng (`15 orders`) — nhãn "orders" của bảng dễ gây hiểu nhầm.
9. Heading Staff Income Detail dùng ký tự `\` làm phân cách (`Staff Income Detail \ Bob`) — xác nhận thiết kế.
10. Staff Payroll có 2 dòng `Beo` không phân biệt được; nhiều staff test `E2E…` giá trị 0. → RV4-E08/E09
11. Sheet Payroll ở **kỳ đã đóng** có nút **`Recalculate payroll`** (thao tác ghi) — test không bao giờ click.
12. Trang legacy `/report-pages/daily-sale-report` nay dùng cùng component `pos-stat` như V4 (Page Object V3 `kpiTile` đã lỗi thời).
13. **`Publish` và `Deactivate` trong builder V4 thực thi ngay, không có hộp xác nhận** — một cú click nhầm sẽ đẩy bản nháp ra cho mọi merchant (với page dùng chung).
14. Page merchant mới publish có trong API `menu` của merchant nhưng **không hiện ở sidebar "Reports V4"** (sidebar có vẻ là danh sách cố định / cache) — chỉ vào được bằng URL.
15. Ghi nhận khi quét 2026-10-20: page dùng chung **Daily Sale Report lên v3 lúc 02:41:50 UTC** và có page **"QA Claude Test Page" (All merchants, Draft)** do một phiên/người khác tạo trên DEV; Change Logs không có bản ghi cho page này.

## 4. Code test

- Page Object: `src/pages/reports-v4/ReportsV4Page.ts` (fixture `reportsV4Page`); URL helper `reportV4Url()` / `ReportV4Slug` trong `src/constants/urls.ts`
- Spec: `tests/e2e/reports-v4/` — `page-load-navigation`, `daily-sale`, `income-summary`, `staff-income`, `staff-payroll`, `export-sort`, `config-sync-nonfunctional`, `config-write`
- Page Object cấu hình: `src/pages/reports-v4/ReportConfigV4Page.ts` (fixture `reportConfigV4Page`)
- **Ghi dữ liệu (chỉ `config-write`: A10, G02, G03)**: mỗi test tự tạo page `e2e-rv4-…` scope **This merchant** (store 100004), publish/deactivate rồi xoá trong `finally`; `beforeEach`/`afterEach` quét và xác nhận không còn page `e2e-rv4-…`. Không sửa page dùng chung (chỉ đọc version để chứng minh không đổi). Lưu ý: `Publish` và `Deactivate` thực thi ngay, **không có hộp xác nhận**.
- Các spec còn lại chỉ đọc. A09/G04/G05/H05 kiểm tra qua API (không có tài khoản merchant/POS riêng)
- Số liệu không hard-code: đối soát chéo trong trang trên ngày cố định `2026-08-18` và kỳ đã đóng `Aug 7 – Aug 20, 2026`
- Chạy: `ENV=stage npx playwright test tests/e2e/reports-v4 --workers=4`

## 5. Lịch sử chạy

### 2026-10-20 (chiều) — viết lại theo Linear VP-4756, ENV=stage

- **Bỏ toàn bộ `test.fail`**: các case bug (A07, C04, D11, E08, E11) nay báo **đỏ** cho tới khi được sửa, thay vì hiện "passed".
- Thêm **VP-4852** (Staff Payroll: breakdown thiếu "Working Days") — đỏ.
- **RV4-A06 ×4 đỏ**: nút "Open in legacy" bị gỡ khỏi mọi trang V4 (regression của fix VP-4839 — [VP-4877](https://linear.app/fastboy/issue/VP-4877)).
- **B12 / F02 / F06** kiểm tra tiền điều kiện `expectDefaultLayout`: store 100004 đang có bản copy merchant của Daily Sale (do người khác tạo, cột `Tip-QA`/`Customer Name`, bỏ `Tax`) → báo `ENV: … merchant override`.
- Bug của Report Configuration V4 (VP-4830 → 4847) nằm trong `tests/e2e/report-config-v4/` — bảng trạng thái ở [report-config-v4.md §0](report-config-v4.md).

### 2026-10-20 (UTC+7) — ENV=stage

| Kết quả                                                                                  | Số lượng |
| ---------------------------------------------------------------------------------------- | -------: |
| Passed (khi đó còn bọc `test.fail` cho A07, C04, D11, E08, E11 — đã bỏ ở lần chạy chiều) |       94 |
| Skipped                                                                                  |        0 |
| Failed                                                                                   |        0 |

93 test RV4 (+1 setup), 4 workers, ~3.0 phút. Lần chạy đầu: 81 passed / 12 fixme; chuyển 9 fixme thành test thật (B20, C10, D14, E08, E09 qua UI; A09, G04, G05, H05 qua API chỉ đọc), rồi 3 case ghi A10, G02, G03 (được cho phép, chỉ dùng page `e2e-rv4-…` của merchant 100004). Kết quả hiển thị trên app desktop "Portal POS Test Results" (`npm run results`).
