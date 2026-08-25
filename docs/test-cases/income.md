# Income Reports — Test Case

- **Màn hình:** Income Reports (Báo cáo doanh thu)
- **Route:** `/pos/<storeId>/income` (vd: `/pos/14/income`) — tự redirect sang `?tab=daily`
- **Ngày quét:** 2026-08-21
- **Nguồn:** `docs/test-cases/_scan/income.json`, `income-tab-summary.json`, `income-tab-staff.json`, `income-interactions*.txt`

## Kiểm kê tính năng (Feature inventory)

### Chrome chung

- **Rail icon ngoài cùng bên trái:** 4 nút không nhãn chữ, aria-label `POS`, `Payment`, `Business`, `Gift Card`.
- **Sidebar:** nút chuyển store `Volt POS 14 Dev#14` (`aria-haspopup="dialog"`), link `FastboyPay home` → `/`, và 3 nhóm menu:
  - **Operations:** Overview `/pos/14/overview`, Orders `/pos/14/orders`, Batch History `/pos/14/batch`, **Income Reports** `/pos/14/income` (active), Payroll `/pos/14/payroll`
  - **Management:** Staffs `/pos/14/staffs`, Services `/pos/14/services`, Customers `/pos/14/customers`, Settings `/pos/14/setting`
  - **Internal:** Merchants `/pos/merchants`, Onboarding `/pos/onboarding`, Packages `/pos/admin/packages`, All Orders `/pos/admin/orders`, Devices `/pos/admin/devices`, Monitor `/pos/admin/monitor`, Versions `/pos/admin/versions`, Settings `/pos/admin/setting`
- **Nút `Open user menu`** (avatar chữ "K", `aria-haspopup="menu"`), nút `Toggle Sidebar` (chỉ hiện ở màn hình hẹp).
- **Tiêu đề tài liệu:** `Income Reports | Portal`. Chữ "Income Reports" hiển thị trên trang **không** nằm trong thẻ `h1`–`h6` (scan đếm được 0 heading).
- **Không có `data-testid` nào trên toàn màn hình** (0 test-id) → selector phải dựa vào role/text/placeholder.

### 3 tab (`role="tab"`, thẻ `button`)

`Daily Sale Report` (mặc định) · `Income Summary` · `Staff Income`

### Query param theo tab

| Tab               | Param                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Daily Sale Report | `tab=daily`, `date=YYYY-MM-DD`, `stat=totalOrders\|saleIncome\|totalTip\|totalPayment`, `page`         |
| Income Summary    | `tab=summary`, `period=day\|week\|month`, `dateAfter`, `dateBefore`, `selectedDate=YYYY-MM-DD`, `page` |
| Staff Income      | `tab=staff`, `dateAfter`, `dateBefore`, `showStaffNoIncome=true`, `search`, `page`                     |

Hành vi làm sạch param đã quan sát: `tab=bogus` → về `?tab=daily`; `date=not-a-date` → bỏ hẳn param; `period=bogus` → về `?tab=summary` (mặc định Day).

### Tab 1 — Daily Sale Report

- **Bộ chọn ngày:** một nút `aria-haspopup="dialog"`, nhãn là `Today` khi đang ở hôm nay, ngược lại là ngày đã chọn (vd `Aug 18, 2026`). Popover là lịch **1 tháng** (`August 2026`, hàng thứ `Su Mo Tu We Th Fr Sa`), chọn **một ngày duy nhất** → `date=2026-08-18`. **Tab này KHÔNG có nút "Clear filters"** (đã kiểm chứng cả khi ngày khác hôm nay).
- **Card biểu đồ:** tiêu đề `Sale Income by Hour`, legend `Sale`, trục X theo giờ (`9 AM` → `7 PM`), trục Y tiền tệ với thang tự co giãn (`$0 $400 $800 $1.2K $1.6K` hoặc `-$70 -$35 $0 $35 $70`). Hover cột hiện tooltip dạng `Sale $1,490.68`. Cột âm (refund) tô đỏ, cột dương tô xanh.
- **4 KPI card** — mỗi card là một `button` chứa: tên, giá trị, badge % chênh lệch, chữ `vs Yesterday`; kèm một nút info riêng `About <tên>`. Bấm card → set `stat=` và **đổi luôn biểu đồ** (vd `stat=totalTip` → tiêu đề `Total Tip by Hour`, legend `Total Tips`, empty state `No total tip recorded for this day yet.`).
  - `Total Orders` — tooltip: "Total number of orders (exclude refunds, and manual refunds)."
  - `Sale Income` — tooltip: "Total sale amount of the order, including refund/partial refund values after discount is applied, excluding Tax and Tip."
  - `Total Tip` — tooltip: "Total tips received, not included in sales revenue but counted in collected amounts."
  - `Total Payment` — tooltip: "The final revenue includes Gift Card Redemption."
- **Card `Order Details`** + số lượng `<N> orders`. Bảng cột: `ORDER #`, `SALE/REFUND`, `TAX`, `TIP`, `TOTAL`. Dòng refund có hậu tố `(Refund)`, giá trị âm, dòng tô đỏ/highlight. Mã order **trông như link nhưng không phải thẻ `<a>`** (scan đếm 0 link trong bảng) — click vào dòng mới mở chi tiết.
- **Dialog `Order detail #OD…`** khi click dòng: badge trạng thái (vd `Refunded`), các khối `Order Information` (Order ID, Order Date kèm `(UTC+7)`, Merchant, WHMCS ID, Customer / `No customer is available`, Order Note / `No note is available.`), `Service Details` (`Last updated: …`, cột `STAFF / SERVICE` + `PRICE`, dòng `Items subtotal`), `Payment Details` (`1 payment`, `Cash` `Successful`, `Received: $68.22 · Change: $0.00`), `Activity Log` (`Times in UTC+7`, sub-tab `All` `Order` `Item` `Tender` `Tip` `Gateway` `JSON`).
- **Rail phải:**
  - `INCOME DETAIL` + tổng; các dòng `Sale`, `Tip`, `Tax Collected`, `Total Payment`.
  - `PAYMENT DETAIL` + tổng; các dòng `Card`, `Cash`, `Others`, `Amount Collected`, `Gift Card Redemption`, `Total Payment`.
  - Cả hai có icon chevron gợi ý thu gọn được, **nhưng không tìm thấy phần tử có role button** → cần xác minh trực tiếp.
- **Phân trang:** `Showing 1 to N of M results`, `Previous`, chỉ số `1 / 1`, `Next`; disable ở biên.

### Tab 2 — Income Summary

- **Nút chọn khoảng ngày** (`aria-haspopup="dialog"`), nhãn dạng `Aug 1, 2026 - Aug 21, 2026`; mặc định là `Today`. → `dateAfter`/`dateBefore`.
- **Combobox `Income period`** (`role="combobox"`, `aria-label="Income period"`, text hiển thị = giá trị hiện tại vd `Day`). Options `role="option"`: `Day` (mặc định, `aria-selected="true"`), `Week`, `Month`.
- **Nút `Clear filters`** — xuất hiện khi filter khác mặc định.
- **Biểu đồ** legend 4 series: `Total Income`, `Gross Income`, `Net Income`, `Total Tip`.
- **Bảng `Total Income Table`** + số bản ghi (`1 entry` / `21 entries`). Cột: `DATE`, `SALE`, `TIP`, `TAX`, `TOTAL PAYMENT`. Nhãn cột DATE đổi theo period:
  - `Day` → `Aug 21, 2026`
  - `Week` → `Week 23 (Jun 1 – Jun 7, 2026)`
  - `Month` → `Jun 2026`
- **Panel phải mặc định:** `No row selected` + `Select a date, week, or month from the Total Income Table to view its summary.`
- **Click một dòng** → `selectedDate=2026-08-01`, panel phải render bảng phân tích rất chi tiết:
  - Tổng đầu panel + `TOTAL PAYMENT`
  - `SALE DETAILS`: Total Sale, Service Sale, Product Sale, Gift Card Sale, Total Refund, Service Refund, Product Refund, Subtotal, Total Discount, Discount, Discount Reversed, Service Fee, Cash Discount, Net Total, Tip, Tax Collected, TOTAL PAYMENT
  - `SUPPLY FEE`: Total Supply Fee, Staff Supply Share, Salon Supply Share
  - `STAFF PAYOUT`: Total Service, Staff Supply Share, Staff Commission, Tip, Clean up fee, Staff Discount Charge, Staff Card Charge Commission, Staff Card Charge Tip, Staff Salary, TOTAL STAFF PAYOUT
  - `SPLIT PAY`: Pay 1, Pay 2
  - `SALON EARNINGS`: Total Service, Salon Supply Share, Salon Commission, Product Sale, Product Refund, Total Discount, Discount, Discount Reversed, Service Fee, Cash Discount, Net Earnings, Staff Supply Share, Clean up fee, Staff Discount Charge, Staff Card Charge Commission, Staff Card Charge Tip, Staff Salary, TOTAL EARNINGS
  - `Tax Collected`

### Tab 3 — Staff Income

- **Nút chọn khoảng ngày** (mặc định `Today`) → `dateAfter`/`dateBefore`.
- **Checkbox `Show staff with no income`** — là thẻ `button` với `role="checkbox"` + `aria-checked` → `showStaffNoIncome=true`. Bật lên: 70 → 244 kết quả (thêm các nhân viên 0 order / $0.00).
- **Ô tìm kiếm** placeholder `Search by staff name...` → `search=`; khớp **chuỗi con** (`Erin` khớp cả `Erin` và `Kerin`).
- **Nút `Clear filters`**.
- **Bảng** cột: `STAFF`, `ORDERS`, `SUBTOTAL`, `SUPPLY FEE`, `TIP`, `TOTAL INCOME`. 30 dòng/trang.
- **Phân trang:** `Showing 31 to 60 of 244 results`, `2 / 9`, param `page=2`.
- **Empty state:** `No staff income found.` + `Showing 0 to 0 of 0 results`.
- **Panel `STAFF SUMMARY`:** Total Staff, Total Orders, Total Subtotal, Total Supply Fee, Total Tip, `TOTAL INCOME`.

### Định dạng dữ liệu

- Tiền tệ: `$1,234.56`; số âm `-$68.22`; trục biểu đồ viết tắt `$1.2K`.
- Ngày: `Aug 21, 2026`; khoảng: `Aug 1, 2026 - Aug 21, 2026`; tuần: `Week 23 (Jun 1 – Jun 7, 2026)`; tháng: `Jun 2026`; mốc thời gian: `Aug 20, 2026, 6:22 PM (UTC+7)`.
- Số đếm: có dấu phân cách hàng nghìn (`5,324`).
- Mã order: `#OD` + `YYMMDD` + `-` + 8 chữ số (vd `#OD260821-10899305`).
- Badge chênh lệch: phần trăm có dấu (`-95%`, `-14%`) + chữ `vs Yesterday`.

### Điểm bất thường phát hiện khi quét (cần xác nhận là bug hay thiết kế)

1. **`STAFF SUMMARY` bỏ qua `search`** — với `search=Erin` bảng còn 1 dòng nhưng panel vẫn giữ `Total Staff 70`, `TOTAL INCOME -$471,042.34` của toàn bộ tập theo ngày.
2. **`STAFF SUMMARY` lệch `Total Orders` khi bật toggle** — tắt: `Total Orders 991`; bật `showStaffNoIncome=true`: `Total Orders 1,000`, trong khi `TOTAL INCOME` giữ nguyên `-$471,042.34`. Thêm nhân viên **không có** doanh thu mà tổng số order lại tăng 9.
3. **`page=999`** trên tab Staff: URL giữ nguyên `page=999`, bảng rỗng và bộ đếm trang hiển thị `999 / 1`.
4. **Lỗi tải chunk không ổn định** — một lần khi quét, trang hiện `POS is unavailable right now` + `Failed to fetch dynamically imported module: …/assets/route-*.js` + nút `Try again`.
5. **Không có heading `h1`–`h6`** và **không có `data-testid`** trên cả màn hình.

### Câu hỏi mở (cần xác minh trực tiếp)

- Hai panel `INCOME DETAIL` / `PAYMENT DETAIL` có thực sự thu gọn được không (chevron có tương tác?).
- Kích thước trang của bảng `Order Details` (tab Daily) — đã thấy 24 dòng trên 1 trang, chưa xác định ngưỡng.
- Bộ chọn ngày tab Daily có cho chọn ngày tương lai / có chặn ngày quá xa không.
- Có phân quyền theo role với màn hình này hay không (project hiện chỉ có 1 storageState admin).
- Có nút export/download nào không (chưa phát hiện trên cả 3 tab).

---

## Test case

### Tải trang & bố cục

**TC-INC-001 · Truy cập trực tiếp `/pos/<storeId>/income` load thành công**

- Mức ưu tiên: Cao · Loại: Điều hướng
- Điều kiện tiên quyết: Đã đăng nhập (dùng lại storageState).
- Các bước: 1) Điều hướng tới `/pos/<storeId>/income`. 2) Chờ trang load xong.
- Kết quả mong đợi: Không bị redirect về `/login`; URL tự chuyển thành `/pos/<storeId>/income?tab=daily`; chữ "Income Reports" hiển thị; tab `Daily Sale Report` được chọn.

**TC-INC-002 · Tiêu đề tài liệu đúng**

- Mức ưu tiên: Thấp · Loại: Giao diện
- Các bước: 1) Load màn hình. 2) Đọc `document.title`.
- Kết quả mong đợi: Bằng đúng `Income Reports | Portal`.

**TC-INC-003 · Mọi khu vực chính của tab Daily hiển thị đầy đủ**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Load `?tab=daily`. 2) Kiểm tra: thanh tab, nút chọn ngày, card biểu đồ, card `Order Details`, footer phân trang, 4 KPI card, panel `INCOME DETAIL`, panel `PAYMENT DETAIL`.
- Kết quả mong đợi: Tất cả đều hiện diện, không khu vực nào trống bất thường.

**TC-INC-004 · Hiển thị loading trước khi dữ liệu về**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Điều kiện tiên quyết: Delay response API báo cáo qua route interception.
- Các bước: 1) Delay API. 2) Điều hướng tới màn hình. 3) Quan sát ngay.
- Kết quả mong đợi: Có skeleton/loading indicator thay cho biểu đồ và bảng; không có vùng trắng chưa style, không nhảy layout đột ngột.

**TC-INC-005 · API lỗi thì hiện trạng thái lỗi, không vỡ layout**

- Mức ưu tiên: Cao · Loại: Tiêu cực
- Các bước: 1) Ép API báo cáo trả 500. 2) Load màn hình.
- Kết quả mong đợi: Sidebar/tab vẫn render; vùng dữ liệu hiện thông báo lỗi rõ ràng, không skeleton chạy vô hạn, không trang trắng.

**TC-INC-006 · Lỗi tải chunk hiển thị được và `Try again` phục hồi**

- Mức ưu tiên: Cao · Loại: Tiêu cực
- Điều kiện tiên quyết: Chặn request tới `**/assets/route-*.js` để mô phỏng lỗi dynamic import (đã gặp thật khi quét).
- Các bước: 1) Chặn chunk. 2) Load màn hình. 3) Bỏ chặn. 4) Bấm `Try again`.
- Kết quả mong đợi: Hiện `POS is unavailable right now` kèm nút `Try again`; sau khi bấm, màn hình Income Reports load bình thường.

**TC-INC-007 · Refresh giữ nguyên trạng thái từ URL**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Load `?tab=staff&dateAfter=2026-08-01&dateBefore=2026-08-21&search=Erin`. 2) Nhấn F5.
- Kết quả mong đợi: Sau reload vẫn đúng tab Staff Income, khoảng ngày, ô tìm kiếm còn chữ `Erin`, bảng giữ nguyên kết quả.

**TC-INC-008 · Không có lỗi console khi load**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Các bước: 1) Lắng nghe console. 2) Load lần lượt cả 3 tab.
- Kết quả mong đợi: Không có console error (bỏ qua warning đã biết/nhiễu bên thứ ba).

### Sidebar & điều hướng

**TC-INC-009 · Link `Income Reports` trên sidebar điều hướng đúng và active**

- Mức ưu tiên: Cao · Loại: Điều hướng
- Các bước: 1) Từ Overview, bấm `Income Reports` trên sidebar.
- Kết quả mong đợi: Tới `/pos/<storeId>/income`; mục `Income Reports` có `aria-current`/`data-active` đánh dấu active (không kiểm tra bằng class Tailwind vì mọi link đều chứa `active:`).

**TC-INC-010 · Trạng thái active giữ nguyên sau reload**

- Mức ưu tiên: Trung bình · Loại: Điều hướng
- Các bước: 1) Vào Income Reports. 2) Reload.
- Kết quả mong đợi: `Income Reports` vẫn được đánh dấu active.

**TC-INC-011 · Điều hướng ra màn hình khác rồi quay lại**

- Mức ưu tiên: Trung bình · Loại: Điều hướng
- Các bước: 1) Từ Income Reports, bấm `Orders`. 2) Bấm lại `Income Reports`.
- Kết quả mong đợi: Cả hai lần điều hướng đúng route; Income Reports trở về tab mặc định `?tab=daily`, dữ liệu load lại bình thường.

**TC-INC-012 · Toàn bộ link sidebar trỏ đúng href**

- Mức ưu tiên: Thấp · Loại: Điều hướng
- Các bước: 1) Load màn hình. 2) Đọc `href` của từng link sidebar.
- Kết quả mong đợi: Khớp đúng danh sách trong phần kiểm kê (nhóm Operations/Management/Internal), phần store-scoped dùng đúng `<storeId>` hiện tại.

**TC-INC-013 · Nút chuyển store mở được**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Bấm nút `Volt POS 14 Dev#14`.
- Kết quả mong đợi: Mở dialog/panel chọn store (`aria-expanded` chuyển `true`); đóng lại được bằng Escape.

**TC-INC-014 · Menu user mở được**

- Mức ưu tiên: Thấp · Loại: Chức năng
- Các bước: 1) Bấm `Open user menu`.
- Kết quả mong đợi: Mở menu (`aria-haspopup="menu"`, `aria-expanded=true`); đóng được bằng Escape/click ra ngoài.

**TC-INC-015 · Back/Forward trình duyệt đi qua các trạng thái filter**

- Mức ưu tiên: Trung bình · Loại: Điều hướng
- Các bước: 1) Load `?tab=daily`. 2) Chuyển sang `Income Summary`. 3) Chuyển sang `Staff Income`. 4) Bấm Back 2 lần. 5) Bấm Forward 1 lần.
- Kết quả mong đợi: Mỗi bước Back/Forward khôi phục đúng tab và query param tương ứng; dữ liệu render lại khớp tab đang hiện.

### Tab & deep-link

**TC-INC-016 · Ba tab hiển thị đúng nhãn và role**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Load màn hình. 2) Liệt kê các phần tử `role="tab"`.
- Kết quả mong đợi: Đúng 3 tab theo thứ tự `Daily Sale Report`, `Income Summary`, `Staff Income`.

**TC-INC-017 · Chuyển sang tab `Income Summary`**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Load `?tab=daily`. 2) Bấm tab `Income Summary`.
- Kết quả mong đợi: URL thành `?tab=summary&period=day&dateAfter=<hôm nay>&dateBefore=<hôm nay>`; hiện combobox `Income period`, bảng `Total Income Table`, panel `No row selected`.

**TC-INC-018 · Chuyển sang tab `Staff Income`**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Load `?tab=daily`. 2) Bấm tab `Staff Income`.
- Kết quả mong đợi: URL thành `?tab=staff&dateAfter=<hôm nay>&dateBefore=<hôm nay>`; hiện ô `Search by staff name...`, checkbox `Show staff with no income`, bảng 6 cột, panel `STAFF SUMMARY`.

**TC-INC-019 · Quay lại tab `Daily Sale Report`**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Vào `?tab=staff`. 2) Bấm tab `Daily Sale Report`.
- Kết quả mong đợi: URL về `?tab=daily`; hiện lại biểu đồ theo giờ, 4 KPI card, bảng `Order Details`.

**TC-INC-020 · Deep-link trực tiếp vào từng tab**

- Mức ưu tiên: Cao · Loại: Điều hướng
- Các bước: Lần lượt load `?tab=daily`, `?tab=summary`, `?tab=staff`.
- Kết quả mong đợi: Mỗi lần mở đúng tab tương ứng ngay từ đầu (không nháy qua tab mặc định rồi mới đổi), tab đó có `aria-selected="true"`.

**TC-INC-021 · `tab` không hợp lệ được làm sạch về mặc định**

- Mức ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước: 1) Load `?tab=bogus`.
- Kết quả mong đợi: URL được chuẩn hóa về `?tab=daily`, nội dung tab Daily render đầy đủ, không lỗi.

**TC-INC-022 · Chỉ một tab panel hiển thị tại một thời điểm**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Các bước: 1) Load `?tab=staff`. 2) Đếm số `table` đang **visible**.
- Kết quả mong đợi: Chỉ đúng 1 bảng hiển thị (bảng của tab Staff); bảng các tab khác dù có trong DOM cũng phải ẩn — tránh assert trúng bảng ẩn.

**TC-INC-023 · Điều hướng tab bằng bàn phím**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Focus vào tab `Daily Sale Report`. 2) Nhấn ArrowRight. 3) Nhấn Enter/Space nếu cần.
- Kết quả mong đợi: Focus/selection chuyển sang tab kế tiếp theo chuẩn ARIA tablist; tab panel tương ứng được hiển thị.

### Tab Daily — bộ chọn ngày

**TC-INC-024 · Mặc định nhãn ngày là `Today`**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Load `?tab=daily`.
- Kết quả mong đợi: Nút chọn ngày có nhãn đúng `Today`; URL không có param `date`.

**TC-INC-025 · Mở popover lịch**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Bấm nút chọn ngày.
- Kết quả mong đợi: Mở popover chứa lịch 1 tháng (tiêu đề dạng `August 2026`, hàng thứ `Su Mo Tu We Th Fr Sa`); `aria-expanded` của nút chuyển `true`.

**TC-INC-026 · Chọn một ngày trong quá khứ cập nhật URL và dữ liệu**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Mở lịch. 2) Chọn ngày 18 của tháng hiện tại.
- Kết quả mong đợi: URL thành `?tab=daily&date=2026-08-18`; nhãn nút đổi thành `Aug 18, 2026`; biểu đồ, KPI card và bảng `Order Details` load lại theo ngày đó.

**TC-INC-027 · Nhãn nút phản ánh đúng ngày đã chọn**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Load `?tab=daily&date=2026-08-18`.
- Kết quả mong đợi: Nhãn là `Aug 18, 2026` (định dạng `MMM D, YYYY`), không phải `Today`.

**TC-INC-028 · Đóng popover lịch bằng Escape**

- Mức ưu tiên: Thấp · Loại: Khả năng tiếp cận
- Các bước: 1) Mở lịch. 2) Nhấn Escape.
- Kết quả mong đợi: Popover đóng, ngày đang chọn không thay đổi, focus trở về nút trigger.

**TC-INC-029 · Chuyển tháng trong lịch rồi chọn ngày**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Mở lịch. 2) Bấm điều hướng về tháng trước. 3) Chọn một ngày.
- Kết quả mong đợi: Tiêu đề lịch đổi sang tháng trước; chọn ngày cập nhật `date=` đúng tháng đó và dữ liệu load lại.

**TC-INC-030 · Chọn hôm nay thì nhãn trở lại `Today`**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Load `?tab=daily&date=2026-08-18`. 2) Mở lịch. 3) Chọn ngày hôm nay.
- Kết quả mong đợi: Nhãn về `Today` (hoặc ngày hôm nay ở định dạng nhất quán) và dữ liệu là của hôm nay.

**TC-INC-031 · `date` không hợp lệ bị bỏ qua**

- Mức ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước: 1) Load `?tab=daily&date=not-a-date`.
- Kết quả mong đợi: Param bị loại khỏi URL, màn hình fallback về hôm nay và render bình thường (không trang trắng, không skeleton vô hạn).

**TC-INC-032 · Ngày tương lai**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Load `?tab=daily&date=<hôm nay + 30 ngày>`.
- Kết quả mong đợi: Ứng dụng xử lý xác định — hoặc chặn/kẹp về hôm nay, hoặc hiển thị báo cáo rỗng có empty state rõ ràng; không được lỗi JS hay treo loading. _(Cần xác nhận hành vi mong muốn với team.)_

**TC-INC-033 · Ngày rất xa trong quá khứ (không có dữ liệu)**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Load `?tab=daily&date=2020-01-01`.
- Kết quả mong đợi: Biểu đồ hiện empty state, KPI đều `$0.00`/`0`, bảng `Order Details` hiện empty state, footer `Showing 0 to 0 of 0 results`.

**TC-INC-034 · Tab Daily không có nút `Clear filters`**

- Mức ưu tiên: Thấp · Loại: Giao diện
- Các bước: 1) Load `?tab=daily&date=2026-08-18`. 2) Tìm nút `Clear filters` trong vùng hiển thị.
- Kết quả mong đợi: Không tồn tại nút `Clear filters` nào đang hiển thị (đúng như hành vi hiện tại đã quét).

### Tab Daily — KPI card & biểu đồ

**TC-INC-035 · Bốn KPI card hiển thị đủ**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Load `?tab=daily`. 2) Kiểm tra các card.
- Kết quả mong đợi: Có đúng 4 card `Total Orders`, `Sale Income`, `Total Tip`, `Total Payment`; mỗi card có giá trị, badge %, chữ `vs Yesterday` và nút `About <tên>`.

**TC-INC-036 · Tooltip `About Total Orders` đúng nội dung**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Các bước: 1) Hover/focus nút `About Total Orders`.
- Kết quả mong đợi: Hiện tooltip "Total number of orders (exclude refunds, and manual refunds)."

**TC-INC-037 · Tooltip `About Sale Income` đúng nội dung**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Các bước: 1) Hover/focus nút `About Sale Income`.
- Kết quả mong đợi: Hiện tooltip "Total sale amount of the order, including refund/partial refund values after discount is applied, excluding Tax and Tip."

**TC-INC-038 · Tooltip `About Total Tip` đúng nội dung**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Các bước: 1) Hover/focus nút `About Total Tip`.
- Kết quả mong đợi: Hiện tooltip "Total tips received, not included in sales revenue but counted in collected amounts."

**TC-INC-039 · Tooltip `About Total Payment` đúng nội dung**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Các bước: 1) Hover/focus nút `About Total Payment`.
- Kết quả mong đợi: Hiện tooltip "The final revenue includes Gift Card Redemption."

**TC-INC-040 · Bấm KPI card `Total Tip` đổi biểu đồ**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Load `?tab=daily`. 2) Bấm card `Total Tip`.
- Kết quả mong đợi: URL thêm `&stat=totalTip`; tiêu đề biểu đồ đổi thành `Total Tip by Hour`; legend đổi thành `Total Tips`; card `Total Tip` có style được chọn.

**TC-INC-041 · Bấm lần lượt cả 4 KPI card**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Bấm từng card `Total Orders` → `Sale Income` → `Total Tip` → `Total Payment`.
- Kết quả mong đợi: Mỗi lần bấm set đúng `stat=` tương ứng và tiêu đề biểu đồ đổi thành `<tên KPI> by Hour`; tại mỗi thời điểm chỉ 1 card ở trạng thái được chọn.

**TC-INC-042 · Deep-link `stat=` khôi phục đúng series**

- Mức ưu tiên: Trung bình · Loại: Điều hướng
- Các bước: 1) Load `?tab=daily&stat=totalTip`.
- Kết quả mong đợi: Biểu đồ mở ra đã là `Total Tip by Hour`, card `Total Tip` được chọn ngay từ đầu.

**TC-INC-043 · Empty state của biểu đồ khi series không có dữ liệu**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Chọn một ngày mà `Total Tip` = `$0.00`. 2) Bấm card `Total Tip`.
- Kết quả mong đợi: Vùng biểu đồ hiện đúng câu `No total tip recorded for this day yet.` thay vì biểu đồ trống không giải thích.

**TC-INC-044 · Biểu đồ mặc định là `Sale Income by Hour`**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Load `?tab=daily` không có `stat`.
- Kết quả mong đợi: Tiêu đề `Sale Income by Hour`, legend `Sale`.

**TC-INC-045 · Trục X biểu đồ theo giờ**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Load `?tab=daily`. 2) Đọc nhãn trục X.
- Kết quả mong đợi: Các mốc giờ dạng `9 AM`, `10 AM`, …, `7 PM` theo thứ tự tăng dần, định dạng 12 giờ có AM/PM.

**TC-INC-046 · Trục Y tự co giãn theo dữ liệu**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) So sánh ngày doanh thu lớn (vd `date=2026-08-18`) với ngày có refund âm (vd hôm nay).
- Kết quả mong đợi: Ngày lớn hiện thang dương có viết tắt (`$0 $400 $800 $1.2K $1.6K`); ngày có giá trị âm hiện thang bao cả phần âm (`-$70 … $70`).

**TC-INC-047 · Hover cột biểu đồ hiện tooltip có giá trị**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Load `?tab=daily&date=2026-08-18`. 2) Hover vào một cột có dữ liệu.
- Kết quả mong đợi: Tooltip hiện tên series và giá trị tiền tệ (vd `Sale $1,490.68`).

**TC-INC-048 · Cột âm (refund) phân biệt được bằng màu và dấu**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Chọn ngày có refund. 2) Quan sát cột dưới mốc `$0`.
- Kết quả mong đợi: Cột âm vẽ xuống dưới đường 0 và tô màu khác cột dương; giá trị trong tooltip có dấu trừ.

### Tab Daily — bảng Order Details

**TC-INC-049 · Bảng `Order Details` đúng tiêu đề cột**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Load `?tab=daily`. 2) Đọc các `th`.
- Kết quả mong đợi: Đúng thứ tự `ORDER #`, `SALE/REFUND`, `TAX`, `TIP`, `TOTAL`.

**TC-INC-050 · Số lượng order ở đầu card khớp footer**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Load `?tab=daily&date=2026-08-18`. 2) Đọc `<N> orders` cạnh tiêu đề và `Showing X to Y of Z results`.
- Kết quả mong đợi: `N` bằng `Z`.

**TC-INC-051 · Dòng refund được đánh dấu rõ**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Chọn ngày có refund. 2) Tìm dòng có hậu tố `(Refund)`.
- Kết quả mong đợi: Mã order kết thúc bằng ` (Refund)`; các cột tiền có dấu âm (vd `-$68.22`); dòng có style phân biệt (nền/chữ đỏ) — và thông tin refund **không chỉ** thể hiện bằng màu (có chữ `(Refund)`).

**TC-INC-052 · Mã order đúng định dạng**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Load bảng. 2) Kiểm tra từng ô `ORDER #`.
- Kết quả mong đợi: Khớp `^#OD\d{6}-\d{8}( \(Refund\))?$`.

**TC-INC-053 · Cột `TOTAL` bằng `SALE/REFUND` + `TAX` + `TIP`**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Load `?tab=daily&date=2026-08-18`. 2) Với mỗi dòng, parse 4 cột tiền và cộng.
- Kết quả mong đợi: `SALE/REFUND + TAX + TIP = TOTAL` với mọi dòng (vd `$18.00 + $1.80 + $0.00 = $19.80`), kể cả dòng refund âm.

**TC-INC-054 · Mã order không phải thẻ `<a>`**

- Mức ưu tiên: Thấp · Loại: Giao diện
- Các bước: 1) Load bảng. 2) Đếm `a[href]` bên trong bảng.
- Kết quả mong đợi: Bằng 0 — mã order chỉ được style giống link; mở chi tiết phải bằng click dòng (xem TC-INC-060).

**TC-INC-055 · Empty state của bảng khi ngày không có order**

- Mức ưu tiên: Cao · Loại: Biên
- Các bước: 1) Chọn một ngày không có order.
- Kết quả mong đợi: Bảng hiện thông báo rỗng trên 1 dòng, footer `Showing 0 to 0 of 0 results`, `Previous`/`Next` disable.

**TC-INC-056 · Phân trang `Previous`/`Next` disable ở biên**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Load một ngày chỉ có 1 trang kết quả. 2) Kiểm tra thuộc tính `disabled` của `Previous` và `Next`.
- Kết quả mong đợi: Cả hai nút disable; chỉ số trang là `1 / 1`.

**TC-INC-057 · Sang trang khi có nhiều trang**

- Mức ưu tiên: Cao · Loại: Chức năng
- Điều kiện tiên quyết: Chọn ngày có số order lớn hơn kích thước trang (hoặc mock response nhiều trang).
- Các bước: 1) Bấm `Next`. 2) Đọc footer và URL.
- Kết quả mong đợi: Chỉ số trang tăng, `Showing` cập nhật đúng dải, URL phản ánh `page=`, tập dòng thay đổi hoàn toàn (không lặp dòng trang trước).

**TC-INC-058 · `Previous` quay lại trang trước**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Sang trang 2. 2) Bấm `Previous`.
- Kết quả mong đợi: Trở về trang 1 với đúng tập dòng ban đầu và footer `Showing 1 to …`.

**TC-INC-059 · Đổi ngày reset về trang 1**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Sang trang 2 của một ngày nhiều order. 2) Chọn ngày khác.
- Kết quả mong đợi: Bảng về trang 1 (`Showing 1 to …`), không giữ lại `page` cũ gây bảng rỗng.

### Tab Daily — dialog chi tiết order

**TC-INC-060 · Click dòng mở dialog `Order detail`**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Load `?tab=daily`. 2) Click vào một dòng trong bảng `Order Details`.
- Kết quả mong đợi: Mở dialog tiêu đề `Order detail #OD…` đúng mã của dòng vừa click.

**TC-INC-061 · Dialog có khối `Order Information` đầy đủ**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Mở dialog chi tiết một order.
- Kết quả mong đợi: Có các trường `Order ID`, `Order Date` (kèm `(UTC+7)`), `Merchant`, `WHMCS ID`, `Customer`, `Order Note`.

**TC-INC-062 · Dialog hiện đúng badge trạng thái order refund**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Click dòng có `(Refund)`.
- Kết quả mong đợi: Dialog hiện badge `Refunded`; các số liệu trong dialog là giá trị âm/refund tương ứng.

**TC-INC-063 · Khối `Service Details` liệt kê dịch vụ và subtotal**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Mở dialog. 2) Xem khối `Service Details`.
- Kết quả mong đợi: Có `Last updated: …`, cột `STAFF / SERVICE` và `PRICE`, dòng `Items subtotal` với số item và tổng tiền bằng tổng các dòng dịch vụ.

**TC-INC-064 · Khối `Payment Details` đúng thông tin thanh toán**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Mở dialog một order thanh toán tiền mặt.
- Kết quả mong đợi: Hiện số payment (`1 payment`), phương thức (`Cash`), trạng thái (`Successful`), dòng `Received: $… · Change: $…`, mốc thời gian có `(UTC+7)` và số tiền.

**TC-INC-065 · Khối `Activity Log` và các sub-tab**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Mở dialog. 2) Cuộn tới `Activity Log`. 3) Bấm lần lượt các sub-tab.
- Kết quả mong đợi: Có chú thích `Times in UTC+7` và các sub-tab `All`, `Order`, `Item`, `Tender`, `Tip`, `Gateway`, `JSON`; mỗi sub-tab lọc/đổi nội dung log tương ứng.

**TC-INC-066 · Trường trống hiển thị placeholder có nghĩa**

- Mức ưu tiên: Thấp · Loại: Biên
- Các bước: 1) Mở dialog một order không có khách và không có ghi chú.
- Kết quả mong đợi: Hiện `No customer is available` và `No note is available.` thay vì để trống.

**TC-INC-067 · Đóng dialog bằng Escape**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Mở dialog. 2) Nhấn Escape.
- Kết quả mong đợi: Dialog đóng, quay về bảng, dữ liệu bảng và filter không đổi.

**TC-INC-068 · Focus bị bẫy trong dialog**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Mở dialog. 2) Nhấn Tab liên tục qua hết các control.
- Kết quả mong đợi: Focus vòng lại trong dialog, không rơi ra nội dung phía sau; khi đóng, focus trở về dòng/nút đã kích hoạt.

**TC-INC-069 · Mở chi tiết nhiều order liên tiếp**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Mở chi tiết dòng 1, đóng lại. 2) Mở chi tiết dòng 2.
- Kết quả mong đợi: Lần 2 hiện đúng dữ liệu của order thứ 2, không còn sót dữ liệu của order trước.

### Tab Daily — panel Income / Payment Detail

**TC-INC-070 · Panel `INCOME DETAIL` đủ dòng**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Load `?tab=daily`. 2) Đọc panel `INCOME DETAIL`.
- Kết quả mong đợi: Có tổng ở tiêu đề và các dòng `Sale`, `Tip`, `Tax Collected`, `Total Payment`.

**TC-INC-071 · Panel `PAYMENT DETAIL` đủ dòng**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Đọc panel `PAYMENT DETAIL`.
- Kết quả mong đợi: Có tổng ở tiêu đề và các dòng `Card`, `Cash`, `Others`, `Amount Collected`, `Gift Card Redemption`, `Total Payment`.

**TC-INC-072 · `INCOME DETAIL` khớp KPI card**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Load một ngày có dữ liệu. 2) So sánh panel với KPI card.
- Kết quả mong đợi: `Sale` = giá trị card `Sale Income`; `Tip` = card `Total Tip`; `Total Payment` = card `Total Payment` và bằng tổng ở tiêu đề panel.

**TC-INC-073 · Công thức `INCOME DETAIL`**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Parse `Sale`, `Tip`, `Tax Collected`, `Total Payment`.
- Kết quả mong đợi: `Sale + Tip + Tax Collected = Total Payment` (vd `-$14.72 + $0.00 + $5.35 = -$9.37`).

**TC-INC-074 · Công thức `PAYMENT DETAIL`**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Parse `Card`, `Cash`, `Others`, `Amount Collected`, `Gift Card Redemption`, `Total Payment`.
- Kết quả mong đợi: `Card + Cash + Others = Amount Collected`; `Amount Collected + Gift Card Redemption = Total Payment` (vd `-$68.22 + $58.85 = -$9.37`).

**TC-INC-075 · Hai panel `Total Payment` bằng nhau**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Đọc `Total Payment` ở cả `INCOME DETAIL` và `PAYMENT DETAIL`.
- Kết quả mong đợi: Hai giá trị bằng nhau và bằng KPI card `Total Payment`.

**TC-INC-076 · Chevron thu gọn panel (nếu có tương tác)**

- Mức ưu tiên: Thấp · Loại: Chức năng
- Các bước: 1) Bấm vào chevron/tiêu đề `INCOME DETAIL`. 2) Bấm lại.
- Kết quả mong đợi: Nếu panel thu gọn được: các dòng bên trong ẩn/hiện tương ứng và có thuộc tính `aria-expanded`. _(Quét không tìm thấy phần tử role button — cần xác minh trực tiếp; nếu không tương tác được thì icon chevron là gây nhầm lẫn và nên báo lại team.)_

**TC-INC-077 · Panel cập nhật khi đổi ngày**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Ghi lại giá trị 2 panel ở hôm nay. 2) Chọn `date=2026-08-18`.
- Kết quả mong đợi: Cả hai panel load lại theo ngày mới và các quan hệ ở TC-INC-073/074 vẫn đúng.

### Tab Income Summary — bộ lọc

**TC-INC-078 · Mặc định của tab Summary**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Bấm tab `Income Summary` từ tab Daily.
- Kết quả mong đợi: `period=day`, `dateAfter`=`dateBefore`=hôm nay; nhãn nút ngày là `Today`; combobox `Income period` hiển thị `Day`.

**TC-INC-079 · Chọn khoảng ngày trên tab Summary**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Mở nút chọn khoảng ngày. 2) Chọn ngày đầu và ngày cuối trong **cùng một tháng**.
- Kết quả mong đợi: URL cập nhật `dateAfter`/`dateBefore`; nhãn nút thành `Aug 1, 2026 - Aug 21, 2026`; biểu đồ và bảng load lại theo khoảng đó.

**TC-INC-080 · Combobox `Income period` mở đúng 3 option**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Bấm combobox `aria-label="Income period"`.
- Kết quả mong đợi: Mở listbox với đúng 3 `role="option"`: `Day`, `Week`, `Month`; option đang chọn có `aria-selected="true"`.

**TC-INC-081 · Chuyển period sang `Week`**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Load `?tab=summary&period=day&dateAfter=2026-06-01&dateBefore=2026-08-21`. 2) Chọn `Week`.
- Kết quả mong đợi: URL `period=week`; cột `DATE` chuyển sang nhãn tuần dạng `Week 23 (Jun 1 – Jun 7, 2026)`; số dòng giảm tương ứng (vd 82 ngày → 12 tuần).

**TC-INC-082 · Chuyển period sang `Month`**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Cùng khoảng ngày trên, chọn `Month`.
- Kết quả mong đợi: URL `period=month`; cột `DATE` dạng `Jun 2026`; đúng 3 dòng cho Jun/Jul/Aug 2026.

**TC-INC-083 · Nhãn combobox phản ánh period hiện tại**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Các bước: 1) Load `?tab=summary&period=month&…`.
- Kết quả mong đợi: Text hiển thị của combobox là `Month` (không phải `Day`).

**TC-INC-084 · `period` không hợp lệ fallback về mặc định**

- Mức ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước: 1) Load `?tab=summary&period=bogus`.
- Kết quả mong đợi: Param bị loại (URL còn `?tab=summary`), period về `Day`, bảng render bình thường.

**TC-INC-085 · Nút `Clear filters` xuất hiện khi filter khác mặc định**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Load `?tab=summary&period=day&dateAfter=2026-08-01&dateBefore=2026-08-21`. 2) Tìm nút `Clear filters`.
- Kết quả mong đợi: Nút `Clear filters` hiển thị.

**TC-INC-086 · `Clear filters` reset về mặc định**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Từ trạng thái đã lọc khoảng ngày + period `Week`. 2) Bấm `Clear filters`.
- Kết quả mong đợi: Khoảng ngày về mặc định (`Today`), period về `Day`, các param filter bị loại khỏi URL, nút `Clear filters` biến mất.

**TC-INC-087 · Khoảng ngày rỗng dữ liệu**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Load `?tab=summary&period=day` với khoảng ngày chắc chắn không có giao dịch (vd 2020).
- Kết quả mong đợi: Biểu đồ và bảng hiện empty state rõ ràng, footer `Showing 0 to 0 of 0 results`, panel phải vẫn là `No row selected`.

**TC-INC-088 · `dateAfter` lớn hơn `dateBefore`**

- Mức ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước: 1) Load `?tab=summary&dateAfter=2026-08-21&dateBefore=2026-08-01`.
- Kết quả mong đợi: Ứng dụng xử lý xác định — hoặc tự đảo/kẹp khoảng, hoặc hiện kết quả rỗng có empty state; không lỗi JS, không treo loading vô hạn.

### Tab Income Summary — biểu đồ, bảng, panel

**TC-INC-089 · Legend biểu đồ có 4 series**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Các bước: 1) Load tab Summary. 2) Đọc legend.
- Kết quả mong đợi: Đúng 4 nhãn `Total Income`, `Gross Income`, `Net Income`, `Total Tip`.

**TC-INC-090 · Bảng `Total Income Table` đúng cột**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Đọc các `th`.
- Kết quả mong đợi: Đúng thứ tự `DATE`, `SALE`, `TIP`, `TAX`, `TOTAL PAYMENT`.

**TC-INC-091 · Bộ đếm bản ghi khớp footer và số hóa đúng số ít/nhiều**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Load khoảng 1 ngày. 2) Load khoảng nhiều ngày.
- Kết quả mong đợi: Khoảng 1 ngày ghi `1 entry`; nhiều ngày ghi `<N> entries`; `N` khớp `Z` trong `Showing X to Y of Z results`.

**TC-INC-092 · Công thức từng dòng bảng Summary**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Với mỗi dòng, parse `SALE`, `TIP`, `TAX`, `TOTAL PAYMENT`.
- Kết quả mong đợi: `SALE + TIP + TAX = TOTAL PAYMENT` (vd `$2,700.58 + $647.12 + $0.84 = $3,348.54`).

**TC-INC-093 · Panel phải mặc định là empty state**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Load tab Summary, chưa chọn dòng nào.
- Kết quả mong đợi: Panel hiện `No row selected` và `Select a date, week, or month from the Total Income Table to view its summary.`

**TC-INC-094 · Chọn dòng render panel chi tiết**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Load `?tab=summary&period=day&dateAfter=2026-08-01&dateBefore=2026-08-21`. 2) Click dòng đầu tiên.
- Kết quả mong đợi: URL thêm `&selectedDate=2026-08-01`; panel phải thay empty state bằng bảng phân tích; dòng được chọn có style highlight (`data-state="selected"`).

**TC-INC-095 · Panel chi tiết có đủ các nhóm**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Chọn một dòng. 2) Kiểm tra các tiêu đề nhóm trong panel.
- Kết quả mong đợi: Có `SALE DETAILS`, `SUPPLY FEE`, `STAFF PAYOUT`, `SPLIT PAY`, `SALON EARNINGS` và dòng `Tax Collected`; mỗi nhóm có tổng riêng.

**TC-INC-096 · Nhóm `SALE DETAILS` đủ chỉ tiêu**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Các bước: 1) Đọc nhóm `SALE DETAILS`.
- Kết quả mong đợi: Có Total Sale, Service Sale, Product Sale, Gift Card Sale, Total Refund, Service Refund, Product Refund, Subtotal, Total Discount, Discount, Discount Reversed, Service Fee, Cash Discount, Net Total, Tip, Tax Collected, TOTAL PAYMENT.

**TC-INC-097 · Nhóm `STAFF PAYOUT` đủ chỉ tiêu và khớp tổng**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Đọc nhóm `STAFF PAYOUT`.
- Kết quả mong đợi: Có Total Service, Staff Supply Share, Staff Commission, Tip, Clean up fee, Staff Discount Charge, Staff Card Charge Commission, Staff Card Charge Tip, Staff Salary; `TOTAL STAFF PAYOUT` bằng tổng các dòng con (vd chỉ có `Staff Salary $572.29` → tổng `$572.29`).

**TC-INC-098 · `SPLIT PAY` khớp `TOTAL STAFF PAYOUT`**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Đọc `SPLIT PAY` (`Pay 1`, `Pay 2`) và `TOTAL STAFF PAYOUT`.
- Kết quả mong đợi: `Pay 1 + Pay 2 = TOTAL STAFF PAYOUT` (vd `$87.20 + $485.09 = $572.29`).

**TC-INC-099 · Nhóm `SALON EARNINGS` đủ chỉ tiêu**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Các bước: 1) Đọc nhóm `SALON EARNINGS`.
- Kết quả mong đợi: Có Total Service, Salon Supply Share, Salon Commission, Product Sale, Product Refund, Total Discount, Discount, Discount Reversed, Service Fee, Cash Discount, Net Earnings, Staff Supply Share, Clean up fee, Staff Discount Charge, Staff Card Charge Commission, Staff Card Charge Tip, Staff Salary, `TOTAL EARNINGS`.

**TC-INC-100 · `SUPPLY FEE` chia đúng hai phần**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Đọc `Total Supply Fee`, `Staff Supply Share`, `Salon Supply Share`.
- Kết quả mong đợi: `Staff Supply Share + Salon Supply Share = Total Supply Fee`.

**TC-INC-101 · Đổi dòng đang chọn cập nhật panel**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Chọn dòng `Aug 1, 2026`. 2) Chọn dòng `Aug 4, 2026`.
- Kết quả mong đợi: `selectedDate` đổi theo; số liệu panel đổi theo dòng mới; chỉ 1 dòng ở trạng thái selected.

**TC-INC-102 · Deep-link `selectedDate` khôi phục panel**

- Mức ưu tiên: Trung bình · Loại: Điều hướng
- Các bước: 1) Load `?tab=summary&period=day&dateAfter=2026-08-01&dateBefore=2026-08-21&selectedDate=2026-08-04`.
- Kết quả mong đợi: Panel chi tiết mở ngay với số liệu của `Aug 4, 2026` và dòng tương ứng được highlight.

**TC-INC-103 · `selectedDate` ngoài khoảng đang lọc**

- Mức ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước: 1) Load `?tab=summary&dateAfter=2026-08-01&dateBefore=2026-08-05&selectedDate=2026-07-01`.
- Kết quả mong đợi: Xử lý xác định — hoặc bỏ qua và về `No row selected`, hoặc hiện panel rỗng có thông báo; không lỗi JS.

**TC-INC-104 · Chọn dòng ở period `Week` và `Month`**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Đặt period `Week`, chọn 1 dòng. 2) Đặt period `Month`, chọn 1 dòng.
- Kết quả mong đợi: Panel chi tiết hiện số liệu tổng hợp cho cả tuần / cả tháng đó (khớp với dòng bảng), đúng như câu hướng dẫn "Select a date, week, or month".

**TC-INC-105 · Đổi period reset dòng đang chọn**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Chọn 1 dòng ở period `Day`. 2) Đổi period sang `Month`.
- Kết quả mong đợi: `selectedDate` cũ không còn hiệu lực — panel về `No row selected` hoặc tự chọn lại dòng hợp lệ; không hiện số liệu sai lệch với period mới.

### Tab Staff Income — bộ lọc & tìm kiếm

**TC-INC-106 · Mặc định của tab Staff**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Bấm tab `Staff Income` từ tab Daily.
- Kết quả mong đợi: URL `?tab=staff&dateAfter=<hôm nay>&dateBefore=<hôm nay>`; nhãn ngày `Today`; checkbox `Show staff with no income` ở trạng thái `aria-checked="false"`; ô tìm kiếm rỗng.

**TC-INC-107 · Bật `Show staff with no income`**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Load `?tab=staff&dateAfter=2026-08-01&dateBefore=2026-08-21`. 2) Ghi lại tổng số kết quả. 3) Bấm checkbox `Show staff with no income`.
- Kết quả mong đợi: URL thêm `showStaffNoIncome=true`; `aria-checked="true"`; tổng kết quả tăng (đã quan sát 70 → 244) và xuất hiện các dòng `0` order / `$0.00`.

**TC-INC-108 · Tắt lại checkbox trở về tập cũ**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Từ trạng thái đã bật, bấm lại checkbox.
- Kết quả mong đợi: `showStaffNoIncome` bị loại khỏi URL; tổng kết quả trở về giá trị ban đầu; không còn dòng toàn `$0.00`.

**TC-INC-109 · Deep-link `showStaffNoIncome=true`**

- Mức ưu tiên: Trung bình · Loại: Điều hướng
- Các bước: 1) Load trực tiếp `?tab=staff&showStaffNoIncome=true&dateAfter=…&dateBefore=…`.
- Kết quả mong đợi: Checkbox hiện ở trạng thái đã tick ngay từ đầu và bảng đã bao gồm nhân viên không có doanh thu.

**TC-INC-110 · Tìm kiếm theo tên nhân viên**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Load tab Staff với khoảng ngày có dữ liệu. 2) Gõ `Erin` vào ô `Search by staff name...`.
- Kết quả mong đợi: URL thêm `search=Erin`; bảng chỉ còn các nhân viên có tên chứa `Erin`; footer `Showing` cập nhật đúng.

**TC-INC-111 · Tìm kiếm khớp chuỗi con, không chỉ khớp đầu tên**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Bật `Show staff with no income`. 2) Tìm `Erin`.
- Kết quả mong đợi: Trả về cả `Erin` và `Kerin` — xác nhận khớp chuỗi con ở bất kỳ vị trí nào trong tên.

**TC-INC-112 · Tìm kiếm không phân biệt hoa thường**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Tìm `erin`. 2) Tìm `ERIN`. 3) So sánh với `Erin`.
- Kết quả mong đợi: Cả ba cho cùng tập kết quả.

**TC-INC-113 · Tìm kiếm không có kết quả hiện empty state**

- Mức ưu tiên: Cao · Loại: Biên
- Các bước: 1) Gõ `zzzznotexist` vào ô tìm kiếm.
- Kết quả mong đợi: Bảng hiện đúng `No staff income found.`; footer `Showing 0 to 0 of 0 results`; `Previous`/`Next` disable.

**TC-INC-114 · Xóa từ khóa tìm kiếm phục hồi danh sách**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Tìm `Erin`. 2) Xóa hết ô tìm kiếm.
- Kết quả mong đợi: `search` bị loại khỏi URL; bảng trở về danh sách đầy đủ theo các filter còn lại.

**TC-INC-115 · Tìm kiếm với ký tự đặc biệt**

- Mức ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước: 1) Lần lượt gõ `%`, `_`, `'`, `<script>`, `a%' OR '1'='1`.
- Kết quả mong đợi: Không lỗi JS/500; kết quả rỗng hoặc khớp theo nghĩa chuỗi thuần; nội dung nhập không được render thành HTML/thực thi (không có SQL/XSS injection).

**TC-INC-116 · Tìm kiếm bằng khoảng trắng đầu/cuối**

- Mức ưu tiên: Thấp · Loại: Biên
- Các bước: 1) Gõ `  Erin  `.
- Kết quả mong đợi: Kết quả giống như tìm `Erin` (từ khóa được trim) hoặc rỗng một cách nhất quán — hành vi phải xác định, không lỗi.

**TC-INC-117 · Từ khóa rất dài**

- Mức ưu tiên: Thấp · Loại: Biên
- Các bước: 1) Gõ chuỗi 500 ký tự.
- Kết quả mong đợi: Không lỗi/crash; empty state hiển thị bình thường; layout ô tìm kiếm không bị vỡ.

**TC-INC-118 · Kết hợp khoảng ngày + checkbox + tìm kiếm**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Đặt khoảng ngày `Aug 1 – Aug 21, 2026`. 2) Bật `Show staff with no income`. 3) Tìm `Erin`.
- Kết quả mong đợi: Cả 3 param cùng có trong URL và cùng tác động lên bảng; kết quả là giao của cả ba điều kiện.

**TC-INC-119 · `Clear filters` trên tab Staff**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Đặt đủ 3 filter như TC-INC-118. 2) Bấm `Clear filters`.
- Kết quả mong đợi: Khoảng ngày về mặc định, checkbox bỏ tick, ô tìm kiếm rỗng, các param filter bị loại khỏi URL, nút `Clear filters` biến mất.

### Tab Staff Income — bảng, phân trang, panel tổng hợp

**TC-INC-120 · Bảng Staff đúng cột**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Load tab Staff. 2) Đọc các `th`.
- Kết quả mong đợi: Đúng thứ tự `STAFF`, `ORDERS`, `SUBTOTAL`, `SUPPLY FEE`, `TIP`, `TOTAL INCOME`.

**TC-INC-121 · Kích thước trang là 30 dòng**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Load tập kết quả > 30 dòng. 2) Đếm dòng và đọc footer.
- Kết quả mong đợi: Đúng 30 dòng trên trang 1; footer `Showing 1 to 30 of <Z> results`.

**TC-INC-122 · Sang trang 2 bằng `Next`**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Load `?tab=staff&dateAfter=2026-08-01&dateBefore=2026-08-21&showStaffNoIncome=true`. 2) Bấm `Next`.
- Kết quả mong đợi: URL thêm `page=2`; footer `Showing 31 to 60 of 244 results`; chỉ số `2 / 9`; tập dòng khác hoàn toàn trang 1.

**TC-INC-123 · Số trang khớp tổng kết quả và page size**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Đọc `Z` trong footer và tổng số trang `M`.
- Kết quả mong đợi: `M = ceil(Z / 30)` (vd `244` → `9`).

**TC-INC-124 · Trang cuối `Next` bị disable**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Điều hướng tới trang cuối.
- Kết quả mong đợi: `Next` disable, `Previous` enable; footer `Showing` kết thúc đúng bằng `Z`.

**TC-INC-125 · `page` vượt quá số trang**

- Mức ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước: 1) Load `?tab=staff&page=999`.
- Kết quả mong đợi: Hiện `No staff income found.` và `Showing 0 to 0 of 0 results`. **Bộ đếm trang hiện đang render `999 / 1`** — cần kẹp về trang hợp lệ (vd `1 / 9`) hoặc redirect về trang cuối. Case này dùng để theo dõi lỗi UI đã phát hiện.

**TC-INC-126 · `page=0` hoặc `page` âm**

- Mức ưu tiên: Thấp · Loại: Tiêu cực
- Các bước: 1) Load `?tab=staff&page=0`, sau đó `?tab=staff&page=-3`.
- Kết quả mong đợi: Fallback về trang 1 và render bình thường, không lỗi.

**TC-INC-127 · Đổi filter reset về trang 1**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Sang trang 3. 2) Gõ vào ô tìm kiếm.
- Kết quả mong đợi: Bảng về trang 1, không giữ `page=3` khiến bảng rỗng dù có kết quả.

**TC-INC-128 · Panel `STAFF SUMMARY` đủ chỉ tiêu**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Load tab Staff. 2) Đọc panel.
- Kết quả mong đợi: Có `Total Staff`, `Total Orders`, `Total Subtotal`, `Total Supply Fee`, `Total Tip`, `TOTAL INCOME`.

**TC-INC-129 · `Total Staff` khớp tổng kết quả bảng**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Load tab Staff (không tìm kiếm). 2) So `Total Staff` với `Z` trong `Showing … of Z results`.
- Kết quả mong đợi: Hai số bằng nhau (đã quan sát khớp: 70/70 và 244/244).

**TC-INC-130 · `STAFF SUMMARY` cập nhật khi bật checkbox**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Ghi lại panel khi tắt checkbox. 2) Bật `Show staff with no income`. 3) Ghi lại panel.
- Kết quả mong đợi: `Total Staff` tăng đúng theo tổng kết quả mới (70 → 244). **Lưu ý:** đã quan sát `Total Orders` tăng `991 → 1,000` khi chỉ thêm nhân viên **không có** doanh thu, trong khi `TOTAL INCOME` không đổi — cần xác nhận đây là lỗi tính toán.

**TC-INC-131 · `STAFF SUMMARY` phải phản ánh cả `search` (kỳ vọng)**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Load `?tab=staff&dateAfter=2026-08-01&dateBefore=2026-08-21` (ghi lại panel). 2) Thêm `&search=Erin` (bảng còn 1 dòng). 3) Đọc lại panel.
- Kết quả mong đợi: Panel phải tổng hợp theo tập đã lọc (`Total Staff 1`, `TOTAL INCOME` = income của `Erin`). **Hiện tại panel không đổi** (`Total Staff 70`, `TOTAL INCOME -$471,042.34`) → case này dự kiến FAIL, dùng để theo dõi lỗi. _(Nếu team xác nhận panel cố ý tổng hợp toàn kỳ, đổi kỳ vọng và bổ sung nhãn giải thích trên UI.)_

**TC-INC-132 · `STAFF SUMMARY` cập nhật khi đổi khoảng ngày**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Đọc panel với khoảng `Today`. 2) Đổi sang `Aug 1 – Aug 21, 2026`. 3) Đọc lại panel.
- Kết quả mong đợi: Mọi chỉ tiêu trong panel thay đổi theo khoảng ngày mới.

**TC-INC-133 · Panel không đổi khi chỉ sang trang**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Đọc panel ở trang 1. 2) Sang trang 2. 3) Đọc lại panel.
- Kết quả mong đợi: Panel giữ nguyên (tổng của toàn bộ tập lọc, không phải của riêng trang đang xem).

**TC-INC-134 · `Total Subtotal` / `Total Tip` khớp tổng các dòng**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Điều kiện tiên quyết: Chọn filter cho tập kết quả ≤ 30 dòng (gói trong 1 trang).
- Các bước: 1) Cộng cột `SUBTOTAL` và cột `TIP` của mọi dòng. 2) So với `Total Subtotal` và `Total Tip` trong panel.
- Kết quả mong đợi: Các cặp giá trị khớp nhau.

**TC-INC-135 · Nhân viên trùng tên vẫn là hai dòng riêng**

- Mức ưu tiên: Thấp · Loại: Biên
- Các bước: 1) Bật `Show staff with no income`. 2) Tìm `Bell` (dữ liệu quan sát có 2 nhân viên tên `Bell`).
- Kết quả mong đợi: Hiện 2 dòng riêng biệt với số liệu khác nhau, không bị gộp hay ghi đè.

**TC-INC-136 · Dòng nhân viên không có doanh thu hiển thị `0`/`$0.00`, không để trống**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Bật `Show staff with no income`. 2) Xem một dòng như `Cara`.
- Kết quả mong đợi: `ORDERS` = `0`; các cột tiền = `$0.00`; không có ô trống hay `null`/`NaN`.

**TC-INC-137 · Giá trị âm và giá trị rất lớn render đúng**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Tìm dòng có `TOTAL INCOME` âm (vd `Erin` → `-$489,680.82`) và dòng có `SUBTOTAL` rất lớn (vd `$5,566,988.54`).
- Kết quả mong đợi: Dấu trừ nằm trước ký hiệu `$`; dấu phẩy phân cách hàng nghìn đúng; ô không bị tràn/cắt chữ.

### Định dạng dữ liệu

**TC-INC-138 · Định dạng tiền tệ nhất quán toàn màn hình**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Thu thập mọi ô tiền ở 3 tab (bảng, KPI card, panel).
- Kết quả mong đợi: Mọi giá trị khớp `^-?\$\d{1,3}(,\d{3})*\.\d{2}$` — luôn 2 chữ số thập phân, có dấu phân cách hàng nghìn, dấu trừ đứng trước `$`.

**TC-INC-139 · Trục biểu đồ dùng dạng viết tắt**

- Mức ưu tiên: Thấp · Loại: Dữ liệu
- Các bước: 1) Load một ngày doanh thu lớn. 2) Đọc nhãn trục Y.
- Kết quả mong đợi: Giá trị lớn viết tắt dạng `$1.2K`/`$1.6K`; đây là biệt lệ có chủ đích so với TC-INC-138 và chỉ áp dụng cho trục biểu đồ.

**TC-INC-140 · Định dạng ngày trong bảng và nhãn filter**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Đọc cột `DATE` (period Day), nhãn nút ngày, nhãn khoảng ngày.
- Kết quả mong đợi: Ngày đơn `MMM D, YYYY` (`Aug 21, 2026`); khoảng `MMM D, YYYY - MMM D, YYYY`; không lẫn định dạng ISO hay `MM/DD/YYYY`.

**TC-INC-141 · Định dạng nhãn tuần**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Đặt period `Week`. 2) Đọc cột `DATE`.
- Kết quả mong đợi: Dạng `Week <số> (MMM D – MMM D, YYYY)`; số tuần liên tiếp tăng dần; dải ngày mỗi tuần đúng 7 ngày và không chồng lấn tuần kế.

**TC-INC-142 · Định dạng nhãn tháng**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Đặt period `Month`. 2) Đọc cột `DATE`.
- Kết quả mong đợi: Dạng `MMM YYYY` (`Jun 2026`), theo thứ tự thời gian tăng dần.

**TC-INC-143 · Mốc thời gian trong dialog có múi giờ**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Mở dialog chi tiết order. 2) Đọc `Order Date` và mốc thời gian ở `Payment Details`.
- Kết quả mong đợi: Dạng `MMM D, YYYY, h:mm A (UTC+7)`; `Activity Log` có ghi chú `Times in UTC+7`; múi giờ nhất quán trong toàn dialog.

**TC-INC-144 · Badge phần trăm và chữ so sánh**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Đọc badge của 4 KPI card.
- Kết quả mong đợi: Dạng phần trăm nguyên có dấu (`-95%`, `-14%`) kèm chữ `vs Yesterday`; badge tăng/giảm phân biệt được không chỉ bằng màu (có dấu +/− hoặc icon mũi tên).

**TC-INC-145 · Số đếm có dấu phân cách hàng nghìn**

- Mức ưu tiên: Thấp · Loại: Dữ liệu
- Các bước: 1) Đọc `Total Orders` trong `STAFF SUMMARY` với tập dữ liệu lớn.
- Kết quả mong đợi: Dạng `5,324` (có dấu phẩy), không phải `5324`.

### Tiêu cực & biên

**TC-INC-146 · `storeId` không tồn tại**

- Mức ưu tiên: Cao · Loại: Tiêu cực
- Các bước: 1) Load `/pos/999999/income`.
- Kết quả mong đợi: Hiện thông báo không tìm thấy / không có quyền, hoặc redirect về màn hình hợp lệ; không trang trắng, không rò rỉ stack trace.

**TC-INC-147 · `storeId` không phải số**

- Mức ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước: 1) Load `/pos/abc/income`.
- Kết quả mong đợi: Xử lý lỗi rõ ràng (404/redirect), không lỗi JS.

**TC-INC-148 · Session hết hạn khi đang xem**

- Mức ưu tiên: Cao · Loại: Bảo mật
- Các bước: 1) Load màn hình. 2) Xóa cookie/token phiên. 3) Đổi filter để phát sinh request mới.
- Kết quả mong đợi: Redirect về `/login` (hoặc hiện thông báo hết phiên), không hiển thị dữ liệu cũ như thể vẫn hợp lệ.

**TC-INC-149 · Truy cập khi chưa đăng nhập**

- Mức ưu tiên: Cao · Loại: Bảo mật
- Các bước: 1) Dùng context sạch (không storageState). 2) Load `/pos/14/income`.
- Kết quả mong đợi: Redirect về `/login`; không lộ bất kỳ số liệu doanh thu nào.

**TC-INC-150 · Mất mạng giữa lúc đổi filter**

- Mức ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước: 1) Load màn hình. 2) Bật offline. 3) Đổi khoảng ngày.
- Kết quả mong đợi: Hiện lỗi/thông báo retry rõ ràng; không skeleton vô hạn; khi online lại thì thao tác lại được.

**TC-INC-151 · API trả dữ liệu rỗng bất thường**

- Mức ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước: 1) Mock API báo cáo trả về mảng rỗng / object thiếu field. 2) Load từng tab.
- Kết quả mong đợi: Mọi tab hiện empty state hoặc `$0.00`, không `NaN`, `undefined`, `null` lộ ra UI.

**TC-INC-152 · Đổi filter liên tục rất nhanh (race condition)**

- Mức ưu tiên: Cao · Loại: Biên
- Các bước: 1) Trên tab Staff, gõ nhanh nhiều từ khóa khác nhau liên tiếp. 2) Đồng thời bấm chuyển trang.
- Kết quả mong đợi: Kết quả cuối cùng khớp filter cuối cùng (response cũ đến muộn phải bị loại bỏ); footer, bảng và URL đồng bộ với nhau.

**TC-INC-153 · Chuyển tab liên tục rất nhanh**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Bấm luân phiên 3 tab nhiều lần liên tiếp.
- Kết quả mong đợi: Cuối cùng chỉ 1 tab panel hiển thị, đúng tab được bấm sau cùng; không hiện đồng thời bảng của 2 tab, không lỗi console.

**TC-INC-154 · Tổ hợp param của tab khác bị bỏ qua đúng cách**

- Mức ưu tiên: Thấp · Loại: Tiêu cực
- Các bước: 1) Load `?tab=daily&search=Erin&showStaffNoIncome=true&period=week`.
- Kết quả mong đợi: Tab Daily render bình thường, các param không thuộc tab này bị bỏ qua (hoặc loại khỏi URL), không lỗi.

**TC-INC-155 · Ngày rơi vào chuyển giao DST / cuối tháng**

- Mức ưu tiên: Thấp · Loại: Biên
- Các bước: 1) Chọn ngày cuối tháng (vd `2026-08-31`) và ngày đầu tháng kế. 2) Ở period `Week`, chọn khoảng vắt qua ranh giới tháng.
- Kết quả mong đợi: Nhãn tuần vắt tháng hiển thị đúng cả hai tháng (vd `Week 27 (Jun 29 – Jul 5, 2026)`); không lệch/thiếu ngày, không trùng dữ liệu giữa hai dòng.

### Responsive

**TC-INC-156 · Bố cục ở 1920px**

- Mức ưu tiên: Trung bình · Loại: Responsive
- Các bước: 1) Đặt viewport 1920×1080. 2) Load `?tab=daily`.
- Kết quả mong đợi: Sidebar cố định bên trái, nội dung chính giữa, rail KPI/panel bên phải; không tràn ngang.

**TC-INC-157 · Bố cục ở 1280px**

- Mức ưu tiên: Trung bình · Loại: Responsive
- Các bước: 1) Đặt viewport 1280×800. 2) Load `?tab=daily`.
- Kết quả mong đợi: Không tràn ngang (`scrollWidth <= clientWidth`); mọi khu vực vẫn hiện diện và đọc được.

**TC-INC-158 · Bố cục ở 768px (tablet)**

- Mức ưu tiên: Trung bình · Loại: Responsive
- Các bước: 1) Đặt viewport 768×1024. 2) Load `?tab=daily`.
- Kết quả mong đợi: Không tràn ngang; các khu vực xếp lại (stack) hợp lý; biểu đồ và bảng vẫn dùng được.

**TC-INC-159 · Bố cục ở 390px (mobile)**

- Mức ưu tiên: Cao · Loại: Responsive
- Các bước: 1) Đặt viewport 390×844. 2) Load `?tab=daily`.
- Kết quả mong đợi: Không tràn ngang; sidebar thu về nút `Toggle Sidebar`; thanh tab, bộ chọn ngày, biểu đồ, bảng `Order Details` đều truy cập được.

**TC-INC-160 · Sidebar dạng drawer ở mobile**

- Mức ưu tiên: Trung bình · Loại: Responsive
- Các bước: 1) Ở 390px, bấm `Toggle Sidebar`. 2) Bấm lại để đóng.
- Kết quả mong đợi: Mở drawer chứa đủ menu điều hướng; đóng lại được bằng chính nút đó (theo màn hình khác trong app, Escape có thể không đóng — cần xác nhận).

**TC-INC-161 · Trục X biểu đồ thưa bớt ở mobile**

- Mức ưu tiên: Thấp · Loại: Responsive
- Các bước: 1) Ở 390px, đọc nhãn trục X biểu đồ tab Daily.
- Kết quả mong đợi: Nhãn giãn cách 2 giờ (`9 AM`, `11 AM`, `1 PM`, `3 PM`, `5 PM`, `7 PM`) thay vì từng giờ, không đè chữ lên nhau.

**TC-INC-162 · Bảng nhiều cột ở màn hình hẹp**

- Mức ưu tiên: Trung bình · Loại: Responsive
- Các bước: 1) Ở 390px, mở tab `Staff Income` (bảng 6 cột).
- Kết quả mong đợi: Bảng cuộn ngang trong vùng chứa riêng hoặc rút gọn cột; **trang** không bị cuộn ngang.

**TC-INC-163 · Dialog chi tiết order ở mobile**

- Mức ưu tiên: Trung bình · Loại: Responsive
- Các bước: 1) Ở 390px, mở dialog chi tiết order.
- Kết quả mong đợi: Dialog vừa khung nhìn, cuộn dọc được tới hết `Activity Log`, có nút đóng chạm được.

### Khả năng tiếp cận

**TC-INC-164 · Điều hướng toàn màn hình bằng bàn phím**

- Mức ưu tiên: Cao · Loại: Khả năng tiếp cận
- Các bước: 1) Load `?tab=daily`. 2) Nhấn Tab tuần tự qua các control.
- Kết quả mong đợi: Tới được tab, nút chọn ngày, 4 KPI card, các nút `About …`, dòng bảng, `Previous`/`Next`; thứ tự focus hợp lý và luôn có vòng focus thấy được.

**TC-INC-165 · KPI card kích hoạt được bằng bàn phím**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Focus card `Total Tip`. 2) Nhấn Enter (rồi Space).
- Kết quả mong đợi: Biểu đồ đổi sang `Total Tip by Hour` giống như click chuột.

**TC-INC-166 · Tooltip `About …` mở được bằng focus bàn phím**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Tab tới nút `About Sale Income`.
- Kết quả mong đợi: Tooltip hiện khi focus (không chỉ khi hover) và nội dung được liên kết qua `aria-describedby`.

**TC-INC-167 · Combobox `Income period` dùng được bằng bàn phím**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Focus combobox. 2) Nhấn Enter/Space để mở. 3) Dùng Arrow chọn `Week`. 4) Nhấn Enter.
- Kết quả mong đợi: Mở/chọn được hoàn toàn bằng bàn phím; `aria-expanded` và `aria-selected` cập nhật đúng.

**TC-INC-168 · Checkbox `Show staff with no income` dùng được bằng bàn phím**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Focus checkbox. 2) Nhấn Space.
- Kết quả mong đợi: `aria-checked` chuyển `true`, filter áp dụng; nhấn Space lần nữa thì bỏ tick.

**TC-INC-169 · Dòng bảng mở chi tiết được bằng bàn phím**

- Mức ưu tiên: Cao · Loại: Khả năng tiếp cận
- Các bước: 1) Tab tới một dòng trong bảng `Order Details`. 2) Nhấn Enter.
- Kết quả mong đợi: Dialog chi tiết mở ra. Nếu dòng không focus được thì đây là lỗi tiếp cận (chức năng chỉ dùng được bằng chuột) — cần báo lại.

**TC-INC-170 · Bảng có cấu trúc semantic đúng**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Kiểm tra DOM của cả 3 bảng.
- Kết quả mong đợi: Dùng `table`/`thead`/`tbody`/`th`/`td` thật; ô tiêu đề là `th` (có `scope` nếu cần) để screen reader đọc được quan hệ hàng/cột.

**TC-INC-171 · Màn hình có heading cấp 1**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Load màn hình. 2) Liệt kê `h1`–`h6`.
- Kết quả mong đợi: "Income Reports" phải là một heading thật (`h1`) và các tiêu đề khu vực (`Order Details`, `Total Income Table`, `STAFF SUMMARY`, …) là heading cấp dưới. **Hiện tại scan đếm 0 heading** → case này dự kiến FAIL, dùng để theo dõi.

**TC-INC-172 · Nút icon đều có tên có nghĩa**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Liệt kê các nút không có text (rail icon, nút info, `Toggle Sidebar`).
- Kết quả mong đợi: Mỗi nút có `aria-label` mô tả rõ (đã có: `POS`, `Payment`, `Business`, `Gift Card`, `About Total Orders`, `Open user menu`, `Toggle Sidebar`, `Income period`).

**TC-INC-173 · Biểu đồ có phương án tiếp cận không phụ thuộc thị giác**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Kiểm tra `role`/`aria-label`/text thay thế của vùng biểu đồ.
- Kết quả mong đợi: Biểu đồ có nhãn mô tả hoặc dữ liệu tương đương ở dạng bảng/text để screen reader tiếp cận được; không phải `canvas`/`svg` trống rỗng.

**TC-INC-174 · Tương phản màu và không dùng màu làm kênh duy nhất**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Kiểm tra dòng refund, badge % và cột biểu đồ âm. 2) Bật `forcedColors`.
- Kết quả mong đợi: Thông tin refund/âm vẫn nhận biết được qua chữ `(Refund)` và dấu trừ khi bỏ màu; tương phản chữ/nền đạt WCAG AA.

**TC-INC-175 · Trạng thái selected của dòng bảng đọc được bằng trợ năng**

- Mức ưu tiên: Thấp · Loại: Khả năng tiếp cận
- Các bước: 1) Ở tab Summary, chọn một dòng.
- Kết quả mong đợi: Dòng có `data-state="selected"` kèm thuộc tính ARIA tương ứng (`aria-selected`/`aria-current`), không chỉ đổi màu nền.

### Hiệu năng

**TC-INC-176 · Thời gian load lần đầu ở mức chấp nhận được**

- Mức ưu tiên: Trung bình · Loại: Hiệu năng
- Các bước: 1) Đo từ lúc điều hướng tới khi biểu đồ + bảng + KPI đều hiển thị (tab Daily, ngày có dữ liệu).
- Kết quả mong đợi: Hoàn tất trong ngưỡng của dự án (khuyến nghị ≤ 5s trên DEV); không có giai đoạn nào đứng im quá lâu mà không có loading indicator.

**TC-INC-177 · Chuyển tab không gọi lại toàn bộ dữ liệu không cần thiết**

- Mức ưu tiên: Thấp · Loại: Hiệu năng
- Các bước: 1) Ghi lại network. 2) Chuyển Daily → Summary → Staff → Daily.
- Kết quả mong đợi: Mỗi tab chỉ gọi API của nó; quay lại tab cũ với cùng filter không tạo ra loạt request trùng lặp bất thường.

**TC-INC-178 · Tập dữ liệu lớn vẫn render mượt**

- Mức ưu tiên: Trung bình · Loại: Hiệu năng
- Các bước: 1) Tab Staff, khoảng ngày rộng + bật `Show staff with no income` (≈244 kết quả, 9 trang). 2) Chuyển vài trang liên tiếp.
- Kết quả mong đợi: Mỗi lần chuyển trang render trong ngưỡng cho phép; không treo UI, không rò rỉ tăng dần thời gian render.

**TC-INC-179 · Gõ tìm kiếm có debounce**

- Mức ưu tiên: Trung bình · Loại: Hiệu năng
- Các bước: 1) Ghi lại network. 2) Gõ liên tục 10 ký tự vào ô tìm kiếm.
- Kết quả mong đợi: Số request ít hơn hẳn số lần gõ (có debounce); không bắn 1 request cho mỗi ký tự.

**TC-INC-180 · Khoảng ngày rất rộng**

- Mức ưu tiên: Trung bình · Loại: Hiệu năng
- Các bước: 1) Tab Summary, period `Day`, chọn khoảng ~2 năm.
- Kết quả mong đợi: Vẫn trả về và phân trang được trong thời gian hợp lý, hoặc có thông báo giới hạn khoảng ngày rõ ràng; không treo tab trình duyệt.

### Bảo mật

**TC-INC-181 · Không truy cập được store khác qua URL**

- Mức ưu tiên: Cao · Loại: Bảo mật
- Các bước: 1) Load `/pos/<storeId của store không được phép>/income`.
- Kết quả mong đợi: Bị chặn (403/404/redirect); không hiển thị bất kỳ số liệu doanh thu nào của store đó.

**TC-INC-182 · Dữ liệu tài chính không lộ trong URL hay log**

- Mức ưu tiên: Trung bình · Loại: Bảo mật
- Các bước: 1) Thao tác đủ các filter. 2) Kiểm tra URL và console/network log.
- Kết quả mong đợi: URL chỉ chứa param filter (ngày, period, search, page, stat, tab); không có token/PII/số liệu tài chính; console không in dữ liệu thô.

**TC-INC-183 · Nội dung nhập không bị render thành HTML**

- Mức ưu tiên: Cao · Loại: Bảo mật
- Các bước: 1) Nhập `<img src=x onerror=alert(1)>` vào ô tìm kiếm nhân viên. 2) Thử cả qua URL `?tab=staff&search=<script>alert(1)</script>`.
- Kết quả mong đợi: Chuỗi được xử lý như text thuần (escape), không có dialog/script chạy, không lỗi console về CSP.

**TC-INC-184 · Phân quyền theo role**

- Mức ưu tiên: Cao · Loại: Bảo mật
- Điều kiện tiên quyết: Cần một storageState của tài khoản role hạn chế (**hiện project chỉ có admin — case này bị chặn**).
- Các bước: 1) Đăng nhập bằng role không có quyền xem báo cáo doanh thu. 2) Load `/pos/<storeId>/income`.
- Kết quả mong đợi: Mục `Income Reports` bị ẩn khỏi sidebar và truy cập trực tiếp bị chặn.

**TC-INC-185 · Gọi API báo cáo trực tiếp không có auth**

- Mức ưu tiên: Cao · Loại: Bảo mật
- Các bước: 1) Bắt endpoint mà màn hình gọi. 2) Gọi lại endpoint đó không kèm token.
- Kết quả mong đợi: Trả 401/403, không trả dữ liệu.

---

## Tổng kết độ phủ (Coverage summary)

**Tổng số test case: 185** (`TC-INC-001` → `TC-INC-185`)

### Theo loại

| Loại              | Số lượng |
| ----------------- | -------- |
| Chức năng         | 39       |
| Dữ liệu           | 39       |
| Giao diện         | 27       |
| Biên              | 19       |
| Khả năng tiếp cận | 16       |
| Tiêu cực          | 15       |
| Điều hướng        | 10       |
| Responsive        | 8        |
| Bảo mật           | 7        |
| Hiệu năng         | 5        |
| **Tổng**          | **185**  |

### Theo mức ưu tiên

| Mức ưu tiên | Số lượng |
| ----------- | -------- |
| Cao         | 69       |
| Trung bình  | 97       |
| Thấp        | 19       |
| **Tổng**    | **185**  |

### Theo khu vực

| Khu vực                       | Dải ID  | Số lượng |
| ----------------------------- | ------- | -------- |
| Tải trang & bố cục            | 001–008 | 8        |
| Sidebar & điều hướng          | 009–015 | 7        |
| Tab & deep-link               | 016–023 | 8        |
| Daily — bộ chọn ngày          | 024–034 | 11       |
| Daily — KPI & biểu đồ         | 035–048 | 14       |
| Daily — bảng Order Details    | 049–059 | 11       |
| Daily — dialog chi tiết order | 060–069 | 10       |
| Daily — panel Income/Payment  | 070–077 | 8        |
| Summary — bộ lọc              | 078–088 | 11       |
| Summary — biểu đồ/bảng/panel  | 089–105 | 17       |
| Staff — bộ lọc & tìm kiếm     | 106–119 | 14       |
| Staff — bảng/phân trang/panel | 120–137 | 18       |
| Định dạng dữ liệu             | 138–145 | 8        |
| Tiêu cực & biên               | 146–155 | 10       |
| Responsive                    | 156–163 | 8        |
| Khả năng tiếp cận             | 164–175 | 12       |
| Hiệu năng                     | 176–180 | 5        |
| Bảo mật                       | 181–185 | 5        |

### Case dự kiến FAIL — theo dõi lỗi đã phát hiện khi quét

| ID         | Vấn đề                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------- |
| TC-INC-125 | `page=999` khiến bộ đếm trang render `999 / 1` thay vì kẹp về trang hợp lệ                      |
| TC-INC-130 | `STAFF SUMMARY` tăng `Total Orders` `991 → 1,000` khi chỉ thêm nhân viên **không có** doanh thu |
| TC-INC-131 | `STAFF SUMMARY` bỏ qua hoàn toàn filter `search`                                                |
| TC-INC-171 | Màn hình không có bất kỳ heading `h1`–`h6` nào                                                  |

### Phần chưa chắc chắn / cần xác minh trực tiếp

- **Panel `INCOME DETAIL` / `PAYMENT DETAIL` (TC-INC-076):** có chevron nhưng scan không tìm thấy phần tử role button — chưa rõ có thu gọn được không.
- **Kích thước trang bảng `Order Details` (TC-INC-057):** đã thấy 24 dòng trên 1 trang, chưa xác định ngưỡng thật (có thể là 30 như tab Staff).
- **Ngày tương lai (TC-INC-032)** và **`dateAfter > dateBefore` (TC-INC-088):** chưa rõ hành vi mong muốn là kẹp, đảo hay báo lỗi — cần chốt với team trước khi khóa kỳ vọng.
- **Ngưỡng hiệu năng (TC-INC-176, 178, 180):** con số đề xuất ≤ 5s trên DEV, cần thống nhất với team.
- **Phân quyền role (TC-INC-184):** bị chặn vì project chỉ có duy nhất storageState admin; cần capture thêm một tài khoản role hạn chế.
- **Endpoint API thật (TC-INC-185):** cần bắt network để xác định endpoint báo cáo trước khi viết case này.
- **Lỗi tải chunk (TC-INC-006):** đã gặp thật 1 lần nhưng không tái hiện được theo yêu cầu — case dùng route interception để mô phỏng, cần xác nhận thông điệp lỗi khớp bản build hiện tại.
- **Toàn màn hình không có `data-testid`:** mọi selector phải dựa vào role/accessible name/placeholder/text — dễ vỡ nếu nhãn UI đổi. Nên đề nghị team thêm test-id cho các khu vực chính.
