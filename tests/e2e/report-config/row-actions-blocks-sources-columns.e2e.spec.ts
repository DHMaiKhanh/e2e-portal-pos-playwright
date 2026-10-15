import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Blocks / Sources / Columns — row actions, Add & Edit flows.
 *
 * SHARED LIVE DATA: every test installs `guardWrites()` or `mockWrites()` before
 * touching a submit / confirm button. Verified on DEV 2026-10-13:
 *  - Blocks: Add & Clone are dialogs, Edit is a full page `/blocks/<uuid>`
 *    ("Edit Report Block | Portal", with Clone / Deactivate / Save Changes —
 *    never clicked here).
 *  - Sources / Columns: Add and Edit are full pages (`/new`, `/<uuid>`); Cancel
 *    there is a link back to the list. Delete is disabled on rows still in use.
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
        for (const a of rc.spec.rowActions)
          await expect(rc.rowAction(a, 0), `${screen}:${a}`).toBeVisible();
        for (const a of ['Publish', 'Build layout', 'Clone'].filter(
          (x) => !rc.spec.rowActions.includes(x),
        )) {
          await expect(rc.rowAction(a, 0), `${screen}:${a}`).toHaveCount(0);
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
      await rc.goto();
      const writes = await rc.mockWrites(422);
      const total = await rc.totalResults();
      const { name } = await rc.nameAndSlug(0);
      await rc.rowAction('Delete', 0).click();
      const a = page.getByRole('alertdialog', { name: 'Delete Block?' });
      await expect(a).toContainText(`This will permanently delete the block "${name}".`);
      await a.getByRole('button', { name: 'Delete' }).click();
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
   * TC-RCF-086 — Dialog "Add Block"
   */
  test(
    'TC-RCF-086 — Add Block dialog: Name, Kind* (default Table), Dataset* (slug · response)',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'Add Block' });
      await expect(d).toContainText('The dataset and kind are fixed once the block is created.');
      await expect(d.getByLabel('Name')).toHaveValue('');
      await expect(d.locator('#kind')).toHaveText('Table');
      await expect(d.locator('#datasetSlug')).toHaveText('Select dataset');
      await d.locator('#kind').click();
      expect((await page.getByRole('option').allTextContents()).map((t) => t.trim())).toEqual([
        'Table',
        'Summary',
        'Chart',
        'Detail',
      ]);
      await page.keyboard.press('Escape');
      await d.locator('#datasetSlug').click();
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
   * TC-RCF-087 — Add Block submit rỗng → lỗi (thông điệp raw — defect D3)
   */
  test(
    'TC-RCF-087 — submitting Add Block empty is blocked client-side (raw validator text — defect D3)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'Add Block' });
      await d.getByRole('button', { name: 'Create' }).click();
      await expect(d).toContainText('Pick a dataset');
      const text = await d.innerText();
      if (/Too small: expected string/.test(text) || /slug must be kebab-case/.test(text)) {
        test.info().annotations.push({
          type: 'defect',
          description:
            'D3: Add Block shows raw validator messages ("Too small: expected string to have >=1 characters", lowercase "slug must be kebab-case…")',
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
      await rc.rowAction('Edit', 0).click();
      await expect(page).toHaveURL(new RegExp(`/report-config/blocks/${UUID}$`), {
        timeout: 30_000,
      });
      await expect(page).toHaveTitle('Edit Report Block | Portal');
      for (const b of ['Clone', 'Deactivate', 'Save Changes']) {
        await expect(page.getByRole('button', { name: b, exact: true })).toBeVisible({
          timeout: 30_000,
        });
      }
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
      await rc.rowAction('Clone', 0).click();
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
   * TC-RCF-090 — "Add Report Data" mở trang tạo Source
   */
  test(
    'TC-RCF-090 — Add Report Data opens /sources/new with an empty column picker',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('sources');
      await rc.goto();
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      await expect(page).toHaveURL(/\/report-config\/sources\/new$/);
      await expect(page).toHaveTitle('New Report Data | Portal');
      await expect(page.getByText('Create Report Data', { exact: true })).toBeVisible({
        timeout: 30_000,
      });
      for (const l of ['Name', 'Type', 'Response', 'Active']) {
        await expect(
          page
            .locator('label')
            .filter({ hasText: new RegExp(`^${l}$`) })
            .first(),
        ).toBeVisible();
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
    'TC-RCF-091 — creating an empty Report Data is blocked client-side; Cancel returns to the list',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('sources');
      const blocked = await rc.guardWrites();
      await page.goto(`${rc.pathname}/new`, { waitUntil: 'domcontentloaded' });
      const create = page.getByRole('button', { name: 'Create', exact: true });
      await expect(create).toBeVisible({ timeout: 30_000 });
      await create.click();
      await expect(page.getByText('Required', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Lowercase letters, numbers and hyphens only')).toBeVisible();
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
        ['sources', 'Edit Report Data | Portal'],
        ['columns', 'Edit Report Column | Portal'],
      ] as const) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        const blocked = await rc.guardWrites();
        const { slug } = await rc.nameAndSlug(0);
        await rc.rowAction('Edit', 0).click();
        await expect(page).toHaveURL(new RegExp(`/report-config/${screen}/${UUID}$`), {
          timeout: 30_000,
        });
        await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible({
          timeout: 30_000,
        });
        await expect(page.getByText(new RegExp(`^[a-z_]+/${slug}$`))).toBeVisible();
        const title = await page.title();
        test
          .info()
          .annotations.push({ type: 'behaviour', description: `${screen} edit title: "${title}"` });
        if (screen === 'sources') await expect(page).toHaveTitle(docTitle);
        expect(blocked).toEqual([]);
      }
    },
  );

  /**
   * TC-RCF-093 — Delete bị khoá với bản ghi đang dùng; bản ghi tự do → alertdialog
   */
  test(
    'TC-RCF-093 — Sources/Columns: Delete is disabled on in-use rows; a free row asks for confirmation',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      for (const [screen, title, prefix] of [
        ['sources', 'Delete Report Data?', 'This will permanently delete "'],
        ['columns', 'Delete Column?', 'This will permanently delete the column "'],
      ] as const) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        const blocked = await rc.guardWrites();
        const states = await rc.table.rows.evaluateAll((rows) =>
          rows.map(
            (r) =>
              (r.querySelector('button[aria-label="Delete"]') as HTMLButtonElement | null)
                ?.disabled ?? null,
          ),
        );
        expect(states, screen).toContain(true);
        const idx = await rc.firstRowWithEnabled('Delete');
        test.skip(idx < 0, `no deletable ${screen} row on page 1`);
        const { name } = await rc.nameAndSlug(idx);
        await rc.rowAction('Delete', idx).click();
        const a = page.getByRole('alertdialog', { name: title });
        await expect(a).toContainText(`${prefix}${name}".`);
        await a.getByRole('button', { name: 'Cancel' }).click();
        await expect(a).toBeHidden();
        expect(blocked).toEqual([]);
      }
      test.info().annotations.push({
        type: 'ux',
        description:
          'Disabled Delete only shows the tooltip "Delete" — it never says the record is in use',
      });
    },
  );

  /**
   * TC-RCF-094 — "Add Column" mở trang tạo Column
   */
  test(
    'TC-RCF-094 — Add Column opens /columns/new with Type, Kind, Label, Data Type, Formula, Aggregation',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      await rc.goto();
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      await expect(page).toHaveURL(/\/report-config\/columns\/new$/);
      await expect(page).toHaveTitle('New Report Column | Portal');
      await expect(page.getByText('Create Column', { exact: true })).toBeVisible({
        timeout: 30_000,
      });
      for (const l of ['Type', 'Kind', 'Label', 'Data Type', 'Formula', 'Aggregation']) {
        await expect(
          page
            .locator('label')
            .filter({ hasText: new RegExp(`^${l}$`) })
            .first(),
        ).toBeVisible();
      }
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-095 — /columns/new: Create rỗng bị chặn (slug camelCase)
   */
  test(
    'TC-RCF-095 — creating an empty Column is blocked client-side with the camelCase slug rule',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      const blocked = await rc.guardWrites();
      await page.goto(`${rc.pathname}/new`, { waitUntil: 'domcontentloaded' });
      const create = page.getByRole('button', { name: 'Create', exact: true });
      await expect(create).toBeVisible({ timeout: 30_000 });
      await create.click();
      await expect(page.getByText('Required', { exact: true }).first()).toBeVisible();
      await expect(
        page.getByText('camelCase only — letters and numbers, must start with a lowercase letter'),
      ).toBeVisible();
      await expect(page).toHaveURL(/\/columns\/new$/);
      expect(blocked).toEqual([]);
    },
  );
});
