# Dry run — bỏ skip/fixme (2026-10-20)

- DEL: fixme/skip thân rỗng → xóa (83)
- RUN: fixme/skip có code → đổi thành test thường (62)
- GRD: test.skip(điều kiện) → expect(điều kiện, lý do).toBeFalsy() (130)

```
RUN  tests/e2e/batch-history/bao-mat-phan-quyen.e2e.spec.ts fixme 'TC-BH-053 — menu/screen hidden or blocked for role without Batch History permission'
RUN  tests/e2e/batch-history/truong-hop-tieu-cuc-bien.e2e.spec.ts fixme 'TC-BH-039 — invalid status query param falls back to "All status"'
DEL  tests/e2e/batch-history/truong-hop-tieu-cuc-bien.e2e.spec.ts fixme 'TC-BH-041 — request timeout/no response shows error with retry button'
RUN  tests/e2e/customers/TC4-search.e2e.spec.ts fixme 'TC-CUS-029 — searching with different phone formats returns the same result'
GRD  tests/e2e/customers/TC6-data-formatting.e2e.spec.ts:87
GRD  tests/e2e/customers/TC6-data-formatting.e2e.spec.ts:170
DEL  tests/e2e/edit-order/activity-log-updated-tag.e2e.spec.ts fixme 'TC-EO-065 — Activity log đủ thông tin'
DEL  tests/e2e/edit-order/activity-log-updated-tag.e2e.spec.ts fixme 'TC-EO-066 — Log khi sửa nhiều field cùng lúc'
DEL  tests/e2e/edit-order/activity-log-updated-tag.e2e.spec.ts fixme 'TC-EO-067 — Tag Updated ở Order Detail'
DEL  tests/e2e/edit-order/activity-log-updated-tag.e2e.spec.ts fixme 'TC-EO-068 — Tag Updated ở Order Listing'
GRD  tests/e2e/edit-order/amount-invariants.e2e.spec.ts:25
DEL  tests/e2e/edit-order/amount-invariants.e2e.spec.ts fixme 'TC-EO-055 — Tổng order trước = sau'
DEL  tests/e2e/edit-order/amount-invariants.e2e.spec.ts fixme 'TC-EO-056 — Không phát sinh transaction mới'
DEL  tests/e2e/edit-order/amount-invariants.e2e.spec.ts fixme 'TC-EO-057 — API chặn field tiền'
DEL  tests/e2e/edit-order/amount-invariants.e2e.spec.ts fixme 'TC-EO-058 — Order có discount'
DEL  tests/e2e/edit-order/edge-negative.e2e.spec.ts fixme 'TC-EO-069 — Edit nhiều lần liên tiếp'
DEL  tests/e2e/edit-order/edge-negative.e2e.spec.ts fixme 'TC-EO-070 — Lỗi mạng / API khi Confirm'
GRD  tests/e2e/edit-order/edit-customer.e2e.spec.ts:23
DEL  tests/e2e/edit-order/edit-customer.e2e.spec.ts fixme 'TC-EO-011 — Đổi customer thành công, tổng tiền không đổi'
DEL  tests/e2e/edit-order/edit-customer.e2e.spec.ts fixme 'TC-EO-012 — Tìm customer'
DEL  tests/e2e/edit-order/edit-customer.e2e.spec.ts fixme 'TC-EO-013 — Huỷ đổi customer'
DEL  tests/e2e/edit-order/edit-customer.e2e.spec.ts fixme 'TC-EO-014 — Đổi customer có tạo activity log và tag Updated'
GRD  tests/e2e/edit-order/edit-staff.e2e.spec.ts:21
DEL  tests/e2e/edit-order/edit-staff.e2e.spec.ts fixme 'TC-EO-016 — Kéo-thả dòng service sang staff khác'
GRD  tests/e2e/edit-order/edit-staff.e2e.spec.ts:73
DEL  tests/e2e/edit-order/edit-staff.e2e.spec.ts fixme 'TC-EO-018 — Bỏ chọn bằng `Clear`'
DEL  tests/e2e/edit-order/edit-staff.e2e.spec.ts fixme 'TC-EO-019 — Đổi staff cho cả nhóm'
DEL  tests/e2e/edit-order/edit-staff.e2e.spec.ts fixme 'TC-EO-020 — Hoán đổi service giữa 2 staff'
GRD  tests/e2e/edit-order/edit-staff.e2e.spec.ts:149
DEL  tests/e2e/edit-order/edit-staff.e2e.spec.ts fixme 'TC-EO-022 — Xoá staff'
DEL  tests/e2e/edit-order/edit-staff.e2e.spec.ts fixme 'TC-EO-023 — Chọn tất cả service của 1 staff'
GRD  tests/e2e/edit-order/edit-staff.e2e.spec.ts:196
DEL  tests/e2e/edit-order/edit-staff.e2e.spec.ts fixme 'TC-EO-025 — Đổi staff thì sale/tip/income đi theo staff mới'
GRD  tests/e2e/edit-order/eligibility.e2e.spec.ts:22
GRD  tests/e2e/edit-order/eligibility.e2e.spec.ts:35
GRD  tests/e2e/edit-order/eligibility.e2e.spec.ts:48
GRD  tests/e2e/edit-order/eligibility.e2e.spec.ts:83
GRD  tests/e2e/edit-order/save-confirm-popup.e2e.spec.ts:20
GRD  tests/e2e/edit-order/save-confirm-popup.e2e.spec.ts:47
GRD  tests/e2e/edit-order/save-confirm-popup.e2e.spec.ts:74
GRD  tests/e2e/edit-order/service-name-note.e2e.spec.ts:17
DEL  tests/e2e/edit-order/service-name-note.e2e.spec.ts fixme 'TC-EO-028 — Đổi sang service khác giá thì giá dòng giữ nguyên'
DEL  tests/e2e/edit-order/service-name-note.e2e.spec.ts fixme 'TC-EO-029 — Tên service trống'
DEL  tests/e2e/edit-order/service-name-note.e2e.spec.ts fixme 'TC-EO-033 — Report Service hiện tên mới'
DEL  tests/e2e/edit-order/store-line.e2e.spec.ts fixme 'TC-EO-039 — Store item không kéo được'
DEL  tests/e2e/edit-order/store-line.e2e.spec.ts fixme 'TC-EO-040 — Store item không chọn, không sửa được'
DEL  tests/e2e/edit-order/store-line.e2e.spec.ts fixme 'TC-EO-041 — Store item không nhận tip'
GRD  tests/e2e/edit-order/tip-allocation.e2e.spec.ts:57
GRD  tests/e2e/edit-order/tip-allocation.e2e.spec.ts:81
GRD  tests/e2e/edit-order/tip-allocation.e2e.spec.ts:104
GRD  tests/e2e/edit-order/tip-allocation.e2e.spec.ts:121
GRD  tests/e2e/edit-order/tip-allocation.e2e.spec.ts:143
GRD  tests/e2e/edit-order/tip-allocation.e2e.spec.ts:176
GRD  tests/e2e/edit-order/tip-allocation.e2e.spec.ts:201
GRD  tests/e2e/edit-order/tip-allocation.e2e.spec.ts:224
GRD  tests/e2e/edit-order/tip-allocation.e2e.spec.ts:252
GRD  tests/e2e/edit-order/tip-allocation.e2e.spec.ts:265
DEL  tests/e2e/edit-order/tip-allocation.e2e.spec.ts fixme 'TC-EO-052 — Total Tip trước = sau'
GRD  tests/e2e/edit-order-linear/helpers.ts:51
GRD  tests/e2e/edit-order-linear/helpers.ts:75
GRD  tests/e2e/edit-order-linear/helpers.ts:110
GRD  tests/e2e/edit-order-linear/helpers.ts:148
GRD  tests/e2e/edit-order-linear/mutation-helpers.ts:62
GRD  tests/e2e/edit-order-linear/mutation-helpers.ts:64
GRD  tests/e2e/edit-order-linear/vp-2591.e2e.spec.ts:136
GRD  tests/e2e/edit-order-linear/vp-2591.e2e.spec.ts:359
GRD  tests/e2e/edit-order-linear/vp-2591.e2e.spec.ts:414
GRD  tests/e2e/edit-order-linear/vp-2591.e2e.spec.ts:465
GRD  tests/e2e/edit-order-linear/vp-2591.e2e.spec.ts:741
GRD  tests/e2e/edit-order-linear/vp-2593.e2e.spec.ts:321
GRD  tests/e2e/edit-order-linear/vp-2593.e2e.spec.ts:590
GRD  tests/e2e/edit-order-linear/vp-2593.e2e.spec.ts:633
GRD  tests/e2e/edit-order-linear/vp-2593.e2e.spec.ts:716
GRD  tests/e2e/edit-order-linear/vp-2593.e2e.spec.ts:806
GRD  tests/e2e/edit-order-linear/vp-2593.e2e.spec.ts:829
GRD  tests/e2e/edit-order-linear/vp-2593.e2e.spec.ts:850
GRD  tests/e2e/edit-order-linear/vp-2593.e2e.spec.ts:899
GRD  tests/e2e/income/TC1-page-load-layout.e2e.spec.ts:86
DEL  tests/e2e/income/TC1-page-load-layout.e2e.spec.ts fixme 'TC-INC-004 — shows skeletons while the report API is still in flight'
DEL  tests/e2e/income/TC1-page-load-layout.e2e.spec.ts fixme 'TC-INC-005 — a 500 from the report API shows an error state, not a blank page'
DEL  tests/e2e/income/TC1-page-load-layout.e2e.spec.ts fixme 'TC-INC-006 — a blocked route chunk shows "POS is unavailable right now" and Try again rec
RUN  tests/e2e/income/TC10-summary-chart-table-panels.e2e.spec.ts fixme 'TC-INC-094 — clicking the first row adds selectedDate and renders the breakdown'
RUN  tests/e2e/income/TC10-summary-chart-table-panels.e2e.spec.ts fixme 'TC-INC-101 — switching rows moves selectedDate, the highlight and the panel'
RUN  tests/e2e/income/TC10-summary-chart-table-panels.e2e.spec.ts fixme 'TC-INC-102 — a selectedDate deep link restores the panel and the highlight'
RUN  tests/e2e/income/TC10-summary-chart-table-panels.e2e.spec.ts fixme 'TC-INC-104 — selecting a Week and a Month row shows that bucket aggregate'
RUN  tests/e2e/income/TC11-staff-filters-search.e2e.spec.ts fixme 'TC-INC-115 — special characters are treated as literal text'
GRD  tests/e2e/income/TC12-staff-table-pagination-panels.e2e.spec.ts:138
GRD  tests/e2e/income/TC12-staff-table-pagination-panels.e2e.spec.ts:172
GRD  tests/e2e/income/TC12-staff-table-pagination-panels.e2e.spec.ts:242
RUN  tests/e2e/income/TC12-staff-table-pagination-panels.e2e.spec.ts fixme 'TC-INC-125 — page=999 shows the empty state and must clamp the page counter to a valid pa
GRD  tests/e2e/income/TC12-staff-table-pagination-panels.e2e.spec.ts:350
GRD  tests/e2e/income/TC12-staff-table-pagination-panels.e2e.spec.ts:357
RUN  tests/e2e/income/TC12-staff-table-pagination-panels.e2e.spec.ts fixme 'TC-INC-131 — STAFF SUMMARY must aggregate the searched subset, not the whole period'
GRD  tests/e2e/income/TC12-staff-table-pagination-panels.e2e.spec.ts:512
GRD  tests/e2e/income/TC12-staff-table-pagination-panels.e2e.spec.ts:588
GRD  tests/e2e/income/TC12-staff-table-pagination-panels.e2e.spec.ts:630
GRD  tests/e2e/income/TC12-staff-table-pagination-panels.e2e.spec.ts:631
GRD  tests/e2e/income/TC12-staff-table-pagination-panels.e2e.spec.ts:666
GRD  tests/e2e/income/TC12-staff-table-pagination-panels.e2e.spec.ts:719
GRD  tests/e2e/income/TC13-data-formatting.e2e.spec.ts:238
GRD  tests/e2e/income/TC13-data-formatting.e2e.spec.ts:282
GRD  tests/e2e/income/TC13-data-formatting.e2e.spec.ts:311
GRD  tests/e2e/income/TC13-data-formatting.e2e.spec.ts:366
RUN  tests/e2e/income/TC13-data-formatting.e2e.spec.ts fixme 'TC-INC-143 — dialog timestamps carry one consistent UTC offset'
GRD  tests/e2e/income/TC13-data-formatting.e2e.spec.ts:396
RUN  tests/e2e/income/TC14-negative-edge.e2e.spec.ts fixme 'TC-INC-146 — a store id that does not exist is refused or redirected, never blank'
DEL  tests/e2e/income/TC14-negative-edge.e2e.spec.ts fixme 'TC-INC-150 — going offline mid-filter shows a retry-able error, not an endless skeleton'
DEL  tests/e2e/income/TC14-negative-edge.e2e.spec.ts fixme 'TC-INC-151 — empty or field-stripped report payloads render $0.00, never NaN'
RUN  tests/e2e/income/TC14-negative-edge.e2e.spec.ts fixme 'TC-INC-155 — a week bucket spanning a month boundary names both months, once each'
GRD  tests/e2e/income/TC15-responsive.e2e.spec.ts:148
GRD  tests/e2e/income/TC15-responsive.e2e.spec.ts:227
GRD  tests/e2e/income/TC15-responsive.e2e.spec.ts:521
GRD  tests/e2e/income/TC15-responsive.e2e.spec.ts:637
RUN  tests/e2e/income/TC16-accessibility.e2e.spec.ts fixme 'TC-INC-167 — Income period opens, moves and selects by keyboard with correct ARIA'
RUN  tests/e2e/income/TC16-accessibility.e2e.spec.ts fixme 'TC-INC-169 — an Order Details row is focusable and opens its dialog on Enter'
RUN  tests/e2e/income/TC16-accessibility.e2e.spec.ts fixme 'TC-INC-171 — Income Reports is an h1 and section titles are lower-level headings'
RUN  tests/e2e/income/TC16-accessibility.e2e.spec.ts fixme 'TC-INC-174 — refund/negative state survives forced colors and text meets WCAG AA'
RUN  tests/e2e/income/TC16-accessibility.e2e.spec.ts fixme 'TC-INC-175 — a selected Summary row carries ARIA, not just data-state'
DEL  tests/e2e/income/TC18-security.e2e.spec.ts fixme 'TC-INC-184 — a role without report permission cannot see or reach Income Reports'
RUN  tests/e2e/income/TC2-sidebar-navigation.e2e.spec.ts fixme 'TC-INC-015 — browser Back/Forward walks the ?tab= history'
RUN  tests/e2e/income/TC4-daily-date-picker.e2e.spec.ts fixme 'TC-INC-032 — a future `date=` is handled deterministically'
GRD  tests/e2e/income/TC5-daily-kpi-chart.e2e.spec.ts:254
GRD  tests/e2e/income/TC5-daily-kpi-chart.e2e.spec.ts:281
RUN  tests/e2e/income/TC5-daily-kpi-chart.e2e.spec.ts fixme 'TC-INC-046 — Y axis rescales for large revenue and for negative values'
RUN  tests/e2e/income/TC5-daily-kpi-chart.e2e.spec.ts fixme 'TC-INC-048 — negative refund bars render below zero in a different colour'
GRD  tests/e2e/income/TC6-daily-order-details-table.e2e.spec.ts:90
RUN  tests/e2e/income/TC6-daily-order-details-table.e2e.spec.ts fixme 'TC-INC-051 — refund rows carry the " (Refund)" suffix and negative amounts'
GRD  tests/e2e/income/TC6-daily-order-details-table.e2e.spec.ts:147
GRD  tests/e2e/income/TC6-daily-order-details-table.e2e.spec.ts:181
GRD  tests/e2e/income/TC6-daily-order-details-table.e2e.spec.ts:237
GRD  tests/e2e/income/TC6-daily-order-details-table.e2e.spec.ts:268
GRD  tests/e2e/income/TC6-daily-order-details-table.e2e.spec.ts:296
GRD  tests/e2e/income/TC6-daily-order-details-table.e2e.spec.ts:342
RUN  tests/e2e/income/TC6-daily-order-details-table.e2e.spec.ts fixme 'TC-INC-059 — changing the date resets the table to page 1'
RUN  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts fixme 'TC-INC-060 — row click opens `Order detail #OD…` for that row'
GRD  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts:107
RUN  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts fixme 'TC-INC-061 — dialog shows the full `Order Information` block'
GRD  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts:131
RUN  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts fixme 'TC-INC-062 — refunded order shows the `Refunded` badge'
GRD  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts:164
RUN  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts fixme 'TC-INC-063 — `Service Details` lists services and a matching `Items subtotal`'
GRD  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts:192
GRD  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts:229
GRD  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts:245
RUN  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts fixme 'TC-INC-065 — `Activity Log` exposes all sub-tabs and switches content'
GRD  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts:269
GRD  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts:303
GRD  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts:319
GRD  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts:346
GRD  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts:370
RUN  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts fixme 'TC-INC-069 — opening a second order replaces the first order’s data'
GRD  tests/e2e/income/TC7-daily-order-detail-dialog.e2e.spec.ts:407
GRD  tests/e2e/income/TC8-daily-income-payment-panels.e2e.spec.ts:91
GRD  tests/e2e/income/TC8-daily-income-payment-panels.e2e.spec.ts:125
GRD  tests/e2e/income/TC8-daily-income-payment-panels.e2e.spec.ts:158
GRD  tests/e2e/income/TC8-daily-income-payment-panels.e2e.spec.ts:198
GRD  tests/e2e/income/TC8-daily-income-payment-panels.e2e.spec.ts:219
GRD  tests/e2e/income/TC8-daily-income-payment-panels.e2e.spec.ts:240
RUN  tests/e2e/income/TC8-daily-income-payment-panels.e2e.spec.ts fixme 'TC-INC-076 — INCOME DETAIL chevron collapses/expands the panel'
GRD  tests/e2e/income/TC8-daily-income-payment-panels.e2e.spec.ts:295
GRD  tests/e2e/income/TC9-summary-filters.e2e.spec.ts:122
RUN  tests/e2e/income/TC9-summary-filters.e2e.spec.ts fixme 'TC-INC-082 — period Month buckets the same range into its 3 months'
RUN  tests/e2e/income/TC9-summary-filters.e2e.spec.ts fixme 'TC-INC-086 — Clear filters resets range and period to default'
RUN  tests/e2e/income/TC9-summary-filters.e2e.spec.ts fixme 'TC-INC-087 — a range with no transactions renders a clean empty state'
RUN  tests/e2e/income/TC9-summary-filters.e2e.spec.ts fixme 'TC-INC-088 — an inverted range resolves deterministically'
RUN  tests/e2e/merchants/TC1-page-load-layout.e2e.spec.ts fixme 'TC-MCH-003 — page title "Merchants" renders in the page header'
DEL  tests/e2e/merchants/TC14-security.e2e.spec.ts fixme 'TC-MCH-132 — a non-admin account cannot reach the Merchants screen'
GRD  tests/e2e/merchants/TC6-pagination.e2e.spec.ts:100
GRD  tests/e2e/merchants/TC6-pagination.e2e.spec.ts:218
GRD  tests/e2e/merchants/TC7-data-formatting.e2e.spec.ts:159
RUN  tests/e2e/onboarding/TC1-page-load-layout.e2e.spec.ts fixme 'TC-ONB-009 — Operations/Management links must carry a real store id, not "undefined"'
RUN  tests/e2e/onboarding/TC11-negative-edge.e2e.spec.ts fixme 'TC-ONB-133 — whmcsId=0 either reaches the panel or is blocked with a message'
RUN  tests/e2e/onboarding/TC11-negative-edge.e2e.spec.ts fixme 'TC-ONB-134 — a negative whmcsId on the URL is rejected the way the form rejects it'
RUN  tests/e2e/onboarding/TC11-negative-edge.e2e.spec.ts fixme 'TC-ONB-135 — a 20-digit whmcsId renders a controlled result with no NaN or rounding'
RUN  tests/e2e/onboarding/TC11-negative-edge.e2e.spec.ts fixme 'TC-ONB-136 — a validate submit while offline fails visibly instead of hanging'
RUN  tests/e2e/onboarding/TC11-negative-edge.e2e.spec.ts fixme 'TC-ONB-137 — a 500 from merchant_onboarding shows Failed Connect with Create Merchant dis
RUN  tests/e2e/onboarding/TC11-negative-edge.e2e.spec.ts fixme 'TC-ONB-141 — a 1000-character Business Name is length-limited with a clear message'
RUN  tests/e2e/onboarding/TC13-accessibility.e2e.spec.ts fixme 'TC-ONB-153 — the feature dialog traps Tab and hands focus back on Escape'
DEL  tests/e2e/onboarding/TC13-accessibility.e2e.spec.ts fixme 'TC-ONB-154 — the whole wizard is operable by keyboard with a visible focus ring'
RUN  tests/e2e/onboarding/TC13-accessibility.e2e.spec.ts fixme 'TC-ONB-155 — headings start at h1, never skip a level, and keep one card level'
DEL  tests/e2e/onboarding/TC13-accessibility.e2e.spec.ts fixme 'TC-ONB-156 — status badges meet WCAG AA contrast in the light and dark themes'
RUN  tests/e2e/onboarding/TC14-performance.e2e.spec.ts fixme 'TC-ONB-162 — walking all seven steps logs no console error and no pageerror'
DEL  tests/e2e/onboarding/TC15-security.e2e.spec.ts fixme 'TC-ONB-164 — a non-Internal account is blocked and gets no Onboarding nav item'
RUN  tests/e2e/onboarding/TC15-security.e2e.spec.ts fixme 'TC-ONB-165 — the error boundary leaks no zod schema detail and keeps the app shell'
RUN  tests/e2e/onboarding/TC15-security.e2e.spec.ts fixme 'TC-ONB-169 — deep-linking an onboarded merchant must still hit the duplicate guard'
RUN  tests/e2e/onboarding/TC2-navigation-routing-guard.e2e.spec.ts fixme 'TC-ONB-016 — an invalid step slug lands on the error boundary, app still framed'
RUN  tests/e2e/onboarding/TC2-navigation-routing-guard.e2e.spec.ts fixme 'TC-ONB-017 — Try again on the error boundary recovers instead of looping'
RUN  tests/e2e/onboarding/TC3-step1-validate-form.e2e.spec.ts fixme 'TC-ONB-031 — " 3660 " with surrounding spaces is rejected as non-numeric'
RUN  tests/e2e/onboarding/TC3-step1-validate-form.e2e.spec.ts fixme 'TC-ONB-032 — leading zeros (`0003660`) clear the regex and reach the lookup'
DEL  tests/e2e/onboarding/TC4-step1-integration-status.e2e.spec.ts fixme 'TC-ONB-048 — default sentence when the API reports no payment integration and no message'
RUN  tests/e2e/onboarding/TC4-step1-integration-status.e2e.spec.ts fixme 'TC-ONB-056 — Magensa / Bamboo integration cards render their exact wording'
DEL  tests/e2e/onboarding/TC4-step1-integration-status.e2e.spec.ts fixme 'TC-ONB-057 — Failed Connect badge with Create Merchant disabled on a backend error'
DEL  tests/e2e/onboarding/TC4-step1-integration-status.e2e.spec.ts fixme 'TC-ONB-058 — Create Merchant creates the merchant and advances to step 2'
DEL  tests/e2e/onboarding/TC5-step2-business-information.e2e.spec.ts fixme 'TC-ONB-066 — the Country combobox opens, filters, and updates its label'
DEL  tests/e2e/onboarding/TC5-step2-business-information.e2e.spec.ts fixme 'TC-ONB-067 — a malformed email is rejected on submit'
DEL  tests/e2e/onboarding/TC5-step2-business-information.e2e.spec.ts fixme 'TC-ONB-068 — a malformed website URL is rejected on submit'
DEL  tests/e2e/onboarding/TC5-step2-business-information.e2e.spec.ts fixme 'TC-ONB-069 — an empty website URL saves successfully'
DEL  tests/e2e/onboarding/TC5-step2-business-information.e2e.spec.ts fixme 'TC-ONB-070 — a raw 10-digit phone number is auto-formatted'
DEL  tests/e2e/onboarding/TC5-step2-business-information.e2e.spec.ts fixme 'TC-ONB-071 — clearing the required fields blocks the submit'
DEL  tests/e2e/onboarding/TC5-step2-business-information.e2e.spec.ts fixme 'TC-ONB-072 — a non-numeric zip is rejected on submit'
DEL  tests/e2e/onboarding/TC5-step2-business-information.e2e.spec.ts fixme 'TC-ONB-074 — a successful save advances to step 3 (work-hours)'
RUN  tests/e2e/onboarding/TC6-step3-work-hours.e2e.spec.ts fixme 'TC-ONB-081 — turning a day off hides or disables its time triggers'
DEL  tests/e2e/onboarding/TC6-step3-work-hours.e2e.spec.ts fixme 'TC-ONB-082 — a closing time earlier than the opening time is rejected'
DEL  tests/e2e/onboarding/TC6-step3-work-hours.e2e.spec.ts fixme 'TC-ONB-085 — saving work hours toasts and advances to Photos'
DEL  tests/e2e/onboarding/TC7-step4-photos.e2e.spec.ts fixme 'TC-ONB-089 — a valid PNG under 5MB shows a preview with remove/replace'
DEL  tests/e2e/onboarding/TC7-step4-photos.e2e.spec.ts fixme 'TC-ONB-090 — a file above 5MB is rejected'
DEL  tests/e2e/onboarding/TC7-step4-photos.e2e.spec.ts fixme 'TC-ONB-091 — unsupported file types are rejected'
DEL  tests/e2e/onboarding/TC7-step4-photos.e2e.spec.ts fixme 'TC-ONB-093 — Save Changes persists photos and advances to Package'
DEL  tests/e2e/onboarding/TC7-step4-photos.e2e.spec.ts fixme 'TC-ONB-094 — Save Changes with no photo selected still advances'
RUN  tests/e2e/onboarding/TC8-step5-package.e2e.spec.ts fixme 'TC-ONB-100 — Close button and Escape both dismiss the dialog and restore focus'
DEL  tests/e2e/onboarding/TC8-step5-package.e2e.spec.ts fixme 'TC-ONB-104 — saving the package toasts and advances to payment-transactions'
DEL  tests/e2e/onboarding/TC8-step5-package.e2e.spec.ts fixme 'TC-ONB-105 — DEV package list contains duplicate/junk packages (report only)'
DEL  tests/e2e/onboarding/TC9-step6-payment-transactions.e2e.spec.ts fixme 'TC-ONB-108 — saving with every tender off is rejected'
DEL  tests/e2e/onboarding/TC9-step6-payment-transactions.e2e.spec.ts fixme 'TC-ONB-110 — out-of-range tax percentages (-5 / 150 / 1000) are rejected on save'
DEL  tests/e2e/onboarding/TC9-step6-payment-transactions.e2e.spec.ts fixme 'TC-ONB-111 — a non-numeric service fee fails validation and is never sent'
DEL  tests/e2e/onboarding/TC9-step6-payment-transactions.e2e.spec.ts fixme 'TC-ONB-112 — a decimal tax rate (8.25) saves and survives a reload'
RUN  tests/e2e/onboarding/TC9-step6-payment-transactions.e2e.spec.ts fixme 'TC-ONB-118 — Add creates a new 30% preset chip with its Remove control'
RUN  tests/e2e/onboarding/TC9-step6-payment-transactions.e2e.spec.ts fixme 'TC-ONB-120 — preset values are unique (3660 renders ~40 duplicates)'
DEL  tests/e2e/onboarding/TC9-step6-payment-transactions.e2e.spec.ts fixme 'TC-ONB-121 — boundary preset values (0 / -5 / 101 / 999 / abc) are rejected'
DEL  tests/e2e/onboarding/TC9-step6-payment-transactions.e2e.spec.ts fixme 'TC-ONB-122 — saving with every preset removed is accepted or clearly blocked'
DEL  tests/e2e/onboarding/TC9-step6-payment-transactions.e2e.spec.ts fixme 'TC-ONB-124 — saving payment settings toasts and advances to complete'
RUN  tests/e2e/orders/order-detail-page.e2e.spec.ts fixme 'TC-ORD-031 — nút "Re-Open Order" bị disabled cho order đã có credit note đầy đủ'
GRD  tests/e2e/orders/search.e2e.spec.ts:49
GRD  tests/e2e/overview/generate-token.e2e.spec.ts:24
GRD  tests/e2e/overview/generate-token.e2e.spec.ts:39
GRD  tests/e2e/overview/header-ngu-canh-cua-hang.e2e.spec.ts:51
GRD  tests/e2e/overview/merchant-information.e2e.spec.ts:31
GRD  tests/e2e/overview/merchant-information.e2e.spec.ts:54
GRD  tests/e2e/overview/tao-token-generate-token.e2e.spec.ts:22
GRD  tests/e2e/overview/tao-token-generate-token.e2e.spec.ts:40
GRD  tests/e2e/overview/thong-tin-merchant.e2e.spec.ts:36
GRD  tests/e2e/overview/thong-tin-merchant.e2e.spec.ts:70
DEL  tests/e2e/payroll/bank-accounts-tab.e2e.spec.ts fixme 'TC-PAY-085 — deleting a bank account in use is blocked or warned'
GRD  tests/e2e/payroll/checks-tab-table-actions.e2e.spec.ts:102
GRD  tests/e2e/payroll/checks-tab-table-actions.e2e.spec.ts:228
DEL  tests/e2e/payroll/quick-book-tab.e2e.spec.ts fixme 'TC-PAY-044 — Submitting a valid quick check succeeds'
DEL  tests/e2e/payroll/quick-book-tab.e2e.spec.ts fixme 'TC-PAY-045 — Amount exceeding Ending Balance is rejected or warned'
RUN  tests/e2e/payroll/security-permissions.e2e.spec.ts fixme 'TC-PAY-140 — bank account numbers never exposed unmasked'
DEL  tests/e2e/payroll/staff-payroll-tab.e2e.spec.ts fixme 'TC-PAY-062 — no payroll periods available shows an empty/setup state'
DEL  tests/e2e/payroll/staff-payroll-tab.e2e.spec.ts fixme 'TC-PAY-063 — create new payroll period flow'
GRD  tests/e2e/regression-linear/helpers.ts:129
GRD  tests/e2e/regression-linear/vp-4086.e2e.spec.ts:25
DEL  tests/e2e/report-config/persistence.e2e.spec.ts fixme 'TC-RCF-170 — creating a page adds it to the list (Draft, Web layout only), then deleting
DEL  tests/e2e/report-config/persistence.e2e.spec.ts fixme 'TC-RCF-171 — Publish bumps "Published vN" to vN+1 and the live report serves the new layo
DEL  tests/e2e/report-config/persistence.e2e.spec.ts fixme 'TC-RCF-172 — editing and saving a block persists after reload'
DEL  tests/e2e/report-config/persistence.e2e.spec.ts fixme 'TC-RCF-173 — the API refuses to delete a source still used by a block (UI disables the bu
GRD  tests/e2e/report-config/row-actions-blocks-sources-columns.e2e.spec.ts:285
DEL  tests/e2e/report-config/security.e2e.spec.ts fixme 'TC-RCF-163 — a non-admin account cannot see the Report Configuration group or open its ro
GRD  tests/e2e/report-config/table-pagination.e2e.spec.ts:135
GRD  tests/e2e/reports/daily-sale-table-panels.e2e.spec.ts:24
GRD  tests/e2e/reports/daily-sale-table-panels.e2e.spec.ts:98
GRD  tests/e2e/reports/export-print.e2e.spec.ts:30
GRD  tests/e2e/reports/export-print.e2e.spec.ts:61
GRD  tests/e2e/reports/export-print.e2e.spec.ts:127
GRD  tests/e2e/reports/income-summary.e2e.spec.ts:62
GRD  tests/e2e/reports/income-summary.e2e.spec.ts:158
GRD  tests/e2e/reports/income-summary.e2e.spec.ts:175
GRD  tests/e2e/reports/staff-income.e2e.spec.ts:28
GRD  tests/e2e/reports/staff-income.e2e.spec.ts:88
GRD  tests/e2e/reports/staff-income.e2e.spec.ts:183
GRD  tests/e2e/reports/staff-payroll.e2e.spec.ts:156
GRD  tests/e2e/reports/staff-payroll.e2e.spec.ts:232
GRD  tests/e2e/reports-v4/staff-income.e2e.spec.ts:212
GRD  tests/e2e/reports-v4/staff-payroll.e2e.spec.ts:104
GRD  tests/e2e/reports-v4/staff-payroll.e2e.spec.ts:236
RUN  tests/e2e/services/TC8-security.e2e.spec.ts fixme 'TC-SVC-072 — restricted role cannot see/use service management controls'
RUN  tests/e2e/staffs/TC4-create-employee.e2e.spec.ts fixme 'TC-STF-031 — creates staff successfully with valid data'
DEL  tests/e2e/staffs/TC4-create-employee.e2e.spec.ts fixme 'TC-STF-040 — duplicate Staff Code is rejected on Create'
DEL  tests/e2e/staffs/TC6-employee-detail-profile-tab.e2e.spec.ts fixme 'TC-STF-062 — chỉnh sửa thông tin Profile và Save Changes'
DEL  tests/e2e/staffs/TC6-employee-detail-profile-tab.e2e.spec.ts fixme 'TC-STF-064 — đổi ảnh đại diện qua nút "Change"'
DEL  tests/e2e/staffs/TC6-employee-detail-profile-tab.e2e.spec.ts fixme 'TC-STF-065 — đổi Staff Role tại trang chi tiết'
DEL  tests/e2e/staffs/TC6-employee-detail-profile-tab.e2e.spec.ts fixme 'TC-STF-066 — đổi Status (Active ⇄ Inactive) tại trang chi tiết'
DEL  tests/e2e/staffs/TC6-employee-detail-profile-tab.e2e.spec.ts fixme 'TC-STF-067 — toggle "Appointment Staff"'
RUN  tests/e2e/staffs/TC6-employee-detail-profile-tab.e2e.spec.ts fixme 'TC-STF-069 — truy cập trực tiếp URL chi tiết với ID không tồn tại'
DEL  tests/e2e/staffs/TC7-permission-security.e2e.spec.ts fixme 'TC-STF-081 — tài khoản giới hạn không có quyền Staffs'
```
