import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import type { Page } from '@playwright/test';
import { env } from '@configs/env/loadEnv';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';
import { type ProductsPage, STAFF_COLOR_PALETTE, readSwatches } from '@pages/products/ProductsPage';
import { type MockedWrite, mockDataWrites } from './helpers';

/**
 * VP-5338 — the Category colour picker uses the 15 Staff colours; VP-5483 — categories saved
 * before the change were remapped to Staff colours by a backend command.
 * https://linear.app/fastboy/issue/VP-5338 · test cases: docs/test-cases/category-color-palette.md
 *
 * Read-only on DEV: `mockDataWrites` answers every POST/PUT with a fake 200, and the cases
 * assert the payload the Portal sent instead of reading the record back.
 */

interface Category {
  id: string;
  name: string;
  status: string;
  type: 'service' | 'product' | string;
  colorHex?: string | null;
}

const runId = Date.now().toString(36);
const PALETTE_HEX = STAFF_COLOR_PALETTE.map((c) => c.hex);
const PEACH = STAFF_COLOR_PALETTE[0];
const MINT = STAFF_COLOR_PALETTE.find((c) => c.name === 'Mint')!;
/** A pre-VP-5338 colour (the old Portal fallback), used to fake an un-remapped category. */
const OLD_COLOR = '#36BFF2';

/** Every category of the store with the given statuses, through all pages. */
async function fetchCategories(page: Page, statuses = ['active', 'inactive']): Promise<Category[]> {
  const all: Category[] = [];
  for (let n = 1; n <= 20; n++) {
    const qs = new URLSearchParams();
    for (const s of statuses) qs.append('status[]', s);
    qs.append('type[]', 'service');
    qs.append('type[]', 'product');
    qs.set('page', String(n));
    const res = await page.request.get(`${dataApiUrl}/categories?${qs}`, {
      headers: { 'x-merch-id': env.STORE_ID, Accept: 'application/ld+json' },
      failOnStatusCode: false,
    });
    expect(res.ok(), `GET /categories page ${n} → ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as { member: Category[]; totalItems: number };
    all.push(...body.member);
    if (all.length >= body.totalItems || body.member.length === 0) break;
  }
  return all;
}

const isCategoryWrite = (w: MockedWrite, method: string): boolean =>
  w.method === method && /^\/categories(\/[0-9a-f-]+)?$/i.test(new URL(w.url).pathname);

/**
 * Active categories listed exactly once by name, so their row can be found unambiguously.
 * "Other" is pinned and has no Edit action.
 */
async function uniqueActive(page: Page): Promise<Category[]> {
  const active = await fetchCategories(page, ['active']);
  return active.filter(
    (c) => c.name !== 'Other' && active.filter((o) => o.name === c.name).length === 1,
  );
}

/** Only `service` categories offer Edit in the row menu ("Product", "nail" … do not). */
async function editableActive(page: Page): Promise<Category[]> {
  return (await uniqueActive(page)).filter((c) => c.type === 'service');
}

/** First candidate that has an Edit action in the list (rows render lazily, so check each). */
async function firstEditable(products: ProductsPage, candidates: Category[]): Promise<Category> {
  for (const c of candidates) {
    if ((await products.categoryRow(c.name).count()) === 1) return c;
  }
  throw new Error(`none of ${candidates.length} candidate categories is in the list`);
}

test.describe('VP-5338 — bảng màu Category đồng bộ với Staff', () => {
  let writes: MockedWrite[];

  test.beforeEach(async ({ page, productsPage }) => {
    writes = await mockDataWrites(page);
    await productsPage.goto();
    await productsPage.waitForCategoryList();
  });

  test.afterEach(async ({ page }) => {
    // Requests still in flight at teardown would hit a disposed context in a route handler.
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  // ------------------------------------------------------------ B1. bảng màu

  test(
    'TC-VP5338-01 — picker Category có đúng 15 màu Staff, đúng thứ tự',
    { tag: [Tag.REGRESSION, Tag.CRITICAL, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.addCategoryButton.click();
      await expect(productsPage.categoryDialog).toBeVisible();
      expect(await productsPage.categoryPaletteInDialog()).toEqual(STAFF_COLOR_PALETTE);
    },
  );

  test(
    'TC-VP5338-02 — picker Category giống hệt picker Add staff',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, staffsPage }) => {
      await staffsPage.goto();
      const staffDialog = await staffsPage.openCreateDialog();
      const staffPalette = await readSwatches(staffDialog.colorSwatches);
      expect(staffPalette, 'bảng màu Add staff').toEqual(STAFF_COLOR_PALETTE);

      await productsPage.goto();
      await productsPage.addCategoryButton.click();
      expect(await productsPage.categoryPaletteInDialog()).toEqual(staffPalette);
    },
  );

  test(
    'TC-VP5338-03 — màu mặc định khi tạo category là Peach',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.addCategoryButton.click();
      await expect(productsPage.checkedCategoryColorSwatch).toHaveCount(1);
      await expect(productsPage.checkedCategoryColorSwatch).toHaveAttribute(
        'aria-label',
        PEACH.name,
      );
    },
  );

  // ------------------------------------------------------------ B2. tạo / sửa

  test(
    'TC-VP5338-04 — tạo category màu Mint gửi colorHex #83F0CC',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      const name = `E2E VP5338 ${runId} Mint`;
      await productsPage.addCategoryButton.click();
      await productsPage.categoryNameInput.fill(name);
      await productsPage.categoryColorSwatch(MINT.name).click();
      await expect(productsPage.categoryColorSwatch(MINT.name)).toHaveAttribute(
        'aria-checked',
        'true',
      );
      await expect(productsPage.categoryColorSwatch(PEACH.name)).toHaveAttribute(
        'aria-checked',
        'false',
      );

      await productsPage.submitCategoryCreate();

      const post = writes.find((w) => isCategoryWrite(w, 'POST'));
      expect(post, 'POST /categories').toBeTruthy();
      expect(post!.body).toMatchObject({ name, status: 'active', colorHex: MINT.hex });
    },
  );

  test(
    'TC-VP5338-05 — Edit category chọn sẵn màu đã lưu',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, productsPage }) => {
      const colored = (await editableActive(page)).filter((c) =>
        PALETTE_HEX.includes((c.colorHex ?? '').toUpperCase()),
      );
      const target = await firstEditable(productsPage, colored);
      const saved = STAFF_COLOR_PALETTE.find((c) => c.hex === target.colorHex!.toUpperCase())!;

      await productsPage.openEditCategory(target.name);
      await expect(productsPage.categoryColorSwatches).toHaveCount(15);
      await expect(productsPage.checkedCategoryColorSwatch).toHaveAttribute(
        'aria-label',
        saved.name,
      );
    },
  );

  test(
    'TC-VP5338-06 — đổi màu trong Edit gửi màu mới, giữ tên và trạng thái',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, productsPage }) => {
      const colored = (await editableActive(page)).filter((c) =>
        PALETTE_HEX.includes((c.colorHex ?? '').toUpperCase()),
      );
      const target = await firstEditable(productsPage, colored);
      const next = STAFF_COLOR_PALETTE.find((c) => c.hex !== target.colorHex!.toUpperCase())!;

      await productsPage.openEditCategory(target.name);
      await productsPage.categoryColorSwatch(next.name).click();
      await productsPage.submitCategorySave();

      const put = writes.find((w) => isCategoryWrite(w, 'PUT') && w.url.includes(target.id));
      expect(put, `PUT /categories/${target.id}`).toBeTruthy();
      expect(put!.body).toMatchObject({ name: target.name, status: 'active', colorHex: next.hex });
    },
  );

  // ------------------------------------------------------------ B3. category cũ (VP-5483)

  test(
    'TC-VP5338-07 — mọi category đã lưu dùng màu trong bảng Staff (VP-5483)',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ page }) => {
      const all = await fetchCategories(page);
      expect(all.length).toBeGreaterThan(0);
      const offPalette = all
        .filter((c) => c.colorHex && !PALETTE_HEX.includes(c.colorHex.toUpperCase()))
        .map((c) => `${c.name} (${c.status}) ${c.colorHex}`);
      expect(offPalette, 'category còn màu ngoài bảng Staff').toEqual([]);
    },
  );

  test(
    'TC-VP5338-08 — chấm màu ở danh sách khớp màu đã lưu, category chưa có màu hiện Peach',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, productsPage }) => {
      const mismatches: string[] = [];
      let checked = 0;
      for (const c of await uniqueActive(page)) {
        if ((await productsPage.categoryRow(c.name).count()) !== 1) continue;
        const expected = (c.colorHex ?? PEACH.hex).toUpperCase();
        const shown = await productsPage.categoryDotHex(c.name);
        checked++;
        if (shown !== expected) mismatches.push(`${c.name}: ${shown} ≠ ${expected}`);
      }
      expect(checked, 'số category đã so').toBeGreaterThan(0);
      expect(mismatches).toEqual([]);
    },
  );

  test(
    'TC-VP5338-09 — category chưa có màu: Edit chọn sẵn Peach, không thêm ô lạ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, productsPage }) => {
      const colorless = (await editableActive(page)).filter((c) => !c.colorHex);
      test.skip(colorless.length === 0, 'store không còn category nào chưa có màu');
      const target = await firstEditable(productsPage, colorless);

      await productsPage.openEditCategory(target.name);
      await expect(productsPage.categoryColorSwatches).toHaveCount(15);
      await expect(productsPage.checkedCategoryColorSwatch).toHaveAttribute(
        'aria-label',
        PEACH.name,
      );
    },
  );

  test(
    'TC-VP5338-10 — category còn màu cũ: ô màu cũ đứng đầu, vẫn chọn được màu Staff',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, productsPage }) => {
      const target = await firstEditable(productsPage, await editableActive(page));

      // Serve the category with a pre-VP-5338 colour, both in the list and in its detail.
      await page.route(/\/\/volt-pos\.[^/]+\/categories(\/|\?)/, async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const response = await route.fetch();
        const json = (await response.json().catch(() => null)) as
          (Category & { member?: Category[] }) | null;
        if (!json) return route.fulfill({ response });
        for (const c of json.member ?? [json]) if (c.id === target.id) c.colorHex = OLD_COLOR;
        await route.fulfill({ response, json });
      });
      await productsPage.goto();
      await productsPage.waitForCategoryList();

      await productsPage.openEditCategory(target.name);
      const swatches = await productsPage.categoryPaletteInDialog();
      expect(swatches, '1 ô màu cũ + 15 màu Staff').toHaveLength(16);
      expect(swatches[0].hex).toBe(OLD_COLOR);
      expect(swatches.slice(1)).toEqual(STAFF_COLOR_PALETTE);
      await expect(productsPage.categoryColorSwatches.first()).toHaveAttribute(
        'aria-checked',
        'true',
      );

      await productsPage.categoryColorSwatch(MINT.name).click();
      await productsPage.submitCategorySave();
      const put = writes.find((w) => isCategoryWrite(w, 'PUT') && w.url.includes(target.id));
      expect(put, `PUT /categories/${target.id}`).toBeTruthy();
      expect(put!.body).toMatchObject({ colorHex: MINT.hex });
    },
  );
});
