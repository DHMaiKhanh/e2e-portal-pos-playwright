import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Pages — row actions & dialogs.
 *
 * SHARED LIVE DATA: every test installs `guardWrites()` (abort) or `mockWrites()`
 * (fulfil locally with a 422 and capture the payload) BEFORE opening a dialog, so
 * no create / edit / clone / delete / publish can reach the DEV Portal. Each test
 * ends by asserting no unexpected write was attempted.
 *
 * Verified on DEV 2026-10-13, re-verified 2026-10-26 after the redesign:
 *  - Add ("New page") / Edit ("Edit page") / Clone ("Clone Page") are
 *    `role=dialog`; Delete is `role=alertdialog` ("Delete page?").
 *  - Publish fires `POST /report_pages/<id>/publish` on ONE click, no confirm.
 *  - Clicking the row opens `/report-config/pages/<uuid>` ("Page builder |
 *    Portal"); the old "Build layout" row action is gone.
 *  - Layout badges open the live report in a new tab:
 *    `/report-pages/<slug>` (Web) or `?layout=pos` (POS window).
 *  - Cancel / Close on an untouched New page form need TWO clicks: blurring the
 *    auto-focused Name runs validation, the error list pushes the footer down
 *    and the first click is lost (defect D11 — kept red in TC-RCF-072).
 */
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

test.describe('Hành động dòng & dialog — Pages', () => {
  test.beforeEach(async ({ reportConfigPage }) => {
    await reportConfigPage.goto();
  });

  /**
   * TC-RCF-070 — Mỗi dòng Pages có menu hành động: Publish, Edit, Clone, Delete
   */
  test(
    'TC-RCF-070 — every page row offers Publish, Edit, Clone, Delete',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc }) => {
      const n = await rc.table.rows.count();
      for (let i = 0; i < n; i++) {
        const names = await rc.rowActionNames(i);
        for (const action of rc.spec.rowActions) expect(names, `row ${i + 1}`).toContain(action);
      }
    },
  );

  /**
   * TC-RCF-072 — Dialog "Add Page": field & giá trị mặc định
   */
  test(
    'TC-RCF-072 — Add Page dialog shows its fields with the documented defaults',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'New page' });
      await expect(d).toBeVisible();
      await expect(d).toContainText('The slug comes from the name and is fixed after creation.');
      await expect(d.getByLabel('Name')).toHaveAttribute('placeholder', 'Income reports');
      await expect(d.getByLabel('Name')).toHaveValue('');
      await expect(d.getByRole('radio', { name: 'A page of its own' })).toBeChecked();
      await expect(
        d.getByRole('radio', { name: 'A fragment of another screen' }),
      ).not.toBeChecked();
      await expect(d.getByRole('switch', { name: 'Hidden in menu' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
      await expect(d.getByRole('switch', { name: 'Active' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      await expect(d.getByRole('combobox', { name: 'Requires permission' })).toHaveText('None');
      await expect(d.getByRole('combobox', { name: 'Requires passcode' })).toHaveText('None');
      await expect(d.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(d.getByRole('button', { name: 'Create page' })).toBeEnabled();
      // One Cancel click must close the untouched form (defect D11: the first
      // click is swallowed by the on-blur validation re-layout).
      await d.getByRole('button', { name: 'Cancel' }).click();
      await expect(d).toBeHidden();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-073 — Slug tự sinh dạng kebab-case từ Name
   */
  test(
    'TC-RCF-073 — typing a name previews a kebab-case slug',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'New page' });
      await d.getByLabel('Name').fill('E2E Probe Page 01');
      await expect(d).toContainText('e2e-probe-page-01');
      await d.getByLabel('Name').fill('  Mixed CASE  & Symbols!! ');
      await expect(d).toContainText('mixed-case-symbols');
      await page.keyboard.press('Escape');
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-074 — Submit form rỗng → lỗi client, không request ghi
   */
  test(
    'TC-RCF-074 — submitting Add Page empty shows client-side errors and sends nothing',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'New page' });
      await d.getByRole('button', { name: 'Create page' }).click();
      await expect(d).toContainText('Name must contain letters or numbers to make a slug');
      // The second message is the raw schema text (same family as defect D3).
      if (/slug must be kebab-case/.test(await d.innerText())) {
        test.info().annotations.push({
          type: 'defect',
          description:
            'D3: New page also lists the raw validator text "slug must be kebab-case, starting with a letter"',
        });
      }
      await expect(d).toBeVisible();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-075 — Name chỉ có ký hiệu → slug "—" và bị chặn khi submit
   */
  test(
    'TC-RCF-075 — a symbols-only name yields no slug and is rejected client-side',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'New page' });
      await d.getByLabel('Name').fill('!!!');
      await expect(d.getByText('—', { exact: true })).toBeVisible();
      await d.getByRole('button', { name: 'Create page' }).click();
      await expect(d).toContainText('Name must contain letters or numbers to make a slug');
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-076 — Submit hợp lệ (mock): payload POST đúng; lỗi server hiện inline
   */
  test(
    'TC-RCF-076 — a valid Add Page posts the expected payload (mocked 422 shown inline)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const writes = await rc.mockWrites(422);
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'New page' });
      await d.getByLabel('Name').fill('E2E Probe Page 01');
      await d.getByRole('button', { name: 'Create page' }).click();
      await expect.poll(() => writes.length).toBe(1);
      expect(writes[0].method).toBe('POST');
      expect(writes[0].url).toMatch(/\/report_pages\.jsonld$/);
      expect(writes[0].body).toEqual({
        slug: 'e2e-probe-page-01',
        name: 'E2E Probe Page 01',
        hiddenInMenu: false,
        usage: 'standalone',
        active: true,
        required: {},
        // Since the redesign the page header title is seeded from the name.
        header: { title: 'E2E Probe Page 01', actions: [] },
      });
      // The violation is mapped back onto the Name field; the dialog stays open.
      await expect(d).toContainText('E2E mocked rejection');
      await expect(d).toBeVisible();
    },
  );

  /**
   * TC-RCF-077 — Cancel / Escape / nút Close đóng dialog không ghi gì
   */
  test(
    'TC-RCF-077 — Cancel, Escape and the close button all dismiss Add Page without a request',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      const d = page.getByRole('dialog', { name: 'New page' });
      await rc.openAdd();
      await d.getByLabel('Name').fill('should not persist');
      await d.getByRole('button', { name: 'Cancel' }).click();
      await expect(d).toBeHidden();
      await rc.openAdd();
      // Re-opened form keeps the cancelled draft (defect D10) — record, don't fail.
      const kept = await d.getByLabel('Name').inputValue();
      if (kept !== '') {
        test.info().annotations.push({
          type: 'defect',
          description: `D10: Add Page re-opens with the cancelled draft still filled in ("${kept}")`,
        });
      }
      await page.keyboard.press('Escape');
      await expect(d).toBeHidden();
      await rc.openAdd();
      await d.getByRole('button', { name: 'Close' }).click();
      await expect(d).toBeHidden();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-078 — Dialog "Edit page" điền sẵn dữ liệu; slug chỉ đọc
   */
  test(
    'TC-RCF-078 — Edit Page is prefilled, shows the fixed slug and publish state, Cancel saves nothing',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      const { name, slug } = await rc.nameAndSlug(0);
      const published = (await rc.columnValues(rc.columnIndex('Published')))[0];
      await rc.clickRowAction('Edit', 0);
      const d = page.getByRole('dialog', { name: 'Edit page' });
      await expect(d).toBeVisible();
      await expect(d.getByLabel('Name')).toHaveValue(name);
      await expect(d).toContainText(slug);
      await expect(d).toContainText(published);
      // Slug is text, not an input: Name is the only textbox.
      await expect(d.getByRole('textbox')).toHaveCount(1);
      await expect(d.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible();
      await d.getByRole('button', { name: 'Cancel' }).click();
      await expect(d).toBeHidden();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-079 — Dialog "Clone Page"
   */
  test(
    'TC-RCF-079 — Clone Page proposes "Copy of <name>" and a "<slug>-copy" slug, blocks not cloned by default',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      const { name, slug } = await rc.nameAndSlug(0);
      await rc.clickRowAction('Clone', 0);
      const d = page.getByRole('dialog', { name: 'Clone Page' });
      await expect(d).toContainText(`Creates a new custom page from “${name}”`);
      await expect(d.getByLabel('Name')).toHaveAttribute('placeholder', `Copy of ${name}`);
      await expect(d).toContainText(`${slug}-copy`);
      await expect(d.getByRole('switch', { name: 'Also clone the blocks' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
      await d.getByRole('button', { name: 'Cancel' }).click();
      await expect(d).toBeHidden();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-080 — Clone submit (mock): POST /report_pages/<id>/clone
   */
  test(
    'TC-RCF-080 — confirming Clone posts {copyBlocks:false} to /report_pages/<id>/clone (mocked)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const writes = await rc.mockWrites(422);
      await rc.clickRowAction('Clone', 0);
      const d = page.getByRole('dialog', { name: 'Clone Page' });
      await d.getByRole('button', { name: 'Clone', exact: true }).click();
      await expect.poll(() => writes.length).toBe(1);
      expect(writes[0].method).toBe('POST');
      expect(writes[0].url).toMatch(new RegExp(`/report_pages/${UUID}/clone$`));
      expect(writes[0].body).toMatchObject({ copyBlocks: false });
    },
  );

  /**
   * TC-RCF-081 — Delete Page: alertdialog xác nhận, Cancel không xoá
   */
  test(
    'TC-RCF-081 — Delete asks for confirmation naming the page; Cancel keeps it',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      const total = await rc.totalResults();
      const { name } = await rc.nameAndSlug(0);
      await rc.clickRowAction('Delete', 0);
      const a = page.getByRole('alertdialog', { name: 'Delete page?' });
      await expect(a).toContainText(`This will permanently delete the page "${name}".`);
      await a.getByRole('button', { name: 'Cancel' }).click();
      await expect(a).toBeHidden();
      expect(await rc.totalResults()).toBe(total);
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-083 — Publish gửi request ngay, không hỏi xác nhận (UX risk D2)
   */
  test(
    'TC-RCF-083 — Publish posts /report_pages/<id>/publish on a single click with no confirmation (mocked, D2)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const writes = await rc.mockWrites(422);
      const last = (await rc.table.rows.count()) - 1;
      await rc.clickRowAction('Publish', last);
      await expect.poll(() => writes.length).toBeGreaterThanOrEqual(1);
      expect(writes[0].method).toBe('POST');
      expect(writes[0].url).toMatch(new RegExp(`/report_pages/${UUID}/publish$`));
      // No confirm step appeared before the request went out.
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      // The mocked failure is surfaced as a toast.
      await expect(rc.toasts.first()).toBeVisible();
      test.info().annotations.push({
        type: 'defect',
        description:
          'D2: Publish ships a page version to every POS on one click — no confirmation dialog',
      });
    },
  );

  /**
   * TC-RCF-084 — Click vào dòng mở Page Builder (menu không còn "Build layout")
   */
  test(
    'TC-RCF-084 — clicking a page row opens the Page builder for that page',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      const { name, slug } = await rc.nameAndSlug(0);
      await rc.row(0).getByRole('cell').first().click();
      await expect(page).toHaveURL(new RegExp(`/report-config/pages/${UUID}$`), {
        timeout: 30_000,
      });
      await expect(page).toHaveTitle('Page builder | Portal');
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.locator('#pos-main').getByRole('banner')).toContainText(slug);
      await expect(page.getByRole('tablist', { name: 'Layout variant' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Page filters' })).toBeVisible();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-085 — Badge layout mở report thật ở tab mới
   */
  test(
    'TC-RCF-085 — layout badges open the live report in a new tab (Web / POS window)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const idx = await rc.table.rows
        .filter({ hasText: 'POS window' })
        .first()
        .evaluate((r) => (r as HTMLTableRowElement).sectionRowIndex);
      const { slug } = await rc.nameAndSlug(idx);
      const web = rc.row(idx).getByRole('button', { name: 'Web', exact: true });
      await expect(web).toHaveAttribute('title', 'Open the page as a Web reader sees it');

      const [webTab] = await Promise.all([page.context().waitForEvent('page'), web.click()]);
      await expect(webTab).toHaveURL(new RegExp(`/report-pages/${slug}$`));
      await webTab.close();

      const pos = rc.row(idx).getByRole('button', { name: 'POS window', exact: true });
      await expect(pos).toHaveAttribute('title', 'Open the page as a POS window reader sees it');
      const [posTab] = await Promise.all([page.context().waitForEvent('page'), pos.click()]);
      await expect(posTab).toHaveURL(new RegExp(`/report-pages/${slug}\\?layout=pos$`));
      await posTab.close();
      // The list itself did not navigate.
      await expect(page).toHaveURL(/\/report-config\/pages/);
    },
  );
});
