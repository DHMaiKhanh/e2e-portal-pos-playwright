# Maintenance 2026 Q4 M10 W4 — mục lục test case

> 30 ticket của project Linear
> [Maintenance 2026 Q4 M10 W4](https://linear.app/fastboy/project/maintenance-2026-q4-m10-w4-a2bd1384ce6e/issues), mỗi
> tính năng một file `.md`. Ticket chạy trên **Portal** có spec Playwright tự động; ticket chạy trên **app POS** hoặc
> **BE** chỉ có test case test tay (suite này chỉ điều khiển được Portal web). Cập nhật 2026-11-02.

## Portal — có test tự động

| Tính năng                                | Ticket              | File                                                                                                  | Spec (`tests/e2e/regression-linear/`)  | Kết quả tự động 02/11          |
| ---------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------ |
| Customer Group cho phép trùng tên        | VP-4566             | [customer-group-duplicate-name.md](customer-group-duplicate-name.md)                                  | `vp-4566.e2e.spec.ts`                  | 29/10: 7/7 pass                |
| Customer Group — tên chỉ có khoảng trắng | VP-5214             | [customer-group-blank-name.md](customer-group-blank-name.md)                                          | `vp-4566.e2e.spec.ts`                  | 29/10: fail (trước khi fix)    |
| Customer Group — trim tên                | VP-5215             | [customer-group-name-trim.md](customer-group-name-trim.md)                                            | `vp-4566.e2e.spec.ts`                  | 29/10: fail (trước khi fix)    |
| Customers — bộ lọc Group                 | VP-5216             | [customer-group-filter.md](customer-group-filter.md)                                                  | `vp-4566.e2e.spec.ts`                  | 29/10: fail (trước khi fix)    |
| Bảng màu Category = Staff                | VP-5338             | [category-color-palette.md](category-color-palette.md)                                                | `vp-5338.e2e.spec.ts`                  | 6/6 pass                       |
| Category cũ đổi sang màu Staff           | VP-5483             | [category-old-color-remap.md](category-old-color-remap.md)                                            | `vp-5338.e2e.spec.ts`                  | 3/4 — 1 category còn `#999999` |
| Earn points on tip                       | VP-4812             | [earn-points-on-tip.md](earn-points-on-tip.md)                                                        | `vp-4812.e2e.spec.ts`                  | 8/8 pass                       |
| Font Size (Portal + POS Accessibility)   | VP-4809 (Request 1) | [font-size-setting.md](font-size-setting.md)                                                          | `vp-4809.e2e.spec.ts`                  | 8/8 pass                       |
| Staff Payroll hiện staff income $0       | VP-3356             | [staff-payroll-zero-income.md](staff-payroll-zero-income.md)                                          | `vp-3356.e2e.spec.ts`                  | 4/4 pass                       |
| Staff Payroll kỳ Unclosed — JD53001      | VP-3891             | [staff-payroll-zero-income-unclosed.md](staff-payroll-zero-income-unclosed.md)                        | `vp-3356.e2e.spec.ts`                  | 2/2 pass                       |
| Điểm theo lượt check-in (Checkout type)  | VP-4489             | [checkin-points.md](checkin-points.md) · Portal: [checkout-type-setting.md](checkout-type-setting.md) | `tests/e2e/settings/checkout-setting/` | (suite VP-4590)                |

Các file VP-4809, VP-4812, VP-3356, VP-3891, VP-5338, VP-5483 có thêm mục **test tay trên POS**.

## POS / BE — test tay

| Tính năng                                   | Ticket                      | File                                                                                       | Số TC | Trạng thái QC (theo Linear)                        |
| ------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------ | ----: | -------------------------------------------------- |
| Thứ tự cột thợ và màu Appointment giống GAP | VP-4402 · VP-5479 · VP-5481 | [pos-appointment-staff-order-color.md](pos-appointment-staff-order-color.md)               |    13 | Todo — 2 bug mở (VP-5479, VP-5481)                 |
| Trang Version Update thay popup auto update | VP-2691 · VP-2787 · VP-5102 | [pos-version-update-page.md](pos-version-update-page.md)                                   |    14 | QC Completed (1.1.59: 13/13)                       |
| Sắp xếp staff check-in ở Pending Orders     | VP-4035                     | [pos-pending-orders-staff-sort.md](pos-pending-orders-staff-sort.md)                       |     7 | Done (1.1.62: 7/7)                                 |
| GoCheckin kiosk → order pending trên POS    | VP-4823                     | [pos-gocheckin-pending-order-sync.md](pos-gocheckin-pending-order-sync.md)                 |     8 | QC Completed (không có bảng từng ca)               |
| Campaign Reminder / New Client / Birthday   | VP-4538                     | [pos-campaign-reminder-newclient-birthday.md](pos-campaign-reminder-newclient-birthday.md) |     9 | QC Completed (1.1.57)                              |
| Giảm giá FIXED vượt phần được giảm          | VP-4375                     | [pos-fixed-discount-cap.md](pos-fixed-discount-cap.md)                                     |    12 | In Review — chưa có QC                             |
| Guard huỷ đơn gift card                     | VP-4376                     | [pos-gift-card-cancel-guard.md](pos-gift-card-cancel-guard.md)                             |     6 | Done — chưa có kết quả QC                          |
| Re-Open / Adjust Tip sau Split Payment      | VP-4912 · VP-4913           | [pos-split-payment-reopen-adjust-tip.md](pos-split-payment-reopen-adjust-tip.md)           |    21 | QC Completed; 1.1.85 regression (VP-5286, VP-5287) |
| Số Promo & Rewards khả dụng                 | VP-4802                     | [pos-promo-rewards-count.md](pos-promo-rewards-count.md)                                   |    14 | QC Completed (1.1.57: 11/11)                       |
| Màn hình khách "earned 1 point"             | VP-5112                     | [pos-customer-display-earned-points.md](pos-customer-display-earned-points.md)             |     8 | QC Completed (1.1.64: 5/5)                         |
| In nhiều Staff Income trên 1 receipt        | VP-4809 (Request 2)         | [pos-print-all-staff-income.md](pos-print-all-staff-income.md)                             |     9 | QC Testing — chưa có kết quả                       |
| Order History — lịch chọn khoảng ngày       | VP-2105                     | [pos-order-history-date-range.md](pos-order-history-date-range.md)                         |    12 | QC Completed (1.1.67: 10/10)                       |
| Dialog Update Service hiện tên cũ           | VP-1418                     | [pos-service-edit-stale-name.md](pos-service-edit-stale-name.md)                           |     8 | QC Completed (1.1.62: 7/7)                         |
| Màu chữ Menu service                        | VP-4039                     | [pos-menu-service-text-color.md](pos-menu-service-text-color.md)                           |     8 | QC Completed (1.1.58: 7/7)                         |
| CDC service GCI lỗi FK category (BE)        | VP-4556                     | [be-gci-service-cdc-category-fk.md](be-gci-service-cdc-category-fk.md)                     |    14 | Todo — QC 02/11: 9/9 pass, 7 ca chưa chạy          |

Các ca do agent soạn thêm từ logic ticket (chưa có trong bảng QC) đều ghi rõ "chưa có kết quả" trong từng file.
