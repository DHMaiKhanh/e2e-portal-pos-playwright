import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportV4Slug, reportV4Url } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { RV4_TEXT } from '@pages/reports-v4/ReportsV4Page';
import { env } from '@configs/env/loadEnv';

/**
 * Reports V4 › write cases (RV4-A10, RV4-G02, RV4-G03) — docs/test-cases/reports-v4.md
 *
 * ⚠ These WRITE to the DEV report configuration, so each test only touches a page it creates
 * itself: key `e2e-rv4-…`, scope "This merchant" (the suite store), deleted in `finally`.
 * Shared ("All merchants") pages are never edited — they are only read to prove they did not change.
 */
test.describe.configure({ mode: 'serial' });

const OTHER_MERCHANT = '14';

function newKey(tag: string): { key: string; name: string } {
  const key = `${PREFIX}${tag}-${Date.now().toString(36)}`;
  return { key, name: `E2E RV4 ${tag} ${key.slice(-6)}` };
}

const PREFIX = 'e2e-rv4-';

test.describe('Reports V4 › config writes (merchant-scoped e2e pages)', () => {
  // Leftovers of an interrupted earlier run would otherwise pile up in the merchant's menu.
  test.beforeEach(async ({ reportConfigV4Page: cfg }) => {
    await cfg.sweep(PREFIX);
  });

  test.afterEach(async ({ reportConfigV4Page: cfg }) => {
    await cfg.sweep(PREFIX);
    // each test deletes its own page in `finally` (deleteById asserts it is gone via the API)
  });

  test(
    'RV4-A10 — a deactivated V4 page leaves the menu and is no longer served',
    { tag: [Tag.REGRESSION] },
    async ({ reportConfigV4Page: cfg, reportsV4Page: rp, page }) => {
      const { key, name } = newKey('a10');
      let id = '';
      try {
        id = await cfg.createMerchantPage(name, key);
        await cfg.addBlockToStack('Store Daily Totals');
        await cfg.saveDraft();
        await cfg.publish();

        const menu = async () =>
          (
            (await (await rp.api('/v4/report_pages/menu?layout=web')).json()) as { slug: string }[]
          ).map((m) => m.slug);
        expect(await menu()).toContain(key);
        await rp.open(key);
        await expect(rp.heading).toContainText(name);

        await cfg.openBuilder(id);
        await cfg.deactivate();
        expect(await menu()).not.toContain(key);
        expect((await rp.api(`/v4/report_pages/${key}/layout`)).status()).toBe(404);
        await page.goto(reportV4Url(key));
        await expect(
          page
            .getByText(RV4_TEXT.LOAD_FAILURE)
            .or(page.getByText(/not found/i))
            .first(),
        ).toBeVisible({
          timeout: Timeouts.LONG,
        });
        await expect(page.locator('#pos-main [data-slot="pos-stat"]')).toHaveCount(0);
      } finally {
        if (id) await cfg.deleteById(id);
      }
      expect((await rp.api(`/v4/report_pages/${key}/layout`)).status(), 'cleanup').toBe(404);
    },
  );

  test(
    'RV4-G02 — a merchant-scoped page only exists for that merchant; shared pages stay untouched',
    { tag: [Tag.REGRESSION] },
    async ({ reportConfigV4Page: cfg, reportsV4Page: rp }) => {
      const { key, name } = newKey('g02');
      await rp.open(ReportV4Slug.DAILY_SALE);
      const sharedVersion = async () =>
        (
          (await (await rp.api(`/v4/report_pages/${ReportV4Slug.DAILY_SALE}/layout`)).json()) as {
            version: number;
          }
        ).version;
      const before = await sharedVersion();
      let id = '';
      try {
        id = await cfg.createMerchantPage(name, key);
        await cfg.addBlockToStack('Store Daily Totals');
        await cfg.saveDraft();
        await cfg.publish();

        const menuFor = async (merchant: string) =>
          (
            (await (await rp.api('/v4/report_pages/menu?layout=web', merchant)).json()) as {
              slug: string;
            }[]
          ).map((m) => m.slug);
        expect(await menuFor(env.STORE_ID)).toContain(key);
        expect(await menuFor(OTHER_MERCHANT)).not.toContain(key);
        expect((await rp.api(`/v4/report_pages/${key}/layout`)).status()).toBe(200);
        expect((await rp.api(`/v4/report_pages/${key}/layout`, OTHER_MERCHANT)).status()).toBe(404);
        expect(await sharedVersion(), 'shared Daily Sale page version unchanged').toBe(before);
      } finally {
        if (id) await cfg.deleteById(id);
      }
    },
  );

  test(
    'RV4-G03 — Save draft is invisible to readers until Publish (version bumps on publish)',
    { tag: [Tag.REGRESSION] },
    async ({ reportConfigV4Page: cfg, reportsV4Page: rp }) => {
      const { key, name } = newKey('g03');
      const served = async () => {
        const body = (await (await rp.api(`/v4/report_pages/${key}/layout`)).json()) as {
          version: number;
          layout: unknown;
        };
        return {
          version: body.version,
          hasSupply: JSON.stringify(body.layout).includes('income-supply-fee'),
        };
      };
      let id = '';
      try {
        id = await cfg.createMerchantPage(name, key);
        await cfg.addBlockToStack('Store Daily Totals');
        await cfg.saveDraft();
        const v1 = await cfg.publish();
        const published = await served();
        expect(published.hasSupply).toBe(false);

        await cfg.addBlockToStack('Store Supply Fee');
        await cfg.saveDraft();
        const draft = await served();
        expect(draft.hasSupply, 'draft block not served').toBe(false);
        expect(draft.version).toBe(published.version);

        const v2 = await cfg.publish();
        expect(v2).toBe(v1 + 1);
        const live = await served();
        expect(live.hasSupply, 'published block served').toBe(true);
        expect(live.version).toBe(published.version + 1);
        await rp.open(key);
        await expect(rp.heading).toContainText(name);
      } finally {
        if (id) await cfg.deleteById(id);
      }
    },
  );
});
