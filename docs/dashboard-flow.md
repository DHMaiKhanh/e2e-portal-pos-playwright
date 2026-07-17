# Luồng code test Dashboard (Overview)

> Lưu ý: trong repo có **2 khái niệm "dashboard" khác nhau** — đừng nhầm lẫn:
>
> 1. **Dashboard/Overview của Portal POS** — màn hình thực tế đang được test (route `/pos/<id>/overview`). Đây là nội dung chính của file này.
> 2. **Report dashboard** (`reports/dashboard/`, `reports/dashboard-app/`, `scripts/run-tests-and-report.mjs`) — công cụ build/mở report HTML sau khi chạy test, không liên quan đến màn hình Overview.

## 1. Các file liên quan

| Vai trò                    | File                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Page Object                | [src/pages/dashboard/DashboardPage.ts](src/pages/dashboard/DashboardPage.ts)                                        |
| Spec test                  | [tests/e2e/dashboard/dashboard.e2e.spec.ts](tests/e2e/dashboard/dashboard.e2e.spec.ts)                              |
| Đăng ký fixture            | [src/fixtures/pages.fixture.ts](src/fixtures/pages.fixture.ts) (khởi tạo `dashboardPage = new DashboardPage(page)`) |
| Export fixture/test/expect | [src/fixtures/index.ts](src/fixtures/index.ts)                                                                      |
| URL route                  | [src/constants/urls.ts](src/constants/urls.ts) → `Urls.DASHBOARD = '/pos/${store}/overview'`                        |
| Test case doc (tiếng Việt) | [docs/test-cases/overview.md](docs/test-cases/overview.md) — 32/33 case đã scan                                     |
| Raw scan đầy đủ            | [docs/test-cases/_scan/overview.json](docs/test-cases/_scan/overview.json)                                          |

Auth: không có bước login trong spec — session được nạp sẵn qua `storageState` do `global.setup.ts` tạo ra.

## 2. Luồng code trong `dashboard.e2e.spec.ts`

```ts
test.describe(`Dashboard ${Tag.REGRESSION} ${Tag.UI}`, () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto(); // điều hướng tới /pos/<id>/overview
  });

  test('renders the overview for an authenticated user', async ({ dashboardPage, page }) => {
    await expect(dashboardPage.heading).toBeVisible(); // sidebar item "Overview" = tín hiệu app đã load
    await expect(page).toHaveURL(/\/pos\/\d+\/overview/);
  });

  test('navigates to Orders via the sidebar', async ({ dashboardPage, page }) => {
    // match theo href, không theo label vì label "Orders" bị trùng với Orders bên admin
    await dashboardPage.sidebar.navigateToHref(/^\/pos\/\d+\/orders$/);
    await expect(page).toHaveURL(/\/pos\/\d+\/orders/);
  });
});
```

Hiện spec chỉ có **2 test case** (render sau khi auth, và điều hướng sidebar sang Orders), dù `DashboardPage` đã expose sẵn rất nhiều locator/helper khác — map 1:1 với các case chưa implement trong `overview.md`.

## 3. Locator chính trong `DashboardPage.ts`

Portal không render `<h1>`/heading ngữ nghĩa nào — mọi locator đều match theo role, text, hoặc regex.

- **Auth signal**: `sidebar.item('Overview')`
- **App switcher rail**: `getByRole('complementary')`; nút `POS` / `Portal` / `Business` / `Gift Card`; logo `getByRole('link', {name:/fastboypay home/i})`
- **Top bar**: store switcher `getByRole('button', {name: /#\d+$/})`; `toggleSidebarButton` (`/toggle sidebar/i`); status badge `/^(Active|Inactive)$/`; `generateTokenButton` (`/generate token/i`)
- **Today's Summary**: section `getByText(/Today's Summary/)`; `metric(label)` cho `'Total Order' | 'Sale' | 'Appointments' | 'Total Tip' | 'Total Payment' | 'Gross Sale'`; "View All" phân biệt bằng `a[href$="/income"]`
- **Merchant Information**: toàn bộ field match theo regex (email, address, timezone, WHMCS, package, active-since date, phone, encryption key UUID, copy button)
- **Device Summary**: `/[\d,]+\s*Total Devices/`, `/[\d,]+\s*offline/`; card thiết bị = `getByRole('button', {name: /^Open POS #\d+ details$/})`
- **Device Detail modal**: `getByRole('dialog').filter({hasText: /Device Detail/i})`
- **Batch History**: section `/Batch History \(Last 7 days\)/`; table phân biệt bằng `columnheader` tên `'BATCH #'`; empty state `/No batches in the last 7 days\./`
- **Token modal**: `getByRole('dialog').filter({hasNotText: /Device Detail/i})`
- **User menu / logout**: `getByRole('button', {name: /open user menu/i})`; `getByRole('menuitem', {name: /log ?out|sign out/i})`

## 4. Câu lệnh chạy test Dashboard

Chưa có script npm riêng cho dashboard, chạy bằng path hoặc grep tag:

```bash
npx cross-env ENV=local playwright test tests/e2e/dashboard
npx cross-env ENV=local playwright test tests/e2e/dashboard/dashboard.e2e.spec.ts
npm run test:regression -- --grep Dashboard    # test:regression = playwright test --grep @regression
npm run test:e2e                               # chạy toàn bộ tests/e2e (rộng hơn dashboard)
```

Xem report sau khi chạy:

```bash
npm run report              # playwright show-report reports/html
npm run report:allure       # allure generate + open
```

### Công cụ report-dashboard (khác, không liên quan đến test Overview)

```bash
npm run test:report         # chạy toàn bộ suite rồi build + mở reports/dashboard-app
npm run dashboard:install   # npm install trong reports/dashboard-app
npm run dashboard:build     # build reports/dashboard-app
npm run dashboard:open      # preview reports/dashboard-app
```

## 5. Khoảng trống test coverage

`docs/test-cases/overview.md` liệt kê 32 case (loại trừ các case cần mock/seed data/đổi role/clipboard/perf) trên 12 nhóm: Page Load & Layout, Header & Store Context, App Switcher, Sidebar Navigation, Today's Summary, Merchant Info, Device Summary, Batch History, Generate Token, User Menu/Logout, Responsive, Security.

Chỉ **2/32 case** đã được code hóa thành Playwright test — phần còn lại là cơ hội mở rộng `dashboard.e2e.spec.ts` dựa trên các locator đã có sẵn trong `DashboardPage.ts`.
