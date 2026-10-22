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
  toast: async ({ page }, use) => {
    await use(new Toast(page));
  },
  confirmModal: async ({ page }, use) => {
    await use(new ConfirmModal(page));
  },
});
