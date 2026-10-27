import { test, expect } from '@fixtures/index';
import type {
  EditOrderStatus,
  OpenOrderOptions,
  OrderDetailPage,
} from '@pages/orders/OrderDetailPage';
import { parseMoney } from '@utils/stringUtils';

/**
 * Shared steps for the Linear-numbered Edit Order specs (docs/test-cases/edit-order-linear.md).
 * Everything here is read-only: callers install `blockOrderMutations()` first and never click
 * `Confirm update`.
 */

export const EDITABLE_STATUSES: EditOrderStatus[] = [
  'Successful - Unsettled',
  'Successful - Settled',
];
export const MONEY = /\$[\d,]+\.\d{2}/;
export const CENT = 0.011;

export const money = (n: number): string =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);

/** First money amount in a row's text (the line price). */
export function priceOf(text: string): string {
  const match = text.match(MONEY);
  expect(match, `expected a price in "${text}"`).not.toBeNull();
  return match ? match[0] : '';
}

/**
 * Opens an editable order (Unsettled, then Settled) matching `opts` and its Edit service details
 * dialog. Skips the test with `reason` when DEV has no such order.
 */
export async function openEditDialog(
  orderDetailPage: OrderDetailPage,
  opts: OpenOrderOptions = {},
  reason = 'no DEV editable order (Successful - Unsettled/Settled)',
): Promise<void> {
  let opened = false;
  for (const status of EDITABLE_STATUSES) {
    // withStaffRows: skip store-only orders, whose single line is locked ("Not editable").
    if (await orderDetailPage.openOrderWithStatus(status, { withStaffRows: true, ...opts })) {
      opened = true;
      break;
    }
  }
  expect(!opened, reason).toBeFalsy();
  await orderDetailPage.openEditServiceDialog();
}

/** Opens an editable order that has a tip (and >= `staffCount` staff), with the dialog open. */
export async function openTipDialog(
  orderDetailPage: OrderDetailPage,
  staffCount = 1,
): Promise<void> {
  await openEditDialog(
    orderDetailPage,
    { withTip: true, staffCount },
    staffCount > 1
      ? `no DEV editable order with a tip and ${staffCount}+ staff`
      : 'no DEV editable order with a tip',
  );
  await expect(orderDetailPage.tipSplitTabs).toBeVisible();
}

/** Opens an order with `status`; skips when DEV has none. */
export async function openStatus(
  orderDetailPage: OrderDetailPage,
  status: EditOrderStatus,
): Promise<void> {
  expect(
    !(await orderDetailPage.openOrderWithStatus(status)),
    `no DEV order with status ${status}`,
  ).toBeFalsy();
}

export async function expectEditButtons(orderDetailPage: OrderDetailPage): Promise<void> {
  await expect(orderDetailPage.editCustomerButton).toBeVisible();
  await expect(orderDetailPage.editServiceDetailsButton).toBeVisible();
}

/** Detail is ready (waitForReady passed), so absence of the edit buttons is meaningful. */
export async function expectNoEditButtons(orderDetailPage: OrderDetailPage): Promise<void> {
  await expect(orderDetailPage.orderInformationCard).toBeVisible();
  await expect(orderDetailPage.editCustomerButton).toHaveCount(0);
  await expect(orderDetailPage.editServiceDetailsButton).toHaveCount(0);
}

/**
 * Opens every status in turn and runs `check` on the ones DEV has. Skips the test when none of
 * them has an order.
 */
export async function forEachStatus(
  orderDetailPage: OrderDetailPage,
  statuses: EditOrderStatus[],
  check: () => Promise<void>,
): Promise<void> {
  let checked = 0;
  for (const status of statuses) {
    await test.step(`order ${status}`, async () => {
      if (!(await orderDetailPage.openOrderWithStatus(status))) return;
      checked += 1;
      await check();
    });
  }
  expect(checked === 0, `no DEV order with status ${statuses.join(' / ')}`).toBeFalsy();
}

/** Current tip share of each staff, read from the `Tip amount for <Staff>` inputs. */
export async function readShares(
  orderDetailPage: OrderDetailPage,
  staff: string[],
): Promise<number[]> {
  const shares: number[] = [];
  for (const name of staff) {
    shares.push(parseMoney(await orderDetailPage.tipAmountInput(name).inputValue()));
  }
  return shares;
}

/** `Balanced $x / $x` for the given total. */
export function balancedText(total: number): RegExp {
  const t = escapeRegExp(money(total));
  return new RegExp(`Balanced\\s*${t}\\s*/\\s*${t}`);
}

/** Line price of every service row, in DOM order. */
export async function rowPrices(orderDetailPage: OrderDetailPage): Promise<string[]> {
  return (await orderDetailPage.serviceRows.allInnerTexts()).map(priceOf);
}

/**
 * Moves every service of the first staff group to the second one via `Move to…`. Returns
 * `[from, to]`. Skips when the first group has nothing selectable.
 */
export async function moveFirstGroupToSecond(
  orderDetailPage: OrderDetailPage,
): Promise<[string, string]> {
  const [from, to] = await orderDetailPage.staffNames();
  const checkboxes = orderDetailPage
    .groupByStaff(from)
    .getByRole('checkbox', { name: 'Select service' });
  const count = await checkboxes.count();
  expect(count === 0, `staff group "${from}" has no selectable service`).toBeFalsy();
  for (let i = 0; i < count; i++) await checkboxes.nth(i).check();
  await orderDetailPage.moveSelectedTo(to);
  return [from, to];
}
