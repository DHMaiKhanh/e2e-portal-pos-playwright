---
name: run-tests-headless-bg
description: Run Playwright tests for this repo headless and in the background by default, then append the run result into the matching docs/test-cases/<screen>.md file. Use whenever the user asks to "chạy test", "run playwright", "run the tests in staffs.md/overview.md/...", or run any spec/folder under tests/e2e — unless they explicitly ask for headed/UI mode.
---

# Run Tests — Headless & Background

Default policy for this repo: every Playwright run triggered from a request like
"chạy playwright test cho staffs.md", "run the tests", "gen and run", etc. must be:

1. **Headless** — never pass `--headed` or `PWDEBUG=1` unless the user explicitly asks to see the browser.
2. **Backgrounded** — always invoke via the Bash tool with `run_in_background: true`, redirecting
   output to a log file in the scratchpad dir, so the main conversation isn't blocked. Read the log
   (or wait for the completion notification) to report results back.
3. **Logged into the test-case .md** — after the run finishes, append a "Lịch sử chạy" entry to the
   corresponding `docs/test-cases/<screen>.md` (see below). Do this every time, not just on request.

## Command pattern

```bash
cd <repo_root> && npx playwright test <path-or-grep> --reporter=list > <scratchpad>/<name>-run.log 2>&1
```

- `<path-or-grep>`: a folder (`tests/e2e/staffs`), a single spec file, or `--grep "@tag"`.
- Map a test-case doc to its spec folder: `docs/test-cases/<screen>.md` → `tests/e2e/<screen>/`.
- Use `cross-env ENV=local` prefix only if the npm script requires it; plain `npx playwright test` already
  defaults to the `local` project config in this repo unless told otherwise.
- After the background command finishes, read the log file and summarize pass/fail counts, list failing
  test titles, and point to `reports/html` (`npm run report`) for the full HTML report if there are failures.

## When NOT to background

If the user explicitly wants to watch it live (`--headed`, `--ui`, `--debug`), run in the foreground instead
and skip this default. Still append the run history entry afterward.

## Appending run history to the .md

Map the executed path back to its test-case doc: `tests/e2e/<screen>/...` → `docs/test-cases/<screen>.md`.
If a run spans multiple screens (e.g. a full `tests/e2e` run), append the relevant slice of the summary to
each affected screen's `.md`.

After parsing the log (pass/fail/skipped counts, failing test titles with their `TC-<ABBR>-NNN` id if present
in the title), append a new subsection under a `## Lịch sử chạy` heading at the end of the file (create the
heading if it doesn't exist yet — use Edit/Write, never overwrite existing content):

```markdown
## Lịch sử chạy

### 2026-07-21 14:32 (UTC+7)

- Lệnh: `npx playwright test tests/e2e/staffs --reporter=list`
- Kết quả: 42 passed, 2 failed, 3 skipped (tổng 47)
- Fail:
  - TC-STF-033 · Nhập Email/Phone sai định dạng khi Create — <lý do ngắn từ log>
  - TC-STF-062 · Chỉnh sửa thông tin Profile và Save Changes — <lý do ngắn từ log>
- Report chi tiết: `npm run report` (reports/html)
```

Each run adds one more `### <timestamp>` entry — never delete or rewrite prior entries, this is an
append-only log. Get the timestamp from the current date/time context available in the session, not by
running a shell date command that could drift from the session's reported date.
