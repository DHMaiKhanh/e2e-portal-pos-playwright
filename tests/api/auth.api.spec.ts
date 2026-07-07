import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { USERS } from '@data/static/users';

// Runs under the `api` project (no browser). See playwright.config.ts.
test.describe(`API — auth ${Tag.API}`, () => {
  test('issues a token for valid credentials', async ({ authService }) => {
    const token = await authService.login(USERS.ADMIN.username, USERS.ADMIN.password);
    expect(token.accessToken).toBeTruthy();
  });
});
