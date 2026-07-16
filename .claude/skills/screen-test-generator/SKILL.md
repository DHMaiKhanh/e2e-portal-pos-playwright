---
name: screen-test-generator
description: Scan any Portal POS screen (real DOM, using the saved login session) to inventory its features, then generate an exhaustive test-case document (.md). Use when the user asks to "scan/quét a screen", enumerate a screen's features, or produce test cases for a screen such as Overview, Orders, Customers, Staffs, Services, Settings, etc.
---

# Screen Test Generator

Turn any Portal POS screen into (1) a real-DOM **feature inventory** and (2) an **exhaustive test-case document** at `docs/test-cases/<screen>.md`.

Works against the live DEV portal using the captured login session (`storageState`), so it reflects what actually renders — not guesses. See [../../../docs/authentication.md](../../../docs/authentication.md) for how the session is captured.

## Prerequisites

- Dependencies installed (`npm install`) and a valid session captured (`npm run auth`). If the scan lands on `/login`, the session expired → run `npm run auth` again.
- `BASE_URL` and `STORE_ID` set in `configs/env/.env.local` (already configured for the DEV portal).

## Workflow

### 1. Scan the screen

Run the scanner with the target route (store-scoped routes use `/pos/<STORE_ID>/...`). On Git Bash, prefix with `MSYS_NO_PATHCONV=1` so `/`-paths aren't mangled:

```bash
MSYS_NO_PATHCONV=1 node .claude/skills/screen-test-generator/scan-screen.mjs "/pos/14/orders" docs/test-cases/_scan/orders.json
```

- Arg 1 = route (defaults to `/`, which redirects to the store overview).
- Arg 2 = output JSON path (a full-page screenshot is written alongside it as `.png`).

The scanner dumps: `title`, `headings`, `buttons`, `links` (name+href), `inputs`, `tables` (headers + sample rows), `tabs`, `dialogs`, `testIds`, the visible `mainText`, and a trimmed ARIA tree (`axTree`).

### 2. Read the inventory

`Read` the produced JSON (and the `.png` screenshot for visual context). From it, write a concise **inventory string**: the screen's route, global chrome, each content section, every actionable control (exact labels), tables/columns, empty states, and data formats. Ground everything in the real labels/routes — this string is the single source of truth for test generation.

### 3. Generate test cases (fan-out workflow)

Invoke the bundled workflow, passing the inventory string:

```
Workflow({
  scriptPath: ".claude/skills/screen-test-generator/generate-testcases.workflow.js",
  args: { screen: "Orders", route: "/pos/<id>/orders", inventory: "<the inventory string>" }
})
```

It fans out one agent per generic dimension (page-load, navigation, core-actions, forms, tables/lists, search/filter, data-formatting, detail-modals, negative/edge, responsive, accessibility, performance, security), runs a **completeness critic**, fills the gaps, and returns `{ screen, route, all: [...testCases] }`. Each test case has `title`, `priority`, `type`, `preconditions`, `steps[]`, `expected`, `dimension`.

> Non-workflow fallback (small screens): skip the workflow and generate the cases directly from the inventory using the same dimensions.

### 4. Render the document — in Vietnamese

Write `docs/test-cases/<screen>.md` **entirely in Vietnamese** (all prose: section headers, priority/type labels, preconditions, steps, expected results, summary notes). Keep only what must stay in the original language for accuracy: route paths, query params, exact on-screen UI labels/button text (quote them as-is, e.g. `"Clear filters"`), field/column names, and IDs.

Structure:

1. **Header** — tên màn hình, route, ngày quét, nguồn (`_scan/<screen>.json`).
2. **Kiểm kê tính năng (Feature inventory)** — liệt kê những gì màn hình chứa, dạng bullet.
3. **Test case** — nhóm theo dimension; gán ID cố định `TC-<ABBR>-001`, `TC-<ABBR>-002`, … (vd: `TC-OVW-*` cho Overview, `TC-ORD-*` cho Orders). Mỗi test case là một khối gọn: **ID · Tiêu đề** kèm Mức độ ưu tiên/Loại, Điều kiện tiên quyết, Các bước (đánh số), Kết quả mong đợi.
   - Priority dịch: High → Cao, Medium → Trung bình, Low → Thấp.
   - Type dịch tự nhiên sang tiếng Việt (Functional → Chức năng, Negative → Tiêu cực, Edge → Biên, Security → Bảo mật, Accessibility → Khả năng tiếp cận, Responsive → Responsive/Đáp ứng, Performance → Hiệu năng, Data → Dữ liệu, UI → Giao diện, Navigation → Điều hướng).
4. **Tổng kết độ phủ (Coverage summary)** — số lượng theo loại và mức ưu tiên, ghi chú các phần còn chưa chắc chắn/cần xác minh trực tiếp.

Keep the `docs/test-cases/_scan/` raw artifacts out of the human-facing doc (they're inputs, can stay in English). They may be gitignored if noisy.

## Reusing for other screens

Repeat steps 1–4 per screen. Known store-scoped routes (from the Overview scan):
`/pos/<id>/overview`, `/orders`, `/payroll`, `/batch`, `/staffs`, `/services`, `/customers`, `/customer-groups`, `/income`, `/setting`.
Admin routes: `/pos/onboarding`, `/pos/merchants`, `/pos/admin/{orders,packages,devices,monitor,versions}`.

## Notes

- The scanner renders ~30 rows of long lists (enough to characterize the pattern); note in the doc that full-volume/pagination behavior needs live verification.
- Data is store-scoped and time-based; expected values in cases should assert **format & behavior**, not fixed numbers.
