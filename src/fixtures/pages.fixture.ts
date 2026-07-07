import { test as base } from '@playwright/test';
import { LoginPage } from '@pages/auth/LoginPage';
import { DashboardPage } from '@pages/dashboard/DashboardPage';
import { OrdersPage } from '@pages/orders/OrdersPage';
import { ProductsPage } from '@pages/products/ProductsPage';
import { CustomersPage } from '@pages/customers/CustomersPage';
import { ReportsPage } from '@pages/reports/ReportsPage';
import { SettingsPage } from '@pages/settings/SettingsPage';
import { Toast } from '@components/Toast';
import { ConfirmModal } from '@components/modal/ConfirmModal';

export interface PagesFixture {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  ordersPage: OrdersPage;
  productsPage: ProductsPage;
  customersPage: CustomersPage;
  reportsPage: ReportsPage;
  settingsPage: SettingsPage;
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
  productsPage: async ({ page }, use) => {
    await use(new ProductsPage(page));
  },
  customersPage: async ({ page }, use) => {
    await use(new CustomersPage(page));
  },
  reportsPage: async ({ page }, use) => {
    await use(new ReportsPage(page));
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
  toast: async ({ page }, use) => {
    await use(new Toast(page));
  },
  confirmModal: async ({ page }, use) => {
    await use(new ConfirmModal(page));
  },
});
