# Batch History — Test Case

- **Màn hình:** Batch History
- **Route:** `/pos/<storeId>/batch` (vd: `/pos/14/batch`)
- **Ngày quét:** 2026-07-15
- **Nguồn:** `docs/test-cases/_scan/batch-history.json`, `docs/test-cases/_scan/batch-history-wide.json`

## Kiểm kê tính năng (Feature inventory)

- **Chrome chung:** sidebar trái (nhóm POS: Overview, Orders, Payroll, Batch History[active]; nhóm Management: Staffs, Services, Customers, Customer Groups, Income Reports, Settings; nhóm Admin: Onboarding, Merchants, Orders, Packages, Devices, Monitor, Versions), nút chuyển store, menu user, nút thu gọn sidebar.
- **Header:** tiêu đề "Batch History", không có tab.
- **Thanh filter:**
  - Nút chọn khoảng ngày (label hiển thị khoảng đang chọn, vd "Jul 8, 2026 - Jul 15, 2026"); mặc định là 7 ngày gần nhất, tương ứng query param `dateAfter`/`dateBefore`.
  - Combobox trạng thái (status), mặc định "All status"; giá trị dữ liệu thực tế quan sát được là `Open` và `Closed`.
  - Nút "Clear filters" — chỉ xuất hiện khi filter khác mặc định; bấm vào để reset khoảng ngày và trạng thái.
- **Bảng dữ liệu** gồm các cột: BATCH DATE (vd "Jun 12, 2026 (UTC+7)"), BATCH NUMBER (vd "B-00103", đánh số có padding 0, chỉ là text thường — không phải link, không phát hiện có row click/detail view), STATUS (badge: màu hổ phách "Open" / màu xám "Closed"), TOTAL PAYMENT (số nguyên, dạng đếm), AMOUNT (tiền tệ USD, dạng `$` + dấu phân cách hàng nghìn + 2 số thập phân).
- **Phân trang:** footer "Showing X to Y of Z results", chỉ số trang "N / M", nút Previous/Next (disable ở biên), cố định 30 dòng/trang, không có bộ chọn số dòng/trang.
- **Trạng thái rỗng (empty state):** thông báo "No batches found." trên 1 dòng duy nhất, footer "Showing 0 to 0 of 0 results", Previous/Next disable, "1 / 1".
- **Không có:** ô tìm kiếm, header cột có thể sort, checkbox chọn dòng/bulk action, nút export/download, nút tạo mới, modal/drawer chi tiết, icon action theo dòng. Đây là màn hình sổ cái lịch sử, chỉ đọc (read-only).
- **Query param:** `page`, `status` (`all|open|closed`), `dateAfter`, `dateBefore` (`YYYY-MM-DD`) — trạng thái filter có thể deep-link qua URL.
- **Câu hỏi mở (cần xác minh trực tiếp trên môi trường thật):** danh sách đầy đủ option của dropdown status; widget/preset của date-picker; TOTAL PAYMENT là số lượng payment hay là một khoản tổng phụ; có phân quyền theo role đối với việc hiển thị màn hình này hay không.

## Test case

### Tải trang & bố cục

**TC-BH-001 · Truy cập trực tiếp vào Batch History load đúng**

- Mức ưu tiên: Cao · Loại: Điều hướng
- Điều kiện tiên quyết: Đã đăng nhập (dùng lại storageState).
- Các bước: 1) Điều hướng trực tiếp tới `/pos/<storeId>/batch`. 2) Chờ trang load xong.
- Kết quả mong đợi: Trang load thành công, không bị redirect về `/login`; URL đúng; header hiển thị "Batch History"; khoảng ngày mặc định là 7 ngày gần nhất và status là "All status".

**TC-BH-002 · Tất cả khu vực chính hiển thị đầy đủ khi load lần đầu**

- Mức ưu tiên: Cao · Loại: Giao diện
- Các bước: 1) Điều hướng tới màn hình. 2) Kiểm tra header, thanh filter, bảng dữ liệu, footer phân trang.
- Kết quả mong đợi: Mọi khu vực đều hiện diện và có dữ liệu (hoặc hiển thị empty state) — không có khu vực nào bị thiếu/trống bất thường.

**TC-BH-003 · Hiển thị trạng thái loading trước khi dữ liệu trả về**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Điều kiện tiên quyết: Network được throttle/delay qua route interception.
- Các bước: 1) Delay response của API danh sách batch. 2) Điều hướng tới màn hình. 3) Quan sát ngay sau khi điều hướng.
- Kết quả mong đợi: Hiển thị loading indicator/skeleton thay cho bảng; không có khoảng trắng/flash không style.

**TC-BH-004 · Refresh trình duyệt render lại đúng trạng thái cũ**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Load màn hình với filter khác mặc định (vd status=Open). 2) Nhấn F5.
- Kết quả mong đợi: Trang reload lại đúng URL/query param, filter và dữ liệu hiển thị lại y hệt.

**TC-BH-005 · API load ban đầu lỗi thì hiển thị trạng thái lỗi, không vỡ layout**

- Mức ưu tiên: Cao · Loại: Tiêu cực
- Các bước: 1) Ép request danh sách batch trả lỗi (500/abort). 2) Điều hướng tới màn hình.
- Kết quả mong đợi: Sidebar/header vẫn render bình thường; khu vực bảng hiển thị thông báo lỗi rõ ràng thay vì skeleton chạy vô hạn hoặc trang trắng.

### Sidebar / điều hướng chính

**TC-BH-006 · Link "Batch History" trên sidebar điều hướng đúng và highlight active**

- Mức ưu tiên: Cao · Loại: Điều hướng
- Các bước: 1) Từ màn hình khác, bấm "Batch History" trên sidebar.
- Kết quả mong đợi: Điều hướng tới `/pos/<storeId>/batch`; mục "Batch History" có style active; các mục khác ở trạng thái inactive.

**TC-BH-007 · Trạng thái active vẫn giữ nguyên sau khi reload**

- Mức ưu tiên: Trung bình · Loại: Điều hướng
- Các bước: 1) Điều hướng tới Batch History. 2) Reload (F5).
- Kết quả mong đợi: "Batch History" vẫn được highlight active sau khi reload.

**TC-BH-008 · Nút Back/Forward của trình duyệt khôi phục đúng trạng thái filter**

- Mức ưu tiên: Cao · Loại: Điều hướng
- Các bước: 1) Áp dụng status=Open. 2) Đổi khoảng ngày. 3) Bấm Back. 4) Bấm Forward.
- Kết quả mong đợi: Back khôi phục đúng trạng thái query param (status/ngày) trước đó với dữ liệu bảng khớp; Forward áp dụng lại trạng thái sau — không có bảng trống/cũ (stale).

**TC-BH-009 · Nút thu gọn sidebar hoạt động đúng trên màn hình này**

- Mức ưu tiên: Thấp · Loại: Giao diện
- Các bước: 1) Ở Batch History, bấm nút thu gọn sidebar.
- Kết quả mong đợi: Sidebar thu gọn về dạng chỉ icon; nội dung chính reflow lại; bấm lần nữa khôi phục về trạng thái mở rộng, "Batch History" vẫn được highlight.

### Filter — khoảng ngày

**TC-BH-010 · Khoảng ngày mặc định là 7 ngày gần nhất**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Điều hướng tới `/pos/<storeId>/batch` không kèm query param.
- Kết quả mong đợi: Label của nút chọn ngày hiển thị khoảng 7 ngày kết thúc là hôm nay; `dateAfter`/`dateBefore` trên URL phản ánh đúng khoảng đó.

**TC-BH-011 · Chọn khoảng ngày mới lọc bảng và cập nhật URL**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Mở date range picker. 2) Chọn khoảng rộng hơn bao trùm các batch lịch sử đã biết (vd 2020-01-01 đến hôm nay). 3) Áp dụng.
- Kết quả mong đợi: Bảng nạp lại tất cả batch trong khoảng đã chọn; query param `dateAfter`/`dateBefore` cập nhật đúng; số lượng kết quả ở footer cập nhật theo.

**TC-BH-012 · Khoảng ngày không có batch nào khớp thì hiển thị empty state**

- Mức ưu tiên: Cao · Loại: Biên
- Các bước: 1) Chọn khoảng ngày không có batch nào.
- Kết quả mong đợi: Bảng hiển thị "No batches found."; footer hiển thị "Showing 0 to 0 of 0 results"; Previous/Next disable; chỉ số trang "1 / 1".

**TC-BH-013 · Chọn ngày kết thúc trước ngày bắt đầu bị chặn hoặc tự sửa**

- Mức ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước: 1) Mở date picker. 2) Thử chọn ngày kết thúc sớm hơn ngày bắt đầu đã chọn.
- Kết quả mong đợi: Picker ngăn lựa chọn không hợp lệ (disable các ngày trước đó) hoặc tự động hoán đổi khoảng; không bị crash, không có trạng thái `dateAfter > dateBefore` được gửi lên URL/API.

**TC-BH-014 · Khoảng 1 ngày (start = end) hợp lệ**

- Mức ưu tiên: Thấp · Loại: Biên
- Các bước: 1) Chọn cùng một ngày cho cả start và end.
- Kết quả mong đợi: Bảng lọc đúng batch của ngày đó (hoặc hiển thị empty state nếu không có), không có lỗi phát sinh.

**TC-BH-015 · Deep-link khoảng ngày qua URL query param áp dụng filter ngay khi load**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Điều hướng trực tiếp tới `/pos/<storeId>/batch?page=1&status=all&dateAfter=2026-01-01&dateBefore=2026-07-15`.
- Kết quả mong đợi: Nút date picker phản ánh đúng khoảng ngày từ URL ngay khi load; bảng hiển thị batch trong khoảng đó mà không cần người dùng mở lại picker.

### Filter — trạng thái (status)

**TC-BH-016 · Lọc "Open" chỉ hiển thị các batch đang mở**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Mở combobox status. 2) Chọn "Open".
- Kết quả mong đợi: Chỉ các dòng có badge STATUS "Open" được hiển thị; combobox phản ánh đúng lựa chọn; URL có `status=open` (hoặc tương đương).

**TC-BH-017 · Lọc "Closed" chỉ hiển thị các batch đã đóng**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Chọn "Closed" trong combobox status.
- Kết quả mong đợi: Chỉ các dòng có STATUS "Closed" được hiển thị.

**TC-BH-018 · "All status" hiển thị cả batch Open và Closed**

- Mức ưu tiên: Trung bình · Loại: Chức năng
- Các bước: 1) Đang có filter, chuyển lại về "All status".
- Kết quả mong đợi: Bảng hiển thị lại cả dòng Open và Closed, khớp với tổng số không filter của khoảng ngày đang chọn.

**TC-BH-019 · Kết hợp filter status với khoảng ngày áp dụng đồng thời cả hai (AND)**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Chọn khoảng ngày rộng. 2) Chọn status=Open.
- Kết quả mong đợi: Chỉ hiển thị batch Open trong khoảng ngày đó; đổi bất kỳ filter nào cũng áp dụng lại cả hai điều kiện cùng lúc.

**TC-BH-020 · Filter status không có kết quả khớp thì hiển thị empty state**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Lọc theo tổ hợp status/ngày biết trước là không có kết quả.
- Kết quả mong đợi: Empty state "No batches found." render đúng; không có lỗi console.

### Filter — clear/reset

**TC-BH-021 · "Clear filters" chỉ xuất hiện khi filter khác mặc định**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Các bước: 1) Load màn hình với filter mặc định. 2) Xác nhận "Clear filters" không xuất hiện/bị ẩn. 3) Đổi khoảng ngày hoặc status.
- Kết quả mong đợi: Nút "Clear filters" xuất hiện ngay khi bất kỳ filter nào khác trạng thái mặc định (7 ngày/All status).

**TC-BH-022 · "Clear filters" reset về khoảng ngày và status mặc định**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Áp dụng khoảng ngày tùy chỉnh và status=Closed. 2) Bấm "Clear filters".
- Kết quả mong đợi: Khoảng ngày quay về mặc định 7 ngày gần nhất, status quay về "All status", bảng refresh lại tương ứng, và nút "Clear filters" biến mất.

### Bảng dữ liệu & phân trang

**TC-BH-023 · Header bảng hiển thị đúng nhãn và đúng thứ tự**

- Mức ưu tiên: Cao · Loại: Chức năng
- Các bước: 1) Điều hướng tới màn hình khi có dữ liệu.
- Kết quả mong đợi: Các cột hiển thị đúng thứ tự: BATCH DATE, BATCH NUMBER, STATUS, TOTAL PAYMENT, AMOUNT — rõ ràng và căn chỉnh đúng với dữ liệu.

**TC-BH-024 · Giá trị từng dòng khớp với dữ liệu nguồn**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) So sánh dữ liệu một batch đã biết trước với dòng tương ứng trên bảng.
- Kết quả mong đợi: BATCH DATE, BATCH NUMBER, STATUS, TOTAL PAYMENT và AMOUNT đều khớp chính xác, không bị cắt/lệch dữ liệu.

**TC-BH-025 · Nút Next/Previous chuyển trang đúng**

- Mức ưu tiên: Cao · Loại: Chức năng
- Điều kiện tiên quyết: Khoảng ngày đủ rộng để có >30 kết quả (vd all-time).
- Các bước: 1) Ghi lại dữ liệu dòng trang 1. 2) Bấm "Next". 3) Bấm "Previous".
- Kết quả mong đợi: Trang 2 hiển thị tập dòng khác, footer/chỉ số trang cập nhật ("2 / N"); Previous quay lại đúng các dòng trang 1 ban đầu.

**TC-BH-026 · Nút phân trang disable đúng ở trang đầu/cuối**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Ở trang 1, kiểm tra Previous. 2) Chuyển tới trang cuối, kiểm tra Next.
- Kết quả mong đợi: Previous disable ở trang 1; Next disable ở trang cuối.

**TC-BH-027 · Footer "Showing X to Y of Z results" chính xác qua các trang**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Load tập filter có tổng số đã biết (vd 88 kết quả / 3 trang). 2) Kiểm tra text footer ở trang 1, 2 và trang cuối.
- Kết quả mong đợi: Trang 1 hiển thị "Showing 1 to 30 of 88 results", trang 2 "31 to 60", trang cuối phản ánh đúng phần còn lại (vd "61 to 88"); tổng không bao giờ vượt quá Z.

**TC-BH-028 · Phân trang ẩn/disable đúng khi kết quả chỉ có 1 trang**

- Mức ưu tiên: Thấp · Loại: Biên
- Các bước: 1) Lọc khoảng có ≤30 kết quả.
- Kết quả mong đợi: Cả Previous và Next đều disable, chỉ số trang hiển thị "1 / 1"; không có trang 2 bị vỡ/thiếu dữ liệu.

**TC-BH-029 · Đổi filter khi đang ở trang 2+ reset về trang 1**

- Mức ưu tiên: Trung bình · Loại: Biên
- Các bước: 1) Điều hướng tới trang 2 hoặc 3 của kết quả. 2) Đổi filter status hoặc khoảng ngày.
- Kết quả mong đợi: Bảng reset về trang 1 của kết quả đã lọc mới, thay vì hiển thị trang ngoài phạm vi hoặc bảng trống.

**TC-BH-030 · Ô batch number và các ô khác không tương tác được (sổ cái chỉ đọc)**

- Mức ưu tiên: Thấp · Loại: Tiêu cực
- Các bước: 1) Bấm trực tiếp vào ô BATCH NUMBER và các ô khác trong một dòng.
- Kết quả mong đợi: Không có điều hướng, modal hay drawer nào mở ra — đúng với việc màn hình này không có detail view; không phát sinh lỗi console khi bấm.

### Định dạng dữ liệu

**TC-BH-031 · BATCH DATE hiển thị kèm chú thích timezone**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Kiểm tra giá trị cột BATCH DATE.
- Kết quả mong đợi: Mỗi ngày được định dạng dạng "Jun 12, 2026 (UTC+7)" nhất quán ở tất cả các dòng.

**TC-BH-032 · AMOUNT hiển thị đúng định dạng tiền tệ USD với dấu phân cách hàng nghìn và 2 số thập phân**

- Mức ưu tiên: Cao · Loại: Dữ liệu
- Các bước: 1) Kiểm tra giá trị AMOUNT, bao gồm cả giá trị lớn (vd > $100,000).
- Kết quả mong đợi: Giá trị hiển thị dạng `$X,XXX.XX` đúng cách phân nhóm và chính xác 2 số thập phân, không bị lệch làm tròn so với dữ liệu nguồn.

**TC-BH-033 · TOTAL PAYMENT hiển thị dạng số nguyên thường, không định dạng tiền tệ**

- Mức ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước: 1) Kiểm tra giá trị TOTAL PAYMENT ở nhiều dòng.
- Kết quả mong đợi: Giá trị là số nguyên thường (vd "14", "2784"), không có ký hiệu `$` hay số thập phân.

**TC-BH-034 · Style badge STATUS khớp với giá trị ("Open" vs "Closed")**

- Mức ưu tiên: Trung bình · Loại: Giao diện
- Các bước: 1) Tìm một dòng "Open" và một dòng "Closed".
- Kết quả mong đợi: "Open" hiển thị badge màu hổ phách/cam khác biệt; "Closed" hiển thị badge màu xám trung tính; nội dung nhãn khớp chính xác.

**TC-BH-035 · Định dạng BATCH NUMBER nhất quán, dạng chuỗi số có padding 0**

- Mức ưu tiên: Thấp · Loại: Dữ liệu
- Các bước: 1) Kiểm tra giá trị BATCH NUMBER ở nhiều dòng.
- Kết quả mong đợi: Tất cả giá trị theo đúng mẫu `B-XXXXX` có padding 0, không có sai lệch định dạng/viết hoa-thường.

**TC-BH-036 · TOTAL PAYMENT/AMOUNT bằng 0 hiển thị là 0, không để trống**

- Mức ưu tiên: Trung bình · Loại: Biên
- Điều kiện tiên quyết: Có một batch với 0 payment/amount (nếu có sẵn trong dữ liệu test).
- Kết quả mong đợi: Hiển thị "0" / "$0.00" tương ứng — không bao giờ để trống, "NaN", hay "undefined".

### Trường hợp tiêu cực & biên

**TC-BH-037 · Empty state render đúng, không lỗi console**

- Mức ưu tiên: Cao · Loại: Biên
- Các bước: 1) Áp dụng tổ hợp khoảng ngày/status có 0 kết quả.
- Kết quả mong đợi: Hiển thị "No batches found."; footer "Showing 0 to 0 of 0 results"; không có lỗi JS trong console.

**TC-BH-038 · Query param ngày không hợp lệ/sai định dạng được xử lý an toàn**

- Mức ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước: 1) Điều hướng trực tiếp tới `/pos/<storeId>/batch?dateAfter=not-a-date&dateBefore=2026-07-15`.
- Kết quả mong đợi: App fallback về khoảng ngày mặc định hợp lý (hoặc hiển thị thông báo lỗi/validate rõ ràng) thay vì crash hoặc hiện exception chưa xử lý.

**TC-BH-039 · Query param status không hợp lệ fallback về "All status"**

- Mức ưu tiên: Thấp · Loại: Tiêu cực
- Các bước: 1) Điều hướng tới `/pos/<storeId>/batch?status=bogus`.
- Kết quả mong đợi: Combobox fallback về "All status" (hoặc bỏ qua giá trị không hợp lệ) mà không crash; bảng hiển thị tập không filter cho khoảng ngày hiện tại.

**TC-BH-040 · API chậm hiển thị trạng thái loading, không bị đứng UI**

- Mức ưu tiên: Trung bình · Loại: Hiệu năng
- Các bước: 1) Delay response danh sách batch 8–10 giây. 2) Quan sát màn hình trong lúc chờ.
- Kết quả mong đợi: Loading indicator hiển thị xuyên suốt; trang vẫn phản hồi được (sidebar/filter vẫn thao tác được nếu áp dụng); nội dung render đầy đủ khi response delay trả về.

**TC-BH-041 · Request timeout/không có phản hồi hiển thị lỗi kèm nút retry**

- Mức ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước: 1) Intercept request danh sách batch và để nó treo vô thời hạn.
- Kết quả mong đợi: Sau một khoảng timeout hợp lý, hiển thị trạng thái lỗi/retry thay vì spinner chạy vô hạn.

**TC-BH-042 · Session hết hạn giữa chừng thì redirect về login**

- Mức ưu tiên: Cao · Loại: Bảo mật
- Các bước: 1) Load màn hình thành công. 2) Vô hiệu hóa session token. 3) Đổi một filter (kích hoạt API call mới).
- Kết quả mong đợi: App phát hiện lỗi 401 và redirect về `/login` (hoặc hiển thị thông báo hết hạn session); không để lại trạng thái UI bị lỗi.

**TC-BH-043 · Khoảng ngày all-time lớn vẫn load và phân trang không lỗi**

- Mức ưu tiên: Cao · Loại: Hiệu năng
- Các bước: 1) Chọn khoảng ngày rộng nhất có thể (vd 2020-01-01 tới hôm nay). 2) Duyệt qua tất cả các trang kết quả.
- Kết quả mong đợi: Tất cả các trang load không bị timeout/đứng UI; tổng số và số lượng mỗi trang nhất quán; không có dòng trùng lặp hoặc thiếu giữa các trang.

### Responsive

**TC-BH-044 · Bố cục đúng ở độ rộng desktop chuẩn (1920x1080)**

- Mức ưu tiên: Trung bình · Loại: Responsive
- Kết quả mong đợi: Sidebar mở rộng đầy đủ, thanh filter và bảng chiếm toàn bộ chiều rộng, không có thanh cuộn ngang ở trang.

**TC-BH-045 · Bố cục đúng ở độ rộng laptop (1366x768)**

- Mức ưu tiên: Trung bình · Loại: Responsive
- Kết quả mong đợi: Nội dung reflow không bị cắt xén; không có overflow ngang ở body trang.

**TC-BH-046 · Bảng chuyển sang scroll/stacked ở độ rộng mobile (375px)**

- Mức ưu tiên: Cao · Loại: Responsive
- Kết quả mong đợi: Bảng scroll ngang trong container riêng (không phải toàn trang) hoặc chuyển sang layout dạng stacked; thanh filter wrap hoặc thu gọn hợp lý; body trang không có thanh cuộn ngang.

**TC-BH-047 · Không bị overflow ngang ở độ rộng mobile tối thiểu (320px)**

- Mức ưu tiên: Trung bình · Loại: Responsive
- Kết quả mong đợi: `document.body.scrollWidth` không vượt quá `window.innerWidth`; date picker, status filter, và nút phân trang vẫn thao tác được.

### Khả năng tiếp cận (Accessibility)

**TC-BH-048 · Toàn bộ màn hình có thể duyệt tuần tự bằng phím Tab**

- Mức ưu tiên: Cao · Loại: Khả năng tiếp cận
- Các bước: 1) Tab qua trang từ trên xuống: date picker, status combobox, Clear filters (nếu có), bảng, Previous/Next.
- Kết quả mong đợi: Thứ tự focus theo đúng bố cục hiển thị; mọi control tương tác đều nhận focus rõ ràng; không có phần tử nào bị bỏ qua.

**TC-BH-049 · Date picker và status combobox thao tác được bằng bàn phím**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Tab tới nút date picker và mở bằng Enter/Space. 2) Tab tới status combobox và đổi lựa chọn bằng phím (mũi tên + Enter).
- Kết quả mong đợi: Cả hai control thao tác được hoàn toàn không cần chuột; lựa chọn áp dụng và bảng cập nhật đúng.

**TC-BH-050 · Nút phân trang thao tác được bằng bàn phím**

- Mức ưu tiên: Thấp · Loại: Khả năng tiếp cận
- Các bước: 1) Tab tới "Next"/"Previous" và kích hoạt bằng Enter/Space.
- Kết quả mong đợi: Trang đổi đúng như khi bấm chuột; nút disable không nhận focus/được thông báo đúng trạng thái disable.

**TC-BH-051 · Badge trạng thái không chỉ dựa vào màu sắc để phân biệt**

- Mức ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước: 1) Kiểm tra badge "Open" vs "Closed" với công cụ giả lập mù màu hoặc bỏ style màu.
- Kết quả mong đợi: Trạng thái vẫn phân biệt được qua nhãn text, không chỉ dựa vào màu badge.

### Bảo mật & phân quyền

**TC-BH-052 · Truy cập trực tiếp khi chưa đăng nhập bị redirect về login**

- Mức ưu tiên: Cao · Loại: Bảo mật
- Các bước: 1) Xóa cookie/session đăng nhập. 2) Điều hướng trực tiếp tới `/pos/<storeId>/batch`.
- Kết quả mong đợi: Redirect về `/login`; không có dữ liệu batch nào bị lộ trước khi redirect.

**TC-BH-053 · Menu/màn hình bị ẩn hoặc chặn với role không có quyền Batch History**

- Mức ưu tiên: Cao · Loại: Bảo mật
- Điều kiện tiên quyết: Có tài khoản/role test không có quyền truy cập Batch History.
- Các bước: 1) Đăng nhập với role đó. 2) Kiểm tra sidebar có mục "Batch History" không. 3) Thử truy cập trực tiếp URL `/pos/<storeId>/batch`.
- Kết quả mong đợi: Mục menu bị ẩn với role không có quyền, và truy cập trực tiếp URL bị chặn (redirect hoặc 403), không âm thầm hiển thị dữ liệu.

**TC-BH-054 · Truy cập chéo store bị chặn**

- Mức ưu tiên: Cao · Loại: Bảo mật
- Các bước: 1) Đang đăng nhập cho store 14, điều hướng tới `/pos/<otherStoreId>/batch` của store mà user không có quyền truy cập.
- Kết quả mong đợi: Truy cập bị từ chối/redirect; không có dữ liệu batch của store khác bị lộ.

**TC-BH-055 · Không lộ dữ liệu nhạy cảm qua URL/query param**

- Mức ưu tiên: Thấp · Loại: Bảo mật
- Các bước: 1) Kiểm tra URL và lịch sử trình duyệt trong lúc dùng filter.
- Kết quả mong đợi: Chỉ có trạng thái filter (ngày, status, page) xuất hiện trên URL — không có token, thông tin cá nhân (PII), hay tổng tiền thô nào ngoài những gì đã hiển thị công khai trên UI.

## Tổng kết độ phủ (Coverage summary)

- **Tổng số test case:** 55
- **Theo nhóm (dimension):** Tải trang/bố cục (5), Sidebar/điều hướng (4), Filter khoảng ngày (6), Filter trạng thái (5), Clear filters (2), Bảng/phân trang (8), Định dạng dữ liệu (6), Tiêu cực/biên (7), Responsive (4), Khả năng tiếp cận (4), Bảo mật (4).
- **Theo mức ưu tiên:** Cao 24 · Trung bình 25 · Thấp 6.
- **Theo loại:** Chức năng 14, Giao diện 5, Dữ liệu 6, Tiêu cực 8, Biên 8, Bảo mật 4, Khả năng tiếp cận 4, Responsive 4, Hiệu năng 2.
- **Các phần còn hoãn / cần xác minh trực tiếp:** danh sách option chính xác của dropdown status và hành vi widget/preset của date-picker (mới suy ra từ dữ liệu, chưa được liệt kê đầy đủ qua static scan); TOTAL PAYMENT là số lượng hay tổng phụ (TC-BH-033 chỉ xác nhận định dạng quan sát hiện tại); quy tắc phân quyền theo role (TC-BH-053/054 cần tài khoản role bị giới hạn thật để thực thi); hành vi phân trang ở quy mô dữ liệu lớn hơn ~88 dòng đã quan sát tại thời điểm quét.
