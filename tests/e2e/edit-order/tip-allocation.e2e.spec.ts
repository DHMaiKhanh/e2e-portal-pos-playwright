import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import type { EditOrderStatus, OrderDetailPage } from '@pages/orders/OrderDetailPage';
import { parseMoney } from '@utils/stringUtils';

/**
 * Edit Order — Tip allocation (docs/test-cases/edit-order.md, B7 / A5.4).
 *
 * SAFETY: every test runs behind `blockOrderMutations()` (installed in beforeEach, before any
 * navigation). Tests never click `Confirm update`; the dialog is always left via Cancel.
 * Amounts are asserted as relations (share = total / N, proportional to services, sums), never
 * as the fixed $3.00 / $1.50 example values from the scan.
 */

const EDITABLE_STATUSES: EditOrderStatus[] = ['Successful - Unsettled', 'Successful - Settled'];
const MONEY = /\$[\d,]+\.\d{2}/;
const CENT = 0.011;

const money = (n: number): string =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Opens an editable order with a tip (and optionally >= staffCount staff), then its edit dialog. */
async function openTipDialog(orderDetailPage: OrderDetailPage, staffCount = 1): Promise<boolean> {
  for (const status of EDITABLE_STATUSES) {
    if (await orderDetailPage.openOrderWithStatus(status, { withTip: true, staffCount })) {
      await orderDetailPage.openEditServiceDialog();
      await expect(orderDetailPage.tipSplitTabs).toBeVisible();
      return true;
    }
  }
  return false;
}

/** Reads the current tip share of each staff from the `Tip amount for <Staff>` inputs. */
async function readShares(orderDetailPage: OrderDetailPage, staff: string[]): Promise<number[]> {
  const shares: number[] = [];
  for (const name of staff) {
    shares.push(parseMoney(await orderDetailPage.tipAmountInput(name).inputValue()));
  }
  return shares;
}

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);

test.describe('Tip allocation — Edit Order', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });

  test(
    'TC-EO-043 — Order không tip',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      // openOrderWithStatus has no "without tip" filter: open the first editable order per status
      // and use it only if it carries no tip.
      let found = false;
      for (const status of EDITABLE_STATUSES) {
        if (!(await orderDetailPage.openOrderWithStatus(status))) continue;
        if (!(await orderDetailPage.editServiceDetailsButton.isVisible())) continue;
        await orderDetailPage.openEditServiceDialog();
        if (await orderDetailPage.noTipText.isVisible()) {
          found = true;
          break;
        }
        await orderDetailPage.closeEditServiceDialog();
      }
      test.skip(!found, 'no DEV editable order without tip among the first listed orders');

      await expect(orderDetailPage.noTipText).toBeVisible();
      await expect(orderDetailPage.tipSplitTabs).toBeHidden();
      await expect(orderDetailPage.recipientsLabel).toBeHidden();
      await expect(orderDetailPage.balanceStatus).toBeHidden();
      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'TC-EO-044 — Bố cục Tip allocation',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      test.skip(!(await openTipDialog(orderDetailPage)), 'no DEV editable order with a tip');

      await expect(orderDetailPage.totalTip).toBeVisible();
      await expect(orderDetailPage.totalTip).toHaveText(/Total tip\s*\$[\d,]+\.\d{2}/);
      await expect(orderDetailPage.tipSplitTabs).toBeVisible();
      for (const method of ['Split evenly', 'Proportion', 'Manual'] as const) {
        await expect(orderDetailPage.tipTab(method)).toBeVisible();
      }
      // Split evenly is the default method.
      await expect(orderDetailPage.tipTab('Split evenly')).toHaveAttribute('aria-selected', 'true');
      await expect(orderDetailPage.recipientsLabel).toBeVisible();

      const total = money(await orderDetailPage.readTotalTip());
      await expect(orderDetailPage.balanceStatus).toContainText(
        new RegExp(`Balanced\\s*${escapeRegExp(total)}\\s*/\\s*${escapeRegExp(total)}`),
      );
      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'TC-EO-045 — Split evenly',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      test.skip(
        !(await openTipDialog(orderDetailPage, 2)),
        'no DEV editable order with a tip and 2+ staff',
      );

      await orderDetailPage.selectTipSplit('Split evenly');
      const total = await orderDetailPage.readTotalTip();
      const staff = await orderDetailPage.staffNames();

      for (const name of staff) {
        await expect(orderDetailPage.tipAmountInput(name)).toBeDisabled();
      }
      const shares = await readShares(orderDetailPage, staff);
      const even = total / staff.length;
      for (const share of shares) {
        expect(Math.abs(share - even)).toBeLessThanOrEqual(CENT);
      }
      expect(Math.abs(sum(shares) - total)).toBeLessThan(0.005);
      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test('TC-EO-046 — Proportion', { tag: [Tag.REGRESSION, Tag.UI] }, async ({ orderDetailPage }) => {
    test.skip(
      !(await openTipDialog(orderDetailPage, 2)),
      'no DEV editable order with a tip and 2+ staff',
    );

    await orderDetailPage.selectTipSplit('Proportion');
    const total = await orderDetailPage.readTotalTip();
    const staff = await orderDetailPage.staffNames();

    // Service amount per staff, read off each group header "<N> service(s) · $x".
    const serviceAmounts: number[] = [];
    for (const name of staff) {
      const summary = await orderDetailPage.groupSummary(name).innerText();
      const amount = summary.match(MONEY);
      serviceAmounts.push(amount ? parseMoney(amount[0]) : 0);
    }
    const servicesSum = sum(serviceAmounts);
    test.skip(servicesSum <= 0, 'order has no priced services to split by proportion');

    for (const name of staff) {
      await expect(orderDetailPage.tipAmountInput(name)).toBeDisabled();
    }
    await expect
      .poll(async () => {
        const shares = await readShares(orderDetailPage, staff);
        return shares.every(
          (share, i) => Math.abs(share - (total * serviceAmounts[i]) / servicesSum) <= CENT,
        );
      })
      .toBe(true);
    const shares = await readShares(orderDetailPage, staff);
    expect(Math.abs(sum(shares) - total)).toBeLessThan(0.005);
    await orderDetailPage.closeEditServiceDialog();
  });

  test(
    'TC-EO-047 — Manual phân bổ hợp lệ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      test.skip(
        !(await openTipDialog(orderDetailPage, 2)),
        'no DEV editable order with a tip and 2+ staff',
      );

      await orderDetailPage.selectTipSplit('Manual');
      const total = await orderDetailPage.readTotalTip();
      const staff = await orderDetailPage.staffNames();
      for (const name of staff) {
        await expect(orderDetailPage.tipAmountInput(name)).toBeEditable();
      }

      // Give the whole tip to the first staff, 0 to the others — still sums to Total tip,
      // and differs from the even split so the dialog is dirty.
      await orderDetailPage.tipAmountInput(staff[0]).fill(total.toFixed(2));
      for (const name of staff.slice(1)) {
        await orderDetailPage.tipAmountInput(name).fill('0.00');
      }

      const t = escapeRegExp(money(total));
      await expect(orderDetailPage.balanceStatus).toContainText(
        new RegExp(`Balanced\\s*${t}\\s*/\\s*${t}`),
      );
      await expect(orderDetailPage.tipError).toBeHidden();
      await expect(orderDetailPage.saveChangesButton).toBeEnabled();
      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'TC-EO-048 — Manual lệch tổng thì chặn Save',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      test.skip(!(await openTipDialog(orderDetailPage)), 'no DEV editable order with a tip');

      await orderDetailPage.selectTipSplit('Manual');
      const total = await orderDetailPage.readTotalTip();
      const staff = await orderDetailPage.staffNames();

      const input = orderDetailPage.tipAmountInput(staff[0]);
      const current = parseMoney(await input.inputValue());
      await input.fill((current + 1.15).toFixed(2));

      await expect(orderDetailPage.balanceStatus).toContainText(
        new RegExp(
          `Off by\\s*\\$[\\d,]+\\.\\d{2}\\s*\\$[\\d,]+\\.\\d{2}\\s*/\\s*${escapeRegExp(money(total))}`,
        ),
      );
      await expect(orderDetailPage.tipError).toBeVisible();
      await expect(orderDetailPage.saveChangesButton).toBeDisabled();
      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'TC-EO-049 — Total Tip bị khoá',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      test.skip(!(await openTipDialog(orderDetailPage)), 'no DEV editable order with a tip');

      const dialog = orderDetailPage.editServiceDialog;
      await expect(orderDetailPage.totalTip).toBeVisible();
      await expect(orderDetailPage.totalTip).toHaveText(/Total tip\s*\$[\d,]+\.\d{2}/);
      await expect(dialog.getByRole('textbox', { name: /total tip/i })).toHaveCount(0);
      await expect(dialog.getByRole('spinbutton', { name: /total tip/i })).toHaveCount(0);

      // Even in Manual mode the only tip inputs are the per-staff shares.
      await orderDetailPage.selectTipSplit('Manual');
      const staff = await orderDetailPage.staffNames();
      const tipInputs = dialog
        .getByRole('textbox', { name: /^Tip amount for / })
        .or(dialog.getByRole('spinbutton', { name: /^Tip amount for / }));
      await expect(tipInputs).toHaveCount(staff.length);
      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'TC-EO-050 — Người nhận tip = staff đang làm service',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      test.skip(!(await openTipDialog(orderDetailPage)), 'no DEV editable order with a tip');

      const dialog = orderDetailPage.editServiceDialog;
      const staff = await orderDetailPage.staffNames();
      await expect(orderDetailPage.recipientsLabel).toBeVisible();

      for (const name of staff) {
        await expect(orderDetailPage.tipAmountInput(name)).toBeVisible();
      }
      const tipInputs = dialog
        .getByRole('textbox', { name: /^Tip amount for / })
        .or(dialog.getByRole('spinbutton', { name: /^Tip amount for / }));
      await expect(tipInputs).toHaveCount(staff.length);
      await expect(dialog.getByText(/\$[\d,]+\.\d{2} in services/).first()).toBeVisible();

      // No manual recipient picker: the only checkboxes in the dialog are the service-row ones.
      const rowCheckboxes = await orderDetailPage.selectServiceCheckboxes.count();
      await expect(dialog.getByRole('checkbox')).toHaveCount(rowCheckboxes);
      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'TC-EO-051 — Đổi staff thì tip đi theo',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      // Covers the ✅ UI part only. The 🔍 persistence part ("lưu → tip của B đúng") is NOT
      // covered: it needs `Confirm update` on live DEV data, which these tests never click.
      test.skip(
        !(await openTipDialog(orderDetailPage, 2)),
        'no DEV editable order with a tip and 2+ staff',
      );

      const staff = await orderDetailPage.staffNames();
      const [from, to] = staff;
      const servicesTotal = await orderDetailPage.readServicesTotal();

      const fromCheckboxes = orderDetailPage
        .groupByStaff(from)
        .getByRole('checkbox', { name: 'Select service' });
      const count = await fromCheckboxes.count();
      test.skip(count === 0, `staff group "${from}" has no selectable service`);
      for (let i = 0; i < count; i++) await fromCheckboxes.nth(i).check();
      await orderDetailPage.moveSelectedTo(to);

      await expect(orderDetailPage.tipAmountInput(from)).toHaveCount(0);
      await expect(orderDetailPage.tipAmountInput(to)).toBeVisible();
      if (staff.length === 2) {
        // All services now belong to `to`: its recipient line carries the full services total.
        await expect(
          orderDetailPage.editServiceDialog.getByText(
            new RegExp(`${escapeRegExp(money(servicesTotal))} in services`),
          ),
        ).toBeVisible();
      }
      await orderDetailPage.closeEditServiceDialog();
    },
  );

  /**
   * Steps:
   *  1. Đổi method/phân bổ
   *  2. lưu
   * Expected: Order summary › Tip và tổng tip trong report không đổi
   */
  test.fixme('TC-EO-052 — Total Tip trước = sau', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): needs `Confirm update` on an order (mutation is blocked on live DEV)
    // plus a cross-check of Order summary › Tip and the tip total in Reports afterwards.
  });

  /**
   * Steps:
   *  1. Lưu thay đổi tip
   * Expected: Network chỉ có request edit-order, **không** có `PUT /split_tip`
   */
  test.fixme('TC-EO-053 — Tip lưu chung 1 API', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): needs `Confirm update` to fire the save request; on a seeded/disposable
    // order, record requests and assert no `PUT /split_tip` (blockOrderMutations would show it).
  });
});
