# Test case: Màn hình Settings (Cài đặt cửa hàng)

- **Route**: `/pos/<STORE_ID>/setting` — mặc định redirect sang `?tab=business-profile`
- **Các tab (query param `tab`)**: `business-profile`, `pos-package`, `payment-transactions`, `role-permission`, `configuration`
- **Ngày quét**: 2026-08-13
- **Nguồn dữ liệu quét**:
  - `docs/test-cases/_scan/settings.json` / `.png` — tab Business Profile
  - `docs/test-cases/_scan/settings-package.json` / `.png` — tab POS Package
  - `docs/test-cases/_scan/settings-payment.json` / `.png` — tab Payment & Transactions
  - `docs/test-cases/_scan/settings-role.json` / `.png` — tab Role & Permission
  - `docs/test-cases/_scan/settings-config.json` / `.png` — tab Configuration
  - `docs/test-cases/_scan/settings-interactions.json` + các ảnh `settings-role-expanded.png`, `settings-config-commission.png`, `settings-config-commsalary.png`, `settings-config-tos-edit.png`, `settings-package-features.png`, `settings-bp-time.png` — kết quả tương tác thật (mở rộng cây quyền, chuyển sub-tab, mở modal)
  - Script tương tác: `docs/test-cases/_scan/explore-settings.mjs`

---

## 1. Kiểm kê tính năng (Feature inventory)

### 1.1. Khung sườn chung

- **Sidebar trái**: nhóm `POS` (Overview, Orders, Income Reports, Payroll, Batch History), nhóm `Management` (Staffs, Services, Customers, Report Config, **Settings** — đang chọn), nhóm `Admin` (Onboarding, Merchants, Support 360, Orders, Packages, Devices, Monitor, Versions, Settings).
- **Thanh trên cùng / rail trái**: các nút chế độ `"POS"`, `"Payment"`, `"Business"`, `"Gift Card"`; bộ chọn store `"Volt POS 14 Dev#14"`; nút `"Toggle Sidebar"`; nút `"Open user menu"`.
- **Tiêu đề trang**: `"Settings"` (title tab trình duyệt: `Settings | Portal`).
- **Thanh tab chính** (5 tab, role `tab`): `"Business Profile"`, `"POS Package"`, `"Payment & Transactions"`, `"Role & Permission"`, `"Configuration"`.
- **Không có `data-testid` nào lộ ra trong DOM** (testIds: 0) → selector phải dựa vào role/label/text.
- Mỗi card cài đặt có **cặp nút riêng** `"Cancel"` + `"Save Changes"` (lưu theo từng section, không phải lưu toàn trang).

### 1.2. Tab `Business Profile` (`?tab=business-profile`)

**Card `Business Information`** — mô tả: _"Legal identity and the address printed on receipts and booking pages."_

| Trường        | Tên field (name) | Kiểu                                            | Placeholder           |
| ------------- | ---------------- | ----------------------------------------------- | --------------------- |
| Business Name | `businessName`   | text                                            | `Enter business name` |
| Legal Name    | `legalName`      | text                                            | `Enter legal name`    |
| Address       | `address`        | text                                            | `Enter address`       |
| Country       | —                | dropdown (button, giá trị mẫu `"Argentina"`)    | —                     |
| State         | —                | dropdown (button, giá trị mẫu `"Buenos Aires"`) | —                     |
| City          | `city`           | text                                            | `Enter city`          |
| Zip           | `postalCode`     | text                                            | `Enter zip code`      |

**Card `Business Hours`** — mô tả: _"Opening hours shown on booking pages and receipts. A closed day is hidden from customers."_

- 7 dòng thứ trong tuần Monday → Sunday, mỗi dòng có toggle `"<Day> open status"` (checkbox) + 2 nút chọn giờ `"Select time"` (giờ mở — giờ đóng).
- Giá trị mẫu khi quét: Monday `7:00 AM — 8:00 PM`, Tuesday `7:00 AM — 9:00 PM`, Wednesday `7:00 AM — 8:00 PM`, Thursday `7:00 AM — 9:00 PM`, Friday `8:00 AM — 11:00 PM`, Saturday `6:00 AM — 10:00 PM`, Sunday `Closed`.
- Time picker mở ra 3 cột cuộn: giờ (`01`–`12`), phút (bước 15 phút: `00`, `15`, `30`, `45`), buổi (`AM`/`PM`).

**Card `Payroll Period`** — mô tả: _"How often payroll is calculated for this merchant."_

- Dòng `Current period` hiển thị khoảng ngày, ví dụ `Jul 25, 2026 — Aug 19, 2026`, kèm badge loại kỳ (mẫu: `Custom`).
- Bước **1 `Period Type`** — _"How often the payroll cycle repeats."_: 4 lựa chọn `"Weekly"`, `"Bi-weekly"`, `"Monthly"`, `"Custom"`.
- Bước **2 `Payroll Dates`** — _"Pick up to 4 days of the month when payroll is processed."_: lưới nút `"Day 1"` → `"Day 31"`, dòng đếm `"2 of 4 days selected"`.

**Card `Contact Owner`** — mô tả: _"Where Volt support and customers reach the owner."_

- `Phone` (`phoneNumber`, `type=tel`, placeholder `(205) 555-0123`), `Email` (`email`, `type=email`, placeholder `email@example.com`), `Website URL` (`website`, `type=url`, placeholder `https://example.com`).

**Card `Business Photos`** — mô tả: _"Your branding appears on receipts, booking pages, and customer communications."_

- `Business logo` → input file `storeLogoObjFid`; `Welcome sign image` → input file `coverPhotoObjFid`. Cả hai render dưới dạng nút/vùng bấm hiển thị ảnh hiện tại.

### 1.3. Tab `POS Package` (`?tab=pos-package`)

- Dòng trạng thái đầu trang: `Current Package:` + badge tên gói (mẫu `GO POS DELUXE`) + `Active since Jun 25, 2026 (UTC+7)`.
- **Lưới card gói** (nhiều gói, dữ liệu DEV có cả gói rác/trùng tên): `GO POS BASIC`, `GO POS DELUXE`, `GO POS PREMIUM`, `GO POS PREMIUM - Copy`, `GO POS PREMIUM - Copy (2)`, `123`, `Test11155`, `Copy of GO POS BASIC` (×3), `Copy of GO POS DELUXE`, `TEST`, `HIHI`, `1`, `Copy of 2`, …
- Mỗi card: tên gói, mô tả, danh sách 5 tính năng tóm tắt có icon ✔/✘ (`Card Payment`, `Cash Payment`, `GiftCard Payment`, `Other Payment`, `Split Order`), link `"View all 62 features"`, và nút `"Select Plan"`.
- Card gói đang dùng: có badge `Current`, viền highlight, nút đổi thành `"Current Plan"` (disabled).
- Modal `"View all 62 features"`: tiêu đề = tên gói, mô tả, danh sách tính năng gom nhóm — `Payment & Transaction Features`, `Employee Management`, `Services & Products`, `Tax & Pricing Rules`, `Promo & Reward`, `Timekeeping`, `Receipt`, `Reporting`, `Batches`, `Print Check`, `Turn Suggestion`, `Shortcuts`, `Device Management`, `Integration`, `Fastboy Support` — kèm nút `"Select This Package"` và nút `"Close"`.

### 1.4. Tab `Payment & Transactions` (`?tab=payment-transactions`)

**Card `Payment Methods`** — _"Choose which tender types staff can accept at checkout."_

- 4 toggle (checkbox): `card` — **Credit Card** (_Visa, Mastercard, Amex, Discover_), `cash` — **Cash** (_Physical cash accepted at the drawer_), `gift_card` — **Gift Cards** (_Store-issued gift cards and balances_), `other` — **Others** (_Checks, external terminals, house account_).

**Card `Tipping Settings`** — _"Control whether tips are collected, when they are captured, and which presets appear on the customer screen."_

- Toggle `tipActive` — **Tip Acceptance** (_"When off, the tip screen is skipped at checkout and no tip is collected on any order."_).
- **1 `Tip Timing`** (radio `tipTiming`): `Before Payment` badge `SALE` (chuỗi `Order › Tip › Sale`) và `After Payment` badge `AUTHORIZE` (chuỗi `Order › Authorize › Tip › Capture`).
- **2 `Tip Presets`**: nút chuyển chế độ `"Percentage"` / `"Fixed Amount"`; các chip preset hiện có `10%`, `15%`, `20%`, `25%`, `35%`, `30%`, mỗi chip có nút xóa `"Remove <x>% tip preset"`; nút `"Add"` để thêm preset.
- **3 `Default Split Tip Method`** (radio `method`): `Split Evenly` (ví dụ `Ann $15 · Ben $15`) và `Proportion` (ví dụ `Ann $20 · Ben $10`), dựa trên ví dụ tip $30 trên dịch vụ $80 (Ann) / $40 (Ben).

**Card `Signature Settings`** — _"Require a customer signature during checkout and choose when it is captured."_

- Toggle `signatureSetting` — **Require Signature**; nhóm radio `signatureTiming`: `Before Payment` (`Order › Sign › Charge`) và `After Payment` (`Order › Charge › Sign`).

**Card `Tax & Pricing`** — _"Rates applied to every order on this location."_

- 3 input text: `taxPercentage` — **Tax Rate (%)**, `cashDiscountPercentage` — **Cash Discount (%)**, `serviceFeePercentage` — **Service Fee (%)**. Giá trị mẫu: `10` cho cả ba.

**Panel `TIP SCREEN PREVIEW`** (badge `Read-only`)

- Mô phỏng màn hình khách trên terminal: giờ `9:41`, tiêu đề `Add a tip`, `Subtotal $42.00`, các ô preset hiển thị % + số tiền tương ứng (`10% $4.20`, `15% $6.30`, `20% $8.40`, `25% $10.50`, `35% $14.70`, `30% $12.60`), nút `No tip` và `Custom`, footer `VOLT TERMINAL`.
- Chú thích: _"Updates live from Tipping Settings — presets, Percentage mode, and After Payment (AUTHORIZE) timing."_ → preview cập nhật realtime theo thay đổi ở card Tipping Settings.

### 1.5. Tab `Role & Permission` (`?tab=role-permission`)

- Header bảng: cột đầu `Access` + nút `"Expand All"` / `"Collapse All"`; 4 cột vai trò `Owner`, `Manager`, `Partner`, `Staff`, mỗi cột có link `"Select All"` / `"Deselect All"` (Owner đang bật hết nên hiển thị `Deselect All`).
- 7 nhóm quyền (có icon, bấm mũi tên để mở rộng) và quyền con khi `Expand All`:
  - **Reporting** → `Summary Income`, `Daily Income`, `Staff Income`, `Staff Payroll`, `Batch History`, `View Time Tracking`
  - **Order Management** → `Cancel Order / Void`, `Refund`, `Edit Order`
  - **Batch Management** → `Batch Close`
  - **Cash Management** → `Open Cash Drawer`
  - **Settings** → `Settings`
  - **Payment** → `Completed Payment`
  - **Privacy** → `View Phone Number`
- Mỗi ô giao nhau nhóm × vai trò là checkbox có aria-label `"Toggle <Nhóm> for <Vai trò>"` (vd `"Toggle Reporting for Owner"`).
- Trạng thái mẫu khi quét: Owner tick toàn bộ 7 nhóm; Staff chỉ tick `Settings` và `Payment`; Manager và Partner không tick nhóm nào.
- Nút `"Cancel"` và `"Save Changes"` ở cuối bảng (khi quét, `Save Changes` ở trạng thái **enabled** — khác các card khác).

### 1.6. Tab `Configuration` (`?tab=configuration`)

**Card `Compensation Default`** — _"Applied automatically to every staff member imported without an explicit compensation setting."_

- 3 sub-tab: `"Commission"`, `"Salary"`, `"Commission & Salary"` (mặc định mở `Salary` khi quét).
- Sub-tab **Commission** (prefix field `commission.*`):
  - `Commission Setting`: `Service Commission - Staff (%)` (`percentServiceStaff`) + `Service Commission - Owner (%)` (readonly, tự tính = 100 − staff, mẫu `50`); tương tự `Product Commission` (`percentProductStaff`), `Gift Card Commission` (`percentGiftCardStaff`).
  - `Pay Split`: `Pay 1 (%)` (`cashCheckSplit`) + `Pay 2 (%)` (readonly, mẫu `50`).
  - `Deduction Per Day` (`deductionPerDay`, placeholder `$0.00`); checkbox `Exclude tips on Check` (`enablePayrollTip`) — _"Exclude tips from cash/check income"_.
  - `Card Fee Charge` — _"Do you want to take a small card fee from staff earnings? You can charge a fee on commission and/or tip paid by card."_: `On Staff Commission (%)` (`percentStaffCommission`), `On Credit Card Tip (%)` (`percentCreditCardTip`), checkbox `Add credit card tips on staff Pay 1` (`cardFeeCharge`).
- Sub-tab **Salary** (prefix `salary.*`):
  - `Salary Setting`: select `salarySetting` với các lựa chọn `Salary by Period`, `Wage Per Day`, `Wage Per Hour`; input `Amount` (`salaryAmount`, mẫu `$555.55`).
  - `Pay Split`: `Pay 1 (%)` (`cashCheckSplit`, mẫu `20`) + `Pay 2 (%)` (readonly `80`).
  - `Deduction Per Day` (mẫu `$5.05`); checkbox `Exclude tips on Check` (đang tick).
  - `Card Fee Charge`: `On Credit Card Tip (%)` (mẫu `0.5`), checkbox `Add credit card tips on staff Pay 1`.
- Sub-tab **Commission & Salary** (prefix `commission_salary.*`): gộp cả `Salary Setting` + `Commission Setting` + `Pay Split` + `Card Fee Charge`, **cộng thêm** `Days Off Setting` với checkbox `Limit days off` (`limitDayOff`). Giá trị mẫu: Service `87.5`/`12.5`… hiển thị Owner `87.5`, Product Owner `80`, Gift Card Owner `90`, Pay 2 `80`.

**Card `Turn Suggestion`** — _"Configure how turns are suggested in the POS app."_

- `Turn Value` (`turnValue`, placeholder `$0.00`, mẫu `$100.00`) — chú thích _"Set to 0 to turn off turn suggestions."_
- Toggle `Service-based Turn` (`turnServiceBased`) — _"Calculate turns based on services performed."_
- Toggle `Decimal Turn` (`turnDecimal`) — _"Allow fractional turn values."_

**Card `Terms of Service`** và **Card `Privacy Policy`** (cột phải)

- Mô tả: _"…content shown to customers in the POS app. Clear the content and save to restore the Fastboy default."_
- Dòng trạng thái: `Custom content saved` (hoặc trạng thái mặc định Fastboy khi chưa custom).
- 2 nút: `"Preview"` và `"Edit"`.
- Modal Edit: tiêu đề `"Edit Terms of Service"` / `"Edit Privacy Policy"`, ô `Content` (rich text/textarea), nút `"Preview"`, `"Cancel"`, `"Save Changes"`, `"Close"`.

**Card `Passcode Setting`** — _"Guards actions that change money or configuration on the POS."_

- Toggle `Enable Passcode Verification` — _"When off, actions that require a passcode run immediately without verification."_

### 1.7. Ghi chú giới hạn quét

- **Không xác minh được**: hành vi thực tế khi bấm `"Save Changes"` (toast thành công/lỗi, gọi API nào), thông báo validation cụ thể cho từng field, luồng `"Select Plan"` (có modal xác nhận / thanh toán hay không), nút `"Preview"` của Terms/Privacy, upload ảnh (định dạng & dung lượng cho phép), dropdown `Country`/`State` (script tự động click bị timeout — cần thử lại thủ công).
- **Trạng thái nút Save**: ở hầu hết card, `"Save Changes"` bắt đầu ở trạng thái mờ/disabled và chỉ enable khi có thay đổi (dirty state) — riêng tab `Role & Permission` nút đang enabled ngay từ đầu, **cần xác minh** đây là chủ ý hay lỗi.
- Dữ liệu DEV có nhiều gói POS rác (`123`, `TEST`, `HIHI`, `1`, `Copy of ...`) — test không được hard-code tên/số lượng gói.
- `STORE_ID` phải lấy từ biến môi trường, không hard-code `14`.

---

## 2. Test case

### A. Tải trang & bố cục (Page load / Layout)

**TC-SET-001 · Tải trang Settings qua điều hướng trực tiếp** — Mức độ ưu tiên: Cao · Loại: Điều hướng

- Điều kiện tiên quyết: Đã đăng nhập với session hợp lệ.
- Các bước:
  1. Điều hướng trực tiếp tới `/pos/<STORE_ID>/setting`.
  2. Chờ trang tải xong.
- Kết quả mong đợi: URL tự chuyển thành `/pos/<STORE_ID>/setting?tab=business-profile`; tiêu đề trang `"Settings"` và title trình duyệt `Settings | Portal` hiển thị; đủ 5 tab; card `Business Information` render; không có lỗi console.

**TC-SET-002 · Điều hướng tới Settings từ sidebar Management** — Mức độ ưu tiên: Cao · Loại: Điều hướng

- Điều kiện tiên quyết: Đang ở màn hình khác (vd Overview).
- Các bước: 1) Click `"Settings"` trong nhóm `"Management"` ở sidebar. 2) Quan sát URL và nội dung.
- Kết quả mong đợi: Điều hướng tới `/pos/<STORE_ID>/setting?tab=business-profile`; mục `Settings` (Management) được highlight active; nội dung tab Business Profile hiển thị.

**TC-SET-003 · Phân biệt Settings (store) và Settings (Admin)** — Mức độ ưu tiên: Trung bình · Loại: Điều hướng

- Các bước: 1) Từ Settings store, click `"Settings"` trong nhóm `"Admin"` ở sidebar. 2) Quan sát URL.
- Kết quả mong đợi: Điều hướng tới `/pos/admin/setting` (khác `/pos/<STORE_ID>/setting`); nội dung khác hẳn tab Business Profile; item active trong sidebar chuyển sang mục Admin.

**TC-SET-004 · Hiển thị đủ 5 tab đúng thứ tự** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Quan sát thanh tab.
- Kết quả mong đợi: Thanh tab hiển thị đúng thứ tự `"Business Profile"` → `"POS Package"` → `"Payment & Transactions"` → `"Role & Permission"` → `"Configuration"`; tab đầu tiên được đánh dấu selected (`aria-selected="true"`).

**TC-SET-005 · Toggle Sidebar không ảnh hưởng nội dung tab** — Mức độ ưu tiên: Thấp · Loại: Giao diện

- Các bước: 1) Ở tab bất kỳ, click `"Toggle Sidebar"`. 2) Quan sát vùng nội dung. 3) Click lại để mở sidebar.
- Kết quả mong đợi: Sidebar thu gọn/mở lại mượt; vùng nội dung giãn ra lấp chỗ trống, không mất dữ liệu, không reset tab đang chọn, không xuất hiện scroll ngang.

**TC-SET-006 · Bố cục 2 cột hiển thị đúng ở các độ rộng desktop** — Mức độ ưu tiên: Trung bình · Loại: Responsive

- Các bước: 1) Xem tab Business Profile ở 1920px. 2) Thu nhỏ xuống ~1366px. 3) Thu nhỏ xuống ~1280px.
- Kết quả mong đợi: Cột trái (Business Information / Business Hours / Payroll Period) và cột phải (Contact Owner / Business Photos) không chồng lấp, không cắt chữ; ở độ rộng nhỏ cột phải xuống dưới thay vì bị bóp méo; không có scroll ngang toàn trang.

### B. Chuyển tab & giữ trạng thái (Tab navigation)

**TC-SET-010 · Chuyển qua từng tab cập nhật đúng query param** — Mức độ ưu tiên: Cao · Loại: Điều hướng

- Các bước: Lần lượt click `"POS Package"`, `"Payment & Transactions"`, `"Role & Permission"`, `"Configuration"`, rồi quay lại `"Business Profile"`.
- Kết quả mong đợi: URL lần lượt là `?tab=pos-package`, `?tab=payment-transactions`, `?tab=role-permission`, `?tab=configuration`, `?tab=business-profile`; nội dung tương ứng render; tab được click có `aria-selected="true"`, các tab khác `false`.

**TC-SET-011 · Deep-link trực tiếp tới từng tab** — Mức độ ưu tiên: Cao · Loại: Điều hướng

- Các bước: Mở lần lượt 5 URL `/pos/<STORE_ID>/setting?tab=<slug>` cho 5 slug hợp lệ.
- Kết quả mong đợi: Mỗi lần tải, đúng tab tương ứng được chọn sẵn và nội dung của tab đó render đầy đủ (không nhấp nháy về tab mặc định).

**TC-SET-012 · Reload (F5) giữ nguyên tab đang xem** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Điều kiện tiên quyết: Đang ở tab `Configuration`.
- Các bước: 1) Nhấn F5. 2) Quan sát tab được chọn sau khi tải lại.
- Kết quả mong đợi: Vẫn ở tab `Configuration` (`?tab=configuration`), không bị đăng xuất, không quay về Business Profile.

**TC-SET-013 · Nút Back/Forward của trình duyệt hoạt động với tab** — Mức độ ưu tiên: Trung bình · Loại: Điều hướng

- Các bước: 1) Từ Business Profile click sang `Payment & Transactions`, rồi sang `Configuration`. 2) Nhấn Back 2 lần. 3) Nhấn Forward 1 lần.
- Kết quả mong đợi: Back đưa về `payment-transactions` rồi `business-profile`; Forward đưa lại `payment-transactions`; nội dung khớp với query param ở mỗi bước.

**TC-SET-014 · Query param `tab` không hợp lệ** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Các bước: Mở `/pos/<STORE_ID>/setting?tab=khong-ton-tai`.
- Kết quả mong đợi: Trang không crash/không màn hình trắng; fallback về tab mặc định `Business Profile` (hoặc hiển thị thông báo hợp lý) — cần xác minh hành vi thực tế.

**TC-SET-015 · Chuyển tab khi đang có thay đổi chưa lưu** — Mức độ ưu tiên: Cao · Loại: Biên

- Điều kiện tiên quyết: Ở tab Business Profile, đã sửa `Business Name` nhưng chưa bấm `"Save Changes"`.
- Các bước: 1) Click sang tab `Payment & Transactions`. 2) Quay lại tab `Business Profile`.
- Kết quả mong đợi: Hệ thống hoặc cảnh báo mất dữ liệu chưa lưu, hoặc giữ nguyên giá trị đã nhập khi quay lại — **không được** âm thầm hiển thị giá trị cũ mà nút Save vẫn ở trạng thái dirty. Ghi nhận hành vi thực tế.

### C. Tab Business Profile — Card `Business Information`

**TC-SET-020 · Hiển thị đầy đủ trường Business Information với dữ liệu hiện tại** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Quan sát card `"Business Information"`.
- Kết quả mong đợi: Hiển thị mô tả _"Legal identity and the address printed on receipts and booking pages."_; đủ 7 trường Business Name, Legal Name, Address, Country, State, City, Zip; các trường được điền sẵn dữ liệu store hiện tại; có nút `"Cancel"` và `"Save Changes"`.

**TC-SET-021 · Nút Save Changes disabled khi chưa có thay đổi** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Tải lại tab Business Profile. 2) Không sửa gì. 3) Kiểm tra trạng thái nút `"Save Changes"` của card Business Information.
- Kết quả mong đợi: Nút ở trạng thái disabled/mờ, click không gọi API.

**TC-SET-022 · Sửa Business Name kích hoạt nút Save** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Xóa nội dung `Business Name`, nhập giá trị mới hợp lệ. 2) Quan sát nút `"Save Changes"`.
- Kết quả mong đợi: Nút chuyển sang enabled ngay khi giá trị khác giá trị gốc.

**TC-SET-023 · Lưu thành công thông tin Business Information** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Điều kiện tiên quyết: Có quyền chỉnh sửa Settings.
- Các bước: 1) Sửa `Business Name` và `City` thành giá trị hợp lệ mới. 2) Click `"Save Changes"`. 3) Chờ phản hồi. 4) Reload trang.
- Kết quả mong đợi: Hiển thị thông báo thành công; nút Save trở lại disabled; sau reload các giá trị mới được giữ nguyên (đã persist xuống backend).

**TC-SET-024 · Nút Cancel hoàn tác thay đổi chưa lưu** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Sửa `Business Name`, `Address`, `Zip`. 2) Click `"Cancel"` của card Business Information.
- Kết quả mong đợi: Tất cả trường trong card quay về giá trị gốc; nút `"Save Changes"` trở lại disabled; các card khác không bị ảnh hưởng.

**TC-SET-025 · Cancel chỉ tác động trong phạm vi card của nó** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Sửa `Business Name` (card Business Information) **và** `Phone` (card Contact Owner). 2) Click `"Cancel"` của card Business Information.
- Kết quả mong đợi: Chỉ card Business Information reset; giá trị `Phone` đã sửa ở card Contact Owner vẫn còn và nút Save của card đó vẫn enabled.

**TC-SET-026 · Bỏ trống trường bắt buộc Business Name** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Xóa sạch `Business Name`. 2) Click `"Save Changes"`.
- Kết quả mong đợi: Hiển thị lỗi validation dưới trường (vd "required"); không gửi request lưu; dữ liệu cũ trên server không đổi.

**TC-SET-027 · Nhập chuỗi rất dài vào Business Name / Address** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Nhập chuỗi 500 ký tự vào `Business Name` và `Address`. 2) Click `"Save Changes"`.
- Kết quả mong đợi: Có giới hạn maxlength rõ ràng hoặc thông báo lỗi độ dài; UI không vỡ layout; không gây lỗi 500.

**TC-SET-028 · Nhập ký tự đặc biệt / unicode / tiếng Việt có dấu** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Nhập `Business Name` = `Tiệm Nail Bảo Châu & Co. <#1>`. 2) Lưu và reload.
- Kết quả mong đợi: Lưu thành công, hiển thị đúng nguyên văn sau reload (không bị escape sai thành `&amp;` hay mất dấu).

**TC-SET-029 · Zip nhận giá trị không phải số** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Các bước: 1) Nhập `Zip` = `abcde`. 2) Click `"Save Changes"`.
- Kết quả mong đợi: Có validation định dạng zip (chặn hoặc cảnh báo) — nếu backend chấp nhận tự do thì ghi nhận là hành vi thiết kế; không crash.

**TC-SET-030 · Chọn Country cập nhật danh sách State** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click dropdown `Country` (đang là `"Argentina"`). 2) Chọn một quốc gia khác (vd `United States`). 3) Mở dropdown `State`.
- Kết quả mong đợi: Danh sách State làm mới theo quốc gia vừa chọn; State cũ không còn hợp lệ bị clear hoặc reset; nút Save enabled.

**TC-SET-031 · Dropdown Country hỗ trợ tìm kiếm / cuộn danh sách dài** — Mức độ ưu tiên: Thấp · Loại: Giao diện

- Các bước: 1) Mở dropdown `Country`. 2) Gõ vài ký tự (nếu có ô tìm kiếm) hoặc cuộn danh sách.
- Kết quả mong đợi: Danh sách quốc gia cuộn được, lọc đúng theo từ khóa nếu hỗ trợ; đóng dropdown bằng `Escape` hoặc click ra ngoài. _(Ghi chú: script tự động click dropdown này bị timeout — cần kiểm tra thủ công.)_

### D. Tab Business Profile — Card `Business Hours`

**TC-SET-035 · Hiển thị đủ 7 ngày với giờ mở/đóng hiện tại** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Quan sát card `"Business Hours"`.
- Kết quả mong đợi: Hiển thị mô tả _"Opening hours shown on booking pages and receipts. A closed day is hidden from customers."_; đúng 7 dòng Monday → Sunday theo thứ tự; mỗi dòng có toggle trạng thái mở + 2 ô giờ; ngày tắt hiển thị `Closed` thay vì khung giờ.

**TC-SET-036 · Tắt toggle một ngày chuyển sang trạng thái Closed** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Tắt toggle `"Monday open status"`. 2) Quan sát dòng Monday.
- Kết quả mong đợi: 2 ô chọn giờ của Monday bị ẩn/disable, dòng hiển thị `Closed`; nút `"Save Changes"` enabled.

**TC-SET-037 · Bật lại toggle cho ngày đang đóng** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Điều kiện tiên quyết: Sunday đang ở trạng thái `Closed`.
- Các bước: 1) Bật toggle `"Sunday open status"`. 2) Quan sát dòng Sunday.
- Kết quả mong đợi: Hai ô chọn giờ xuất hiện với giá trị mặc định hợp lý (hoặc trống chờ chọn); có thể chọn giờ; nút Save enabled.

**TC-SET-038 · Time picker hiển thị đúng cấu trúc giờ / phút / AM-PM** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: 1) Click ô giờ mở cửa của Monday (`"Select time"`). 2) Quan sát popup.
- Kết quả mong đợi: Popup có 3 cột cuộn — giờ `01`–`12`, phút bước 15 (`00`, `15`, `30`, `45`), và `AM`/`PM`; giá trị hiện tại được highlight.

**TC-SET-039 · Đổi giờ mở cửa và lưu thành công** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Đổi giờ mở Monday từ `7:00 AM` sang `9:30 AM`. 2) Click `"Save Changes"`. 3) Reload trang.
- Kết quả mong đợi: Thông báo thành công; sau reload Monday hiển thị `9:30 AM — 8:00 PM`.

**TC-SET-040 · Giờ đóng sớm hơn giờ mở** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Đặt Tuesday: giờ mở `9:00 PM`, giờ đóng `7:00 AM`. 2) Click `"Save Changes"`.
- Kết quả mong đợi: Hệ thống báo lỗi khoảng giờ không hợp lệ và chặn lưu, **hoặc** hỗ trợ ca qua đêm và ghi rõ điều đó trên UI — cần xác minh và ghi nhận hành vi thực tế.

**TC-SET-041 · Giờ mở trùng giờ đóng** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Đặt Wednesday: mở `8:00 AM`, đóng `8:00 AM`. 2) Lưu.
- Kết quả mong đợi: Bị chặn với thông báo rõ ràng (khoảng giờ bằng 0), hoặc được coi là mở 24h nếu đó là thiết kế — không được lưu âm thầm một khoảng giờ vô nghĩa.

**TC-SET-042 · Đóng cửa cả 7 ngày** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Tắt toggle của cả 7 ngày. 2) Lưu. 3) Reload.
- Kết quả mong đợi: Hoặc lưu được (cửa hàng đóng toàn tuần, booking page không hiển thị giờ nào), hoặc có cảnh báo yêu cầu ít nhất 1 ngày mở — không crash và trạng thái sau reload khớp với thao tác.

### E. Tab Business Profile — Card `Payroll Period`

**TC-SET-045 · Hiển thị kỳ payroll hiện tại đúng định dạng ngày** — Mức độ ưu tiên: Cao · Loại: Dữ liệu

- Các bước: Quan sát dòng `Current period` trong card `"Payroll Period"`.
- Kết quả mong đợi: Hiển thị dạng `MMM D, YYYY — MMM D, YYYY` (vd `Jul 25, 2026 — Aug 19, 2026`); ngày kết thúc luôn sau ngày bắt đầu; badge loại kỳ khớp với `Period Type` đang chọn.

**TC-SET-046 · Chọn Period Type = Weekly** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click `"Weekly"` ở bước 1 `Period Type`. 2) Quan sát bước 2 `Payroll Dates` và dòng `Current period`.
- Kết quả mong đợi: `"Weekly"` được đánh dấu chọn; UI bước 2 điều chỉnh phù hợp với chu kỳ tuần (chọn thứ trong tuần thay vì ngày trong tháng, hoặc ẩn lưới ngày); `Current period` cập nhật lại khoảng 7 ngày.

**TC-SET-047 · Chọn Period Type = Bi-weekly / Monthly** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Chọn `"Bi-weekly"`, quan sát. 2) Chọn `"Monthly"`, quan sát.
- Kết quả mong đợi: Mỗi lựa chọn chỉ có 1 giá trị được chọn tại một thời điểm; `Current period` cập nhật thành khoảng ~14 ngày và ~1 tháng tương ứng; bước 2 hiển thị/ẩn phù hợp với từng loại.

**TC-SET-048 · Chọn Period Type = Custom hiển thị lưới Payroll Dates** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Chọn `"Custom"`. 2) Quan sát bước 2.
- Kết quả mong đợi: Bước 2 `Payroll Dates` hiển thị với mô tả _"Pick up to 4 days of the month when payroll is processed."_ và đủ lưới nút `Day 1` → `Day 31`; dòng đếm hiển thị số ngày đang chọn dạng `"<n> of 4 days selected"`.

**TC-SET-049 · Chọn / bỏ chọn ngày trong lưới Payroll Dates** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Điều kiện tiên quyết: `Period Type` = `Custom`, đang chọn 2 ngày.
- Các bước: 1) Click `"Day 10"` để chọn thêm. 2) Click lại `"Day 10"` để bỏ chọn.
- Kết quả mong đợi: Sau bước 1 dòng đếm thành `3 of 4 days selected` và nút Day 10 ở trạng thái selected; sau bước 2 trở lại `2 of 4 days selected`, nút bỏ highlight.

**TC-SET-050 · Giới hạn tối đa 4 ngày payroll** — Mức độ ưu tiên: Cao · Loại: Biên

- Các bước: 1) Chọn đủ 4 ngày (`4 of 4 days selected`). 2) Thử click chọn ngày thứ 5.
- Kết quả mong đợi: Ngày thứ 5 không được chọn — các nút chưa chọn bị disable hoặc hiển thị cảnh báo giới hạn; bộ đếm không vượt quá 4.

**TC-SET-051 · Không chọn ngày payroll nào khi Period Type = Custom** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Các bước: 1) Bỏ chọn hết ngày (`0 of 4 days selected`). 2) Click `"Save Changes"`.
- Kết quả mong đợi: Bị chặn với thông báo yêu cầu chọn ít nhất 1 ngày; không lưu cấu hình payroll rỗng.

**TC-SET-052 · Chọn Day 29/30/31 với tháng ngắn** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Chọn `"Day 31"` làm ngày payroll. 2) Lưu. 3) Kiểm tra `Current period` cho tháng chỉ có 28/30 ngày (vd tháng 2).
- Kết quả mong đợi: Hệ thống xử lý hợp lý (lùi về ngày cuối tháng) và hiển thị chú thích, không sinh ngày không tồn tại như `Feb 31`.

**TC-SET-053 · Lưu cấu hình Payroll Period và kiểm tra ảnh hưởng sang màn Payroll** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Đổi Period Type và ngày payroll, lưu thành công. 2) Sang màn hình `/pos/<STORE_ID>/payroll`. 3) Quan sát khoảng kỳ payroll hiển thị.
- Kết quả mong đợi: Kỳ payroll trên màn Payroll khớp với cấu hình vừa lưu.

### F. Tab Business Profile — Card `Contact Owner`

**TC-SET-058 · Hiển thị đúng 3 trường liên hệ với type input phù hợp** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Quan sát card `"Contact Owner"`.
- Kết quả mong đợi: `Phone` là `input[type=tel]` placeholder `(205) 555-0123`; `Email` là `input[type=email]` placeholder `email@example.com`; `Website URL` là `input[type=url]` placeholder `https://example.com`; có cặp nút Cancel/Save riêng.

**TC-SET-059 · Nhập email sai định dạng** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Nhập `Email` = `test@@email`. 2) Click `"Save Changes"`.
- Kết quả mong đợi: Hiển thị lỗi định dạng email; không gửi request lưu; giá trị cũ trên server giữ nguyên.

**TC-SET-060 · Nhập số điện thoại sai định dạng / chứa chữ** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Nhập `Phone` = `abc-123`. 2) Lưu.
- Kết quả mong đợi: Bị chặn với thông báo định dạng số điện thoại; hoặc input tự lọc ký tự không hợp lệ khi gõ.

**TC-SET-061 · Auto-format số điện thoại theo mẫu (xxx) xxx-xxxx** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: 1) Nhập `Phone` = `2052220003` (chỉ chữ số). 2) Rời khỏi ô nhập.
- Kết quả mong đợi: Giá trị hiển thị được format thành `(205) 222-0003` khớp với mẫu placeholder.

**TC-SET-062 · Nhập Website URL thiếu scheme** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Các bước: 1) Nhập `Website URL` = `google.com` (không có `https://`). 2) Lưu.
- Kết quả mong đợi: Hoặc tự thêm `https://`, hoặc báo lỗi yêu cầu URL đầy đủ — hành vi phải nhất quán và không lưu URL hỏng.

**TC-SET-063 · Lưu thành công thông tin liên hệ chủ cửa hàng** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Cập nhật cả 3 trường bằng giá trị hợp lệ. 2) Click `"Save Changes"`. 3) Reload.
- Kết quả mong đợi: Thông báo thành công; sau reload cả 3 giá trị mới được giữ nguyên.

**TC-SET-064 · Xóa trống toàn bộ trường liên hệ** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Xóa sạch `Phone`, `Email`, `Website URL`. 2) Lưu.
- Kết quả mong đợi: Nếu là trường bắt buộc → báo lỗi rõ ràng cho từng trường; nếu tùy chọn → lưu được và hiển thị placeholder sau reload. Ghi nhận hành vi thực tế.

### G. Tab Business Profile — Card `Business Photos`

**TC-SET-068 · Hiển thị ảnh logo và welcome sign hiện tại** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Quan sát card `"Business Photos"`.
- Kết quả mong đợi: Hiển thị mô tả _"Your branding appears on receipts, booking pages, and customer communications."_; 2 vùng ảnh có nhãn `Business logo` và `Welcome sign image`; ảnh hiện tại render đúng tỉ lệ, không vỡ/không bị kéo giãn.

**TC-SET-069 · Upload logo mới với ảnh hợp lệ** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click vùng `Business logo`, chọn file PNG/JPG hợp lệ (vd 500KB). 2) Chờ upload. 3) Click `"Save Changes"`. 4) Reload.
- Kết quả mong đợi: Preview cập nhật ngay sau khi chọn file; lưu thành công; sau reload ảnh mới vẫn hiển thị.

**TC-SET-070 · Upload file không phải ảnh** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Chọn file `.pdf` hoặc `.txt` cho `Business logo`.
- Kết quả mong đợi: File bị từ chối (input có `accept` lọc sẵn, hoặc có thông báo lỗi định dạng); ảnh hiện tại không bị thay/xóa.

**TC-SET-071 · Upload ảnh vượt quá giới hạn dung lượng** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Chọn ảnh dung lượng lớn (vd 20MB) cho `Welcome sign image`. 2) Quan sát.
- Kết quả mong đợi: Hiển thị lỗi giới hạn dung lượng với con số cụ thể; không treo UI; không gửi request upload thất bại lặp lại.

**TC-SET-072 · Upload ảnh tỉ lệ bất thường (rất rộng / rất cao)** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: 1) Upload ảnh 3000×100 px cho `Welcome sign image`.
- Kết quả mong đợi: Preview co giãn trong khung, không phá vỡ layout card; nếu có yêu cầu tỉ lệ tối thiểu thì phải báo trước khi lưu.

**TC-SET-073 · Cancel sau khi chọn ảnh mới nhưng chưa lưu** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Chọn ảnh mới cho `Business logo`. 2) Click `"Cancel"` của card Business Photos.
- Kết quả mong đợi: Preview quay lại ảnh cũ; nút Save trở lại disabled; ảnh trên server không đổi.

### H. Tab POS Package

**TC-SET-080 · Hiển thị gói hiện tại và ngày kích hoạt** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Mở tab `"POS Package"`, quan sát dòng đầu.
- Kết quả mong đợi: Hiển thị `Current Package:` + badge tên gói + `Active since <MMM D, YYYY> (UTC+7)`; tên gói trong badge trùng với tên card có badge `Current`.

**TC-SET-081 · Card gói đang dùng được highlight và nút bị vô hiệu hóa** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Quan sát card gói đang dùng (mẫu: `GO POS DELUXE`).
- Kết quả mong đợi: Card có viền/nền highlight khác các card còn lại; có badge `Current`; nút hiển thị `"Current Plan"` ở trạng thái disabled (không phải `"Select Plan"`).

**TC-SET-082 · Chỉ có đúng một gói được đánh dấu Current** — Mức độ ưu tiên: Cao · Loại: Dữ liệu

- Các bước: Đếm số badge `Current` và số nút `"Current Plan"` trên toàn tab.
- Kết quả mong đợi: Đúng 1 badge `Current` và 1 nút `"Current Plan"`; tất cả card còn lại đều có nút `"Select Plan"` enabled.

**TC-SET-083 · Mỗi card gói hiển thị đủ thành phần chuẩn** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Duyệt qua tất cả card gói.
- Kết quả mong đợi: Mỗi card có tên gói, mô tả (có thể rỗng với gói test), danh sách 5 tính năng tóm tắt kèm icon ✔/✘ (`Card Payment`, `Cash Payment`, `GiftCard Payment`, `Other Payment`, `Split Order`), link `"View all 62 features"`, và một nút hành động.

**TC-SET-084 · Mở modal "View all 62 features"** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click `"View all 62 features"` trên card `GO POS BASIC`. 2) Quan sát modal.
- Kết quả mong đợi: Modal mở với tiêu đề = tên gói và mô tả gói; danh sách tính năng gom theo nhóm (`Payment & Transaction Features`, `Employee Management`, `Services & Products`, `Tax & Pricing Rules`, `Promo & Reward`, `Timekeeping`, `Receipt`, `Reporting`, `Batches`, `Print Check`, `Turn Suggestion`, `Shortcuts`, `Device Management`, `Integration`, `Fastboy Support`); có nút `"Select This Package"` và `"Close"`.

**TC-SET-085 · Modal tính năng hiển thị đúng dữ liệu của gói được click** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Mở modal từ card `GO POS BASIC`, ghi nhận các tính năng bật/tắt. 2) Đóng modal. 3) Mở modal từ card `GO POS PREMIUM`.
- Kết quả mong đợi: Tiêu đề và danh sách tính năng thay đổi theo đúng gói được click; gói PREMIUM có nhiều tính năng bật hơn BASIC (đúng như phần tóm tắt trên card).

**TC-SET-086 · Đóng modal tính năng bằng nút Close, Escape và click nền** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: 1) Mở modal, click `"Close"`. 2) Mở lại, nhấn `Escape`. 3) Mở lại, click vùng overlay ngoài modal.
- Kết quả mong đợi: Cả 3 cách đều đóng modal, quay lại tab POS Package nguyên trạng; không còn overlay chặn thao tác; focus trả về nút đã mở modal.

**TC-SET-087 · Bấm "Select Plan" trên gói khác gói hiện tại** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Điều kiện tiên quyết: Đang dùng `GO POS DELUXE`; **cẩn trọng — thao tác này đổi gói thật trên môi trường DEV**.
- Các bước: 1) Click `"Select Plan"` trên `GO POS PREMIUM`. 2) Quan sát phản hồi.
- Kết quả mong đợi: Hiển thị bước xác nhận (modal xác nhận đổi gói / luồng thanh toán) trước khi áp dụng — **không được** đổi gói ngay lập tức không cảnh báo. Ghi nhận luồng thực tế (chưa xác minh khi quét).

**TC-SET-088 · Hủy giữa chừng luồng đổi gói** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click `"Select Plan"` trên một gói khác. 2) Ở bước xác nhận, chọn hủy/đóng.
- Kết quả mong đợi: Gói hiện tại không đổi; badge `Current` và dòng `Current Package:` giữ nguyên sau reload.

**TC-SET-089 · Bấm "Select This Package" từ trong modal tính năng** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Mở modal `"View all 62 features"` của một gói khác. 2) Click `"Select This Package"`.
- Kết quả mong đợi: Cho ra cùng luồng xác nhận như nút `"Select Plan"` trên card; không có hai luồng khác nhau cho cùng một hành động.

**TC-SET-090 · Gói có tên/mô tả rỗng hoặc rác vẫn render an toàn** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: Quan sát các card có tên bất thường trên DEV (`123`, `1`, `TEST`, `HIHI`, `Copy of 2`, gói không có mô tả).
- Kết quả mong đợi: Card vẫn giữ đúng layout, không sập chiều cao, không hiện `undefined`/`null`; test không được hard-code số lượng gói hay tên gói cụ thể.

### I. Tab Payment & Transactions — `Payment Methods`

**TC-SET-095 · Hiển thị đủ 4 phương thức thanh toán kèm mô tả** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Mở tab `"Payment & Transactions"`, quan sát card `Payment Methods`.
- Kết quả mong đợi: 4 toggle với nhãn và mô tả đúng: `Credit Card` — _Visa, Mastercard, Amex, Discover_; `Cash` — _Physical cash accepted at the drawer_; `Gift Cards` — _Store-issued gift cards and balances_; `Others` — _Checks, external terminals, house account_.

**TC-SET-096 · Tắt/bật một phương thức thanh toán và lưu** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Tắt toggle `Gift Cards`. 2) Click `"Save Changes"`. 3) Reload tab.
- Kết quả mong đợi: Nút Save enabled sau khi toggle; lưu thành công có thông báo; sau reload toggle `Gift Cards` vẫn ở trạng thái tắt.

**TC-SET-097 · Tắt tất cả phương thức thanh toán** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Tắt cả 4 toggle. 2) Click `"Save Changes"`.
- Kết quả mong đợi: Bị chặn với thông báo yêu cầu bật ít nhất 1 phương thức (nếu không, POS sẽ không thể thanh toán) — đây là kịch bản rủi ro cao, cần xác minh kỹ.

**TC-SET-098 · Cancel hoàn tác thay đổi phương thức thanh toán** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Tắt `Cash` và `Others`. 2) Click `"Cancel"` của card Payment Methods.
- Kết quả mong đợi: Cả 2 toggle trở về trạng thái ban đầu; nút Save disabled; card Tipping Settings bên dưới không bị ảnh hưởng.

### J. Tab Payment & Transactions — `Tipping Settings`

**TC-SET-102 · Tắt Tip Acceptance ẩn/vô hiệu hóa các bước cấu hình tip** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Tắt toggle `Tip Acceptance`. 2) Quan sát các mục 1 `Tip Timing`, 2 `Tip Presets`, 3 `Default Split Tip Method` và panel preview.
- Kết quả mong đợi: Ba mục con bị ẩn hoặc disable (khớp mô tả _"When off, the tip screen is skipped at checkout and no tip is collected on any order."_); panel `TIP SCREEN PREVIEW` phản ánh việc bỏ qua màn hình tip.

**TC-SET-103 · Chọn Tip Timing = Before Payment (SALE)** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Chọn radio `Before Payment`. 2) Quan sát badge và chuỗi bước.
- Kết quả mong đợi: Chỉ `Before Payment` được chọn; hiển thị badge `SALE` và chuỗi `Order › Tip › Sale`; radio `After Payment` bỏ chọn; nút Save enabled.

**TC-SET-104 · Chọn Tip Timing = After Payment (AUTHORIZE)** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Chọn radio `After Payment`. 2) Quan sát.
- Kết quả mong đợi: Hiển thị badge `AUTHORIZE` và chuỗi `Order › Authorize › Tip › Capture`; hai radio loại trừ lẫn nhau (không thể chọn cả hai).

**TC-SET-105 · Chuyển chế độ preset Percentage ↔ Fixed Amount** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click `"Fixed Amount"`. 2) Quan sát các chip preset. 3) Click lại `"Percentage"`.
- Kết quả mong đợi: Ở chế độ `Fixed Amount`, các chip hiển thị dạng tiền (`$…`) thay vì `%`; chuyển lại `Percentage` khôi phục dạng `%`; nút chế độ đang chọn được highlight.

**TC-SET-106 · Xóa một tip preset** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click `"Remove 35% tip preset"`. 2) Quan sát danh sách chip và panel preview.
- Kết quả mong đợi: Chip `35%` biến mất khỏi danh sách; panel `TIP SCREEN PREVIEW` cũng bỏ ô `35% $14.70`; nút Save enabled.

**TC-SET-107 · Thêm tip preset mới hợp lệ** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click nút `"Add"`. 2) Nhập giá trị `18`. 3) Xác nhận. 4) Lưu và reload.
- Kết quả mong đợi: Chip `18%` xuất hiện trong danh sách; preview có thêm ô `18%` với số tiền tính trên subtotal $42.00 (`$7.56`); sau reload preset vẫn còn.

**TC-SET-108 · Thêm tip preset trùng với preset đã có** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Các bước: 1) Click `"Add"`, nhập `20` (đã có chip `20%`). 2) Xác nhận.
- Kết quả mong đợi: Bị chặn với thông báo trùng, hoặc không tạo chip thứ hai — danh sách không được có 2 chip giống nhau.

**TC-SET-109 · Thêm tip preset giá trị âm hoặc lớn bất thường** — Mức độ ưu tiên: Cao · Loại: Biên

- Các bước: 1) Thử thêm preset `-10`. 2) Thử thêm preset `999`. 3) Thử thêm preset `0`.
- Kết quả mong đợi: Giá trị âm bị chặn; giá trị vượt ngưỡng hợp lý (vd > 100%) bị chặn hoặc cảnh báo; `0` bị chặn hoặc xử lý rõ ràng; không có preset vô nghĩa lọt vào preview.

**TC-SET-110 · Xóa hết tip preset** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Xóa lần lượt tất cả chip preset. 2) Quan sát preview và thử lưu.
- Kết quả mong đợi: Hoặc bị chặn (yêu cầu tối thiểu 1 preset), hoặc preview chỉ còn `No tip` / `Custom` — không hiển thị vùng preset rỗng vỡ layout.

**TC-SET-111 · Chọn Default Split Tip Method = Split Evenly** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Chọn radio `Split Evenly`. 2) Quan sát ví dụ minh họa.
- Kết quả mong đợi: Radio `Split Evenly` được chọn, `Proportion` bỏ chọn; ví dụ hiển thị `Ann $15 · Ben $15` (chia đều $30 tip).

**TC-SET-112 · Chọn Default Split Tip Method = Proportion** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Chọn radio `Proportion`. 2) Quan sát ví dụ.
- Kết quả mong đợi: Ví dụ hiển thị `Ann $20 · Ben $10` — đúng tỉ lệ dịch vụ $80 / $40 trên tổng tip $30.

**TC-SET-113 · Lưu toàn bộ cấu hình Tipping Settings** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Đổi Tip Timing, xóa 1 preset, thêm 1 preset, đổi Split Method. 2) Click `"Save Changes"`. 3) Reload tab.
- Kết quả mong đợi: Thông báo thành công; sau reload tất cả 4 thay đổi được giữ nguyên chính xác.

### K. Tab Payment & Transactions — `Signature Settings`

**TC-SET-118 · Tắt Require Signature ẩn/vô hiệu hóa Signature Timing** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Tắt toggle `Require Signature`. 2) Quan sát mục `Signature Timing`.
- Kết quả mong đợi: Nhóm radio `Before Payment` / `After Payment` bị ẩn hoặc disable, khớp mô tả _"When enabled, customers must sign during POS checkout."_

**TC-SET-119 · Chọn Signature Timing = Before Payment** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Điều kiện tiên quyết: `Require Signature` đang bật.
- Các bước: 1) Chọn radio `Before Payment`. 2) Quan sát chuỗi bước.
- Kết quả mong đợi: Hiển thị chuỗi `Order › Sign › Charge`; `After Payment` bỏ chọn.

**TC-SET-120 · Chọn Signature Timing = After Payment** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Chọn radio `After Payment`. 2) Quan sát.
- Kết quả mong đợi: Hiển thị chuỗi `Order › Charge › Sign`; hai radio loại trừ lẫn nhau.

**TC-SET-121 · Lưu và giữ trạng thái Signature Settings sau reload** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Bật `Require Signature`, chọn `After Payment`. 2) Lưu. 3) Reload tab.
- Kết quả mong đợi: Toggle vẫn bật và radio `After Payment` vẫn được chọn.

### L. Tab Payment & Transactions — `Tax & Pricing`

**TC-SET-125 · Hiển thị 3 trường tỉ lệ với giá trị hiện tại** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Quan sát card `Tax & Pricing`.
- Kết quả mong đợi: Có `Tax Rate (%)`, `Cash Discount (%)`, `Service Fee (%)` với giá trị số hiện tại (mẫu `10`); mô tả _"Rates applied to every order on this location."_; cặp nút Cancel/Save riêng.

**TC-SET-126 · Cập nhật Tax Rate hợp lệ và lưu** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Đổi `Tax Rate (%)` thành `8.25`. 2) Lưu. 3) Reload.
- Kết quả mong đợi: Lưu thành công, chấp nhận số thập phân; sau reload hiển thị `8.25`.

**TC-SET-127 · Nhập giá trị âm cho các trường %** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Nhập `-5` vào `Tax Rate (%)`. 2) Lưu.
- Kết quả mong đợi: Bị chặn với thông báo giá trị không hợp lệ; không lưu số âm.

**TC-SET-128 · Nhập giá trị > 100 cho các trường %** — Mức độ ưu tiên: Cao · Loại: Biên

- Các bước: 1) Nhập `150` vào `Cash Discount (%)`. 2) Lưu.
- Kết quả mong đợi: Bị chặn hoặc cảnh báo vượt ngưỡng 100%; không lưu giá trị phi lý ảnh hưởng tính tiền.

**TC-SET-129 · Nhập ký tự chữ vào trường %** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Các bước: 1) Gõ `abc` vào `Service Fee (%)`. 2) Quan sát ô nhập và thử lưu.
- Kết quả mong đợi: Input chặn ký tự không phải số (hoặc báo lỗi validation); nút Save không cho lưu giá trị rác.

**TC-SET-130 · Nhập 0 cho cả 3 trường** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Đặt cả 3 trường = `0`. 2) Lưu và reload.
- Kết quả mong đợi: Lưu được (0% là hợp lệ — không áp thuế/phí); sau reload hiển thị `0`, không hiển thị ô trống.

**TC-SET-131 · Nhập số thập phân nhiều chữ số** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: 1) Nhập `Tax Rate (%)` = `8.123456`. 2) Lưu và reload.
- Kết quả mong đợi: Hệ thống làm tròn theo quy tắc nhất quán (vd 2 chữ số thập phân) và hiển thị đúng giá trị đã làm tròn sau reload; không lưu một giá trị khác với giá trị hiển thị.

### M. Panel `TIP SCREEN PREVIEW`

**TC-SET-135 · Preview hiển thị đúng cấu trúc màn hình tip của terminal** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Quan sát panel bên phải tab Payment & Transactions.
- Kết quả mong đợi: Có nhãn `TIP SCREEN PREVIEW` + badge `Read-only`; nội dung mô phỏng: `9:41`, `Add a tip`, `Subtotal $42.00`, các ô preset, `No tip`, `Custom`, footer `VOLT TERMINAL`; chú thích _"Updates live from Tipping Settings…"_.

**TC-SET-136 · Preview cập nhật realtime khi thêm/xóa preset** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Xóa chip `10%`. 2) Quan sát preview ngay lập tức (chưa bấm Save). 3) Thêm preset `18%`. 4) Quan sát preview.
- Kết quả mong đợi: Ô `10% $4.20` biến mất ngay không cần lưu; ô `18%` xuất hiện ngay với số tiền đúng; preview đồng bộ tức thời với Tipping Settings.

**TC-SET-137 · Số tiền trong preview tính đúng theo subtotal $42.00** — Mức độ ưu tiên: Cao · Loại: Dữ liệu

- Các bước: Đối chiếu từng ô preset với công thức `42.00 × %`.
- Kết quả mong đợi: `10% → $4.20`, `15% → $6.30`, `20% → $8.40`, `25% → $10.50`, `30% → $12.60`, `35% → $14.70`; định dạng tiền luôn 2 chữ số thập phân có tiền tố `$`.

**TC-SET-138 · Preview đổi sang dạng tiền khi chuyển chế độ Fixed Amount** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Click `"Fixed Amount"` ở Tip Presets. 2) Quan sát preview.
- Kết quả mong đợi: Các ô preset trong preview hiển thị số tiền cố định (không còn dòng `%`); phần `Subtotal $42.00` giữ nguyên.

**TC-SET-139 · Preview là read-only, không nhận tương tác** — Mức độ ưu tiên: Thấp · Loại: Giao diện

- Các bước: 1) Thử click vào ô `20%`, `No tip`, `Custom` trong preview.
- Kết quả mong đợi: Không có phản hồi thay đổi trạng thái/không gửi request — đúng với badge `Read-only`.

### N. Tab Role & Permission

**TC-SET-145 · Hiển thị đúng ma trận 7 nhóm quyền × 4 vai trò** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Mở tab `"Role & Permission"`, quan sát bảng.
- Kết quả mong đợi: Cột đầu `Access`; 4 cột `Owner`, `Manager`, `Partner`, `Staff`; 7 dòng nhóm theo thứ tự `Reporting`, `Order Management`, `Batch Management`, `Cash Management`, `Settings`, `Payment`, `Privacy`; mỗi ô là một checkbox có aria-label `"Toggle <Nhóm> for <Vai trò>"`.

**TC-SET-146 · Expand All hiển thị đầy đủ quyền con** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click `"Expand All"`. 2) Quan sát các nhóm mở ra.
- Kết quả mong đợi: Nút đổi thành `"Collapse All"`; hiển thị đúng các quyền con — `Reporting`: `Summary Income`, `Daily Income`, `Staff Income`, `Staff Payroll`, `Batch History`, `View Time Tracking`; `Order Management`: `Cancel Order / Void`, `Refund`, `Edit Order`; `Batch Management`: `Batch Close`; `Cash Management`: `Open Cash Drawer`; `Settings`: `Settings`; `Payment`: `Completed Payment`; `Privacy`: `View Phone Number`.

**TC-SET-147 · Collapse All thu gọn toàn bộ nhóm** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Điều kiện tiên quyết: Đang ở trạng thái expanded.
- Các bước: 1) Click `"Collapse All"`.
- Kết quả mong đợi: Tất cả quyền con ẩn đi, chỉ còn 7 dòng nhóm; nút đổi lại thành `"Expand All"`.

**TC-SET-148 · Mở rộng / thu gọn từng nhóm riêng lẻ** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Click mũi tên bên cạnh `Order Management`. 2) Quan sát. 3) Click lại.
- Kết quả mong đợi: Chỉ nhóm `Order Management` mở/đóng; các nhóm khác giữ nguyên trạng thái.

**TC-SET-149 · Tick checkbox nhóm tự động tick toàn bộ quyền con** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Expand `Reporting`. 2) Tick `"Toggle Reporting for Manager"`. 3) Quan sát 6 quyền con của Reporting ở cột Manager.
- Kết quả mong đợi: Cả 6 quyền con được tick theo; checkbox nhóm ở trạng thái checked (không indeterminate).

**TC-SET-150 · Bỏ tick một quyền con đưa checkbox nhóm về trạng thái indeterminate** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Điều kiện tiên quyết: Nhóm `Reporting` cho `Owner` đang tick toàn bộ.
- Các bước: 1) Bỏ tick quyền con `Staff Payroll` ở cột Owner. 2) Quan sát checkbox nhóm `Reporting` cột Owner.
- Kết quả mong đợi: Checkbox nhóm chuyển sang trạng thái một-phần (indeterminate / dấu gạch), không phải checked hay unchecked hoàn toàn.

**TC-SET-151 · "Select All" theo cột vai trò** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click `"Select All"` dưới cột `Manager`. 2) Quan sát toàn bộ cột Manager.
- Kết quả mong đợi: Tất cả checkbox nhóm và quyền con của cột Manager được tick; link đổi thành `"Deselect All"`; các cột khác không đổi.

**TC-SET-152 · "Deselect All" theo cột vai trò** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Điều kiện tiên quyết: Cột `Owner` đang tick toàn bộ (link hiển thị `"Deselect All"`).
- Các bước: 1) Click `"Deselect All"` dưới cột `Owner`. 2) Quan sát.
- Kết quả mong đợi: Toàn bộ checkbox cột Owner bỏ tick; link đổi thành `"Select All"`; các cột khác giữ nguyên.

**TC-SET-153 · Link Select/Deselect All đổi nhãn theo trạng thái cột** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: 1) Với cột `Partner` (đang trống), quan sát nhãn link. 2) Tick thủ công toàn bộ quyền cột Partner. 3) Quan sát lại nhãn.
- Kết quả mong đợi: Ban đầu `"Select All"`; sau khi tick đủ, tự đổi thành `"Deselect All"` mà không cần click link.

**TC-SET-154 · Bỏ toàn bộ quyền của vai trò Owner** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) `"Deselect All"` cột `Owner`. 2) Click `"Save Changes"`.
- Kết quả mong đợi: Hệ thống cảnh báo/chặn (Owner không nên bị tước hết quyền, dễ khóa cứng cửa hàng), hoặc yêu cầu xác nhận rõ ràng — đây là kịch bản rủi ro cao cần xác minh.

**TC-SET-155 · Cancel hoàn tác toàn bộ thay đổi ma trận quyền** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Thay đổi nhiều checkbox ở nhiều cột. 2) Click `"Cancel"`.
- Kết quả mong đợi: Ma trận trở về đúng trạng thái ban đầu ở mọi ô (kể cả các quyền con đang mở rộng).

**TC-SET-156 · Lưu ma trận quyền và giữ nguyên sau reload** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Tick `"Toggle Order Management for Manager"` và quyền con `Refund` cho `Staff`. 2) Click `"Save Changes"`. 3) Reload tab, `"Expand All"`.
- Kết quả mong đợi: Thông báo thành công; sau reload cả quyền nhóm và quyền con vừa tick vẫn giữ nguyên trạng thái.

**TC-SET-157 · Trạng thái nút Save khi chưa thay đổi gì** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Tải mới tab `Role & Permission`. 2) Không thay đổi gì. 3) Kiểm tra nút `"Save Changes"`.
- Kết quả mong đợi: Nút nên ở trạng thái disabled như các card khác. **Khi quét, nút này đang enabled** → nếu vẫn enabled, xác minh đây là chủ ý hay lỗi dirty-state; nếu click phải không gây thay đổi dữ liệu.

**TC-SET-158 · Trạng thái quyền phản ánh đúng dữ liệu backend** — Mức độ ưu tiên: Cao · Loại: Dữ liệu

- Các bước: 1) Tải tab, `"Expand All"`. 2) Đối chiếu các ô đã tick với cấu hình quyền của store.
- Kết quả mong đợi: Trạng thái mẫu khi quét — Owner tick đủ 7 nhóm, Staff chỉ tick `Settings` và `Payment`, Manager/Partner trống — phải khớp với dữ liệu API; không có ô nào ở trạng thái mặc định sai khi API chưa trả về.

### O. Tab Configuration — `Compensation Default`

**TC-SET-165 · Hiển thị 3 sub-tab của Compensation Default** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Mở tab `"Configuration"`, quan sát card `Compensation Default`.
- Kết quả mong đợi: Mô tả _"Applied automatically to every staff member imported without an explicit compensation setting."_; 3 sub-tab `"Commission"`, `"Salary"`, `"Commission & Salary"`; một sub-tab được chọn sẵn (khi quét là `Salary`).

**TC-SET-166 · Chuyển sub-tab hiển thị đúng bộ trường tương ứng** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click sub-tab `"Commission"`. 2) Click `"Salary"`. 3) Click `"Commission & Salary"`.
- Kết quả mong đợi:
  - `Commission`: có `Commission Setting` (Service/Product/Gift Card), `Pay Split`, `Deduction Per Day`, `Card Fee Charge` (có `On Staff Commission (%)`); **không có** `Salary Setting`.
  - `Salary`: có `Salary Setting` (select + `Amount`), `Pay Split`, `Card Fee Charge` (**chỉ** `On Credit Card Tip (%)`); **không có** `Commission Setting`.
  - `Commission & Salary`: có **cả** `Salary Setting` và `Commission Setting`, `Pay Split`, `Card Fee Charge` đầy đủ, **cộng thêm** mục `Days Off Setting` với checkbox `Limit days off`.

**TC-SET-167 · Commission Owner (%) tự tính bù cho Staff (%)** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Điều kiện tiên quyết: Đang ở sub-tab `Commission`.
- Các bước: 1) Nhập `Service Commission - Staff (%)` = `60`. 2) Quan sát `Service Commission - Owner (%)`.
- Kết quả mong đợi: Ô Owner tự cập nhật thành `40` (tổng = 100) và ở trạng thái readonly; tương tự với Product và Gift Card.

**TC-SET-168 · Pay 2 (%) tự tính bù cho Pay 1 (%)** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Nhập `Pay 1 (%)` = `30`. 2) Quan sát `Pay 2 (%)`.
- Kết quả mong đợi: `Pay 2 (%)` tự thành `70` và readonly; không cho nhập trực tiếp vào Pay 2.

**TC-SET-169 · Nhập % commission ngoài khoảng 0–100** — Mức độ ưu tiên: Cao · Loại: Biên

- Các bước: 1) Nhập `Service Commission - Staff (%)` = `120`. 2) Nhập `-10`. 3) Quan sát ô Owner và thử lưu.
- Kết quả mong đợi: Bị chặn/kẹp về khoảng hợp lệ; ô Owner không được hiển thị giá trị âm (vd `-20`); không lưu cấu hình lương sai.

**TC-SET-170 · Select `Salary Setting` có đủ 3 lựa chọn** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Điều kiện tiên quyết: Sub-tab `Salary`.
- Các bước: 1) Mở select `Salary Setting`. 2) Liệt kê options.
- Kết quả mong đợi: Đúng 3 lựa chọn `Salary by Period`, `Wage Per Day`, `Wage Per Hour`; giá trị hiện tại được chọn sẵn.

**TC-SET-171 · Đổi Salary Setting cập nhật nhãn/ngữ nghĩa trường Amount** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Chọn `Wage Per Hour`. 2) Quan sát trường `Amount`. 3) Chọn `Wage Per Day`, quan sát tiếp.
- Kết quả mong đợi: Trường `Amount` vẫn nhận giá trị tiền; nếu có đơn vị/hậu tố (per hour / per day) thì phải cập nhật theo lựa chọn; giá trị đã nhập không bị mất bất ngờ.

**TC-SET-172 · Nhập Amount hợp lệ và lưu** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Ở sub-tab `Salary`, đặt `Amount` = `$600.00`. 2) Click `"Save Changes"`. 3) Reload tab Configuration.
- Kết quả mong đợi: Lưu thành công; sau reload hiển thị `$600.00` với đúng định dạng tiền tệ.

**TC-SET-173 · Nhập Amount / Deduction Per Day âm** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Nhập `Amount` = `-100`. 2) Nhập `Deduction Per Day` = `-5`. 3) Lưu.
- Kết quả mong đợi: Bị chặn với thông báo giá trị phải ≥ 0; không lưu số âm vào cấu hình lương.

**TC-SET-174 · Nhập Deduction Per Day lớn hơn Amount** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) `Amount` = `$100.00`, `Deduction Per Day` = `$500.00`. 2) Lưu.
- Kết quả mong đợi: Có cảnh báo hoặc chặn (khấu trừ vượt lương sẽ ra lương âm); nếu cho phép thì phải nêu rõ cách hệ thống xử lý.

**TC-SET-175 · Checkbox `Exclude tips on Check`** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Tick/bỏ tick `Exclude tips on Check`. 2) Lưu và reload.
- Kết quả mong đợi: Mô tả phụ _"Exclude tips from cash/check income"_ hiển thị đúng; trạng thái tick được giữ nguyên sau reload.

**TC-SET-176 · Card Fee Charge — `On Credit Card Tip (%)` và `On Staff Commission (%)`** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Ở sub-tab `Commission`, nhập `On Staff Commission (%)` = `1.5` và `On Credit Card Tip (%)` = `2`. 2) Lưu và reload.
- Kết quả mong đợi: Mô tả hiển thị _"…charge a fee on commission and/or tip paid by card."_; cả 2 giá trị được lưu và hiển thị đúng sau reload; ở sub-tab `Salary` mô tả chỉ nhắc tới tip và **không có** ô `On Staff Commission (%)`.

**TC-SET-177 · Checkbox `Add credit card tips on staff Pay 1`** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Tick checkbox. 2) Lưu và reload.
- Kết quả mong đợi: Trạng thái được giữ nguyên; checkbox này tồn tại ở cả 3 sub-tab và lưu độc lập theo từng sub-tab.

**TC-SET-178 · `Days Off Setting` chỉ có ở sub-tab Commission & Salary** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Kiểm tra sub-tab `Commission` và `Salary` xem có mục `Days Off Setting` không. 2) Chuyển sang `Commission & Salary`, kiểm tra lại. 3) Tick `Limit days off`, lưu, reload.
- Kết quả mong đợi: Mục `Days Off Setting` chỉ xuất hiện ở `Commission & Salary`; checkbox `Limit days off` lưu được và giữ trạng thái sau reload; nếu bật có thể hiện thêm ô nhập số ngày (cần xác minh).

**TC-SET-179 · Dữ liệu 3 sub-tab lưu độc lập, không đè lẫn nhau** — Mức độ ưu tiên: Cao · Loại: Dữ liệu

- Các bước: 1) Ghi nhận giá trị `Pay 1 (%)` của cả 3 sub-tab (mẫu: Commission `50`, Salary `20`, Commission & Salary `20`). 2) Đổi `Pay 1 (%)` ở sub-tab `Salary` thành `35`, lưu. 3) Kiểm tra `Pay 1 (%)` ở 2 sub-tab còn lại.
- Kết quả mong đợi: Chỉ giá trị của sub-tab `Salary` đổi; hai sub-tab kia giữ nguyên (field name có prefix riêng `commission.` / `salary.` / `commission_salary.`).

**TC-SET-180 · Chuyển sub-tab khi có thay đổi chưa lưu** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Sửa `Amount` ở sub-tab `Salary` nhưng không lưu. 2) Chuyển sang sub-tab `Commission`. 3) Quay lại `Salary`.
- Kết quả mong đợi: Giá trị đang nhập được giữ lại (hoặc có cảnh báo mất dữ liệu); không âm thầm mất thay đổi trong khi nút Save vẫn enabled.

### P. Tab Configuration — `Turn Suggestion`

**TC-SET-185 · Hiển thị card Turn Suggestion đầy đủ** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Quan sát card `"Turn Suggestion"`.
- Kết quả mong đợi: Mô tả _"Configure how turns are suggested in the POS app."_; trường `Turn Value` kèm chú thích _"Set to 0 to turn off turn suggestions."_; 2 toggle `Service-based Turn` (_Calculate turns based on services performed._) và `Decimal Turn` (_Allow fractional turn values._); cặp nút Cancel/Save.

**TC-SET-186 · Đặt Turn Value = 0 để tắt gợi ý lượt** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Nhập `Turn Value` = `0`. 2) Lưu và reload.
- Kết quả mong đợi: Lưu thành công, hiển thị `$0.00`; đây là trạng thái tắt gợi ý theo chú thích, không bị coi là lỗi validation.

**TC-SET-187 · Đặt Turn Value hợp lệ khác 0** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Nhập `Turn Value` = `150`. 2) Lưu và reload.
- Kết quả mong đợi: Hiển thị định dạng tiền `$150.00` sau reload.

**TC-SET-188 · Turn Value âm hoặc phi số** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Nhập `-50`. 2) Nhập `abc`. 3) Thử lưu ở mỗi trường hợp.
- Kết quả mong đợi: Cả hai đều bị chặn với thông báo rõ ràng; input tiền tự lọc ký tự không hợp lệ.

**TC-SET-189 · Toggle `Service-based Turn` và `Decimal Turn`** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Đổi trạng thái cả 2 toggle. 2) Lưu và reload.
- Kết quả mong đợi: Cả 2 trạng thái được giữ đúng sau reload; 2 toggle độc lập, đổi cái này không kéo theo cái kia.

**TC-SET-190 · Turn Value = 0 kết hợp với toggle đang bật** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: 1) Đặt `Turn Value` = `0` trong khi `Service-based Turn` đang bật. 2) Lưu.
- Kết quả mong đợi: Hoặc hai toggle bị disable khi Turn Value = 0 (vì gợi ý đã tắt), hoặc UI ghi rõ toggle không có tác dụng — trạng thái mâu thuẫn phải được xử lý tường minh.

### Q. Tab Configuration — `Terms of Service` & `Privacy Policy`

**TC-SET-195 · Hiển thị trạng thái nội dung hiện tại** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Quan sát 2 card `Terms of Service` và `Privacy Policy`.
- Kết quả mong đợi: Mỗi card có mô tả _"…content shown to customers in the POS app. Clear the content and save to restore the Fastboy default."_; dòng trạng thái (`Custom content saved` khi đã custom); nút `"Preview"` và `"Edit"`.

**TC-SET-196 · Mở modal Edit Terms of Service** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click `"Edit"` trên card `Terms of Service`. 2) Quan sát modal.
- Kết quả mong đợi: Modal tiêu đề `"Edit Terms of Service"` với mô tả _"Shown to customers in the POS app. Clear the content and save to restore the Fastboy default."_; ô `Content` chứa nội dung hiện tại; các nút `"Preview"`, `"Cancel"`, `"Save Changes"`, `"Close"`.

**TC-SET-197 · Sửa và lưu nội dung Terms of Service** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Mở modal Edit, sửa nội dung `Content`. 2) Click `"Save Changes"`. 3) Mở lại modal Edit.
- Kết quả mong đợi: Modal đóng sau khi lưu, có thông báo thành công; card hiển thị `Custom content saved`; mở lại modal thấy đúng nội dung vừa lưu.

**TC-SET-198 · Xóa trống nội dung để khôi phục mặc định Fastboy** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Mở modal Edit, xóa sạch ô `Content`. 2) Click `"Save Changes"`. 3) Quan sát card và mở lại modal.
- Kết quả mong đợi: Đúng như mô tả — nội dung quay về bản mặc định của Fastboy; dòng trạng thái không còn là `Custom content saved`; không lưu một chuỗi rỗng khiến POS hiển thị trang trắng.

**TC-SET-199 · Cancel / Close trong modal không lưu thay đổi** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Mở modal Edit, sửa nội dung. 2) Click `"Cancel"`. 3) Mở lại modal. 4) Lặp lại với nút `"Close"` và phím `Escape`.
- Kết quả mong đợi: Cả 3 cách đều đóng modal mà không lưu; nội dung khi mở lại vẫn là bản cũ (nếu có hỏi xác nhận mất dữ liệu thì hành vi phải nhất quán ở cả 3 cách).

**TC-SET-200 · Nút Preview trong modal Edit** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Mở modal Edit, sửa nội dung. 2) Click `"Preview"` trong modal.
- Kết quả mong đợi: Hiển thị bản xem trước theo nội dung **đang soạn** (chưa lưu), đúng cách render sẽ hiện trên POS; có đường quay lại chế độ soạn thảo.

**TC-SET-201 · Nút Preview trên card (ngoài modal)** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Click `"Preview"` trên card `Privacy Policy`.
- Kết quả mong đợi: Mở bản xem trước nội dung **đã lưu**, ở chế độ chỉ đọc, không cho chỉnh sửa; đóng được bằng Escape/Close. _(Chưa xác minh khi quét.)_

**TC-SET-202 · Nội dung rất dài trong Terms of Service** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Dán nội dung ~50.000 ký tự vào ô `Content`. 2) Lưu.
- Kết quả mong đợi: Hoặc lưu thành công không timeout, hoặc báo lỗi giới hạn độ dài với con số cụ thể; ô soạn thảo cuộn được, không đơ trình duyệt.

**TC-SET-203 · Nội dung chứa HTML/script** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Các bước: 1) Nhập `<script>alert('xss')</script>` và `<img src=x onerror=alert(1)>` vào `Content`. 2) Lưu. 3) Mở `"Preview"`.
- Kết quả mong đợi: Nội dung được escape/sanitize — **không** thực thi script trong Preview hay trong portal; hiển thị dưới dạng text hoặc HTML đã lọc.

**TC-SET-204 · Terms of Service và Privacy Policy lưu độc lập** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: 1) Sửa & lưu nội dung `Terms of Service`. 2) Mở modal Edit của `Privacy Policy`.
- Kết quả mong đợi: Nội dung Privacy Policy không bị thay đổi/ghi đè bởi nội dung Terms vừa lưu.

### R. Tab Configuration — `Passcode Setting`

**TC-SET-208 · Hiển thị card Passcode Setting** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Quan sát card `"Passcode Setting"`.
- Kết quả mong đợi: Mô tả _"Guards actions that change money or configuration on the POS."_; toggle `Enable Passcode Verification` kèm chú thích _"When off, actions that require a passcode run immediately without verification."_

**TC-SET-209 · Bật/tắt Enable Passcode Verification** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Các bước: 1) Tắt toggle. 2) Lưu (nếu card có nút Save riêng) hoặc quan sát lưu tự động. 3) Reload tab.
- Kết quả mong đợi: Trạng thái được giữ đúng sau reload; nếu card không có nút Save riêng thì thay đổi phải được lưu ngay và có phản hồi (toast/spinner) — không được lặng lẽ mất thay đổi. Cần xác minh cơ chế lưu của card này.

**TC-SET-210 · Cảnh báo khi tắt xác thực passcode** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Các bước: 1) Tắt `Enable Passcode Verification`.
- Kết quả mong đợi: Hiển thị cảnh báo về hệ quả bảo mật (mọi thao tác đổi tiền/cấu hình trên POS chạy ngay không cần xác minh) trước khi áp dụng — đây là thay đổi giảm mức bảo mật.

### S. Định dạng dữ liệu (Data formatting)

**TC-SET-215 · Định dạng tiền tệ nhất quán toàn màn hình** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: Đối chiếu các trường tiền: `Amount`, `Deduction Per Day`, `Turn Value` (tab Configuration), số tiền trong `TIP SCREEN PREVIEW`.
- Kết quả mong đợi: Tất cả dùng tiền tố `$` và 2 chữ số thập phân (`$0.00`, `$555.55`, `$100.00`, `$4.20`); không lẫn định dạng khác trong cùng màn hình.

**TC-SET-216 · Định dạng phần trăm nhất quán** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: Đối chiếu các trường `%`: `Tax Rate (%)`, `Cash Discount (%)`, `Service Fee (%)`, các `Commission (%)`, `Pay 1/2 (%)`, `On Credit Card Tip (%)`.
- Kết quả mong đợi: Nhãn trường luôn kèm hậu tố `(%)`, ô nhập chứa số trần (không kèm ký tự `%` trong value); chấp nhận số thập phân (vd `0.5`, `87.5`) và hiển thị lại đúng như đã nhập.

**TC-SET-217 · Định dạng ngày tháng nhất quán** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: Đối chiếu `Current period` (tab Business Profile) và `Active since …` (tab POS Package).
- Kết quả mong đợi: Cùng mẫu `MMM D, YYYY`; dòng POS Package ghi rõ múi giờ `(UTC+7)`; không xuất hiện timestamp thô hay ISO string.

**TC-SET-218 · Định dạng giờ 12h có AM/PM** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: Quan sát toàn bộ giờ trong `Business Hours` và mẫu `9:41` trong preview.
- Kết quả mong đợi: Tất cả dùng định dạng 12 giờ kèm `AM`/`PM` (vd `7:00 AM`, `11:00 PM`); phút theo bước 15; ngày đóng hiển thị chữ `Closed` thay vì `--:--`.

### T. Trường hợp tiêu cực & biên (Negative / Edge)

**TC-SET-225 · Mở Settings với STORE_ID không tồn tại** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: Mở `/pos/999999/setting`.
- Kết quả mong đợi: Hiển thị trang lỗi/không tìm thấy hoặc redirect hợp lý; **không** hiển thị form Settings với dữ liệu rỗng có thể lưu đè; không lộ stack trace.

**TC-SET-226 · Mở Settings với STORE_ID không hợp lệ (chuỗi ký tự)** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Các bước: Mở `/pos/abc/setting`.
- Kết quả mong đợi: Xử lý an toàn (404 / redirect); không màn hình trắng, không lỗi JS chưa bắt trong console.

**TC-SET-227 · Mất kết nối mạng khi bấm Save** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Sửa `Business Name`. 2) Ngắt mạng (offline). 3) Click `"Save Changes"`.
- Kết quả mong đợi: Hiển thị thông báo lỗi mạng rõ ràng; nút Save trở lại trạng thái cho phép thử lại; giá trị đang nhập **không bị mất**; không hiện toast "thành công" giả.

**TC-SET-228 · API trả lỗi 500 khi lưu** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Mock/route API lưu Settings trả 500. 2) Sửa một trường và lưu.
- Kết quả mong đợi: Hiển thị thông báo lỗi (không phải success); dữ liệu trên form giữ nguyên trạng thái dirty; không reload mất dữ liệu người dùng.

**TC-SET-229 · Session hết hạn khi đang ở Settings** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Các bước: 1) Mở Settings. 2) Làm session hết hạn (xóa cookie/token). 3) Bấm `"Save Changes"`.
- Kết quả mong đợi: Redirect về `/login` hoặc hiện thông báo hết phiên; **không** lưu thành công với token đã hết hạn; không lộ dữ liệu store sau khi hết phiên.

**TC-SET-230 · Bấm Save nhiều lần liên tiếp (double submit)** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Sửa một trường. 2) Click `"Save Changes"` 3 lần thật nhanh.
- Kết quả mong đợi: Chỉ 1 request được gửi (nút disable trong lúc đang lưu / có spinner); không tạo bản ghi trùng, không hiện nhiều toast chồng nhau.

**TC-SET-231 · Sửa nhiều card cùng lúc rồi lưu từng card** — Mức độ ưu tiên: Cao · Loại: Biên

- Các bước: 1) Ở tab Business Profile, sửa đồng thời Business Information, Business Hours và Contact Owner. 2) Lưu lần lượt từng card. 3) Reload.
- Kết quả mong đợi: Mỗi card lưu độc lập và đủ dữ liệu; card sau **không** ghi đè/reset thay đổi của card trước; sau reload cả 3 nhóm thay đổi đều còn.

**TC-SET-232 · Dán dữ liệu có khoảng trắng đầu/cuối** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: 1) Dán `"   Volt POS   "` vào `Business Name`. 2) Lưu và reload.
- Kết quả mong đợi: Giá trị được trim khi lưu; sau reload hiển thị `Volt POS` không thừa khoảng trắng.

**TC-SET-233 · Mở cùng lúc 2 tab trình duyệt và lưu chồng nhau** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Mở Settings ở 2 tab trình duyệt. 2) Ở tab A sửa `Business Name` và lưu. 3) Ở tab B (dữ liệu cũ) sửa `City` và lưu. 4) Reload cả hai.
- Kết quả mong đợi: Ghi nhận hành vi thực tế — lý tưởng là chỉ trường được sửa bị ghi đè, hoặc có cảnh báo xung đột; **không** để thay đổi của tab A biến mất một cách âm thầm.

### U. Responsive

**TC-SET-238 · Bố cục ở 1366×768** — Mức độ ưu tiên: Trung bình · Loại: Responsive

- Các bước: Xem lần lượt cả 5 tab ở viewport 1366×768.
- Kết quả mong đợi: Không có scroll ngang toàn trang; bảng `Role & Permission` giữ đủ 4 cột vai trò đọc được; lưới card POS Package tự giảm số cột; không cắt chữ nhãn trường.

**TC-SET-239 · Bố cục ở 1024×768 (tablet ngang)** — Mức độ ưu tiên: Trung bình · Loại: Responsive

- Các bước: Đổi viewport về 1024×768, duyệt 5 tab.
- Kết quả mong đợi: Cột phải (Contact Owner / Tax & Pricing / Terms of Service) xuống dưới cột trái thay vì bị bóp; panel `TIP SCREEN PREVIEW` vẫn đọc được; thanh tab có thể cuộn ngang riêng nếu tràn.

**TC-SET-240 · Bố cục ở 768×1024 (tablet dọc)** — Mức độ ưu tiên: Trung bình · Loại: Responsive

- Các bước: Đổi viewport về 768×1024, duyệt 5 tab.
- Kết quả mong đợi: Tất cả card xếp 1 cột; sidebar tự thu gọn hoặc chuyển sang dạng overlay; bảng quyền cuộn ngang trong khung riêng chứ không đẩy cả trang.

**TC-SET-241 · Bố cục ở 375×812 (mobile)** — Mức độ ưu tiên: Thấp · Loại: Responsive

- Các bước: Đổi viewport về 375×812, duyệt 5 tab.
- Kết quả mong đợi: Nội dung xếp dọc, nút Cancel/Save vẫn bấm được (không bị tràn khỏi màn hình); lưới `Day 1`–`Day 31` xuống nhiều dòng gọn gàng; các chip tip preset wrap thay vì tràn.

**TC-SET-242 · Modal hoạt động tốt ở màn hình nhỏ** — Mức độ ưu tiên: Trung bình · Loại: Responsive

- Các bước: 1) Ở viewport 768px, mở modal `"View all 62 features"` và modal `"Edit Terms of Service"`.
- Kết quả mong đợi: Modal vừa khung nhìn, nội dung dài cuộn được bên trong modal; nút `"Close"` / `"Save Changes"` luôn với tới được; nền trang bị khóa cuộn.

### V. Khả năng tiếp cận (Accessibility)

**TC-SET-248 · Thanh tab có role và trạng thái ARIA đúng** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: Kiểm tra ARIA của 5 tab chính và 3 sub-tab Compensation Default.
- Kết quả mong đợi: Các tab có `role="tab"` trong `role="tablist"`; tab đang chọn có `aria-selected="true"`, các tab khác `false`; panel nội dung liên kết qua `aria-controls`/`role="tabpanel"`.

**TC-SET-249 · Điều hướng tab bằng bàn phím** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: 1) Focus vào tab `"Business Profile"`. 2) Nhấn `ArrowRight` vài lần. 3) Nhấn `Enter`/`Space`.
- Kết quả mong đợi: Focus di chuyển giữa các tab bằng phím mũi tên; kích hoạt được tab bằng Enter/Space; vòng focus không bị kẹt.

**TC-SET-250 · Tab-order hợp lý trong form** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: Từ đầu card `Business Information`, nhấn `Tab` liên tục.
- Kết quả mong đợi: Focus đi theo thứ tự trực quan Business Name → Legal Name → Address → Country → State → City → Zip → Cancel → Save Changes; vòng focus hiển thị rõ (focus ring).

**TC-SET-251 · Toggle và checkbox thao tác được bằng bàn phím** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: 1) Tab tới toggle `"Monday open status"`, nhấn `Space`. 2) Tab tới checkbox `"Toggle Reporting for Manager"`, nhấn `Space`.
- Kết quả mong đợi: Trạng thái đổi đúng bằng phím Space; `aria-checked` cập nhật theo; screen reader đọc được nhãn có ý nghĩa.

**TC-SET-252 · Nhãn ARIA của ma trận quyền mô tả rõ ngữ cảnh** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: Kiểm tra `aria-label` của các checkbox trong bảng Role & Permission.
- Kết quả mong đợi: Mỗi ô có nhãn dạng `"Toggle <Nhóm> for <Vai trò>"` (vd `"Toggle Order Management for Partner"`) — đủ để hiểu ô nào thuộc hàng/cột nào mà không cần nhìn bảng.

**TC-SET-253 · Nút xóa tip preset có nhãn mô tả** — Mức độ ưu tiên: Thấp · Loại: Khả năng tiếp cận

- Các bước: Kiểm tra nhãn các nút `×` trên chip preset.
- Kết quả mong đợi: Mỗi nút có nhãn `"Remove <x>% tip preset"` thay vì chỉ ký tự `×`.

**TC-SET-254 · Focus trap và trả focus của modal** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: 1) Mở modal `"View all 62 features"` bằng bàn phím. 2) Nhấn Tab nhiều lần. 3) Nhấn `Escape`.
- Kết quả mong đợi: Focus bị giữ trong modal, không nhảy ra nền; Escape đóng modal và focus trả về đúng nút `"View all 62 features"` đã mở nó.

**TC-SET-255 · Thông báo lỗi validation được liên kết với trường** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: 1) Gây lỗi validation ở `Email`. 2) Kiểm tra DOM của trường.
- Kết quả mong đợi: Trường có `aria-invalid="true"` và `aria-describedby` trỏ tới phần tử chứa thông báo lỗi; screen reader đọc được lỗi.

**TC-SET-256 · Độ tương phản màu đạt chuẩn** — Mức độ ưu tiên: Thấp · Loại: Khả năng tiếp cận

- Các bước: Kiểm tra tương phản của text mô tả xám, nút Save ở trạng thái disabled, badge `Current`, badge `SALE`/`AUTHORIZE`, badge `Read-only`.
- Kết quả mong đợi: Đạt tối thiểu WCAG AA (4.5:1 cho text thường); trạng thái disabled vẫn đọc được, không dùng riêng màu sắc để truyền tải trạng thái.

### W. Hiệu năng (Performance)

**TC-SET-260 · Thời gian tải tab Business Profile** — Mức độ ưu tiên: Trung bình · Loại: Hiệu năng

- Các bước: Mở `/pos/<STORE_ID>/setting` từ trạng thái chưa cache, đo tới khi form hiển thị đủ dữ liệu.
- Kết quả mong đợi: Nội dung hiển thị dưới ~3 giây trên mạng bình thường; có skeleton/loading trong lúc chờ chứ không phải form trống có thể gõ vào.

**TC-SET-261 · Thời gian render tab POS Package với nhiều gói** — Mức độ ưu tiên: Trung bình · Loại: Hiệu năng

- Các bước: Mở `?tab=pos-package` (DEV có >15 card gói), đo thời gian render và cuộn trang.
- Kết quả mong đợi: Lưới card render dưới ~3 giây; cuộn mượt không giật; không tải lại toàn bộ ảnh mỗi lần cuộn.

**TC-SET-262 · Chuyển tab không gọi lại API không cần thiết** — Mức độ ưu tiên: Thấp · Loại: Hiệu năng

- Các bước: 1) Mở DevTools Network. 2) Chuyển qua lại giữa `Business Profile` và `Configuration` 3 lần.
- Kết quả mong đợi: Dữ liệu đã tải được cache hợp lý; không gọi lại đúng một API nhiều lần liên tiếp cho cùng dữ liệu tĩnh.

**TC-SET-263 · Expand All trên bảng quyền phản hồi nhanh** — Mức độ ưu tiên: Thấp · Loại: Hiệu năng

- Các bước: Click `"Expand All"` và đo độ trễ tới khi toàn bộ quyền con hiển thị.
- Kết quả mong đợi: Mở rộng gần như tức thì (< 1 giây), không đơ UI, không gọi thêm request cho từng nhóm.

### X. Bảo mật & phân quyền (Security)

**TC-SET-268 · Truy cập Settings khi chưa đăng nhập** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Các bước: 1) Xóa cookie/storage. 2) Mở trực tiếp `/pos/<STORE_ID>/setting?tab=configuration`.
- Kết quả mong đợi: Redirect về `/login`; không render bất kỳ dữ liệu store nào (tên doanh nghiệp, email chủ, cấu hình lương) trước khi redirect.

**TC-SET-269 · Truy cập Settings của store không thuộc quyền quản lý** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Điều kiện tiên quyết: Tài khoản chỉ có quyền với store A.
- Các bước: Mở `/pos/<STORE_ID_KHAC>/setting`.
- Kết quả mong đợi: Bị chặn (403 / trang không có quyền / redirect); không hiển thị dữ liệu của store khác; API trả lỗi tương ứng chứ không trả dữ liệu.

**TC-SET-270 · Vai trò không có quyền `Settings` không sửa được** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Điều kiện tiên quyết: Đăng nhập bằng tài khoản vai trò `Manager`/`Partner` — theo ma trận quyền khi quét, hai vai trò này **không** được tick nhóm `Settings`.
- Các bước: 1) Mở `/pos/<STORE_ID>/setting`. 2) Thử sửa và bấm `"Save Changes"` ở một card bất kỳ.
- Kết quả mong đợi: Hoặc không truy cập được màn hình, hoặc các trường ở chế độ chỉ đọc và nút Save bị disable; nếu gọi API trực tiếp thì backend phải từ chối (403) — không được chỉ chặn ở phía client.

**TC-SET-271 · Vai trò Staff (có quyền Settings) chỉ thấy phần được phép** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Điều kiện tiên quyết: Tài khoản vai trò `Staff` (theo ma trận, được tick `Settings` và `Payment`).
- Các bước: 1) Mở Settings. 2) Kiểm tra khả năng truy cập tab `Role & Permission` và `POS Package`.
- Kết quả mong đợi: Các tab nhạy cảm (đổi gói, sửa ma trận quyền) không truy cập được hoặc ở chế độ chỉ đọc — tránh leo thang đặc quyền tự cấp quyền cho chính mình.

**TC-SET-272 · Không leo thang đặc quyền qua tab Role & Permission** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Các bước: 1) Bằng tài khoản không phải Owner, gọi trực tiếp API lưu ma trận quyền để tự cấp thêm quyền.
- Kết quả mong đợi: Backend từ chối (403) và ghi log; ma trận quyền không đổi khi kiểm tra lại trên UI.

**TC-SET-273 · Chống XSS ở các trường text tự do** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Các bước: 1) Nhập `<script>alert(1)</script>` vào `Business Name`, `Legal Name`, `Address`. 2) Lưu. 3) Reload và kiểm tra nơi hiển thị lại giá trị (bao gồm cả tên store trên header).
- Kết quả mong đợi: Chuỗi được escape và hiển thị nguyên văn dưới dạng text; không có alert nào thực thi ở bất kỳ đâu trong portal.

**TC-SET-274 · Không lộ thông tin nhạy cảm trong response/console** — Mức độ ưu tiên: Trung bình · Loại: Bảo mật

- Các bước: 1) Mở DevTools Network + Console. 2) Tải lần lượt 5 tab.
- Kết quả mong đợi: Không có token/secret/khóa API in ra console; response API không chứa dữ liệu vượt phạm vi store hiện tại (vd danh sách store khác, thông tin PII của merchant khác).

**TC-SET-275 · Upload file có phần mở rộng giả mạo** — Mức độ ưu tiên: Trung bình · Loại: Bảo mật

- Các bước: 1) Đổi tên một file `.html` chứa script thành `.png`. 2) Upload làm `Business logo`.
- Kết quả mong đợi: Server kiểm tra nội dung file (magic bytes) chứ không chỉ đuôi file; file bị từ chối; không có nội dung HTML/script nào được phục vụ lại từ URL ảnh.

---

## 3. Tổng kết độ phủ (Coverage summary)

**Tổng số test case: 185** (`TC-SET-001` → `TC-SET-275`, đánh số có khoảng trống theo nhóm).

### Theo mức độ ưu tiên

| Mức độ ưu tiên | Số lượng |
| -------------- | -------- |
| Cao            | 100      |
| Trung bình     | 72       |
| Thấp           | 13       |

### Theo loại

| Loại              | Số lượng |
| ----------------- | -------- |
| Chức năng         | 69       |
| Biên              | 25       |
| Giao diện         | 23       |
| Tiêu cực          | 20       |
| Bảo mật           | 12       |
| Dữ liệu           | 11       |
| Khả năng tiếp cận | 9        |
| Responsive        | 6        |
| Điều hướng        | 6        |
| Hiệu năng         | 4        |

### Theo nhóm chức năng

| Nhóm                                 | ID      | Số lượng |
| ------------------------------------ | ------- | -------- |
| A. Tải trang & bố cục                | 001–006 | 6        |
| B. Chuyển tab & giữ trạng thái       | 010–015 | 6        |
| C. Business Information              | 020–031 | 12       |
| D. Business Hours                    | 035–042 | 8        |
| E. Payroll Period                    | 045–053 | 9        |
| F. Contact Owner                     | 058–064 | 7        |
| G. Business Photos                   | 068–073 | 6        |
| H. POS Package                       | 080–090 | 11       |
| I. Payment Methods                   | 095–098 | 4        |
| J. Tipping Settings                  | 102–113 | 12       |
| K. Signature Settings                | 118–121 | 4        |
| L. Tax & Pricing                     | 125–131 | 7        |
| M. Tip Screen Preview                | 135–139 | 5        |
| N. Role & Permission                 | 145–158 | 14       |
| O. Compensation Default              | 165–180 | 16       |
| P. Turn Suggestion                   | 185–190 | 6        |
| Q. Terms of Service & Privacy Policy | 195–204 | 10       |
| R. Passcode Setting                  | 208–210 | 3        |
| S. Định dạng dữ liệu                 | 215–218 | 4        |
| T. Tiêu cực & biên                   | 225–233 | 9        |
| U. Responsive                        | 238–242 | 5        |
| V. Khả năng tiếp cận                 | 248–256 | 9        |
| W. Hiệu năng                         | 260–263 | 4        |
| X. Bảo mật & phân quyền              | 268–275 | 8        |

### Các phần còn chưa chắc chắn / cần xác minh trực tiếp

1. **Luồng đổi gói POS** (`TC-SET-087`, `088`, `089`) — chưa biết có modal xác nhận hay bước thanh toán; thao tác này thay đổi gói thật, cần môi trường test riêng.
2. **Trạng thái nút Save ở tab Role & Permission** (`TC-SET-157`) — khi quét, nút đang enabled dù chưa thay đổi gì, khác với các card còn lại.
3. **Dropdown `Country` / `State`** (`TC-SET-030`, `031`) — script tự động click bị timeout, chưa xác minh được danh sách và cơ chế lọc.
4. **Cơ chế lưu của card `Passcode Setting`** (`TC-SET-209`) — không thấy nút Save riêng trong lần quét; có thể lưu tự động khi toggle.
5. **Nút `"Preview"` trên card Terms/Privacy** (`TC-SET-201`) — chưa mở được trong lần quét, chưa rõ là modal hay tab mới.
6. **Giới hạn validation cụ thể** — maxlength của các trường text, dung lượng/định dạng ảnh cho phép, ngưỡng min/max của các trường `%` và tiền: tất cả đang được đặt giả định trong test case, cần đối chiếu với đặc tả/backend.
7. **Ràng buộc nghiệp vụ nguy hiểm** — tắt hết phương thức thanh toán (`TC-SET-097`), bỏ hết quyền Owner (`TC-SET-154`), đóng cửa cả 7 ngày (`TC-SET-042`): cần xác nhận với team sản phẩm xem có chặn hay không trước khi chốt kết quả mong đợi.
8. **Không có `data-testid`** trong toàn bộ màn hình → code test phải bám vào role/label/text; nếu nhãn tiếng Anh thay đổi, test sẽ gãy. Nên đề xuất bổ sung test-id cho các control chính.
