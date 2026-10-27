import { test as base } from '@playwright/test';
import { LoginPage } from '@pages/auth/LoginPage';
import { DashboardPage } from '@pages/dashboard/DashboardPage';
import { OrdersPage } from '@pages/orders/OrdersPage';
import { OrderDetailPage } from '@pages/orders/OrderDetailPage';
import { ProductsPage } from '@pages/products/ProductsPage';
import { CustomersPage } from '@pages/customers/CustomersPage';
import { CustomerDetailPage } from '@pages/customers/CustomerDetailPage';
import { IncomePage } from '@pages/income/IncomePage';
import { SettingsPage } from '@pages/settings/SettingsPage';
import { CheckoutSettingPage } from '@pages/settings/CheckoutSettingPage';
import { PayrollPage } from '@pages/payroll/PayrollPage';
import { BatchHistoryPage } from '@pages/batch/BatchHistoryPage';
import { StaffsPage } from '@pages/staffs/StaffsPage';
import { MerchantsPage } from '@pages/merchants/MerchantsPage';
import { OnboardingPage } from '@pages/onboarding/OnboardingPage';
import { ReportConfigPage } from '@pages/report-config/ReportConfigPage';
import { ReportPagesPage } from '@pages/reports/ReportPagesPage';
import { ReportsV4Page } from '@pages/reports-v4/ReportsV4Page';
import { ReportConfigV4Page } from '@pages/reports-v4/ReportConfigV4Page';
import { RcV4Page } from '@pages/report-config-v4/RcV4Page';
import { MonitorPage } from '@pages/monitor/MonitorPage';
import { RemoteActionsPage } from '@pages/monitor/RemoteActionsPage';
import { ChangeLogsPage } from '@pages/monitor/ChangeLogsPage';
import { PackagesPage } from '@pages/packages/PackagesPage';
import { AllOrdersPage } from '@pages/orders/AllOrdersPage';
import { DevicesPage } from '@pages/devices/DevicesPage';
import { SystemPage } from '@pages/system/SystemPage';
import { UsersRolesPage } from '@pages/users-roles/UsersRolesPage';
import { Toast } from '@components/Toast';
import { ConfirmModal } from '@components/modal/ConfirmModal';

export interface PagesFixture {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  ordersPage: OrdersPage;
  /** Order Detail + Edit Order dialogs. Call `.blockOrderMutations()` before navigating. */
  orderDetailPage: OrderDetailPage;
  productsPage: ProductsPage;
  customersPage: CustomersPage;
  customerDetailPage: CustomerDetailPage;
  incomePage: IncomePage;
  settingsPage: SettingsPage;
  /** Checkout setting card (Payment & Transactions). Call `.mockSettingWrites()` before `goto()`. */
  checkoutSettingPage: CheckoutSettingPage;
  payrollPage: PayrollPage;
  batchHistoryPage: BatchHistoryPage;
  staffsPage: StaffsPage;
  merchantsPage: MerchantsPage;
  onboardingPage: OnboardingPage;
  /** Report Configuration — bound to Pages; use `.on('blocks' | 'sources' | 'columns')`. */
  reportConfigPage: ReportConfigPage;
  /** Reports — the configurable report pages; use `.open(slug)`. */
  reportPagesPage: ReportPagesPage;
  /** Reports V4 — `/v4/reports/<slug>`; use `.open(slug)`. */
  reportsV4Page: ReportsV4Page;
  /** Report Configuration V4 › Pages — builder helpers for the V4 write tests. */
  reportConfigV4Page: ReportConfigV4Page;
  /** Report Configuration V4 (Internal) — call `.guardWrites()` first; every write is intercepted. */
  rcV4Page: RcV4Page;
  /** Internal › Monitor — use `.open(MonitorTab.SYNC)`. */
  monitorPage: MonitorPage;
  /** Monitoring › Remote Actions. Call `.blockWrites()` before opening send-action. */
  remoteActionsPage: RemoteActionsPage;
  /** Monitoring › Change Logs — read-only system-wide entity history. */
  changeLogsPage: ChangeLogsPage;
  /** Packages (Internal POS package catalogue). Call `.blockWrites()` before `goto()`. */
  packagesPage: PackagesPage;
  /** All Orders (Internal, cross-merchant). Call `.blockWrites()` before navigating. */
  allOrdersPage: AllOrdersPage;
  /** Devices (Internal › Device Management). Call `.blockWrites()`; use `.open(DevicesTab.*)`. */
  devicesPage: DevicesPage;
  /** System — App Versions / Settings / Feature Flags. Call `.blockWrites()`; use `.open(SystemSection.*)`. */
  systemPage: SystemPage;
  /** Users & Roles (Internal RBAC). Call `.blockWrites()`; use `.open(UsersRolesScope.*)`. */
  usersRolesPage: UsersRolesPage;
  toast: Toast;
  confirmModal: ConfirmModal;
}

export const pagesFixture = base.extend<PagesFixture>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  ordersPage: async ({ page }, use) => {
    await use(new OrdersPage(page));
  },
  orderDetailPage: async ({ page }, use) => {
    await use(new OrderDetailPage(page));
  },
  productsPage: async ({ page }, use) => {
    await use(new ProductsPage(page));
  },
  customersPage: async ({ page }, use) => {
    await use(new CustomersPage(page));
  },
  customerDetailPage: async ({ page }, use) => {
    await use(new CustomerDetailPage(page));
  },
  incomePage: async ({ page }, use) => {
    await use(new IncomePage(page));
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
  checkoutSettingPage: async ({ page }, use) => {
    await use(new CheckoutSettingPage(page));
  },
  payrollPage: async ({ page }, use) => {
    await use(new PayrollPage(page));
  },
  batchHistoryPage: async ({ page }, use) => {
    await use(new BatchHistoryPage(page));
  },
  staffsPage: async ({ page }, use) => {
    await use(new StaffsPage(page));
  },
  merchantsPage: async ({ page }, use) => {
    await use(new MerchantsPage(page));
  },
  onboardingPage: async ({ page }, use) => {
    await use(new OnboardingPage(page));
  },
  reportConfigPage: async ({ page }, use) => {
    await use(new ReportConfigPage(page));
  },
  reportPagesPage: async ({ page }, use) => {
    await use(new ReportPagesPage(page));
  },
  reportsV4Page: async ({ page }, use) => {
    await use(new ReportsV4Page(page));
  },
  reportConfigV4Page: async ({ page }, use) => {
    await use(new ReportConfigV4Page(page));
  },
  rcV4Page: async ({ page }, use) => {
    await use(new RcV4Page(page));
  },
  monitorPage: async ({ page }, use) => {
    await use(new MonitorPage(page));
  },
  remoteActionsPage: async ({ page }, use) => {
    await use(new RemoteActionsPage(page));
  },
  changeLogsPage: async ({ page }, use) => {
    await use(new ChangeLogsPage(page));
  },
  packagesPage: async ({ page }, use) => {
    await use(new PackagesPage(page));
  },
  allOrdersPage: async ({ page }, use) => {
    await use(new AllOrdersPage(page));
  },
  devicesPage: async ({ page }, use) => {
    await use(new DevicesPage(page));
  },
  systemPage: async ({ page }, use) => {
    await use(new SystemPage(page));
  },
  usersRolesPage: async ({ page }, use) => {
    await use(new UsersRolesPage(page));
  },
  toast: async ({ page }, use) => {
    await use(new Toast(page));
  },
  confirmModal: async ({ page }, use) => {
    await use(new ConfirmModal(page));
  },
});
