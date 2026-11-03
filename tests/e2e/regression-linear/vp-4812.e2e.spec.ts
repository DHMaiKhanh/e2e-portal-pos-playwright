import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  CheckoutMessages,
  type CheckoutSettingPage,
  POINT_CONFIG_FLAG,
  type PointPaymentConfigValue,
} from '@pages/settings/CheckoutSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';

/**
 * VP-4812 — Store Settings › Payment & transactions › Checkout setting › Tip:
 * "Earn points on tip" decides whether the tip counts toward the amount that earns points.
 * https://linear.app/fastboy/issue/VP-4812 · test cases: docs/test-cases/earn-points-on-tip.md
 *
 * Read-only on DEV: `mockSettingWrites()` fakes `PUT /sys_settings` and overlays the written value
 * on the refetch, so the page behaves as after a real save. The point maths on POS is out of scope.
 */

const DESCRIPTION = 'Count the tip in the amount that earns points.';

const isOn = async (cs: CheckoutSettingPage): Promise<boolean> =>
  (await cs.earnOnTipSwitch.getAttribute('aria-checked')) === 'true';

/** Flip the switch to `on` and save (mocked), so a case can start from a known state. */
async function seedEarnOnTip(cs: CheckoutSettingPage, on: boolean): Promise<void> {
  if ((await isOn(cs)) === on) return;
  await cs.earnOnTipSwitch.click();
  await cs.saveAndWait();
  cs.writes.length = 0;
  await expect(cs.page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 15_000 });
}

test.describe('VP-4812 — Earn points on tip', () => {
  test.beforeEach(async ({ checkoutSettingPage }) => {
    await checkoutSettingPage.mockSettingWrites();
    await checkoutSettingPage.goto();
  });

  test(
    'TC-VP4812-01 — hiển thị bước Tip và switch "Earn points on tip"',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ checkoutSettingPage: cs }) => {
      await expect(cs.tipStepTitle).toBeVisible();
      await expect(cs.earnOnTipSwitch).toBeVisible();
      await expect(cs.earnOnTipSwitch).toBeEnabled();
      await expect(cs.earnOnTipDescription).toHaveText(DESCRIPTION);
    },
  );

  test(
    'TC-VP4812-02 — switch hiển thị đúng giá trị đang lưu',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, checkoutSettingPage: cs }) => {
      const flag = await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
      await expect(cs.earnOnTipSwitch).toHaveAttribute(
        'aria-checked',
        String(flag.value.earn_on_tip === true),
      );
    },
  );

  test(
    'TC-VP4812-03 — đổi switch hiện Unsaved changes, Discard trả về giá trị cũ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      const before = await isOn(cs);
      await cs.earnOnTipSwitch.click();
      await expect(cs.saveBar).toBeVisible();
      await expect(cs.saveBar).toContainText('1 unsaved change');

      await cs.discardButton.click();
      await expect(cs.saveBar).toBeHidden();
      await expect(cs.earnOnTipSwitch).toHaveAttribute('aria-checked', String(before));
      expect(cs.writes, 'Discard không gửi request ghi').toHaveLength(0);
    },
  );

  for (const [id, target] of [
    ['04', true],
    ['05', false],
  ] as const) {
    test(
      `TC-VP4812-${id} — ${target ? 'bật' : 'tắt'} rồi Save gửi earn_on_tip: ${target}`,
      { tag: [Tag.REGRESSION, Tag.UI] },
      async ({ checkoutSettingPage: cs }) => {
        await seedEarnOnTip(cs, !target);
        const flag = await readSysSetting<PointPaymentConfigValue>(cs.page, POINT_CONFIG_FLAG);

        await cs.earnOnTipSwitch.click();
        await expect(cs.earnOnTipSwitch).toHaveAttribute('aria-checked', String(target));
        await cs.saveAndWait();

        await expect(cs.toast(CheckoutMessages.SAVED_POINT)).toBeVisible();
        const written = cs.lastWrittenConfig();
        expect(written.earn_on_tip).toBe(target);
        // Nothing else in the shared flag moved.
        expect({ ...written, earn_on_tip: target }).toEqual({ ...flag.value, earn_on_tip: target });
      },
    );
  }

  test(
    'TC-VP4812-06 — trạng thái được giữ sau reload',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, checkoutSettingPage: cs }) => {
      const target = !(await isOn(cs));
      await cs.earnOnTipSwitch.click();
      await cs.saveAndWait();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await cs.waitForReady();
      await expect(cs.earnOnTipSwitch).toHaveAttribute('aria-checked', String(target));
    },
  );

  test(
    'TC-VP4812-07 — đổi Checkout type không làm mất earn_on_tip',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      const stored = await isOn(cs);
      await cs.selectType(cs.bonusTypeOtherThan(await cs.selectedType()));
      await cs.saveAndWait();

      expect(cs.lastWrittenConfig().earn_on_tip).toBe(stored);
      await expect(cs.earnOnTipSwitch).toHaveAttribute('aria-checked', String(stored));
    },
  );

  test(
    'TC-VP4812-08 — lưu thất bại không báo thành công, giữ thay đổi để lưu lại',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      cs.failWrites(500);
      await cs.earnOnTipSwitch.click();
      await cs.save();

      await expect.poll(() => cs.sysSettingWrites().length).toBeGreaterThan(0);
      await expect(cs.toast(/saved/i)).toHaveCount(0);
      await expect(cs.saveBar).toBeVisible();
    },
  );
});
