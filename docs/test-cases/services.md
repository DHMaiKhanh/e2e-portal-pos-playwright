# Test case: Màn hình Services (Dịch vụ & Sản phẩm)

- **Route**: `/pos/<STORE_ID>/services`
- **Ngày quét**: 2026-08-03
- **Nguồn dữ liệu quét**: `docs/test-cases/_scan/services.json` (+ ảnh chụp màn hình `services.png` cùng thư mục)

## 1. Kiểm kê tính năng (Feature inventory)

**Khung sườn chung**: sidebar trái (POS: Overview/Orders/Payroll/Batch History; Management: Staffs/Services (đang chọn)/Customers/Customer Groups/Income Reports/Report Config/Settings; Admin cho tài khoản admin: Onboarding/Merchants/Support 360/Orders/Packages/Devices/Monitor/Versions/Settings), thanh trên cùng có các nút chế độ POS/Payment/Business/Gift Card, bộ chọn store `"Volt POS 14 Dev #14"`, nút `"Toggle Sidebar"`, user menu.

**Header trang**: H2 `"All Services"`. Góc phải trên có nút `"Export"` và `"Add Category"`.

**Tìm kiếm**: ô input placeholder `"Search by name..."` — tìm theo tên dịch vụ/sản phẩm.

**Tab trạng thái**: `"Active"` (mặc định được chọn) và `"Inactive"` — chuyển tab lọc lại cả danh sách category và bảng dữ liệu theo trạng thái.

**Danh sách Category** (mỗi category là một dòng có nhóm nút hành động):

- Tên category hiển thị dạng nút, ví dụ: Artificial Nails, nail, Test 232, Product, Hand Care, Test 223, Specialty & Art, The Signature Spa Combo, Gel & Acrylic Services, api test cat, E2E, Service B33, test12, Glossy/Matte, custom1, Other test, test, abc32, Signature Pedicure & Gel Mani, Skincare, sasd, Luxury Nail Experience, Basic Services, Add-ons & Spa, 1232, test last, test lastest, testadasd, prodxuct, test1, test2, ayaya, Additional Services, test category, test3.
- Category `"Other"` luôn nằm cuối danh sách, các nút reorder bị disable (tooltip `"Other is always last"`), không có nút Edit.
- Mỗi category (trừ Other) có: `"Reorder <tên>"` (kéo-thả), `"Move <tên> to first"`, `"Move <tên> up"`, `"Move <tên> down"`, `"Move <tên> to last"`, `"Edit <tên>"`. Category đầu danh sách bị disable `to first`/`up`; category cuối (trước Other) bị disable `down`/`to last`.

**Khu vực dưới danh sách category**: combobox lọc trạng thái (hiển thị `"Active"`), nút `"Manage Order"`, nút `"Add Service"`.

**Bảng dữ liệu `"All Services"`**, cột: NAME & DESCRIPTION, PRICE, DURATION, SUPPLY FEE, STATUS.

- NAME & DESCRIPTION: chỉ tên (vd `"Diamond Pedicure"`), hoặc tên kèm mô tả ở dòng dưới (vd `"Gel Manicure product 2"` + mô tả `"Gel nail polish"`).
- PRICE: định dạng tiền USD, vd `"$62.00"`, `"$0.00"`.
- DURATION: `"—"` khi không đặt, hoặc chuỗi thời gian như `"30 minutes"`.
- SUPPLY FEE: định dạng tiền USD, vd `"$0.00"`, `"$3.00"`.
- STATUS: `"Active"` ở tab Active (giả định `"Inactive"` ở tab Inactive — cần xác minh trực tiếp).
- Phân trang: footer `"Showing 1 to 30 of 259 results"`, nút `"Previous"` (disable ở trang 1), chỉ số trang dạng `"1 / 9"`, nút `"Next"`. Cố định 30 dòng/trang.

**Ghi chú giới hạn quét**: Không có dialog nào mở trong lúc quét (dialogs: 0) — các hành động `"Add Category"`, `"Edit <category>"`, `"Add Service"`, click vào dòng bảng, và `"Manage Order"` được kỳ vọng mở modal/drawer riêng nhưng **chưa được xác minh trực tiếp**. Dữ liệu quét thấy một vài tên trùng nhau giữa các dòng mẫu (vd `"Tropical Deluxe"`, `"Diamond Pedicure"` xuất hiện 2 lần) — cần xác minh đây là 2 dịch vụ khác nhau hay dữ liệu test trùng lặp. Không có test-id lộ ra trong DOM. ID store nên lấy từ biến môi trường `STORE_ID`, không hard-code `14`.

## 2. Test case

### A. Tải trang & bố cục (Page load / Layout)

**TC-SVC-001 · Tải trang Services qua điều hướng trực tiếp** — Mức độ ưu tiên: Cao · Loại: Điều hướng

- Điều kiện tiên quyết: Đã đăng nhập với session hợp lệ.
- Các bước:
  1. Điều hướng trực tiếp tới `/pos/<STORE_ID>/services`.
  2. Chờ trang tải xong.
- Kết quả mong đợi: Tiêu đề `"All Services"` hiển thị; thanh tìm kiếm, tab Active/Inactive, danh sách category, nút Export/Add Category/Manage Order/Add Service, và bảng dữ liệu đều render đầy đủ; không có lỗi console.

**TC-SVC-002 · Điều hướng tới Services từ sidebar Management** — Mức độ ưu tiên: Cao · Loại: Điều hướng

- Điều kiện tiên quyết: Đang ở màn hình khác (vd Overview).
- Các bước: 1) Click `"Services"` trong nhóm `"Management"` ở sidebar. 2) Quan sát URL và nội dung.
- Kết quả mong đợi: Điều hướng tới `/pos/<STORE_ID>/services`; mục `"Services"` trong sidebar được highlight active; nội dung trang (category list + bảng) hiển thị đúng.

**TC-SVC-003 · Reload (F5) giữ nguyên trạng thái tab/tìm kiếm** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Điều kiện tiên quyết: Đang ở trang Services, đã chuyển sang tab `"Inactive"` và/hoặc đã nhập từ khóa tìm kiếm.
- Các bước: 1) Chuyển tab/nhập tìm kiếm. 2) Nhấn F5.
- Kết quả mong đợi: Trang tải lại, không bị đăng xuất; nếu trạng thái được lưu qua URL/query param thì tab và từ khóa tìm kiếm vẫn giữ nguyên (nếu không được lưu, kết quả mong đợi là quay lại trạng thái mặc định "Active" — cần xác minh hành vi thực tế).

**TC-SVC-004 · Bố cục hiển thị đúng ở các độ rộng desktop phổ biến** — Mức độ ưu tiên: Trung bình · Loại: Responsive

- Các bước: 1) Xem trang ở 1920px. 2) Thu nhỏ xuống ~1366px. 3) Thu nhỏ xuống ~1024px.
- Kết quả mong đợi: Danh sách category, bảng dữ liệu và phân trang không chồng lấp/cắt chữ ở cả 3 độ rộng; không xuất hiện thanh cuộn ngang toàn trang ngoài ý muốn.

### B. Danh sách Category (Reorder / Edit / Add Category)

**TC-SVC-010 · Danh sách category hiển thị đúng tên và category "Other" luôn ở cuối** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Quan sát danh sách category trên tab Active.
- Kết quả mong đợi: Mỗi category hiển thị đúng tên; category `"Other"` luôn là dòng cuối cùng, các nút reorder/move của nó bị disable với tooltip `"Other is always last"`.

**TC-SVC-011 · Nút "Move ... up/down" hoạt động đúng** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Điều kiện tiên quyết: Có ít nhất 3 category (không tính "Other").
- Các bước: 1) Ghi lại thứ tự category hiện tại. 2) Click `"Move <tên category thứ 2> up"`. 3) Quan sát lại danh sách.
- Kết quả mong đợi: Category được chọn hoán đổi vị trí với category ngay phía trên; thứ tự các category khác không đổi; thay đổi được lưu lại sau khi reload trang.

**TC-SVC-012 · Nút "Move ... to first / to last" hoạt động đúng** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Chọn một category ở giữa danh sách. 2) Click `"Move <tên> to first"`. 3) Xác nhận category lên đầu danh sách. 4) Click `"Move <tên> to last"` trên chính category đó. 5) Xác nhận category xuống ngay trước "Other".
- Kết quả mong đợi: Category di chuyển đúng vị trí đầu/cuối (trước "Other") sau mỗi lần click; các nút biên tương ứng (`to first`/`up` ở đầu, `down`/`to last` ở cuối) bị disable đúng lúc.

**TC-SVC-013 · Category đầu danh sách disable nút "to first" và "up"** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Quan sát category đầu tiên trong danh sách.
- Kết quả mong đợi: Nút `"Move <tên> to first"` và `"Move <tên> up"` ở trạng thái disabled.

**TC-SVC-014 · Category cuối (trước "Other") disable nút "down" và "to last"** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Quan sát category ngay trước "Other".
- Kết quả mong đợi: Nút `"Move <tên> down"` và `"Move <tên> to last"` ở trạng thái disabled.

**TC-SVC-015 · Kéo-thả (drag handle "Reorder ...") đổi thứ tự category** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Dùng chuột kéo handle `"Reorder <tên category>"` xuống dưới một category khác. 2) Thả chuột.
- Kết quả mong đợi: Thứ tự category cập nhật đúng theo vị trí thả; danh sách không bị lỗi/trùng lặp dòng.

**TC-SVC-016 · Click "Add Category" mở form thêm category mới** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click nút `"Add Category"`. 2) Nhập tên category hợp lệ. 3) Xác nhận lưu.
- Kết quả mong đợi: Dialog/form thêm category hiển thị; sau khi lưu thành công, category mới xuất hiện trong danh sách (thường ở cuối, trước "Other").

**TC-SVC-017 · Thêm category với tên trống bị chặn** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Các bước: 1) Click `"Add Category"`. 2) Để trống tên category. 3) Thử lưu.
- Kết quả mong đợi: Hiển thị thông báo lỗi validation, không tạo category mới, không có request được gửi (hoặc bị API từ chối với lỗi rõ ràng).

**TC-SVC-018 · Click "Edit <category>" mở form sửa category** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click nút `"Edit <tên category>"` trên một category bất kỳ. 2) Đổi tên category. 3) Lưu.
- Kết quả mong đợi: Form sửa hiển thị đúng dữ liệu category hiện tại; sau khi lưu, tên category trong danh sách được cập nhật.

### C. Tìm kiếm (Search)

**TC-SVC-020 · Tìm kiếm theo tên dịch vụ trả về kết quả khớp** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Nhập một tên dịch vụ có thật (vd `"Diamond Pedicure"`) vào ô `"Search by name..."`. 2) Quan sát bảng.
- Kết quả mong đợi: Bảng chỉ hiển thị các dịch vụ có tên khớp (chứa từ khóa, không phân biệt hoa/thường); footer phân trang cập nhật theo số kết quả khớp.

**TC-SVC-021 · Tìm kiếm với từ khóa không tồn tại trả về bảng rỗng** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Nhập từ khóa ngẫu nhiên không khớp bất kỳ dịch vụ nào (vd `"zzz_no_such_service_zzz"`). 2) Quan sát bảng.
- Kết quả mong đợi: Bảng hiển thị trạng thái rỗng (empty state) rõ ràng, footer hiển thị `"Showing 0 to 0 of 0 results"`, không lỗi console.

**TC-SVC-022 · Xóa từ khóa tìm kiếm khôi phục danh sách đầy đủ** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Nhập từ khóa tìm kiếm. 2) Xóa hết nội dung ô tìm kiếm.
- Kết quả mong đợi: Bảng quay lại hiển thị toàn bộ dịch vụ (259 kết quả, 9 trang) như trước khi tìm kiếm.

**TC-SVC-023 · Tìm kiếm với ký tự đặc biệt không gây lỗi** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: Nhập các ký tự đặc biệt (vd `"&"`, `"/"`, `"%"`, emoji) vào ô tìm kiếm.
- Kết quả mong đợi: Không có lỗi console/crash trang; bảng trả về kết quả khớp hoặc rỗng một cách hợp lý (vd tìm `"/"` có thể khớp `"Glossy/Matte"`).

### D. Tab trạng thái Active / Inactive

**TC-SVC-030 · Chuyển sang tab "Inactive" lọc đúng dữ liệu** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click tab `"Inactive"`. 2) Quan sát danh sách category và bảng.
- Kết quả mong đợi: Bảng chỉ hiển thị các dịch vụ có STATUS `"Inactive"`; tab `"Inactive"` được đánh dấu đang chọn.

**TC-SVC-031 · Chuyển tab khi đang có từ khóa tìm kiếm** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Điều kiện tiên quyết: Đã nhập từ khóa tìm kiếm ở tab Active.
- Các bước: 1) Nhập từ khóa tìm kiếm. 2) Chuyển sang tab `"Inactive"`.
- Kết quả mong đợi: Từ khóa tìm kiếm vẫn được áp dụng (hoặc được reset — cần xác minh hành vi thực tế), kết quả hiển thị đúng theo tab Inactive + từ khóa.

**TC-SVC-032 · Tab "Active" là tab mặc định khi tải trang** — Mức độ ưu tiên: Thấp · Loại: Giao diện

- Các bước: Tải lại trang Services từ đầu (không có query param nào).
- Kết quả mong đợi: Tab `"Active"` được chọn mặc định.

### E. Bảng dữ liệu & Phân trang (Table / Pagination)

**TC-SVC-040 · Header bảng đúng thứ tự và nhãn cột** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Quan sát header bảng `"All Services"`.
- Kết quả mong đợi: Đúng 5 cột theo thứ tự: NAME & DESCRIPTION, PRICE, DURATION, SUPPLY FEE, STATUS.

**TC-SVC-041 · Định dạng cột PRICE và SUPPLY FEE hiển thị đúng tiền USD** — Mức độ ưu tiên: Cao · Loại: Dữ liệu

- Các bước: Quan sát giá trị các cột PRICE và SUPPLY FEE trên nhiều dòng.
- Kết quả mong đợi: Mọi giá trị hiển thị dạng `"$X.XX"` (2 chữ số thập phân), bao gồm cả trường hợp `"$0.00"` khi không có phụ phí/giá 0.

**TC-SVC-042 · Cột DURATION hiển thị "—" khi không đặt thời gian** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: Quan sát cột DURATION trên các dòng không có thời gian thực hiện (đa số dòng mẫu) và trên dòng có thời gian (vd `"Dipping Ombre"` → `"30 minutes"`).
- Kết quả mong đợi: Dòng không đặt duration hiển thị `"—"`; dòng có đặt hiển thị đúng chuỗi thời gian dạng `"N minutes"`.

**TC-SVC-043 · NAME & DESCRIPTION hiển thị mô tả phụ khi có** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: Quan sát dòng có mô tả (vd `"Gel Manicure product 2"` với mô tả `"Gel nail polish"`) và dòng không có mô tả.
- Kết quả mong đợi: Dòng có mô tả hiển thị tên chính + đoạn mô tả nhỏ bên dưới; dòng không có mô tả chỉ hiển thị tên, không có khoảng trắng thừa/dòng trống bất thường.

**TC-SVC-044 · Phân trang hiển thị đúng tổng số kết quả và số trang** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Tải trang Services ở tab Active (mặc định).
- Kết quả mong đợi: Footer hiển thị `"Showing 1 to 30 of 259 results"` (số liệu thực tế có thể khác, cần khớp với dữ liệu store), chỉ số trang `"1 / 9"`, nút `"Previous"` disabled ở trang 1, nút `"Next"` enabled.

**TC-SVC-045 · Click "Next"/"Previous" chuyển trang đúng dữ liệu** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click `"Next"` từ trang 1. 2) Quan sát chỉ số trang và dữ liệu bảng. 3) Click `"Previous"` để quay lại trang 1.
- Kết quả mong đợi: Chỉ số trang chuyển thành `"2 / 9"`, dữ liệu bảng thay đổi (30 dòng tiếp theo); quay lại `"Previous"` trở về đúng dữ liệu trang 1 ban đầu.

**TC-SVC-046 · Trang cuối cùng (9/9) disable nút "Next" và hiển thị đủ số dòng còn lại** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Chuyển tới trang cuối (9/9) bằng cách click `"Next"` liên tục hoặc điều hướng trực tiếp qua query param page. 2) Quan sát footer và nút Next.
- Kết quả mong đợi: Nút `"Next"` bị disabled; footer hiển thị đúng số dòng còn lại (vd `"Showing 241 to 259 of 259 results"` nếu tổng là 259); không có dòng trống/lỗi hiển thị.

**TC-SVC-047 · Click vào một dòng dịch vụ mở chi tiết/sửa dịch vụ** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: Click vào một dòng bất kỳ trong bảng (ngoài các nút hành động).
- Kết quả mong đợi: Mở modal/trang sửa dịch vụ hiển thị đầy đủ thông tin của dịch vụ đó (tên, mô tả, giá, thời gian, supply fee, trạng thái, category) — **cần xác minh trực tiếp vì chưa quét được nội dung modal**.

### F. Thêm dịch vụ & Quản lý thứ tự (Add Service / Manage Order)

**TC-SVC-050 · Click "Add Service" mở form thêm dịch vụ mới** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click nút `"Add Service"`. 2) Điền đầy đủ thông tin hợp lệ (tên, category, giá, ...). 3) Lưu.
- Kết quả mong đợi: Form/dialog thêm dịch vụ hiển thị; sau khi lưu, dịch vụ mới xuất hiện trong bảng với trạng thái Active theo mặc định.

**TC-SVC-051 · Thêm dịch vụ thiếu trường bắt buộc bị chặn** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Các bước: 1) Click `"Add Service"`. 2) Bỏ trống các trường bắt buộc (vd tên). 3) Thử lưu.
- Kết quả mong đợi: Hiển thị lỗi validation cho từng trường bắt buộc còn thiếu; không tạo dịch vụ mới.

**TC-SVC-052 · Thêm dịch vụ với giá âm hoặc không hợp lệ bị chặn** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Các bước: 1) Click `"Add Service"`. 2) Nhập giá âm hoặc ký tự không phải số vào trường Price. 3) Thử lưu.
- Kết quả mong đợi: Hiển thị lỗi validation, không cho lưu giá trị không hợp lệ.

**TC-SVC-053 · Click "Manage Order" mở màn hình quản lý thứ tự** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: Click nút `"Manage Order"`.
- Kết quả mong đợi: Mở dialog/trang quản lý thứ tự category và/hoặc dịch vụ; các thao tác sắp xếp trong đó phản ánh đúng ra danh sách category/bảng chính sau khi lưu — **cần xác minh trực tiếp vì chưa quét được nội dung**.

### G. Tiêu cực & Biên (Negative / Edge cases)

**TC-SVC-060 · Danh sách hiển thị đúng khi một category không có dịch vụ nào** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Điều kiện tiên quyết: Tồn tại (hoặc tạo) một category chưa có dịch vụ nào.
- Các bước: Chọn/lọc theo category đó.
- Kết quả mong đợi: Bảng hiển thị trạng thái rỗng phù hợp, không lỗi console, category vẫn hiển thị trong danh sách category.

**TC-SVC-061 · Tải trang khi API services trả lỗi/timeout** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Các bước: 1) Chặn (mock lỗi 500 hoặc timeout) request API lấy danh sách dịch vụ. 2) Tải trang Services.
- Kết quả mong đợi: Hiển thị trạng thái lỗi/thông báo phù hợp thay vì màn hình trắng hoặc treo vô hạn; sidebar/top bar vẫn render bình thường.

**TC-SVC-062 · Tên dịch vụ/category rất dài hoặc chứa ký tự đặc biệt hiển thị không vỡ layout** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: Quan sát các category có tên dài/đặc biệt (vd `"Gel & Acrylic Services"`, `"Glossy/Matte"`, `"1232"`).
- Kết quả mong đợi: Tên hiển thị đầy đủ hoặc bị truncate (có tooltip/ellipsis) một cách nhất quán, không tràn ra ngoài layout hoặc đè lên các nút hành động khác.

**TC-SVC-063 · Điều hướng trực tiếp tới trang phân trang không hợp lệ (page vượt quá tổng số trang)** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: Điều hướng trực tiếp bằng query param tới một số trang lớn hơn tổng số trang thực tế (vd `?page=99` khi chỉ có 9 trang).
- Kết quả mong đợi: App không hiển thị bảng trống/lỗi crash; hoặc tự động điều chỉnh về trang hợp lệ cuối cùng, hoặc hiển thị trạng thái rỗng có kiểm soát.

### H. Bảo mật & Phân quyền (Security)

**TC-SVC-070 · Người dùng chưa đăng nhập bị chuyển hướng khi truy cập trực tiếp** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Điều kiện tiên quyết: Không có session đăng nhập hợp lệ (xóa cookie/storage state).
- Các bước: Điều hướng trực tiếp tới `/pos/<STORE_ID>/services`.
- Kết quả mong đợi: Bị chuyển hướng về trang đăng nhập, không hiển thị bất kỳ dữ liệu dịch vụ nào.

**TC-SVC-071 · Truy cập route Services của một store khác (cross-store) bị chặn** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Điều kiện tiên quyết: Tài khoản chỉ có quyền trên `STORE_ID` hiện tại.
- Các bước: Điều hướng trực tiếp tới `/pos/<STORE_ID_KHAC>/services` với store ID không thuộc quyền quản lý của tài khoản.
- Kết quả mong đợi: Truy cập bị chặn (redirect/lỗi 403/không tải được dữ liệu), không rò rỉ dữ liệu dịch vụ của store khác.

**TC-SVC-072 · Vai trò không có quyền quản lý dịch vụ không thấy/không dùng được các nút chỉnh sửa** — Mức độ ưu tiên: Trung bình · Loại: Bảo mật

- Điều kiện tiên quyết: Có tài khoản với vai trò hạn chế (vd Staff không có quyền quản lý dịch vụ).
- Các bước: Đăng nhập bằng tài khoản đó, vào trang Services.
- Kết quả mong đợi: Các nút `"Add Category"`, `"Edit <category>"`, `"Add Service"`, `"Manage Order"`, các nút reorder/move bị ẩn hoặc disable — **cần xác minh trực tiếp với tài khoản phân quyền thực tế**.

### I. Khả năng tiếp cận (Accessibility)

**TC-SVC-080 · Điều hướng bằng bàn phím qua các nút hành động của category** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: Dùng Tab/Shift+Tab để di chuyển focus qua các nút `Move ... up/down/to first/to last` và `Edit ...` của một category; dùng Enter/Space để kích hoạt.
- Kết quả mong đợi: Thứ tự focus hợp lý (theo thứ tự hiển thị); mọi nút có thể kích hoạt bằng bàn phím; trạng thái disabled được bỏ qua focus hoặc thông báo rõ là disabled cho trình đọc màn hình.

**TC-SVC-081 · Bảng dữ liệu có ngữ nghĩa HTML/ARIA đúng cho table** — Mức độ ưu tiên: Thấp · Loại: Khả năng tiếp cận

- Các bước: Kiểm tra cấu trúc DOM/ARIA của bảng `"All Services"` bằng công cụ accessibility inspector.
- Kết quả mong đợi: Bảng dùng đúng role table/row/cell/columnheader; mỗi cột có tên (accessible name) khớp với header hiển thị.

### J. Hiệu năng (Performance)

**TC-SVC-090 · Trang tải danh sách 259 dịch vụ qua 9 trang không bị treo/giật** — Mức độ ưu tiên: Trung bình · Loại: Hiệu năng

- Các bước: 1) Tải trang Services. 2) Chuyển qua vài trang liên tiếp bằng nút `"Next"`.
- Kết quả mong đợi: Thời gian tải mỗi trang trong ngưỡng hợp lý (không có yêu cầu SLA cụ thể — ghi nhận thời gian thực tế để tham chiếu); không có hiện tượng giật/treo UI khi chuyển trang; không tăng bộ nhớ bất thường khi chuyển nhiều trang liên tiếp.

## 3. Tổng kết độ phủ (Coverage summary)

**Theo loại**:

- Chức năng: 15
- Giao diện: 8
- Điều hướng: 2
- Dữ liệu: 3
- Tiêu cực: 5
- Biên: 8
- Bảo mật: 3
- Khả năng tiếp cận: 2
- Responsive: 1
- Hiệu năng: 1

**Theo mức độ ưu tiên**:

- Cao: 16
- Trung bình: 22
- Thấp: 5

**Ghi chú cần xác minh trực tiếp (chưa quét được do không có dialog mở lúc scan)**:

- Nội dung form/dialog của `"Add Category"`, `"Edit <category>"`, `"Add Service"`, click-vào-dòng (sửa dịch vụ), và `"Manage Order"`.
- Hành vi thực tế của tab Inactive (giá trị STATUS hiển thị, có dịch vụ Inactive mẫu hay không).
- Việc lưu trạng thái tìm kiếm/tab qua URL query param khi reload.
- Phân quyền theo vai trò (Staff/Manager/Owner) đối với các hành động quản lý dịch vụ/category.
- Cặp tên trùng nhau trong dữ liệu mẫu (`"Tropical Deluxe"`, `"Diamond Pedicure"` xuất hiện 2 lần) — xác nhận là dịch vụ khác nhau hay dữ liệu test bị trùng.

## Lịch sử chạy

### 2026-08-12

- Lệnh: `WORKERS=8 npx playwright test tests/e2e` (full suite, headless)
- Kết quả màn này: 6 fail → 1 fail
- Fail còn lại — **nghi bug sản phẩm, KHÔNG sửa test**: TC-SVC-010 · handle kéo-thả của category "Other" có `aria-disabled="false"`, tức đang cho phép kéo, trong khi quy tắc là "Other luôn nằm cuối". Cần product xác nhận đây là gỡ ràng buộc có chủ đích hay regression.
- Nguyên nhân gốc đã sửa: `ProductsPage.waitForReady()` chỉ chờ ô search chứ **không chờ bảng**, nên mọi test đọc footer đều đọc trúng "Showing 0 to 0 of 0 results" lúc còn đang tải (làm hỏng TC-SVC-021/022/023/045). Đã bổ sung chờ skeleton tan + footer hiện.
- `search()` trước đây gõ xong bấm Enter rồi trả về ngay; nay chờ đúng vòng fetch `GET /services?...&name[]=<term>` (bounded 5s, best-effort vì query trùng có thể trả từ cache).
- TC-SVC-017 bấm nhầm nút ngoài dialog: nút submit trong dialog tên là **"Create"**, không phải "Save"/"Add"; và dialog có cả "Cancel" lẫn "Close" nên regex `/cancel|close/i` khớp 2 phần tử.
- Report chi tiết: `npm run report` (reports/html)

### 2026-08-13 — bỏ test bị skip

- Lệnh: `npx playwright test tests/e2e/services` (headless, 4 workers)
- Kết quả: **42 pass / 1 skip** (trước đó 15 `test.fixme` + 2 fail).
- **Đính chính TC-SVC-010** (lần chạy 2026-08-12 kết luận là bug sản phẩm): không phải bug. Locator `categoryReorderHandle('Other')` dùng regex **không neo** nên khớp nhầm sang category tên `"Other test"`. Category `"Other"` thật ra **không có drag handle** — chỉ có nhãn "Other is always last". Đã neo `^…$` cho toàn bộ locator hành động của category; TC-SVC-010 pass.
- **Đính chính TC-SVC-022**: case hardcode `of 259 results`, vỡ ngay khi có test khác thêm dịch vụ. Nay đọc tổng tại thời điểm chạy.
- Nhóm mutation (TC-SVC-011/012/015/016/018) đã chạy thật, gom vào `test.describe('mutating category state')` chạy **serial** và mỗi case tự khôi phục trong `finally`:
  - `moveCategoryToIndex()` hội tụ về đúng vị trí ban đầu từ bất kỳ trạng thái nào, thay vì giả định "một click ngược lại là đủ" (sai khi case fail giữa chừng).
  - Thứ tự category ghi qua `PUT /display_orders/<id>`; UI cập nhật lạc quan **trước** khi request xong, nên phải chờ response — nếu reload ngay sẽ huỷ request đang bay và trông như "không lưu được".
  - TC-SVC-015 (kéo-thả) dùng bàn phím của dnd-kit (Space → Arrow → Space) thay vì giả lập chuột: cùng code path, cùng request, nhưng ổn định.
- **Bẫy chung của Portal**: khi access token hết hạn, lần bấm submit **đầu tiên** bị nuốt trong lúc `POST /refresh_token` chạy — không request, không lỗi, dialog đứng yên. Lần bấm thứ hai mới đi. Các helper submit đều retry.
- TC-SVC-003 / 031: đã xác minh — state lưu qua URL (`?name=<term>&page=1&categoryStatus=inactive`), reload và chuyển tab đều giữ nguyên từ khoá.
- TC-SVC-063: `?page=0` và `?page=abc` **được clamp** về trang 1 (khác Customers, nơi cùng tham số lại ra màn hình Error); `?page=99` ra empty state có kiểm soát.
- TC-SVC-090: đo bằng `performance.memory` + thời gian mỗi trang khi đi hết 9 trang, assert theo ngưỡng "không treo" (case không đặt SLA) và đính kèm số đo vào report.

**Còn skip (1)**: TC-SVC-072 · role hạn chế — cần capture thêm storageState của tài khoản không có quyền quản lý dịch vụ.

**Lưu ý dữ liệu**: Portal **không có nút xoá category/service**. TC-SVC-016 tạo category thật (prefix `E2E-CAT-`) và chỉ có thể dọn bằng cách set Inactive; mỗi lần chạy sẽ để lại 1 dòng inactive. Muốn sạch hẳn cần API delete.

### 2026-10-13 10:11 (UTC+7)

- Lệnh: `npx cross-env ENV=local playwright test tests/e2e` (full suite, headless, 8 workers)
- Kết quả: 1 passed, 36 failed, 5 skipped (tổng 42)
- Fail: toàn bộ 36 case fail cùng một nguyên nhân — session đăng nhập (`src/data/dynamic/auth/admin.json`) đã hết hạn (refreshToken expired 2026-08-28), mọi trang bị redirect về `/login`. Không phải lỗi test/locator. Cần `npm run auth` rồi chạy lại.
- Report chi tiết: `npm run report` (reports/html) · Dashboard: `npm run dashboard:open`

### 2026-10-13 (UTC+7) — ENV=stage

- Lệnh: `ENV=stage npm run test:report` (full suite, headless, 8 workers, `https://v2.dev-fastboypay.com`)
- Kết quả: 41 passed, 0 failed, 1 skipped (tổng 42) — toàn suite 705 passed, 0 failed, 130 skipped
- Đã sửa test (fail ở các lần chạy trước trong ngày, đều do test chứ không phải bug app):
  - TC-SVC-022 · đọc footer trước khi refetch xong (race) → `expect.poll`
  - TC-SVC-046 · tổng thay đổi 302→303 giữa chừng do TC-SVC-050 thêm service → lấy tổng từ footer trang cuối
- Report chi tiết: `npm run report` (reports/html) · Dashboard: `npm run dashboard:open`
