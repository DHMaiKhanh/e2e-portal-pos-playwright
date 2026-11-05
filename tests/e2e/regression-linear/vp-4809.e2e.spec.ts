import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  FONT_SIZE_FLAG,
  type FontSize,
  FontSizeSettingPage,
  FontSizeText,
  FontSizes,
} from '@pages/settings/FontSizeSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';

/**
 * VP-4809 (request 1) — Store Settings › Configuration › Font size: Small / Medium / Large,
 * default Medium, shared with POS › Setting › Accessibility.
 * https://linear.app/fastboy/issue/VP-4809 · test cases: docs/test-cases/font-size-setting.md
 *
 * Read-only on DEV: picking an option saves at once, so `mockWrites()` fakes the
 * `PUT /sys_settings` and overlays the written value on later GETs. POS terminals write the same
 * flag, so cases read the current value instead of assuming one.
 */

const ERROR_TOAST = 'Something went wrong. Please try again.';
const SUCCESS_TOAST = 'Font size updated';

let fs: FontSizeSettingPage;

test.describe('VP-4809 — Font size (Portal)', () => {
  test.beforeEach(async ({ page }) => {
    fs = new FontSizeSettingPage(page);
    await fs.mockWrites();
    await fs.goto();
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test(
    'TC-VP4809-01 — card Font size hiển thị đủ 3 lựa chọn',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async () => {
      await expect(fs.cardTitle).toHaveText('Font size');
      await expect(fs.description).toHaveText('Text size on every POS terminal of this merchant.');
      await expect(fs.group.getByRole('radio')).toHaveCount(3);
      await expect(fs.group.locator('[data-slot="merchant-option-card"]')).toHaveText(
        FontSizes.map(
          (s) => new RegExp(`${FontSizeText[s].label}\\s*${FontSizeText[s].description}`),
        ),
      );
      await expect(fs.checkedRadio).toHaveCount(1);
    },
  );

  test(
    'TC-VP4809-02 — thẻ đang chọn khớp giá trị đã lưu',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      const flag = await readSysSetting<{ font_size: FontSize }>(page, FONT_SIZE_FLAG);
      await expect(fs.checkedRadio).toHaveAttribute('value', flag.value.font_size);
    },
  );

  test(
    'TC-VP4809-03 — mặc định là Medium',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ page }) => {
      const flag = await readSysSetting<{ font_size: FontSize }>(page, FONT_SIZE_FLAG);
      const config = flag.config as {
        default_value?: { font_size?: string };
        selections?: { key: string; default_value?: string; selections?: string[] }[];
      };
      expect(config.default_value?.font_size).toBe('medium');
      const field = config.selections?.find((s) => s.key === 'font_size');
      expect(field?.default_value).toBe('medium');
      expect(field?.selections).toEqual([...FontSizes]);
    },
  );

  for (const [id, size] of [
    ['04', 'small'],
    ['05', 'medium'],
    ['06', 'large'],
  ] as const) {
    test(
      `TC-VP4809-${id} — chọn ${FontSizeText[size].label} lưu font_size: "${size}"`,
      { tag: [Tag.REGRESSION, Tag.UI] },
      async () => {
        if ((await fs.selected()) === size) {
          await fs.choose(FontSizes.find((s) => s !== size)!);
        }
        const before = fs.writes.length;

        await fs.choose(size);

        const write = fs.writes[before];
        expect(write.url).toMatch(/\/sys_settings\/[^/?]+$/);
        expect(write.body).toEqual({ value: { font_size: size } });
        await expect(fs.radio(size)).toHaveAttribute('aria-checked', 'true');
        // QC TC-FS-P02 (Linear 02/11): a successful save shows "Font size updated".
        await expect(fs.toast(SUCCESS_TOAST).last()).toBeVisible();
        await expect(fs.toast(ERROR_TOAST)).toHaveCount(0);
      },
    );
  }

  test(
    'TC-VP4809-07 — lựa chọn được giữ sau reload',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      const next: FontSize = (await fs.selected()) === 'large' ? 'small' : 'large';
      await fs.choose(next);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await fs.waitForReady();
      await expect(fs.checkedRadio).toHaveAttribute('value', next);
    },
  );

  test(
    'TC-VP4809-08 — lưu lỗi: báo lỗi và quay về giá trị cũ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {
      const before = await fs.selected();
      fs.failWrites(500);
      await fs.choose(FontSizes.find((s) => s !== before)!);

      // The toast carries the server's message: "Server Error" + body.message for a 500
      // ("Something went wrong…" only when the body has none).
      await expect(fs.toast(/Server Error/).first()).toBeVisible();
      await expect(fs.toast(/Mocked failure/).first()).toBeVisible();
      await expect(fs.checkedRadio).toHaveAttribute('value', before);
    },
  );
});
