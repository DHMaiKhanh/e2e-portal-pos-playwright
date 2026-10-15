# Test case — Reports (Report Pages)

- **Màn hình:** Reports — các trang báo cáo cấu hình được (configurable report pages)
- **Route:** `/pos/<seg>/<storeId>/report-pages/<slug>` (vd: `/pos/nail/14/report-pages/daily-sale-report`)
- **Slug:** `daily-sale-report` · `demo-ds-report` · `income-summary` · `staff-income` · `staff-payroll`
- **Ngày quét:** 2026-10-13 (DEV Portal `https://v2.dev-fastboypay.com`, store 14, `ENV=stage`)
- **Nguồn:** `_scan/rescan/rp-*.json` + các probe tương tác `_scan/rescan/probe-rp-*.mjs` (kết quả trong `_scan/rescan/rp-probe/`)
- **Code:** `src/pages/reports/ReportPagesPage.ts` (fixture `reportPagesPage`) · `tests/e2e/reports/*.e2e.spec.ts`
- **Tiền thân:** màn `Income Reports (Legacy)` (`/income`, xem `income.md`)

## Kiểm kê tính năng (Feature inventory)

### Chrome chung & điều hướng

- Sidebar nhóm **Management** có accordion `button "Reports"`; mở ra các link report theo cấu hình: lúc quét là 5 link `Daily Sale Report`, `Demo DS Report`, `Income Summary`, `Staff Income`, `Staff Payroll` (đúng thứ tự, href store-scoped). Cuối ngày 2026-10-13 `Demo DS Report` bị gỡ khỏi sidebar (trang vẫn mở được bằng URL).
- Ở màn khác (vd Overview) nhóm `Reports` **thu gọn** (`aria-expanded="false"`); khi đang ở một report thì nhóm **tự mở** và link hiện tại có `aria-current="page"`.
- Overview → `Today's Summary` → link `View All` trỏ tới `/report-pages/income-summary`.
- Màn cũ đổi nhãn thành `Income Reports (Legacy)` (vẫn ở `/income`).
- Tên report hiển thị ở header trang là `div[data-slot="page-title"]` — **không có heading `h1`–`h6`**. `document.title` = `<Tên report> | Portal`.
- Không có `data-testid` nào; mọi locator dựa vào role / aria-label / text.
- `/report-pages` (không slug) → chuyển hướng về Overview.

### Trạng thái URL (deep-link)

| Param               | Ý nghĩa                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------- |
| `after`, `before`   | Khoảng ngày `YYYY-MM-DD` (Daily Sale: cùng một ngày)                                    |
| `metric`            | KPI đang chọn ở Daily Sale (vd `dailySaleTip`, `numberOfOrders`)                        |
| `period`            | Income Summary: `daily` / `weekly` / `monthly`                                          |
| `search`            | Ô tìm nhân viên (Staff Income / Staff Payroll)                                          |
| `include_no_income` | Switch `Show staff with no income` (Staff Income)                                       |
| `period_id`         | Kỳ lương (Staff Payroll, tab Staff Payroll của Demo) — tự gắn kỳ hiện tại khi vào       |
| `page`              | Trang của bảng                                                                          |
| `tab`               | Tab của Demo DS (`daily-sale`, `tab`, `tab-2`, `tab-3`)                                 |
| `blockSort`         | JSON `{ "<block-id>": "<cột>:<asc\|desc>" }` — vd `{"income-staff":"totalIncome:desc"}` |

### Daily Sale Report (`daily-sale-report`)

- Nút `Today` (nhảy về hôm nay) + bộ chọn ngày `button "Report Date"` (popover lịch 1 tháng, `Go to the Previous Month` / `Go to the Next Month`, nút ngày có aria-label đầy đủ `Monday, October 12th, 2026`, hôm nay là `Today, …, selected`). **Ngày tương lai không bị disable.**
- Biểu đồ `<KPI> by Hour` (trục X 24 mốc `12 AM` … `11 PM`, trục Y viết tắt `$3K`).
- `Daily Summary`: 4 KPI tile (`role="button"`, `tabindex=0`, `data-selected`) — `Total Orders`, `Sale Income`, `Total Tip`, `Total Payment`; mỗi tile có badge `±N%` + `vs Yesterday` (ngày khác hôm nay: `vs <Mmm d>`).
- Bảng `Order Details`: `Order # | Sale/Refund | Tax | Tip | Total`; mã order là button `#ODyymmdd-nnnnnnnn` → mở dialog `Order detail #OD…` (Order Information, Service Details, Payment Details, Activity Log).
- Phân trang 30 dòng/trang: `Showing 1 to 30 of N results`, `Previous`, `x / y`, `Next`.
- Panel `INCOME DETAIL` (Sale, Tip, Tax Collected, Total Payment) và `PAYMENT DETAIL` (Card, Cash, Others, Amount Collected, Gift Card Redemption, Total Payment) — thu gọn/mở được.
- `Export` (disabled khi bảng rỗng) → menu `Download CSV` / `Download Excel`.
- Lần quét đầu có nút `Print` ở header; một thay đổi cấu hình trên DEV cùng ngày đã gỡ nút này.

### Income Summary (`income-summary`)

- `button "Report date range"` (lịch range: click 1 = ngày bắt đầu, click 2 = ngày kết thúc; popover không tự đóng, Esc để đóng) + `combobox "Period and Date Window"` (`Day` / `Week` / `Month`).
- Week/Month mở rộng khoảng ngày (vd Week → từ tuần đầu năm); nhãn dòng `Week N (Mmm d – Mmm d, yyyy)` / `Mmm yyyy`.
- Biểu đồ `Total Income`, legend `Gross Income`, `Net Income`, `Total Tip`.
- Bảng `Total Income Table`: `Date | Sale | Tip | Tax | Total Payment`, header sort 3 trạng thái.
- Panel phải mặc định `No Row Selected — Pick a row on the left to see its breakdown.`; click dòng → breakdown 5 nhóm: `PAYMENT DETAILS`, `SALE DETAILS`, `SUPPLY FEE`, `STAFF PAYOUT`, `SALON EARNINGS` (dòng được tô nền, URL không đổi).

### Staff Income (`staff-income`)

- `Print`, `combobox "Report Date Range preset"` (Today, Yesterday, This Week, Last Week, Last 7 Days, This Month, Last Month, Last 30 Days, This Year, Last Year — xuất hiện trên DEV trong ngày 2026-10-13), `button "Report date range"`.
- Ô tìm `Search by staff name (on report)...` (label “…staff name, staff code or staff phone”), switch `Show staff with no income`.
- Bảng `By Staff`: `Staff | Orders | Subtotal | Supply Fee | Tip | Total Income`, mặc định sort `Staff` tăng dần.
- Panel `STAFF SUMMARY` (trigger collapsible bị disable — luôn mở): Total Staff, Total Orders, Total Subtotal, Total Supply Fee, Total Tip, Total Income — co giãn theo search.
- Click dòng nhân viên: không mở gì.

### Staff Payroll (`staff-payroll`)

- `combobox "Payroll Period"`: kỳ hiện tại `… · Current Period (Unclosed)` + danh sách kỳ cũ (mới → cũ). Tự gắn `period_id`. Heading `h3` `(Mmm d, yyyy - Mmm d, yyyy)`.
- Kỳ hiện tại: tiêu đề bảng `By Staff (live)` + ghi chú `Estimated figures. They keep changing until the period is closed.`; kỳ đã đóng: `By Staff`.
- Ô tìm `Search by staff name...`; bảng `Name | Orders | Subtotal | Supply Fee | Tip | Total Income` (avatar chữ cái đầu), 30 dòng/trang.
- Click dòng → panel phiếu lương: `<Tên>(kỳ)`, `Print`, bảng theo ngày `DATE | SALE | REFUND | SUPPLY FEE | TIP`, các mục Sale, Refund, Subtotal, Supply Fee, Staff Commission, Card Charge Commission, Clean Up Fee/Deduction, Tip, Card Charge Tip, Discount Charge, Total Income (kèm công thức), Pay 1, Pay 2, `Thank you, <Tên>!`. Nhân viên lương cứng hiển thị bộ mục khác (Working Days, Salary Amount…); nhân viên không có số liệu: `No data — This staff has no figures for the selected period yet.` (không có Print).

### Demo DS Report (`demo-ds-report`)

- 4 tab `Daily Sale | Income Summary | Staff Income | Staff Payroll` (role tab), ô `Date`, `Export`, bảng `Order # | Sale | Refund | Tax | Tip | Total` + dòng `Total · N rows`, sort riêng (`demo-ds-order-details`). Trang demo — phủ nhẹ.

### Export & Print

- Tên file: `income-daily-sale-<after>-<before>.csv|xlsx`, `income-summary-<after>-<before>.*`, `income-staff-<after>-<before>.*`, `payroll-live-by-staff-<…>.*` (kỳ hiện tại) / `payroll-by-staff-<…>.*` (kỳ đã đóng).
- CSV có dòng header đúng tên cột; Excel là file `.xlsx` (zip `PK`).
- Print dựng nội dung vào một iframe ẩn rồi gọi `iframe.contentWindow.print()` (test dùng spy, không mở hộp thoại in).

### Định dạng dữ liệu

- Tiền `$1,234.56` / `-$41.10`; số đếm `1,955`; phần trăm `-61%`; ngày `Oct 13, 2026`; khoảng `Oct 1, 2026 - Oct 13, 2026`; tuần `Week 41 (Oct 5 – Oct 11, 2026)` (EN DASH); tháng `Oct 2026`; mốc giờ `9 AM`.
- Footer phân trang: desktop `Showing 1 to 30 of 316 results`; dưới 768px rút gọn `1-29 of 29`.

### Điểm bất thường phát hiện khi quét (cần xác nhận là bug hay thiết kế)

1. **Slug không tồn tại** (`/report-pages/does-not-exist`): trang trắng, `document.title` rỗng, không có thông báo.
2. **Tham số ngày rác** (`after=garbage`): hiển thị màn `This merchant is not available. Invalid time value` (lỗi parse ngày bị hiển thị như lỗi merchant).
3. **Ngày sai lịch** (`after=2026-13-45`): nhãn `Invalid Date - Oct 13, 2026`, bảng trống.
4. **Range ngược** (`after > before`): được chấp nhận, nhãn `Oct 13, 2026 - Oct 1, 2026`, 0 dòng, không báo lỗi.
5. **`page` vượt phạm vi** (`page=99`): `99 / 1` + bảng rỗng thay vì kẹp về trang hợp lệ.
6. **API báo cáo lỗi 500**: skeleton xám vô hạn, không có thông báo lỗi.
7. **Export chỉ xuất trang hiện tại** (30 dòng) dù có 316/336 kết quả.
8. **Tên file Export của Staff Payroll** luôn là `…-<ngày 1 của tháng>-<hôm nay>` bất kể kỳ đã chọn (kỳ 8–13/10 → `2026-10-01-2026-10-13`; kỳ 1–7/10 cũng vậy).
9. **Breakdown Income Summary**: `SALE DETAILS` → Total Payment `$20,932.43` khác `PAYMENT DETAILS` → Total Payment `$20,966.04` (lệch $33.61) trên cùng một ngày — cần BA xác nhận công thức.
10. **Phiếu lương Staff Payroll** từng hiển thị placeholder chưa render `({row.rowPay1Base} x {row.rowPay1Rate})` ở mục Pay 1 — đã được sửa ở bản deploy sau trong ngày (giờ là `(Total Income x 20%)`); giữ TC-RPT-070 làm regression guard.
11. **Demo DS**: số tiền bị nhân 100 và mất phần thập phân (`$36,410` cho order $364.10), KPI demo không có ký hiệu tiền — chấp nhận vì là trang demo.
12. Không có heading cho tên report; dòng được chọn ở Income Summary chỉ đổi class, không có `aria-selected`.
13. CSV Daily Sale của một ngày có thể chứa order mang mã ngày trước (`#OD261011-…` trong file ngày 12/10) — có thể do lọc theo ngày thanh toán; cần xác nhận.
14. Màn hình DEV **thay đổi trong lúc kiểm thử** (gỡ Print ở Daily Sale, thêm nút `Today`, thêm preset ở Staff Income, Export disabled khi rỗng, Daily Sale “hôm nay” từ 313 order về 0, `Demo DS Report` bị gỡ khỏi sidebar) — các case được viết theo trạng thái cuối.
15. Bản in phiếu lương: `innerText` của iframe in chỉ có bảng theo ngày; các dòng tổng (Total Income, Pay 1, Pay 2) có trong DOM nhưng bị ẩn ở media screen — cần kiểm tra bằng mắt bản in thật (Print Preview) để chắc chắn các dòng tổng có xuất hiện trên giấy.

## Test case

### Tải trang & bố cục

**TC-RPT-001 · Daily Sale Report tải thành công**
Ưu tiên: Cao · Loại: Chức năng/Giao diện
Điều kiện tiên quyết: đã đăng nhập admin, có quyền với store.
Các bước: 1. Mở `/report-pages/daily-sale-report`.
Kết quả mong đợi: URL đúng, title `Daily Sale Report | Portal`, page-title `Daily Sale Report`, có `Report Date`, `Export`, `Daily Summary`, biểu đồ `… by Hour`, footer phân trang hiển thị.

**TC-RPT-002 · Income Summary tải thành công**
Ưu tiên: Cao · Loại: Chức năng/Giao diện
Các bước: 1. Mở `/report-pages/income-summary`.
Kết quả mong đợi: title `Income Summary | Portal`; có `Report date range`, combobox `Day`, `Total Income Table`; header bảng `Date, Sale, Tip, Tax, Total Payment`.

**TC-RPT-003 · Staff Income tải thành công**
Ưu tiên: Cao · Loại: Chức năng/Giao diện
Các bước: 1. Mở `/report-pages/staff-income`.
Kết quả mong đợi: title đúng; có `Print`, ô tìm placeholder `Search by staff name (on report)...`, switch `Show staff with no income`, nút `Staff Summary`, footer phân trang.

**TC-RPT-004 · Staff Payroll tải và tự gắn `period_id`**
Ưu tiên: Cao · Loại: Chức năng
Các bước: 1. Mở `/report-pages/staff-payroll` (không query).
Kết quả mong đợi: URL được bổ sung `?period_id=<uuid>`; có combobox `Payroll Period`, ô `Search by staff name...`, bảng có dữ liệu.

**TC-RPT-005 · Demo DS Report tải với 4 tab**
Ưu tiên: Trung bình · Loại: Giao diện
Các bước: 1. Mở `/report-pages/demo-ds-report`.
Kết quả mong đợi: title đúng; 4 tab `Daily Sale`, `Income Summary`, `Staff Income`, `Staff Payroll`.

**TC-RPT-006 · Không có lỗi JS khi tải các report**
Ưu tiên: Trung bình · Loại: Chức năng
Các bước: 1. Lắng nghe `pageerror`. 2. Mở lần lượt 5 report, chờ dữ liệu.
Kết quả mong đợi: không có lỗi JS nào.

**TC-RPT-007 · `/report-pages` không slug chuyển về Overview**
Ưu tiên: Thấp · Loại: Điều hướng
Các bước: 1. Mở `/report-pages`.
Kết quả mong đợi: chuyển hướng tới `/overview` của store.

**TC-RPT-008 · API báo cáo lỗi 500 → hiển thị trạng thái lỗi** _(dự kiến FAIL)_
Ưu tiên: Trung bình · Loại: Tiêu cực
Các bước: 1. Vào Overview, mở nhóm Reports. 2. Ép `report_pages/*` và `report_blocks/*` trả 500. 3. Click `Income Summary` (điều hướng phía client).
Kết quả mong đợi: hiển thị thông báo lỗi/thử lại, không còn skeleton.

### Sidebar & điều hướng

**TC-RPT-009 · Nhóm Reports thu gọn mặc định ở màn khác**
Ưu tiên: Trung bình · Loại: Giao diện
Các bước: 1. Mở Overview.
Kết quả mong đợi: `button "Reports"` hiển thị với `aria-expanded="false"`; không link report nào hiển thị.

**TC-RPT-010 · Mở nhóm Reports hiển thị các link report đúng thứ tự & href**
Ưu tiên: Cao · Loại: Điều hướng
Các bước: 1. Overview → click `Reports`.
Kết quả mong đợi: có đủ 4 report dữ liệu (`Daily Sale Report`, `Income Summary`, `Staff Income`, `Staff Payroll`), `Demo DS Report` tùy cấu hình; thứ tự theo `Daily Sale Report, Demo DS Report, Income Summary, Staff Income, Staff Payroll`; href `/pos/<seg>/<id>/report-pages/<slug>`.

**TC-RPT-011 · Click từng link điều hướng tới đúng report**
Ưu tiên: Cao · Loại: Điều hướng
Các bước: 1. Mở nhóm Reports. 2. Lần lượt click từng link report đang hiển thị.
Kết quả mong đợi: URL, `document.title` và page-title đúng cho từng report.

**TC-RPT-012 · Link đang mở được đánh dấu và nhóm tự mở**
Ưu tiên: Trung bình · Loại: Giao diện
Các bước: 1. Mở trực tiếp `staff-income`.
Kết quả mong đợi: nhóm `Reports` `aria-expanded="true"`; link `Staff Income` có `aria-current="page"`, các link khác thì không.

**TC-RPT-013 · Thu gọn nhóm Reports**
Ưu tiên: Thấp · Loại: Giao diện
Các bước: 1. Mở nhóm. 2. Click lại `Reports`.
Kết quả mong đợi: khi mở có ≥ 4 link hiển thị; sau khi thu gọn `aria-expanded="false"`, các link ẩn đi.

**TC-RPT-014 · `View All` ở Today's Summary mở Income Summary**
Ưu tiên: Cao · Loại: Điều hướng
Các bước: 1. Overview → click `View All` (href `…/report-pages/income-summary`).
Kết quả mong đợi: tới Income Summary, page-title `Income Summary`.

**TC-RPT-015 · Màn cũ mang nhãn `Income Reports (Legacy)`**
Ưu tiên: Thấp · Loại: Giao diện
Kết quả mong đợi: link `Income Reports (Legacy)` hiển thị, href `/pos/<seg>/<id>/income`.

### Daily Sale — bộ chọn ngày, KPI & biểu đồ

**TC-RPT-016 · `Report Date` mặc định Today, lịch 1 tháng, hôm nay được chọn**
Ưu tiên: Trung bình · Loại: Giao diện
Các bước: 1. Mở Daily Sale. 2. Click `Report Date`. 3. Nhấn Esc.
Kết quả mong đợi: nhãn `Today`, `aria-haspopup="dialog"`; popover có 1 lưới tháng, nút ngày `Today, …, selected`, nút `Go to the Previous Month`; Esc đóng popover.

**TC-RPT-017 · Chọn ngày quá khứ**
Ưu tiên: Cao · Loại: Chức năng
Các bước: 1. Mở lịch. 2. Click ngày hôm qua.
Kết quả mong đợi: URL `after=<ngày>&before=<ngày>`; nhãn `Mmm d, yyyy`; popover đóng; dữ liệu tải lại.

**TC-RPT-018 · Deep-link `after/before` giữ sau reload**
Ưu tiên: Trung bình · Loại: Chức năng
Các bước: 1. Mở với `?after=X&before=X`. 2. Reload.
Kết quả mong đợi: nhãn và param giữ nguyên ngày X.

**TC-RPT-019 · Chuyển tháng trước/sau trong lịch**
Ưu tiên: Thấp · Loại: Giao diện
Kết quả mong đợi: caption đổi khi bấm `Go to the Previous Month`, quay lại đúng tháng khi bấm `Go to the Next Month`.

**TC-RPT-020 · Ngày tương lai → trạng thái rỗng sạch**
Ưu tiên: Trung bình · Loại: Biên
Các bước: 1. Mở với ngày +7.
Kết quả mong đợi: `No rows for this date range.`, `Showing 0 to 0 of 0 results`, `Total Orders` = 0, `Total Payment` = `$0.00`.

**TC-RPT-021 · 4 KPI tile đúng thứ tự & định dạng**
Ưu tiên: Trung bình · Loại: Giao diện/Dữ liệu
Kết quả mong đợi: thứ tự `Total Orders, Sale Income, Total Tip, Total Payment`; giá trị số đếm/tiền đúng định dạng; có `±N% vs …`.

**TC-RPT-022 · Nhãn so sánh `vs Yesterday` / `vs <Mmm d>`**
Ưu tiên: Thấp · Loại: Giao diện
Kết quả mong đợi: hôm nay → `vs Yesterday`; ngày 2020-01-01 → `vs Dec 31`.

**TC-RPT-023 · Click KPI tile đổi metric & biểu đồ**
Ưu tiên: Cao · Loại: Chức năng
Các bước: 1. Lần lượt click 4 tile.
Kết quả mong đợi: tile được chọn có `data-selected="true"`; tiêu đề `<KPI> by Hour`; `?metric=` đổi (4 giá trị khác nhau; `Total Tip` → `dailySaleTip`).

**TC-RPT-024 · Trục giờ của biểu đồ có 24 mốc**
Ưu tiên: Thấp · Loại: Giao diện
Kết quả mong đợi: 24 nhãn từ `12 AM` tới `11 PM`.

**TC-RPT-025 · `metric` không hợp lệ**
Ưu tiên: Thấp · Loại: Tiêu cực
Các bước: 1. Mở với `?metric=bogus`.
Kết quả mong đợi: vùng biểu đồ hiện `No Metric Selected`, không tile nào được chọn.

### Daily Sale — bảng Order Details & panel

> Các case cần dữ liệu dùng hôm nay; nếu hôm nay chưa có order thì dùng hôm qua, nếu cả hai rỗng thì skip.

**TC-RPT-026 · Bảng 5 cột đúng thứ tự**
Ưu tiên: Trung bình · Loại: Giao diện
Kết quả mong đợi: `Order #, Sale/Refund, Tax, Tip, Total`.

**TC-RPT-027 · Định dạng mã order & tiền**
Ưu tiên: Trung bình · Loại: Dữ liệu
Kết quả mong đợi: ≤ 30 dòng; mã `#ODyymmdd-nnnnnnnn` (có thể kèm ` (Refund)`) là button; 4 cột tiền đúng định dạng.

**TC-RPT-028 · Total = Sale/Refund + Tax + Tip**
Ưu tiên: Trung bình · Loại: Dữ liệu
Kết quả mong đợi: đúng trên mọi dòng của trang (sai số ≤ 1 cent).

**TC-RPT-029 · Phân trang Next/Previous**
Ưu tiên: Trung bình · Loại: Chức năng
Các bước: 1. Kiểm tra `Previous` disabled ở trang 1. 2. `Next`. 3. `Previous`.
Kết quả mong đợi: `?page=2`, footer `Showing 31 to 60 of N results`, `2 / y`, dòng đầu khác trang 1; quay lại `1 / y`.

**TC-RPT-030 · Click mã order mở dialog chi tiết**
Ưu tiên: Cao · Loại: Chức năng
Kết quả mong đợi: dialog `Order detail #OD…` đúng mã, có `Order Information`, `Service Details`, `Payment Details`, `Activity Log`; URL không đổi; Esc đóng.

**TC-RPT-031 · Panel INCOME DETAIL**
Ưu tiên: Trung bình · Loại: Dữ liệu
Kết quả mong đợi: đủ 4 dòng; header = Total Payment = Sale + Tip + Tax Collected; trigger thu gọn/mở lại được (`aria-expanded`).

**TC-RPT-032 · Panel PAYMENT DETAIL cộng đúng**
Ưu tiên: Trung bình · Loại: Dữ liệu
Kết quả mong đợi: Card + Cash + Others = Amount Collected; Amount Collected + Gift Card Redemption = Total Payment.

**TC-RPT-033 · KPI Total Payment khớp hai panel**
Ưu tiên: Trung bình · Loại: Dữ liệu
Kết quả mong đợi: giá trị KPI `Total Payment` = header INCOME DETAIL = header PAYMENT DETAIL.

**TC-RPT-034 · `page` vượt phạm vi được kẹp** _(dự kiến FAIL)_
Ưu tiên: Thấp · Loại: Biên
Các bước: 1. Mở `?page=99`.
Kết quả mong đợi: về trang hợp lệ (không hiển thị `99 / 1`).

### Income Summary

**TC-RPT-035 · Trạng thái mặc định**
Ưu tiên: Trung bình · Loại: Giao diện
Kết quả mong đợi: nhãn range = ngày hôm nay, combobox `Day`, panel `No Row Selected` + `Pick a row on the left to see its breakdown.`

**TC-RPT-036 · Chọn khoảng ngày bằng lịch**
Ưu tiên: Cao · Loại: Chức năng
Các bước: 1. Mở lịch. 2. Click ngày 1 của tháng. 3. Click hôm qua. 4. Esc.
Kết quả mong đợi: sau bước 2 `after` đổi; sau bước 3 `after/before` đúng; nhãn `Mmm d, yyyy - Mmm d, yyyy`; số dòng = số ngày.

**TC-RPT-037 · Combobox có Day/Week/Month**
Ưu tiên: Thấp · Loại: Giao diện
Kết quả mong đợi: 3 option đúng thứ tự.

**TC-RPT-038 · Chọn Week**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: `period=weekly`, nhãn dòng `Week N (Mmm d – Mmm d, yyyy)`.

**TC-RPT-039 · Chọn Month**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: `period=monthly`, nhãn dòng `Mmm yyyy`.

**TC-RPT-040 · Legend biểu đồ**
Ưu tiên: Thấp · Loại: Giao diện
Kết quả mong đợi: `Gross Income`, `Net Income`, `Total Tip` (img legend icon).

**TC-RPT-041 · Bảng 5 cột, định dạng ngày & tiền**
Ưu tiên: Trung bình · Loại: Dữ liệu
Các bước: 1. Mở với 7 ngày gần nhất (đến hôm qua).
Kết quả mong đợi: header đúng; `Showing 1 to 7 of 7 results`; cột Date `Mmm d, yyyy`, 4 cột tiền đúng định dạng.

**TC-RPT-042 · Total Payment = Sale + Tip + Tax**
Ưu tiên: Trung bình · Loại: Dữ liệu
Kết quả mong đợi: đúng trên mọi dòng.

**TC-RPT-043 · Click dòng mở breakdown 5 nhóm**
Ưu tiên: Cao · Loại: Chức năng
Kết quả mong đợi: `No Row Selected` biến mất; 5 nhóm `PAYMENT DETAILS … SALON EARNINGS` hiển thị; dòng được tô nền; URL không đổi.

**TC-RPT-044 · Breakdown khớp số liệu dòng**
Ưu tiên: Trung bình · Loại: Dữ liệu
Kết quả mong đợi: header và dòng `Total Payment` của PAYMENT DETAILS = Total Payment của dòng; header SALE DETAILS = dòng `Total Payment` trong nhóm. (Độ lệch giữa SALE DETAILS và PAYMENT DETAILS — bất thường #9 — chưa khóa thành assertion.)

**TC-RPT-045 · Sort Date 3 trạng thái**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: none → `sorted ascending` (`blockSort` `date:asc`, `th[aria-sort=ascending]`) → `sorted descending` (`date:desc`, dòng đầu là ngày mới nhất) → none (bỏ khỏi `blockSort`).

**TC-RPT-046 · Sort cột số bắt đầu giảm dần**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: click `Sale` → `sorted descending`, giá trị cột Sale giảm dần.

**TC-RPT-047 · Deep-link period + range giữ sau reload**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: combobox `Month`, `period=monthly`, nhãn dòng dạng tháng.

**TC-RPT-048 · Range ngược** _(dự kiến FAIL)_
Ưu tiên: Thấp · Loại: Tiêu cực
Các bước: 1. Mở với `after` > `before` (7 ngày).
Kết quả mong đợi: hệ thống đảo lại khoảng (7 dòng) hoặc báo lỗi rõ ràng.

### Staff Income

**TC-RPT-049 · Trạng thái mặc định**
Ưu tiên: Trung bình · Loại: Giao diện
Kết quả mong đợi: range = hôm nay, switch tắt, search rỗng, tiêu đề `By Staff`, 6 cột đúng thứ tự, `STAFF SUMMARY` mở (`aria-expanded=true`) với 6 mục.

**TC-RPT-050 · Search khớp lọc bảng và summary**
Ưu tiên: Cao · Loại: Chức năng
Các bước: 1. Nhập tên nhân viên ở dòng đầu.
Kết quả mong đợi: `search=<tên>`; mọi dòng chứa từ khóa; `Total Staff` = số kết quả.

**TC-RPT-051 · Search không phân biệt hoa thường / khớp một phần**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: nhập 3 ký tự đầu viết HOA vẫn tìm thấy nhân viên đó.

**TC-RPT-052 · Search không khớp**
Ưu tiên: Trung bình · Loại: Tiêu cực
Kết quả mong đợi: `No rows for this date range.`, `Showing 0 to 0 of 0 results`, summary `Total Staff 0`, `Total Income $0.00`.

**TC-RPT-053 · Xóa search khôi phục danh sách**
Ưu tiên: Thấp · Loại: Chức năng
Kết quả mong đợi: footer quay về như ban đầu, `search` bị bỏ khỏi URL.

**TC-RPT-054 · Switch `Show staff with no income`**
Ưu tiên: Cao · Loại: Chức năng
Kết quả mong đợi: bật → `aria-checked=true`, `include_no_income=true`, tổng kết quả ≥ trước; tắt → param biến mất, tổng như cũ.

**TC-RPT-055 · Deep-link search + include_no_income**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: ô search có giá trị, switch bật.

**TC-RPT-056 · Sort Staff mặc định tăng dần**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: `Sort by Staff, sorted ascending`; click → `descending`, `blockSort` `{"income-staff":"staffName:desc"}`.

**TC-RPT-057 · Sort Total Income giảm dần**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: `totalIncome:desc`, giá trị cột giảm dần.

**TC-RPT-058 · STAFF SUMMARY = tổng các cột (1 trang)**
Ưu tiên: Trung bình · Loại: Dữ liệu
Kết quả mong đợi: Total Staff = số dòng; Total Orders/Subtotal/Supply Fee/Tip/Income = tổng cột tương ứng.

**TC-RPT-059 · Deep-link range**
Ưu tiên: Thấp · Loại: Chức năng
Kết quả mong đợi: nhãn `Mmm d, yyyy - Mmm d, yyyy` đúng 7 ngày gần nhất.

**TC-RPT-060 · Định dạng cột**
Ưu tiên: Thấp · Loại: Dữ liệu
Kết quả mong đợi: `Orders` là số nguyên, 4 cột tiền đúng định dạng (cho phép âm).

**TC-RPT-106 · Preset khoảng ngày**
Ưu tiên: Trung bình · Loại: Chức năng
Các bước: 1. Mở `Report Date Range preset`. 2. Chọn `Yesterday`.
Kết quả mong đợi: 10 preset đúng thứ tự; `after=before=<hôm qua>`; nhãn range = hôm qua; preset hiển thị `Yesterday`.

### Staff Payroll

**TC-RPT-061 · Mặc định là kỳ hiện tại (live)**
Ưu tiên: Cao · Loại: Chức năng
Kết quả mong đợi: combobox chứa `Current Period (Unclosed)`; `By Staff (live)`; `h3` `(Mmm d, yyyy - Mmm d, yyyy)`; ghi chú `Estimated figures…`; 6 cột `Name … Total Income`.

**TC-RPT-062 · Danh sách kỳ lương**
Ưu tiên: Trung bình · Loại: Giao diện
Kết quả mong đợi: option đầu là kỳ hiện tại; mọi nhãn dạng `Mmm d, yyyy - Mmm d, yyyy`; ngày bắt đầu giảm dần.

**TC-RPT-063 · Chọn kỳ đã đóng**
Ưu tiên: Cao · Loại: Chức năng
Kết quả mong đợi: `period_id` đổi; combobox + `h3` theo kỳ mới; tiêu đề `By Staff` (không live); không còn ghi chú `Estimated figures…`.

**TC-RPT-064 · `period_id` không hợp lệ**
Ưu tiên: Trung bình · Loại: Tiêu cực
Kết quả mong đợi: được thay bằng `period_id` của kỳ hiện tại.

**TC-RPT-065 · Search khớp và không khớp**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: khớp → mọi dòng chứa từ khóa; không khớp → `No rows for this date range.` + footer 0.

**TC-RPT-066 · Sort Name & Orders**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: Name mặc định ascending → descending (`staffName:desc`); Orders → `numberOfOrders:desc`, giảm dần.

**TC-RPT-067 · Phân trang 30 dòng**
Ưu tiên: Thấp · Loại: Chức năng
Kết quả mong đợi: trang 1 có 30 dòng; Next → `page=2`, `Showing 31 to 60 of N results`.

**TC-RPT-068 · Click dòng mở phiếu lương**
Ưu tiên: Cao · Loại: Chức năng
Các bước: 1. Sort Orders giảm dần. 2. Click dòng đầu.
Kết quả mong đợi: panel có tên, bảng `DATE | SALE | REFUND | SUPPLY FEE | TIP`, đủ các mục lương (Sale … Pay 2), nút `Print`, `Thank you, <Tên>!`.

**TC-RPT-069 · Số học phiếu lương**
Ưu tiên: Trung bình · Loại: Dữ liệu
Kết quả mong đợi: Subtotal = Sale − Refund; Pay 1 + Pay 2 = Total Income.

**TC-RPT-070 · Không có placeholder template chưa render**
Ưu tiên: Trung bình · Loại: Giao diện
Kết quả mong đợi: không xuất hiện chuỗi dạng `{row.xxx}` (từng thấy `({row.rowPay1Base} x {row.rowPay1Rate})`, đã sửa — regression guard).

**TC-RPT-071 · Total Income của dòng = Total Income của phiếu lương**
Ưu tiên: Trung bình · Loại: Dữ liệu
Kết quả mong đợi: hai giá trị bằng nhau.

**TC-RPT-107 · Nhân viên không có số liệu**
Ưu tiên: Thấp · Loại: Biên
Các bước: 1. Click một dòng toàn 0.
Kết quả mong đợi: `This staff has no figures for the selected period yet.`, không có nút `Print`, vẫn có `Thank you, <Tên>!`.

### Demo DS Report

**TC-RPT-072 · 4 tab, Daily Sale được chọn mặc định**
Ưu tiên: Thấp · Loại: Giao diện
Kết quả mong đợi: tab 1 `aria-selected=true`, các tab còn lại `false`.

**TC-RPT-073 · Chuyển tab cập nhật `?tab=`**
Ưu tiên: Thấp · Loại: Chức năng
Kết quả mong đợi: tab được chọn; `tab` nhận 4 giá trị khác nhau (Daily Sale = `daily-sale`); tab Staff Payroll gắn `period_id`.

**TC-RPT-074 · Bảng demo 6 cột & dòng tổng**
Ưu tiên: Thấp · Loại: Giao diện
Kết quả mong đợi: `Order #, Sale, Refund, Tax, Tip, Total`; có `Total · N rows` khi có dữ liệu.

**TC-RPT-075 · Sort Total của demo**
Ưu tiên: Thấp · Loại: Chức năng
Kết quả mong đợi: `sorted descending`, `blockSort` có key `demo-ds-order-details`.

### Export & Print

**TC-RPT-076 · Menu Export trên 4 report**
Ưu tiên: Trung bình · Loại: Giao diện
Kết quả mong đợi: `aria-haspopup="menu"`; menu `Download CSV`, `Download Excel`; Esc đóng menu.

**TC-RPT-077 · Daily Sale CSV**
Ưu tiên: Cao · Loại: Chức năng
Các bước: 1. Mở ngày hôm qua. 2. `Export` → `Download CSV`.
Kết quả mong đợi: tên `income-daily-sale-<d>-<d>.csv`; header `Order #,Sale/Refund,Tax,Tip,Total`; mỗi dòng bắt đầu bằng mã order.

**TC-RPT-078 · Daily Sale Excel**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: tên `income-daily-sale-<d>-<d>.xlsx`; file zip bắt đầu `PK`, > 1KB.

**TC-RPT-079 · Income Summary CSV**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: tên `income-summary-<after>-<before>.csv`; header đúng; 7 dòng cho 7 ngày.

**TC-RPT-080 · Staff Income CSV**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: tên `income-staff-<hôm nay>-<hôm nay>.csv`; header đúng; số dòng = min(tổng, 30).

**TC-RPT-081 · Staff Payroll CSV (kỳ hiện tại)**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: tên `payroll-live-by-staff-<ngày>-<ngày>.csv`; header `Name,Orders,Subtotal,Supply Fee,Tip,Total Income`.

**TC-RPT-082 · Tên file Staff Payroll theo kỳ đã chọn** _(dự kiến FAIL)_
Ưu tiên: Thấp · Loại: Dữ liệu
Kết quả mong đợi: tên file chứa ngày bắt đầu/kết thúc của kỳ đang chọn.

**TC-RPT-083 · Export chứa toàn bộ kết quả** _(dự kiến FAIL)_
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: số dòng CSV = tổng kết quả (không chỉ 30 dòng của trang hiện tại).

**TC-RPT-084 · Print phiếu lương Staff Payroll**
Ưu tiên: Cao · Loại: Chức năng
Các bước: 1. Cài spy `print()`. 2. Sort Orders, mở phiếu lương dòng đầu. 3. Click `Print`.
Kết quả mong đợi: `print()` được gọi đúng 1 lần, nội dung in chứa tên nhân viên và `Total Income`.

**TC-RPT-085 · Print Staff Income**
Ưu tiên: Trung bình · Loại: Chức năng
Kết quả mong đợi: `print()` được gọi 1 lần, nội dung in có `By Staff` và cột `TOTAL INCOME`.

**TC-RPT-086 · Export/Print không gửi request ghi**
Ưu tiên: Trung bình · Loại: Bảo mật/Chức năng
Kết quả mong đợi: không có POST/PUT/PATCH/DELETE tới data host khi tải CSV, Excel và Print.

### Tiêu cực & biên

**TC-RPT-087 · Slug không tồn tại** _(dự kiến FAIL)_
Ưu tiên: Trung bình · Loại: Tiêu cực
Kết quả mong đợi: thông báo not-found rõ ràng, `document.title` không rỗng.

**TC-RPT-088 · `after/before` không phải ngày** _(dự kiến FAIL)_
Ưu tiên: Trung bình · Loại: Tiêu cực
Kết quả mong đợi: rơi về ngày mặc định và hiển thị dữ liệu; không hiện `This merchant is not available.`

**TC-RPT-089 · Ngày sai lịch `2026-13-45`** _(dự kiến FAIL)_
Ưu tiên: Thấp · Loại: Tiêu cực
Kết quả mong đợi: bị từ chối/thay thế; không có nhãn `Invalid Date`.

**TC-RPT-090 · Ngày rất cũ 2020-01-01**
Ưu tiên: Thấp · Loại: Biên
Kết quả mong đợi: nhãn `Jan 1, 2020`, `No rows for this date range.`, footer 0.

**TC-RPT-091 · Payload XSS trong ô search**
Ưu tiên: Cao · Loại: Bảo mật
Kết quả mong đợi: không có dialog `alert`, không có `img[src=x]` trong DOM, giá trị được giữ nguyên dạng text, kết quả rỗng.

**TC-RPT-092 · Search 200 ký tự & ký tự đặc biệt**
Ưu tiên: Thấp · Loại: Biên
Kết quả mong đợi: trạng thái rỗng, trang không vỡ, không lỗi JS, không hiện màn lỗi merchant.

### Responsive

**TC-RPT-093 · 390px: không cuộn ngang, Export truy cập được**
Ưu tiên: Trung bình · Loại: Responsive
Kết quả mong đợi: trên 4 report `scrollWidth ≤ innerWidth`; `Export` và page-title hiển thị; footer dạng rút gọn `a-b of N`.

**TC-RPT-094 · 390px: drawer sidebar → Reports → điều hướng**
Ưu tiên: Trung bình · Loại: Responsive
Kết quả mong đợi: nút toggle mở drawer; mở nhóm Reports, click `Staff Payroll` tới đúng trang.

**TC-RPT-095 · 768px: bảng & panel Income Summary**
Ưu tiên: Thấp · Loại: Responsive
Kết quả mong đợi: bảng và `No Row Selected` hiển thị, không tràn ngang.

### Khả năng tiếp cận

**TC-RPT-096 · Header sort có tên & `aria-sort`**
Ưu tiên: Trung bình · Loại: Khả năng tiếp cận
Kết quả mong đợi: 6 nút `Sort by …`; `th[aria-sort]` phản ánh ascending/descending/none.

**TC-RPT-097 · Switch & ô search có accessible name**
Ưu tiên: Trung bình · Loại: Khả năng tiếp cận
Kết quả mong đợi: `switch "Show staff with no income"`, `textbox "Search by staff name…"`, `Report date range`, `Export` đều có tên.

**TC-RPT-098 · Điều hướng bàn phím**
Ưu tiên: Trung bình · Loại: Khả năng tiếp cận
Kết quả mong đợi: Tab từ ô search: preset → date range → switch → Export → `Sort by Staff` → `Sort by Orders`; Enter trên `Sort by Orders` sắp xếp giảm dần.

**TC-RPT-099 · KPI tile dùng được bằng bàn phím**
Ưu tiên: Thấp · Loại: Khả năng tiếp cận
Kết quả mong đợi: `role="button"`, `tabindex="0"`; focus + Enter chọn tile và đổi `metric`.

**TC-RPT-100 · Tên report là heading** _(dự kiến FAIL)_
Ưu tiên: Thấp · Loại: Khả năng tiếp cận
Kết quả mong đợi: có `heading` mang tên report.

### Hiệu năng

**TC-RPT-101 · Mỗi report hiển thị dữ liệu trong ngưỡng DEV**
Ưu tiên: Trung bình · Loại: Hiệu năng
Kết quả mong đợi: từ lúc `goto` đến khi bảng có dữ liệu < 20s cho từng report (ghi ms vào annotation).

**TC-RPT-102 · Sort phản hồi ≤ 5s**
Ưu tiên: Thấp · Loại: Hiệu năng
Kết quả mong đợi: click sort → bảng render lại trong < 5s.

### Bảo mật

**TC-RPT-103 · Chưa đăng nhập → `/login?redirect=`**
Ưu tiên: Cao · Loại: Bảo mật
Kết quả mong đợi: chuyển tới `/login?redirect=<route report>`, không có dòng dữ liệu.

**TC-RPT-104 · Store không thuộc tài khoản**
Ưu tiên: Cao · Loại: Bảo mật
Các bước: 1. Mở `/pos/nail/99999/report-pages/daily-sale-report`.
Kết quả mong đợi: `This merchant is not available.`, không có dòng nào.

**TC-RPT-105 · Session hết hạn giữa chừng**
Ưu tiên: Trung bình · Loại: Bảo mật
Các bước: 1. Ở Overview mở nhóm Reports. 2. Ép data host trả 401. 3. Click `Staff Income`.
Kết quả mong đợi: chuyển về `/login`.

## Tổng kết độ phủ (Coverage summary)

Tổng: **107 test case** (TC-RPT-001 … 107), tất cả đã có code — 98 case kiểm chứng hành vi đúng, 9 case `test.fail` (bug sản phẩm đã biết, vẫn chạy thật), 0 `test.fixme`.

### Theo khu vực

| Khu vực                         | ID           | Số lượng | Spec                                  |
| ------------------------------- | ------------ | -------- | ------------------------------------- |
| Tải trang & bố cục              | 001–008      | 8        | `page-load-layout.e2e.spec.ts`        |
| Sidebar & điều hướng            | 009–015      | 7        | `sidebar-navigation.e2e.spec.ts`      |
| Daily Sale — ngày, KPI, biểu đồ | 016–025      | 10       | `daily-sale-date-kpi.e2e.spec.ts`     |
| Daily Sale — bảng & panel       | 026–034      | 9        | `daily-sale-table-panels.e2e.spec.ts` |
| Income Summary                  | 035–048      | 14       | `income-summary.e2e.spec.ts`          |
| Staff Income                    | 049–060, 106 | 13       | `staff-income.e2e.spec.ts`            |
| Staff Payroll                   | 061–071, 107 | 12       | `staff-payroll.e2e.spec.ts`           |
| Demo DS Report                  | 072–075      | 4        | `demo-ds.e2e.spec.ts`                 |
| Export & Print                  | 076–086      | 11       | `export-print.e2e.spec.ts`            |
| Tiêu cực & biên                 | 087–092      | 6        | `negative-edge.e2e.spec.ts`           |
| Responsive                      | 093–095      | 3        | `responsive.e2e.spec.ts`              |
| Khả năng tiếp cận               | 096–100      | 5        | `accessibility.e2e.spec.ts`           |
| Hiệu năng & bảo mật             | 101–105      | 5        | `performance-security.e2e.spec.ts`    |

### Theo mức ưu tiên

| Ưu tiên    | Số lượng |
| ---------- | -------- |
| Cao        | 22       |
| Trung bình | 57       |
| Thấp       | 28       |

### Case dự kiến FAIL — theo dõi bug sản phẩm

| ID         | Vấn đề                                                                               |
| ---------- | ------------------------------------------------------------------------------------ |
| TC-RPT-008 | API báo cáo 500 → skeleton vô hạn, không có thông báo lỗi                            |
| TC-RPT-034 | `page=99` hiển thị `99 / 1` + bảng rỗng                                              |
| TC-RPT-048 | Range ngược được chấp nhận, trả 0 dòng, không báo lỗi                                |
| TC-RPT-082 | Tên file Export Staff Payroll luôn là `<đầu tháng>-<hôm nay>`, không theo kỳ đã chọn |
| TC-RPT-083 | Export chỉ xuất 30 dòng của trang hiện tại                                           |
| TC-RPT-087 | Slug không tồn tại → trang trắng, title rỗng                                         |
| TC-RPT-088 | `after=garbage` → `This merchant is not available. Invalid time value`               |
| TC-RPT-089 | `after=2026-13-45` → nhãn `Invalid Date - …`, bảng trống                             |
| TC-RPT-100 | Tên report không phải heading (không có `h1`–`h6`)                                   |

Các case này dùng `test.fail(...)`: chạy thật và **xanh khi bug còn tồn tại**; khi bug được sửa, Playwright báo "Expected to fail, but passed" → bỏ dòng `test.fail` để biến chúng thành regression guard (như đã làm với TC-RPT-070).

### Phần chưa chắc chắn / cần xác minh trực tiếp

- **DEV thay đổi trong lúc kiểm thử:** trong cùng ngày 2026-10-13, Daily Sale mất nút `Print` và có thêm nút `Today`, Staff Income có thêm preset khoảng ngày, Export bị disable khi rỗng, placeholder Pay 1 được sửa. Đây là trang báo cáo **cấu hình được** (Report Configuration) — mọi thay đổi cấu hình trên DEV có thể làm lệch locator/nhãn.
- **Dữ liệu sống:** Daily Sale “hôm nay” có lúc 313 order rồi về 0 trong cùng ngày (trong khi Staff Income/Income Summary cùng ngày vẫn có số liệu) — nghi do thay đổi cấu hình nguồn dữ liệu; các case Daily Sale cần dữ liệu tự lùi về hôm qua, skip nếu cả hai ngày rỗng.
- **TC-RPT-082:** nếu kỳ lương hiện tại bắt đầu đúng ngày 1 của tháng thì tên file sẽ “đúng tình cờ” → case báo “Expected to fail, but passed”.
- **Bất thường #9 và #13** (lệch SALE DETAILS vs PAYMENT DETAILS; order ngày trước trong CSV) cần BA xác nhận trước khi khóa thành assertion.
- **Ngưỡng hiệu năng** 20s/5s là ngưỡng cho DEV dùng chung, cần thống nhất với team.
- **Phân quyền theo role** chưa phủ: project chỉ có storageState admin.

## Lịch sử chạy

### 2026-10-13 (UTC+7) — ENV=stage

- Lệnh: `ENV=stage npx playwright test tests/e2e/reports --workers=6` (headless, `https://v2.dev-fastboypay.com`, store 14)
- Kết quả lần chạy cuối: **107/107 pass** (+ project `setup`), 0 fail, 0 skip, 0 fixme — trong đó 98 case kiểm chứng hành vi đúng và 9 case `test.fail` xác nhận bug sản phẩm còn tồn tại (TC-RPT-008, 034, 048, 082, 083, 087, 088, 089, 100).
- Các lần chạy trước trong ngày: fail do **DEV thay đổi giữa chừng** (gỡ `Print` ở Daily Sale, thêm preset ở Staff Income, footer mobile rút gọn `a-b of N`, Daily Sale “hôm nay” về 0 order, `Demo DS Report` bị gỡ khỏi sidebar, placeholder Pay 1 được sửa) → đã cập nhật locator/kỳ vọng; 1 lần flaky môi trường (TC-RPT-062: sidebar hydrate > 30s khi 6 worker) → tăng ngân sách chờ shell lên 45s.
- Report chi tiết: `npm run report` (reports/html)
