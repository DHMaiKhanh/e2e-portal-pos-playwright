import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { buildCustomerInput } from '@data/dynamic/factories';

// Runs under the `api` project (no browser). Demonstrates factory-driven data.
test.describe(`API — customers ${Tag.API}`, () => {
  test('creates a customer with generated data', async ({ customerService }) => {
    const input = buildCustomerInput();
    const created = await customerService.create(input);

    expect(created.id).toBeTruthy();
    expect(created.name).toBe(input.name);
    expect(created.phone).toBe(input.phone);
  });

  test('creates a customer with a pinned email override', async ({ customerService }) => {
    const input = buildCustomerInput({ email: 'qa.fixed@example.com' });
    const created = await customerService.create(input);

    expect(created.email).toBe('qa.fixed@example.com');
  });
});
