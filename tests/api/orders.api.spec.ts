import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

// Runs under the `api` project (no browser).
test.describe(`API — orders ${Tag.API}`, () => {
  test('lists orders with pagination metadata', async ({ orderService }) => {
    const result = await orderService.list({ page: 1 });
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.data)).toBe(true);
  });
});
