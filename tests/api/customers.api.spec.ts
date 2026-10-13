// NOTE: API test cases are temporarily commented out.
// Uncomment the block below to re-enable the `api` project tests.

// import { test, expect } from '@fixtures/index';
// import { Tag } from '@/types/testTags';
// import { buildCustomerInput } from '@data/dynamic/factories';
// import { env } from '@configs/env/loadEnv';
// import * as fs from 'fs';
// import * as path from 'path';

// /**
//  * The `api` project runs headless with no browser and no storageState, so its
//  * request context carries no session — an unauthenticated POST to the data API
//  * answers with 401 ("Full authentication is required"). The Portal authorises
//  * data calls with the `token` JWT that sign-in drops as a cookie (its audience
//  * includes the volt-pos data host); lift that same token off the saved session
//  * and send it as a bearer. The API accepts the header as well as the cookie
//  * (see StaffsPage.removeStaffViaApi).
//  */
// const sessionToken = (): string => {
//   const statePath = path.resolve(env.STORAGE_STATE);
//   const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as {
//     cookies?: { name: string; value: string }[];
//   };
//   const token = state.cookies?.find((cookie) => cookie.name === 'token')?.value;
//   if (!token) {
//     throw new Error(
//       `No "token" cookie in ${env.STORAGE_STATE}; refresh the saved session with: npm run auth`,
//     );
//   }
//   return token;
// };

// // Runs under the `api` project (no browser). Demonstrates factory-driven data.
// test.describe(`API — customers ${Tag.API}`, () => {
//   test('creates a customer with a pinned email override', async ({
//     apiClient,
//     customerService,
//   }) => {
//     // The shared apiClient has no auth by default; authorise it with the saved
//     // session token. customerService wraps this same client instance, so setting
//     // the token here applies to the create() call below.
//     apiClient.setToken(sessionToken());

//     const input = buildCustomerInput({ email: 'qa.fixed@example.com' });
//     const created = await customerService.create(input);

//     expect(created.email).toBe('qa.fixed@example.com');
//   });
// });
