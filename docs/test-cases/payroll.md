# Payroll — Test Cases

- **Screen**: Payroll
- **Route**: `/pos/{storeId}/payroll` (tabs via `?tab=<checks|quick-book|staff-payroll|bank-account|history>`)
- **Scanned**: 2026-07-08, store `#100004` (DEV), source: `docs/test-cases/_scan/payroll-*.json`

## Feature inventory

- **Global chrome**: left sidebar (Overview, Orders, Payroll[active], Batch History, Staffs, Services, Customers, Customer Groups, Income Reports, Settings, Admin section), top bar with store selector and user menu, page header "Payroll".
- **Sub-nav**: 5 tabs — `Checks`, `Quick Book`, `Staff Payroll`, `Bank Accounts`, `Check History`. Active tab reflected in `?tab=` query param; each tab keeps its own filters/pagination in the URL (`page`, `periodId`).
- **Tab 1 — Checks** (default, `tab=checks`):
  - Filters: text `Search by staff name...`, sort/column select (default "Created"), date-range preset select (default "All dates"), button `Pick a date range`.
  - Actions: `Add Staff`, `Edit Signature`.
  - Table: `[Select all]` checkbox | ID | STAFF NAME | CREATED AT | CHECK AMOUNT | MEMO | STATUS | `Print` (per row: `Select row` checkbox + `Print` button).
  - Formats: CREATED AT `MMM D, YYYY, h:mm AM/PM (US/Central UTC-5)`; CHECK AMOUNT `$X,XXX.XX`; MEMO shows a date range `MMM D, YYYY to MMM D, YYYY`; STATUS badge (e.g. "Created").
  - Pagination: `Showing X to Y of Z results`, Previous/Next, page indicator `1 / 1`.
  - Empty state: full-width row `No checks found.`, `Showing 0 to 0 of 0 results`.
- **Tab 2 — Quick Book** (`tab=quick-book`): check-writing form above the Checks table.
  - Form: combobox `Select bank account` (e.g. "Techcombank"), read-only `Ending Balance: $0.00`; "PAY TO THE ORDER OF" combobox `Select staff`; `AMOUNT ($)` text input (placeholder `$0.00`, field `pay1Amount`); spelled-out `DOLLAR` label (auto-derived); `MEMO` textarea (placeholder `Enter memo...`, field `desc`); button `Create`.
  - Below: same search/filter row + `Edit Signature`, then the Checks table (with its own empty/populated state).
- **Tab 3 — Staff Payroll** (`tab=staff-payroll`, adds `periodId` + `page`):
  - Filters: `Search by staff name...`; pay-period range combobox (e.g. "Jun 30, 2026 - Jun 30, 2026"); `Create` / `Create New` for payroll periods; empty message `No payroll periods available`.
  - Table: Name (avatar+initial) | Orders | Subtotal | Supply Fee | Tip | Total Income — currency `$0.00` format, integer Orders count.
  - Pagination: `Showing 1 to 15 of 15 results`.
  - Right detail panel: `No staff selected — Select a staff to view payroll details.` until a row is clicked.
- **Tab 4 — Bank Accounts** (`tab=bank-account`):
  - Filter: `Search by bank or account name...`; button `Create New`.
  - Table: BANK NAME | ACCOUNT NAME | ACCOUNT NUMBER (masked `****1234`) | ROUTING NUMBER (masked `****1234`) | BANK LINK (clickable URL) | row actions `Edit` / `Delete`.
  - Empty state: `No bank accounts`.
- **Tab 5 — Check History** (`tab=history`):
  - Filters: `Search by staff name...`, `All statuses` select, `All dates` select, `Pick a date range`.
  - Table: # | Staff Name | Created At (date-only, no time) | Check ($) | Memo (date range).
  - Pagination: multi-page example `Showing 1 to 30 of 46 results`, `1 / 2`.
  - Right detail panel: `No check selected — Select a check from the list to view its history.` until a row is clicked.
- **Cross-tab**: switching tabs preserves independent filter/pagination state via URL; shared chrome; currency always `$X,XXX.XX`; sensitive bank fields masked. No modals/dialogs were observed in the static DOM scan (`Pick a date range`, `Edit`, `Delete`, `Create New`, `Add Staff`, `Edit Signature` likely open popovers/modals/forms — flagged for live verification).

## Test cases

### Page load & layout

**TC-PAY-001 · Payroll page loads with Checks tab active by default**
Priority: High · Type: Navigation
Preconditions: Logged in, valid session for store #100004.
Steps:

1. Navigate to `/pos/{storeId}/payroll`.
2. Observe the URL and active tab.
   Expected: URL resolves to `?tab=checks&page=1` (or equivalent default); "Checks" tab is visually active; header "Payroll" is visible; sidebar highlights "Payroll".

**TC-PAY-002 · All layout regions render on initial load**
Priority: High · Type: UI
Preconditions: Logged in; on Payroll screen.
Steps:

1. Load `/pos/{storeId}/payroll`.
2. Inspect sidebar, top bar, tab strip, filter row, table, and pagination footer.
   Expected: All regions render simultaneously with no missing/blank sections.

**TC-PAY-003 · Deep link directly into a non-default tab**
Priority: Medium · Type: Navigation
Preconditions: Logged in.
Steps:

1. Navigate directly to `/pos/{storeId}/payroll?tab=bank-account`.
   Expected: Page loads with "Bank Accounts" tab active and its table rendered, without first flashing the Checks tab.

**TC-PAY-004 · Reloading the page preserves the active tab and filters**
Priority: Medium · Type: Functional
Preconditions: On Payroll with `tab=history` and a search term entered.
Steps:

1. Enter a staff name in the Check History search box.
2. Reload the page (F5).
   Expected: URL retains `tab=history` and the search query param; the Check History tab remains active after reload (search text itself may reset unless persisted in URL — verify actual behavior).

**TC-PAY-005 · Unauthenticated access redirects to login**
Priority: High · Type: Security
Preconditions: No active session (cleared cookies/storage).
Steps:

1. Navigate directly to `/pos/{storeId}/payroll`.
   Expected: Redirected to the login page; Payroll content is never rendered.

### Tab navigation

**TC-PAY-010 · Switching between all 5 tabs updates content and URL**
Priority: High · Type: Navigation
Preconditions: On Payroll screen.
Steps:

1. Click "Quick Book", then "Staff Payroll", then "Bank Accounts", then "Check History", then back to "Checks".
   Expected: Each click updates `?tab=` in the URL and swaps the panel content to match the tab (form, table, or detail layout) with the correct tab visually marked active.

**TC-PAY-011 · Each tab retains its own filter/pagination state independently**
Priority: Medium · Type: Navigation
Preconditions: On Payroll screen.
Steps:

1. In "Checks", search for a staff name and go to page 2 (if available).
2. Switch to "Check History" and change page.
3. Switch back to "Checks".
   Expected: Checks tab still shows the previously entered search term and page; Check History retains its own separate page state.

**TC-PAY-012 · Browser back/forward navigates between tab states**
Priority: Low · Type: Navigation
Preconditions: Navigated through 2+ tabs.
Steps:

1. From Checks, click to Bank Accounts, then to Check History.
2. Click browser Back twice.
   Expected: Each Back press returns to the prior tab with its previous state (URL and rendered content match).

### Checks tab — table & actions

**TC-PAY-020 · Checks table renders correct columns and data formats**
Priority: High · Type: Data
Preconditions: Checks tab loaded with existing checks (e.g. store #100004).
Steps:

1. Load the Checks tab.
2. Inspect the table header and first row.
   Expected: Columns are ID, STAFF NAME, CREATED AT, CHECK AMOUNT, MEMO, STATUS in that order; CREATED AT shows `MMM D, YYYY, h:mm AM/PM (US/Central UTC-5)`; CHECK AMOUNT shows `$X,XXX.XX`; MEMO shows a `MMM D, YYYY to MMM D, YYYY` range; STATUS shows a badge (e.g. "Created").

**TC-PAY-021 · Search by staff name filters the Checks table**
Priority: High · Type: Functional
Preconditions: Checks tab with multiple staff represented (e.g. Mai, Vincent).
Steps:

1. Type "Mai" into `Search by staff name...`.
   Expected: Table shows only rows where STAFF NAME contains "Mai"; result count/pagination updates accordingly.

**TC-PAY-022 · Search with no matches shows empty state**
Priority: Medium · Type: Negative
Preconditions: Checks tab loaded.
Steps:

1. Enter a staff name that doesn't exist (e.g. "zzzznotreal").
   Expected: Table shows `No checks found.` row; `Showing 0 to 0 of 0 results`.

**TC-PAY-023 · "Created" sort/column selector changes row order**
Priority: Medium · Type: Functional
Preconditions: Checks tab with 2+ rows spanning different dates.
Steps:

1. Open the sort select (default "Created") and choose an alternate option if available.
   Expected: Row order updates according to the selected sort; reverting to "Created" restores original (most-recent-first) order.

**TC-PAY-024 · "All dates" preset filter narrows results by date range**
Priority: Medium · Type: Functional
Preconditions: Checks tab with checks spanning multiple weeks.
Steps:

1. Change the date filter from "All dates" to a narrower preset (e.g. "This week").
   Expected: Table only shows checks whose CREATED AT falls within the selected range; pagination/count updates.

**TC-PAY-025 · "Pick a date range" opens a custom range picker**
Priority: Medium · Type: UI
Preconditions: Checks tab loaded.
Steps:

1. Click `Pick a date range`.
2. Select a start and end date and apply.
   Expected: A date-range picker (popover/calendar) opens; after applying, the table filters to checks within the chosen range and the button label reflects the selected range.

**TC-PAY-026 · Select all checkbox selects every visible row**
Priority: Medium · Type: Functional
Preconditions: Checks tab with 2+ rows.
Steps:

1. Click the header `Select all` checkbox.
   Expected: All row checkboxes become checked; clicking again deselects all.

**TC-PAY-027 · Selecting individual rows works independently of Select all**
Priority: Low · Type: Functional
Preconditions: Checks tab with 3+ rows.
Steps:

1. Check row 1 and row 3 individually.
2. Verify header checkbox state.
   Expected: Only rows 1 and 3 are checked; header checkbox shows an indeterminate/unchecked state (not fully checked) since not all rows are selected.

**TC-PAY-028 · Print button on a row triggers print for that check**
Priority: High · Type: Functional
Preconditions: Checks tab with at least one row.
Steps:

1. Click `Print` on a specific check row (e.g. #46).
   Expected: A print dialog/preview opens (or a print-formatted view/PDF is generated) for check #46 specifically, not for other checks.

**TC-PAY-029 · Add Staff button opens the add-staff flow**
Priority: High · Type: Functional
Preconditions: Checks tab loaded.
Steps:

1. Click `Add Staff`.
   Expected: A modal/drawer/form opens allowing a new staff member to be added to payroll; cancelling closes it without side effects.

**TC-PAY-030 · Edit Signature button opens the signature editor**
Priority: Medium · Type: Functional
Preconditions: Checks tab loaded.
Steps:

1. Click `Edit Signature`.
   Expected: A modal/drawer opens for editing/uploading the check signature; saving persists it, cancelling discards changes.

**TC-PAY-031 · Pagination Next/Previous navigate pages of checks**
Priority: Medium · Type: Functional
Preconditions: Checks tab with more results than one page.
Steps:

1. Click `Next` to go to page 2.
2. Click `Previous` to return to page 1.
   Expected: Table content updates per page; page indicator updates (e.g. `2 / 2`); `Previous`/`Next` disable appropriately at first/last page.

### Quick Book tab

**TC-PAY-040 · Quick Book form renders all required fields**
Priority: High · Type: UI
Preconditions: Quick Book tab loaded, at least one bank account exists.
Steps:

1. Load the Quick Book tab.
   Expected: `Select bank account`, `Ending Balance`, `Select staff` ("PAY TO THE ORDER OF"), `AMOUNT ($)`, spelled-out DOLLAR text, `MEMO`, and `Create` button are all visible.

**TC-PAY-041 · Selecting a bank account updates the Ending Balance**
Priority: High · Type: Functional
Preconditions: 2+ bank accounts configured with different balances.
Steps:

1. Open `Select bank account` and choose an account (e.g. "Techcombank").
   Expected: `Ending Balance: $X.XX` updates to reflect the selected account's actual balance.

**TC-PAY-042 · Entering an amount auto-populates the spelled-out DOLLAR text**
Priority: Medium · Type: Functional
Preconditions: Quick Book tab loaded.
Steps:

1. Type `250.75` into `AMOUNT ($)`.
   Expected: The spelled-out amount updates to reflect "Two hundred fifty and 75/100" (or equivalent format) in real time.

**TC-PAY-043 · Create button is disabled until required fields are filled**
Priority: High · Type: Validation
Preconditions: Quick Book tab loaded, form empty.
Steps:

1. Leave `Select staff` and `AMOUNT ($)` empty.
2. Observe the `Create` button state.
   Expected: `Create` is disabled (or clicking shows validation errors) until bank account, staff, and a valid amount are provided.

**TC-PAY-044 · Submitting a valid quick check succeeds**
Priority: High · Type: Functional
Preconditions: Valid bank account with sufficient balance, valid staff selected.
Steps:

1. Select bank account, staff, enter amount `$50.00`, enter memo "Test bonus".
2. Click `Create`.
   Expected: A success confirmation appears; the new check appears in the Checks table below (and in Check History) with STATUS "Created", CHECK AMOUNT `$50.00`, and MEMO "Test bonus".

**TC-PAY-045 · Amount exceeding Ending Balance is rejected or warned**
Priority: High · Type: Negative
Preconditions: Bank account with a known low balance (e.g. `$0.00`).
Steps:

1. Select that bank account.
2. Enter an amount greater than the Ending Balance.
3. Click `Create`.
   Expected: Validation error or warning prevents submission (or clearly flags insufficient funds); no check is created.

**TC-PAY-046 · Non-numeric or negative amount is rejected**
Priority: Medium · Type: Validation
Preconditions: Quick Book tab loaded.
Steps:

1. Enter `-10` or non-numeric text into `AMOUNT ($)`.
   Expected: Field rejects the input or shows a validation error; `Create` cannot be submitted with an invalid amount.

**TC-PAY-047 · Memo field accepts free text and enforces any max length**
Priority: Low · Type: Validation
Preconditions: Quick Book tab loaded.
Steps:

1. Enter a very long string (e.g. 500 characters) into `MEMO`.
   Expected: Field either truncates at a defined max length or shows a validation message; no crash or overflow of the textarea.

### Staff Payroll tab

**TC-PAY-060 · Staff Payroll table lists all staff with income summary**
Priority: High · Type: Data
Preconditions: Staff Payroll tab loaded with an active pay period selected.
Steps:

1. Load the Staff Payroll tab.
   Expected: Table shows Name, Orders, Subtotal, Supply Fee, Tip, Total Income for every staff member in the period; currency columns formatted as `$X,XXX.XX`.

**TC-PAY-061 · Selecting a pay period reloads the staff summary**
Priority: High · Type: Functional
Preconditions: Multiple pay periods exist.
Steps:

1. Open the pay-period combobox (e.g. "Jun 30, 2026 - Jun 30, 2026") and select a different period.
   Expected: `periodId` in the URL updates; table data (Orders/Subtotal/Tip/Total Income) refreshes to reflect the newly selected period.

**TC-PAY-062 · No payroll periods available shows an empty/setup state**
Priority: Medium · Type: Edge
Preconditions: Store with zero payroll periods configured.
Steps:

1. Load Staff Payroll tab for such a store.
   Expected: `No payroll periods available` message is shown along with a way to create one (`Create` / `Create New`), rather than a blank or errored table.

**TC-PAY-063 · Create New payroll period flow**
Priority: High · Type: Functional
Preconditions: Staff Payroll tab loaded.
Steps:

1. Click `Create New`.
2. Fill in a new period's date range and confirm.
   Expected: A new pay period is created, appears in the period selector, and becomes selectable; staff summary recalculates for that period.

**TC-PAY-064 · Clicking a staff row opens their payroll detail panel**
Priority: High · Type: Functional
Preconditions: Staff Payroll tab with at least one staff row.
Steps:

1. Click on a staff row (e.g. "Mai").
   Expected: The right panel replaces `No staff selected — Select a staff to view payroll details.` with that staff's detailed payroll breakdown.

**TC-PAY-065 · Search by staff name filters the Staff Payroll table**
Priority: Medium · Type: Functional
Preconditions: Multiple staff listed.
Steps:

1. Type a partial staff name into `Search by staff name...`.
   Expected: Table narrows to matching staff only; non-matching rows are hidden.

**TC-PAY-066 · Staff with zero orders/income still displays correctly**
Priority: Low · Type: Edge
Preconditions: A staff member with 0 orders and all-zero currency columns.
Steps:

1. Locate such a staff row (e.g. "Wendy" in sample data).
   Expected: Row renders `0` for Orders and `$0.00` for all currency columns without errors or blank cells.

### Bank Accounts tab

**TC-PAY-080 · Bank Accounts table lists accounts with masked sensitive fields**
Priority: High · Type: Security
Preconditions: At least one bank account configured (e.g. "Techcombank").
Steps:

1. Load the Bank Accounts tab.
2. Inspect ACCOUNT NUMBER and ROUTING NUMBER cells.
   Expected: Both fields are masked showing only the last 4 digits (e.g. `****7890`, `****1111`); full numbers are never exposed in the DOM/network response beyond what's needed.

**TC-PAY-081 · BANK LINK opens the linked banking URL**
Priority: Medium · Type: Functional
Preconditions: A bank account row with a BANK LINK value.
Steps:

1. Click the BANK LINK URL for a row.
   Expected: Opens the linked URL (e.g. `https://techcombank.gulit.ronaldo.com`) in a new tab, without exposing masked account details in the link.

**TC-PAY-082 · Create New opens the add-bank-account form**
Priority: High · Type: Functional
Preconditions: Bank Accounts tab loaded.
Steps:

1. Click `Create New`.
2. Fill in bank name, account name, account number, routing number.
3. Submit.
   Expected: New account appears in the table (masked appropriately); it becomes selectable in the Quick Book tab's `Select bank account` dropdown.

**TC-PAY-083 · Edit updates an existing bank account**
Priority: Medium · Type: Functional
Preconditions: At least one bank account exists.
Steps:

1. Click `Edit` on a row.
2. Change the account name and save.
   Expected: Table reflects the updated account name; account/routing numbers remain masked unless explicitly re-entered.

**TC-PAY-084 · Delete removes a bank account after confirmation**
Priority: High · Type: Functional
Preconditions: At least one bank account exists that is not referenced by pending checks.
Steps:

1. Click `Delete` on a row.
2. Confirm the deletion in the confirmation dialog.
   Expected: A confirmation prompt appears before deletion; after confirming, the account is removed from the table and no longer selectable in Quick Book.

**TC-PAY-085 · Deleting a bank account in use is blocked or warned**
Priority: Medium · Type: Negative
Preconditions: A bank account referenced by an existing/pending check.
Steps:

1. Attempt to `Delete` that account.
   Expected: App blocks the deletion or warns the user of the dependency, rather than silently breaking existing checks.

**TC-PAY-086 · Search by bank or account name filters the list**
Priority: Medium · Type: Functional
Preconditions: 2+ bank accounts with distinct names.
Steps:

1. Type part of a bank/account name into `Search by bank or account name...`.
   Expected: Table narrows to matching rows only.

**TC-PAY-087 · Empty state when no bank accounts exist**
Priority: Medium · Type: Edge
Preconditions: Store with zero bank accounts.
Steps:

1. Load the Bank Accounts tab for such a store.
   Expected: `No bank accounts` message is shown instead of an empty table grid.

### Check History tab

**TC-PAY-100 · Check History table lists all past checks with date-only timestamps**
Priority: High · Type: Data
Preconditions: Check History tab loaded with existing checks (46 total in sample data).
Steps:

1. Load the Check History tab.
2. Inspect the CREATED AT column format.
   Expected: Columns are #, Staff Name, Created At, Check, Memo; CREATED AT shows date only (`MMM D, YYYY (US/Central UTC-5)`), no time-of-day (distinct from the Checks tab's timestamp format).

**TC-PAY-101 · Pagination across multiple pages of check history**
Priority: High · Type: Functional
Preconditions: 46 total checks (per sample: `Showing 1 to 30 of 46 results`, `1 / 2`).
Steps:

1. Load Check History tab.
2. Click `Next`.
   Expected: Page indicator updates to `2 / 2`; remaining 16 rows are shown; `Previous` becomes enabled and `Next` disables on the last page.

**TC-PAY-102 · Filter by status narrows the check list**
Priority: Medium · Type: Functional
Preconditions: Checks exist in multiple statuses (e.g. "Created", "Cleared", "Voided" if applicable).
Steps:

1. Change `All statuses` to a specific status.
   Expected: Table shows only checks matching the selected status.

**TC-PAY-103 · Filter by date range narrows the check list**
Priority: Medium · Type: Functional
Preconditions: Checks span multiple dates.
Steps:

1. Change `All dates` to a preset, or use `Pick a date range`.
   Expected: Table shows only checks whose Created At falls within the selected range.

**TC-PAY-104 · Search by staff name filters check history**
Priority: Medium · Type: Functional
Preconditions: Multiple staff represented in history.
Steps:

1. Type a staff name (e.g. "Vincent") into the search box.
   Expected: Only that staff's checks remain visible.

**TC-PAY-105 · Clicking a check row opens its history detail panel**
Priority: High · Type: Functional
Preconditions: Check History tab with at least one row.
Steps:

1. Click on a check row (e.g. #46).
   Expected: Right panel replaces `No check selected — Select a check from the list to view its history.` with that check's status timeline/history (e.g. created, printed, cleared events).

**TC-PAY-106 · No results after filtering shows an empty state**
Priority: Low · Type: Negative
Preconditions: Check History tab loaded.
Steps:

1. Apply a filter combination guaranteed to match nothing (e.g. a nonexistent staff name).
   Expected: Table shows an appropriate empty/no-results state; pagination shows `0 of 0`.

### Data formatting & consistency

**TC-PAY-120 · Currency values are consistently formatted across all tabs**
Priority: Medium · Type: Data
Preconditions: Data present in Checks, Staff Payroll, and Check History tabs.
Steps:

1. Compare CHECK AMOUNT / Total Income / Check column values across tabs.
   Expected: All currency values use `$X,XXX.XX` format (comma thousands separator, 2 decimal places), including `$0.00` for zero values — no raw numbers or missing `$`.

**TC-PAY-121 · Date/time formatting differs intentionally between Checks and Check History**
Priority: Low · Type: Data
Preconditions: Same check visible in both Checks tab (e.g. #46) and Check History tab.
Steps:

1. Compare the CREATED AT value for check #46 in both tabs.
   Expected: Checks tab shows full timestamp with time (`Jul 2, 2026, 1:48 AM (US/Central UTC-5)`); Check History shows date only (`Jul 2, 2026 (US/Central UTC-5)`) — both refer to the same underlying timestamp.

**TC-PAY-122 · MEMO field renders the pay-period date range consistently**
Priority: Low · Type: Data
Preconditions: A check tied to a pay period.
Steps:

1. Inspect the MEMO column for a check in Checks, Quick-Book-generated checks, and Check History.
   Expected: MEMO consistently shows `MMM D, YYYY to MMM D, YYYY` for the same check across all tabs where it appears.

### Responsive & accessibility

**TC-PAY-130 · Payroll screen adapts at tablet/mobile widths**
Priority: Medium · Type: Responsive
Preconditions: Logged in.
Steps:

1. Resize viewport to tablet width (~768px), then mobile width (~375px).
2. Observe the tab strip, filter row, and table on each tab.
   Expected: Sidebar collapses per app convention; tab strip remains usable (e.g. scrollable or wraps); tables adapt (horizontal scroll within their own container or stacked cards) without breaking the page layout or causing whole-page horizontal scroll.

**TC-PAY-131 · All interactive controls are keyboard-navigable**
Priority: Medium · Type: Accessibility
Preconditions: Payroll screen loaded.
Steps:

1. Use Tab/Shift+Tab to move through tabs, search inputs, selects, buttons, and table row checkboxes.
2. Use Enter/Space to activate a tab and a button.
   Expected: Focus order is logical; all controls are reachable and operable via keyboard; focus indicator is visible at each stop.

**TC-PAY-132 · Table checkboxes and buttons expose accessible names**
Priority: Low · Type: Accessibility
Preconditions: Checks tab loaded.
Steps:

1. Inspect accessibility tree for `Select all`, `Select row`, and `Print` controls.
   Expected: Each control has a distinct, descriptive accessible name (already observed as "Select all", "Select row", "Print" in the ARIA tree) rather than generic/unlabeled roles.

### Security & permissions

**TC-PAY-140 · Bank account numbers are never exposed unmasked in the client**
Priority: High · Type: Security
Preconditions: Bank Accounts tab loaded; browser dev tools open.
Steps:

1. Inspect the rendered DOM and the underlying API response for account/routing numbers.
   Expected: Only masked values (`****` + last 4) are present in both the rendered UI and (unless required for edit) the API payload; no full account/routing number leaks to the client.

**TC-PAY-141 · Payroll data is scoped to the current store only**
Priority: High · Type: Security
Preconditions: User has access to multiple stores.
Steps:

1. Note check/staff data for store #100004's Payroll screen.
2. Switch to a different store via the store selector.
   Expected: Payroll screen reloads with that store's own checks/staff/bank accounts only; no cross-store data leakage.

## Coverage summary

- **Total cases**: 47
- **By priority**: High 22 · Medium 20 · Low 5
- **By type**: Functional 20 · Data 4 · Navigation 5 · UI 3 · Validation 3 · Negative 4 · Edge 4 · Security 3 · Responsive 1 · Accessibility 2
- **By dimension**: Page load & layout (5), Tab navigation (3), Checks tab (12), Quick Book (8), Staff Payroll (7), Bank Accounts (8), Check History (7), Data formatting (3), Responsive/A11y (3), Security (2)
- **Deferred / needs live verification**: exact modal/dialog behavior for `Pick a date range`, `Add Staff`, `Edit Signature`, `Create New` (bank account), `Edit`/`Delete` (bank account), and the Staff Payroll / Check History detail panels — these weren't captured by the static DOM scan (0 dialogs detected) since they likely render on click. Full-volume pagination behavior (Check History has 46 rows / 2 pages) was inferred from the scan sample and should be re-verified live for page 2 content and boundary behavior.
