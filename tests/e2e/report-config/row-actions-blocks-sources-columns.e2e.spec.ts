import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Blocks / Sources / Columns — row actions, Add & Edit flows.
 *
 * SHARED LIVE DATA: every test installs `guardWrites()` or `mockWrites()` before
 * touching a submit / confirm button. Verified on DEV 2026-10-13, re-verified
 * 2026-10-26 after the redesign:
 *  - Blocks: Add ("New block") & Clone are dialogs, Edit is a full page
 *    `/blocks/<uuid>` ("Edit block | Portal", "Save changes" plus a "More
 *    actions" menu holding Clone / Deactivate — never clicked here).
 *  - Sources / Columns: Add and Edit are full pages (`/new`, `/<uuid>`; "New
 *    source", "Edit column" …); Cancel there is a link back to the list. The
 *    slug is derived from the name / label, so an empty submit only says
 *    "Required".
 *  - Delete is disabled, with a reason in its `title`, on system records: every
 *    block and source on DEV, and every "Database column" column. Block tests
 *    use `unlockSystemRows()` to reach the confirmation.
 */
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

test.describe('Hành động dòng & form — Blocks / Sources / Columns', () => {
  /**
   * TC-RCF-071 — Số hành động trên dòng: Blocks 3, Sources 2, Columns 2
   */
  test(
    'TC-RCF-071 — row actions: Blocks Edit/Clone/Delete, Sources & Columns Edit/Delete',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      for (const screen of ['blocks', 'sources', 'columns'] as const) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        // Since the 2026-10-20 redesign the row actions live in an "Actions for <name>" menu.
        const names = await rc.rowActionNames(0);
        for (const a of rc.spec.rowActions) expect(names, `${screen}:${a}`).toContain(a);
        for (const a of ['Publish', 'Build layout', 'Clone'].filter(
          (x) => !rc.spec.rowActions.includes(x),
        )) {
          expect(names, `${screen}:${a}`).not.toContain(a);
        }
      }
    },
  );

  /**
   * TC-RCF-082 — Xác nhận Delete (mock) gửi DELETE; lỗi được báo, dòng còn nguyên
   */
  test(
    'TC-RCF-082 — confirming a Block delete sends DELETE /report_blocks/<id> (mocked) and keeps the row on failure',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('blocks');
      // Every DEV block is a system block (Delete disabled) — unlock the first row.
      await rc.unlockSystemRows();
      await rc.goto();
      const writes = await rc.mockWrites(422);
      const total = await rc.totalResults();
      const { name } = await rc.nameAndSlug(0);
      await rc.clickRowAction('Delete', 0);
      const a = page.getByRole('alertdialog', { name: 'Delete block?' });
      await expect(a).toContainText(`This will permanently delete the block "${name}".`);
      await a.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect.poll(() => writes.length).toBe(1);
      expect(writes[0].method).toBe('DELETE');
      expect(writes[0].url).toMatch(new RegExp(`/report_blocks/${UUID}$`));
      await expect(rc.toasts.first()).toBeVisible();
      // On failure the confirmation stays open (user can retry or cancel).
      await expect(a).toBeVisible();
      await a.getByRole('button', { name: 'Cancel' }).click();
      await expect(a).toBeHidden();
      expect(await rc.totalResults()).toBe(total);
      expect((await rc.nameAndSlug(0)).name).toBe(name);
    },
  );

  /**
   * TC-RCF-086 — Dialog "New block"
   */
  test(
    'TC-RCF-086 — New block dialog: Name, Kind* (default Table), Dataset* (slug · response)',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'New block' });
      await expect(d).toContainText('The dataset and kind are fixed once the block is created.');
      await expect(d.getByLabel('Name')).toHaveValue('');
      const kind = d.getByRole('combobox', { name: 'Kind *' });
      const dataset = d.getByRole('combobox', { name: 'Dataset *' });
      await expect(kind).toHaveText('Table');
      await expect(dataset).toHaveText('Select dataset');
      await kind.click();
      expect((await page.getByRole('option').allTextContents()).map((t) => t.trim())).toEqual([
        'Table',
        'Summary',
        'Chart',
        'Detail',
      ]);
      await page.keyboard.press('Escape');
      await dataset.click();
      const datasets = (await page.getByRole('option').allTextContents()).map((t) => t.trim());
      expect(datasets.length).toBeGreaterThan(0);
      for (const ds of datasets) expect(ds).toMatch(/^.+ \([a-z0-9-]+\) · (collection|summary)$/);
      await page.keyboard.press('Escape');
      await d.getByRole('button', { name: 'Cancel' }).click();
      await expect(d).toBeHidden();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-087 — New block submit rỗng → lỗi (thông điệp raw — defect D3)
   */
  test(
    'TC-RCF-087 — submitting New block empty is blocked client-side (raw validator text — defect D3)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'New block' });
      // Blur the auto-focused Name first: its on-blur validation re-lays out the
      // footer and would swallow the Create click (defect D11, asserted in TC-RCF-072).
      await d.getByLabel('Name').blur();
      await expect(d.getByRole('alert').first()).toBeVisible();
      await d.getByRole('button', { name: 'Create block' }).click();
      await expect(d).toContainText('Pick a dataset');
      const text = await d.innerText();
      if (/Too small: expected string/.test(text) || /slug must be kebab-case/.test(text)) {
        test.info().annotations.push({
          type: 'defect',
          description:
            'D3: New block shows raw validator messages ("Too small: expected string to have >=1 characters", lowercase "slug must be kebab-case…")',
        });
      }
      await expect(d).toBeVisible();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-088 — Edit Block mở trang chỉnh sửa riêng
   */
  test(
    'TC-RCF-088 — Edit on a block opens the block editor page (not saved)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      const blocked = await rc.guardWrites();
      await rc.clickRowAction('Edit', 0);
      await expect(page).toHaveURL(new RegExp(`/report-config/blocks/${UUID}$`), {
        timeout: 30_000,
      });
      await expect(page).toHaveTitle('Edit block | Portal');
      await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible({
        timeout: 30_000,
      });
      // Clone / Deactivate moved into the "More actions" menu (opened, never clicked).
      await page.getByRole('button', { name: 'More actions', exact: true }).click();
      const more = page.getByRole('menu', { name: 'More actions' });
      for (const b of ['Clone', 'Deactivate']) {
        await expect(more.getByRole('menuitem', { name: b, exact: true })).toBeVisible();
      }
      await page.keyboard.press('Escape');
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-089 — Dialog "Clone Block"
   */
  test(
    'TC-RCF-089 — Clone Block proposes "Copy of <name>" and "<slug>-copy"; Cancel saves nothing',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      const blocked = await rc.guardWrites();
      const { name, slug } = await rc.nameAndSlug(0);
      await rc.clickRowAction('Clone', 0);
      const d = page.getByRole('dialog', { name: 'Clone Block' });
      await expect(d).toContainText(`Creates a new custom block from “${name}”`);
      await expect(d.getByLabel('Name')).toHaveAttribute('placeholder', `Copy of ${name}`);
      await expect(d).toContainText(`${slug}-copy`);
      await d.getByRole('button', { name: 'Cancel' }).click();
      await expect(d).toBeHidden();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-090 — "Add source" mở trang tạo Source
   */
  test(
    'TC-RCF-090 — Add source opens /sources/new with an empty column picker',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('sources');
      await rc.goto();
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      await expect(page).toHaveURL(/\/report-config\/sources\/new$/);
      await expect(page).toHaveTitle('New source | Portal');
      await expect(page.getByRole('heading', { level: 1, name: 'New source' })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('');
      await expect(page.getByRole('switch', { name: 'Active' })).toBeChecked();
      for (const l of ['Type', 'Response']) {
        await expect(page.getByRole('combobox', { name: l, exact: true })).toBeVisible();
      }
      await expect(page.getByText('Selected (0)')).toBeVisible();
      await expect(page.getByText('No columns selected.')).toBeVisible();
      await expect(page.getByText(/^Available \(\d+\)$/)).toBeVisible();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-091 — /sources/new: Create rỗng bị chặn; Cancel quay về danh sách
   */
  test(
    'TC-RCF-091 — creating an empty source is blocked client-side; Cancel returns to the list',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('sources');
      const blocked = await rc.guardWrites();
      await page.goto(`${rc.pathname}/new`, { waitUntil: 'domcontentloaded' });
      const create = page.getByRole('button', { name: 'Create', exact: true });
      await expect(create).toBeVisible({ timeout: 30_000 });
      await create.click();
      // The slug is derived from the name now ("Slug: made from the name"), so
      // the only client-side error is on Name.
      await expect(page.getByRole('alert').filter({ hasText: /^Required$/ })).toBeVisible();
      await expect(page).toHaveURL(/\/sources\/new$/);
      await page.getByRole('link', { name: 'Cancel' }).click();
      await expect(page).toHaveURL(/\/report-config\/sources$/);
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-092 — Edit Source / Edit Column mở trang sửa
   */
  test(
    'TC-RCF-092 — Edit on Sources and Columns opens the edit page for that record (not saved)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      for (const [screen, docTitle] of [
        ['sources', 'Edit source | Portal'],
        ['columns', 'Edit column | Portal'],
      ] as const) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        const blocked = await rc.guardWrites();
        const { slug } = await rc.nameAndSlug(0);
        await rc.clickRowAction('Edit', 0);
        await expect(page).toHaveURL(new RegExp(`/report-config/${screen}/${UUID}$`), {
          timeout: 30_000,
        });
        await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible({
          timeout: 30_000,
        });
        // Banner shows "<type>/<slug>" (Columns prefix it with the kind, "Column staff/…").
        await expect(page.locator('#pos-main').getByRole('banner')).toContainText(
          new RegExp(`[a-z_]+/${slug}`),
        );
        await expect(page).toHaveTitle(docTitle);
        expect(blocked).toEqual([]);
      }
    },
  );

  /**
   * TC-RCF-093 — Delete bị khoá với bản ghi hệ thống (có lý do); bản ghi tự do → alertdialog
   */
  test(
    'TC-RCF-093 — Sources/Columns: Delete is disabled with a reason on system rows; a free row asks for confirmation',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      for (const [screen, reason] of [
        ['sources', 'System sources cannot be deleted'],
        ['columns', 'Database columns cannot be deleted'],
      ] as const) {
        const rc = reportConfigPage.on(screen);
        // Every DEV source is a system source — unlock the first row so the
        // confirmation can be reached; Columns has free (formula) rows of its own.
        if (screen === 'sources') await rc.unlockSystemRows();
        await rc.goto();
        const blocked = await rc.guardWrites();
        // A locked row explains why in the menu item's tooltip.
        const locked = screen === 'sources' ? 1 : 0;
        const menu = await rc.openRowMenu(locked);
        const del = menu.getByRole('menuitem', { name: /^Delete…?$/ });
        await expect(del).toHaveAttribute('aria-disabled', 'true');
        await expect(del).toHaveAttribute('title', reason);
        await rc.closeRowMenu();

        const idx = await rc.firstRowWithEnabled('Delete');
        expect(idx < 0, `no deletable ${screen} row on page 1`).toBeFalsy();
        const { name } = await rc.nameAndSlug(idx);
        await rc.clickRowAction('Delete', idx);
        const a = page.getByRole('alertdialog');
        await expect(a).toContainText(`This will permanently delete`);
        await expect(a).toContainText(`"${name}".`);
        const description = `${screen}: ${await a.innerText()}`;
        test.info().annotations.push({ type: 'behaviour', description });
        await a.getByRole('button', { name: 'Cancel' }).click();
        await expect(a).toBeHidden();
        expect(blocked).toEqual([]);
      }
    },
  );

  /**
   * TC-RCF-094 — "Add Column" mở trang tạo Column
   */
  test(
    'TC-RCF-094 — Add column opens /columns/new with Type, Kind, Label, Data type, Aggregation, Formula',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      await rc.goto();
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      await expect(page).toHaveURL(/\/report-config\/columns\/new$/);
      await expect(page).toHaveTitle('New column | Portal');
      await expect(page.getByRole('heading', { level: 1, name: 'New column' })).toBeVisible({
        timeout: 30_000,
      });
      for (const l of ['Type', 'Kind', 'Data type', 'Aggregation']) {
        await expect(page.getByRole('combobox', { name: l, exact: true })).toBeVisible();
      }
      // Kind defaults to Formula, so the formula editor is open.
      await expect(page.getByRole('combobox', { name: 'Kind', exact: true })).toHaveText('Formula');
      for (const l of ['Label', 'Formula']) {
        await expect(page.getByRole('textbox', { name: l, exact: true })).toBeVisible();
      }
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-095 — /columns/new: Create rỗng bị chặn (slug tự sinh từ Label)
   */
  test(
    'TC-RCF-095 — creating an empty Column is blocked client-side (Label required, slug derived)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      const blocked = await rc.guardWrites();
      await page.goto(`${rc.pathname}/new`, { waitUntil: 'domcontentloaded' });
      const create = page.getByRole('button', { name: 'Create', exact: true });
      await expect(create).toBeVisible({ timeout: 30_000 });
      await create.click();
      // The camelCase slug is derived from the label ("Slug: made from the label"),
      // so the only client-side error is on Label.
      await expect(page.getByRole('alert').filter({ hasText: /^Required$/ })).toBeVisible();
      await expect(page.locator('#pos-main')).toContainText(/Slug:\s*made from the label/);
      await expect(page).toHaveURL(/\/columns\/new$/);
      expect(blocked).toEqual([]);
    },
  );
});
