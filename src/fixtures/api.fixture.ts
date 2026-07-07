import { test as base } from '@playwright/test';
import { BaseApiClient } from '@api/clients/BaseApiClient';
import { AuthService } from '@api/services/AuthService';
import { OrderService } from '@api/services/OrderService';
import { ProductService } from '@api/services/ProductService';
import { CustomerService } from '@api/services/CustomerService';

export interface ApiFixture {
  apiClient: BaseApiClient;
  authService: AuthService;
  orderService: OrderService;
  productService: ProductService;
  customerService: CustomerService;
}

export const apiFixture = base.extend<ApiFixture>({
  apiClient: async ({}, use) => {
    const client = new BaseApiClient();
    await client.init();
    await use(client);
    await client.dispose();
  },
  authService: async ({ apiClient }, use) => {
    await use(new AuthService(apiClient));
  },
  orderService: async ({ apiClient }, use) => {
    await use(new OrderService(apiClient));
  },
  productService: async ({ apiClient }, use) => {
    await use(new ProductService(apiClient));
  },
  customerService: async ({ apiClient }, use) => {
    await use(new CustomerService(apiClient));
  },
});
