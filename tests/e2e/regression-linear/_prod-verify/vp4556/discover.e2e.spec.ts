import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { blockMutations } from '@helpers/writeGuard';
import { Urls } from '@constants/urls';
import { shot } from './_shared';

/** VP-4556 PROD discovery — READ-ONLY (every non-GET is aborted). */
test.describe('VP-4556 PROD discover (read-only)', () => {
  test.beforeEach(() => {
    expect(env.STORE_ID, 'must target the internal test store').toBe('20258');
  });

  test('monitor background tasks — filters + API', async ({ page }) => {
    test.setTimeout(180_000);
    const blocked = await blockMutations(page);
    const seen: string[] = [];
    page.on('response', async (r) => {
      const u = r.url();
      if (r.request().resourceType() === 'fetch' || r.request().resourceType() === 'xhr') {
        seen.push(`${r.request().method()} ${r.status()} ${u}`);
        if (/background|task|monitor/i.test(u) && r.request().method() === 'GET') {
          try {
            const j = await r.json();
            const m = j.member ?? j['hydra:member'] ?? j.data ?? j.items ?? j;
            console.log('BG URL', u);
            console.log(
              'BG total',
              j.totalItems ?? j['hydra:totalItems'] ?? j.total,
              'keys',
              Object.keys(Array.isArray(m) ? (m[0] ?? {}) : m).join(','),
            );
            console.log('BG item0', JSON.stringify(Array.isArray(m) ? m[0] : m).slice(0, 1500));
            if (/references/.test(u))
              for (const g of m)
                console.log(
                  'REF',
                  g.key,
                  g.label,
                  (g.types ?? []).map((t: { value: string }) => t.value).join(','),
                );
          } catch {
            /* ignore non-JSON / failed probe responses */
          }
        }
      }
    });
    await page.goto(`${Urls.MONITOR}?tab=background-task`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    console.log('TABS', (await page.getByRole('tab').allInnerTexts()).join(' | '));
    const panel = page.locator('[role="tabpanel"]:visible').first();
    console.log(
      'PANEL buttons',
      (await panel.getByRole('button').allInnerTexts())
        .map((t) => t.replace(/\s+/g, ' '))
        .join(' | '),
    );
    console.log(
      'PANEL comboboxes',
      (await panel.getByRole('combobox').allInnerTexts()).join(' | '),
    );
    console.log(
      'PANEL inputs',
      JSON.stringify(
        await panel.locator('input').evaluateAll((els) =>
          els.map((e) => ({
            n: e.getAttribute('name'),
            p: e.getAttribute('placeholder'),
            t: e.getAttribute('type'),
          })),
        ),
      ),
    );
    console.log('HEADERS', (await panel.getByRole('columnheader').allInnerTexts()).join(' | '));
    const rows = await panel.locator('tbody tr').allInnerTexts();
    console.log(
      'ROWS\n' +
        rows
          .slice(0, 15)
          .map((r) => r.replace(/\s+/g, ' '))
          .join('\n'),
    );
    console.log('PANEL HTML (filters)', await panel.evaluate((e) => e.outerHTML.slice(0, 4000)));
    await shot(page, 'discover_monitor_bg');
    console.log('NET\n' + seen.slice(0, 60).join('\n'));
    console.log('BLOCKED', blocked.join('\n'));
  });

  test('services — category actions + edit dialog controls', async ({ page, productsPage }) => {
    test.setTimeout(180_000);
    const blocked = await blockMutations(page);
    page.on('response', async (r) => {
      const u = new URL(r.url());
      if (
        u.host.startsWith('volt-pos.') &&
        r.request().method() === 'GET' &&
        /^\/(categories|services)$/.test(u.pathname)
      ) {
        try {
          const j = await r.json();
          const m = j.member ?? [];
          console.log('API', u.pathname + u.search, 'total', j.totalItems, 'n', m.length);
          console.log('API item0', JSON.stringify(m[0]).slice(0, 1200));
        } catch {
          /* ignore non-JSON / failed probe responses */
        }
      }
    });
    await productsPage.goto();
    await productsPage.waitForCategoryList();
    const names = await productsPage.categoryNamesInOrder();
    console.log('CATEGORIES', JSON.stringify(names));
    console.log('PREFIX leftovers', names.filter((n) => n.startsWith('E2E VP4556')).length);
    const first = names.find((n) => n !== 'Other' && n !== 'Product');
    if (first) {
      await productsPage.openCategoryActions(first);
      console.log(
        'MENU items',
        (await productsPage.categoryActionsMenu(first).getByRole('menuitem').allInnerTexts()).join(
          ' | ',
        ),
      );
      await shot(page, 'discover_category_menu');
      await productsPage.categoryEditButton(first).click();
      await expect(productsPage.categoryDialog).toBeVisible();
      await page.waitForTimeout(1500);
      console.log(
        'EDIT dialog buttons',
        (await productsPage.categoryDialog.getByRole('button').allInnerTexts()).join(' | '),
      );
      console.log(
        'EDIT dialog text',
        (await productsPage.categoryDialog.innerText()).replace(/\s+/g, ' ').slice(0, 600),
      );
      await shot(page, 'discover_category_edit');
      await productsPage.categoryDialogCancelButton.click();
    }
    const row = productsPage.table.rows.first();
    if (await row.count()) {
      await row.click();
      await expect(productsPage.serviceDialog).toBeVisible();
      await page.waitForTimeout(1500);
      console.log(
        'SERVICE dialog buttons',
        (await productsPage.serviceDialog.getByRole('button').allInnerTexts()).join(' | '),
      );
      await shot(page, 'discover_service_edit');
      await productsPage.serviceDialogCancelButton
        .click()
        .catch(() => page.keyboard.press('Escape'));
    }
    console.log('BLOCKED', blocked.join('\n'));
  });
});
