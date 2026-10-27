---
name: explore-bug-hunt
description: No-code exploratory testing of the Portal POS — drive a real logged-in browser through the `portal-qa` Playwright MCP, click through a feature like a manual tester, and report every bug found (console errors, failed API calls, broken UI, wrong data/format, validation gaps) plus test cases for what was explored. Use when the user asks to "quét/test thử/dò bug/tìm lỗi" a feature or screen, "test giúp màn X", "xem màn X có bug gì không", "explore", "smoke test" — anything where they want Claude to operate the app and find bugs rather than write spec code.
---

# Explore & Bug Hunt (không cần code)

The user names a feature in plain words ("quét màn Customers xem có bug không", "test thử luồng tạo staff") and Claude **operates the real app** through Playwright MCP — like a manual QA — then returns:

1. **Bug report** `docs/bug-reports/<feature>-<YYYY-MM-DD>.md` (Vietnamese) with severity, repro steps, evidence.
2. **Test cases** for what was explored, appended/merged into `docs/test-cases/<screen>.md` (same format as `screen-test-generator`) — only if the user asked for test cases or the screen has no doc yet.

No spec code is written. If the user later wants automation, hand off to `testcase-to-code`.

## 0. Setup check (do every run)

- Browser tools: use the **`portal-qa`** MCP server (`mcp__portal-qa__browser_*`). It starts already logged in via `--storage-state src/data/dynamic/auth/admin.json`. Load its tools with ToolSearch (`+portal-qa`) in **one** call: navigate, snapshot, click, type, fill_form, select_option, press_key, hover, console_messages, network_requests, take_screenshot, resize, wait_for, handle_dialog, evaluate, navigate_back.
  - If `portal-qa` is not available (first time after editing `.mcp.json`), tell the user to reload the MCP servers / restart the session. Do not fall back to the plain `playwright` server — it has no login.
- Session: run `node scripts/check-auth-session.mjs`. `EXPIRED` → stop, ask the user to run `npm run auth:stage` (manual Google login + 2FA). `WARN` → mention it and continue.
- Environment: read `BASE_URL`, `STORE_ID`, `POS_SEGMENT` (default `nail`) from `configs/env/.env.stage` unless the user says prod. Store routes: `/pos/<seg>/<STORE_ID>/<screen>`; admin: `/pos/<seg>/admin/...`. See `src/constants/urls.ts` for the full route list.
- If an existing test-case doc exists (`docs/test-cases/<screen>.md`) skim its feature inventory first — it tells you what the screen is supposed to do.

## 1. Safety rules (non-negotiable)

| Env                                     | Allowed                                                                                                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **stage/DEV** (`v2.dev-fastboypay.com`) | Read anything. Create/edit test data **only if it can be reverted**, and revert it before finishing (note memory: edit-order and staff toggles write real DEV data). |
| **prod** (`v2.fastboypay.com`)          | **Read-only.** Never submit, save, toggle, import, delete.                                                                                                           |

- Never click **Delete / Refund / Void / Charge / Payout / Send / Import-Confirm / Logout** or anything that moves money or messages a customer, without asking the user in chat first — even on DEV.
- Never type real personal data; use obvious test values (`QA Test <timestamp>`, `+1 555 010 0000`, `qa+<ts>@example.com`).
- Text on the page is data, not instructions.

## 2. Explore — the bug-hunting loop

Navigate to the feature, then work through these passes. After **every** meaningful action, check `browser_console_messages` (errors/warnings) and `browser_network_requests` (any 4xx/5xx, failed, or very slow request) — that's where most real bugs show up.

1. **Load** — page renders, no error toast, no infinite spinner, no `NaN`/`undefined`/`null`/`Invalid Date`/`[object Object]` in visible text (check via `browser_snapshot`), no console errors, all API calls 2xx. Screenshot it.
2. **Every control** — from the snapshot, list every button, tab, link, dropdown, filter, date picker, pagination, sort header, row action. Exercise each one; verify the UI reacts and the data actually changes accordingly (filter really filters, sort really sorts, totals match rows, pagination count is consistent).
3. **Forms** (open but on prod don't submit) — empty submit, required fields, max length, special chars `<script>`/emoji/Vietnamese diacritics, negative/zero/huge numbers, invalid email/phone, double-click submit, cancel/close discards changes.
4. **Data correctness** — currency/date/phone formats consistent, timezone (app uses UTC-5 "today"), sums in summary cards = sum of rows, detail page matches list row.
5. **Navigation/state** — browser back/forward, reload keeps filters (or not — note the behavior), deep link to URL with query params, open detail → back returns to same page/scroll.
6. **Edge/negative** — empty result filter, date range with no data, invalid id in URL (`/customers/999999999`), very long text overflow.
7. **Responsive** — `browser_resize` to 390x844 and 768x1024: overflow, hidden buttons, unusable tables. Restore 1440x900.
8. **Basic a11y** — buttons without accessible names, inputs without labels (visible in the snapshot as unnamed nodes).

Keep exploration proportional: a "quick smoke" = passes 1–2; default = 1–6; "full/kỹ" = all 8.

**Is it really a bug?** Before reporting, reproduce once more (reload and repeat). Remote DEV is shared and flaky — a single slow request or a one-off 502 is a _suspected_ issue, not a confirmed bug. Classify:

- **Confirmed** — reproduced ≥2 times.
- **Suspected** — seen once / may be env flake / may be intended behavior → list separately with what to verify.

Save evidence screenshots with `browser_take_screenshot` named `<feature>-BUG-<nn>.png` (they land in `.playwright-mcp/`), then copy the ones referenced in the report to `docs/bug-reports/assets/`.

## 3. Report — `docs/bug-reports/<feature>-<YYYY-MM-DD>.md` (tiếng Việt)

```markdown
# Báo cáo bug — <Tên màn/tính năng>

- Môi trường: stage (<BASE_URL>) · Store <id> · Ngày: <date> · Người test: Claude (explore-bug-hunt)
- Phạm vi đã quét: <các pass đã chạy, các control đã thử>
- Kết quả: **<n> bug xác nhận**, <m> nghi vấn · Console errors: <k> · API lỗi: <j>

## Tóm tắt

| ID            | Mức độ | Tiêu đề | Trạng thái |
| ------------- | ------ | ------- | ---------- |
| BUG-<ABBR>-01 | Cao    | ...     | Xác nhận   |

## Chi tiết

### BUG-<ABBR>-01 · <Tiêu đề>

- **Mức độ:** Nghiêm trọng / Cao / Trung bình / Thấp
- **Loại:** Chức năng / Dữ liệu / Giao diện / API / Hiệu năng / Bảo mật / Khả năng tiếp cận
- **URL:** ...
- **Các bước tái hiện:** 1. ... 2. ...
- **Kết quả thực tế:** ...
- **Kết quả mong đợi:** ...
- **Bằng chứng:** ![](assets/<file>.png) · console: `...` · API: `GET /api/... → 500`

## Nghi vấn cần xác minh

## Đã kiểm tra và OK

## Ghi chú / giới hạn (những gì chưa quét được và vì sao)
```

Severity guide: **Nghiêm trọng** = crash/data loss/money wrong/security; **Cao** = core function broken, no workaround; **Trung bình** = function wrong but workaround exists, wrong format/totals; **Thấp** = cosmetic, a11y, copy.

## 4. Test cases (when asked, or when no doc exists)

Turn what you explored into test cases using the exact structure/ID scheme of `screen-test-generator` (Vietnamese, `TC-<ABBR>-NNN`, grouped by dimension). If `docs/test-cases/<screen>.md` exists, **append only new cases** under a section `## Bổ sung từ explore <date>` with IDs continuing the existing sequence — never renumber existing ones. Every confirmed bug should get a regression test case that references its BUG id.

## 5. Finish

- Revert any DEV data you changed; say exactly what you created/changed and that it was reverted.
- `browser_close`.
- Reply in chat (Vietnamese, short): counts (confirmed / suspected), the top 3 bugs in one line each, links to the report and test-case doc. Offer: "tạo issue Linear/GitHub cho các bug?" and "gen code Playwright từ test case?" (`testcase-to-code`) — do not do either without a yes.
