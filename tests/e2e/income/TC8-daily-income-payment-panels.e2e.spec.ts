import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  INCOME_CURRENCY_PATTERN,
  INCOME_DETAIL_ROWS,
  INCOME_PAYMENT_DETAIL_ROWS,
  incomeRowValue,
  parseIncomeAmount,
  type IncomePage,
} from '@pages/income/IncomePage';

/**
 * A past day that the Daily tab can be deep-linked to via `?date=`.
 * Used by TC-INC-077 to prove both rail panels re-read on a date change.
 */
const OTHER_DAY = '2026-08-18';

/**
 * Assert one rail value renders as currency, then hand back its number.
 *
 * The format check runs first on purpose: it is the real assertion, and it
 * guarantees {@link parseIncomeAmount} cannot hand the arithmetic a `NaN`.
 */
function amount(text: string, label: string): number {
  expect(text, `${label} should render as currency`).toMatch(INCOME_CURRENCY_PATTERN);
  return parseIncomeAmount(text);
}

/** `Sale + Tip + Tax Collected = Total Payment` on the `INCOME DETAIL` panel. */
async function expectIncomeDetailBalances(incomePage: IncomePage): Promise<void> {
  const rows = await incomePage.incomeDetailRows();
  const sale = amount(incomeRowValue(rows, 'Sale'), 'INCOME DETAIL Sale');
  const tip = amount(incomeRowValue(rows, 'Tip'), 'INCOME DETAIL Tip');
  const tax = amount(incomeRowValue(rows, 'Tax Collected'), 'INCOME DETAIL Tax Collected');
  const total = amount(incomeRowValue(rows, 'Total Payment'), 'INCOME DETAIL Total Payment');

  expect(sale + tip + tax, 'Sale + Tip + Tax Collected should equal Total Payment').toBeCloseTo(
    total,
    2,
  );
}

/**
 * `Card + Cash + Others = Amount Collected` and
 * `Amount Collected + Gift Card Redemption = Total Payment` on `PAYMENT DETAIL`.
 */
async function expectPaymentDetailBalances(incomePage: IncomePage): Promise<void> {
  const rows = await incomePage.paymentDetailRows();
  const card = amount(incomeRowValue(rows, 'Card'), 'PAYMENT DETAIL Card');
  const cash = amount(incomeRowValue(rows, 'Cash'), 'PAYMENT DETAIL Cash');
  const others = amount(incomeRowValue(rows, 'Others'), 'PAYMENT DETAIL Others');
  const collected = amount(
    incomeRowValue(rows, 'Amount Collected'),
    'PAYMENT DETAIL Amount Collected',
  );
  const giftCard = amount(
    incomeRowValue(rows, 'Gift Card Redemption'),
    'PAYMENT DETAIL Gift Card Redemption',
  );
  const total = amount(incomeRowValue(rows, 'Total Payment'), 'PAYMENT DETAIL Total Payment');

  expect(card + cash + others, 'Card + Cash + Others should equal Amount Collected').toBeCloseTo(
    collected,
    2,
  );
  expect(
    collected + giftCard,
    'Amount Collected + Gift Card Redemption should equal Total Payment',
  ).toBeCloseTo(total, 2);
}

test.describe('Tab Daily — panel Income / Payment Detail — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  test(
    'TC-INC-070 — INCOME DETAIL panel renders its heading total and all four rows',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.waitForDataSettled();
      await expect(incomePage.incomeDetailHeading).toBeVisible();

      const rows = await incomePage.incomeDetailRows();

      // The panel heading carries the section total next to the label.
      expect(incomeRowValue(rows, 'INCOME DETAIL'), 'INCOME DETAIL heading total').toMatch(
        INCOME_CURRENCY_PATTERN,
      );

      for (const label of INCOME_DETAIL_ROWS) {
        expect(incomeRowValue(rows, label), `INCOME DETAIL row "${label}"`).toMatch(
          INCOME_CURRENCY_PATTERN,
        );
      }
    },
  );

  test(
    'TC-INC-071 — PAYMENT DETAIL panel renders its heading total and all six rows',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.waitForDataSettled();
      await expect(incomePage.paymentDetailHeading).toBeVisible();

      const rows = await incomePage.paymentDetailRows();

      expect(incomeRowValue(rows, 'PAYMENT DETAIL'), 'PAYMENT DETAIL heading total').toMatch(
        INCOME_CURRENCY_PATTERN,
      );

      for (const label of INCOME_PAYMENT_DETAIL_ROWS) {
        expect(incomeRowValue(rows, label), `PAYMENT DETAIL row "${label}"`).toMatch(
          INCOME_CURRENCY_PATTERN,
        );
      }
    },
  );

  test(
    'TC-INC-072 — INCOME DETAIL rows match the Sale Income / Total Tip / Total Payment cards',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.waitForDataSettled();

      const rows = await incomePage.incomeDetailRows();
      const panelSale = amount(incomeRowValue(rows, 'Sale'), 'INCOME DETAIL Sale');
      const panelTip = amount(incomeRowValue(rows, 'Tip'), 'INCOME DETAIL Tip');
      const panelTotal = amount(
        incomeRowValue(rows, 'Total Payment'),
        'INCOME DETAIL Total Payment',
      );
      const headingTotal = amount(
        incomeRowValue(rows, 'INCOME DETAIL'),
        'INCOME DETAIL heading total',
      );

      const cardSale = amount(await incomePage.kpiValue('Sale Income'), 'Sale Income card');
      const cardTip = amount(await incomePage.kpiValue('Total Tip'), 'Total Tip card');
      const cardTotal = amount(await incomePage.kpiValue('Total Payment'), 'Total Payment card');

      expect(panelSale, 'panel Sale vs Sale Income card').toBeCloseTo(cardSale, 2);
      expect(panelTip, 'panel Tip vs Total Tip card').toBeCloseTo(cardTip, 2);
      expect(panelTotal, 'panel Total Payment vs Total Payment card').toBeCloseTo(cardTotal, 2);
      expect(panelTotal, 'panel Total Payment vs panel heading total').toBeCloseTo(headingTotal, 2);
    },
  );

  test(
    'TC-INC-073 — INCOME DETAIL adds up: Sale + Tip + Tax Collected = Total Payment',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.waitForDataSettled();
      await expectIncomeDetailBalances(incomePage);
    },
  );

  test(
    'TC-INC-074 — PAYMENT DETAIL adds up: Card + Cash + Others = Amount Collected, plus gift card = Total Payment',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.waitForDataSettled();
      await expectPaymentDetailBalances(incomePage);
    },
  );

  test(
    'TC-INC-075 — both panels report the same Total Payment as the KPI card',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.waitForDataSettled();

      const income = amount(
        await incomePage.incomeDetailValue('Total Payment'),
        'INCOME DETAIL Total Payment',
      );
      const payment = amount(
        await incomePage.paymentDetailValue('Total Payment'),
        'PAYMENT DETAIL Total Payment',
      );
      const card = amount(await incomePage.kpiValue('Total Payment'), 'Total Payment card');

      expect(income, 'INCOME DETAIL vs PAYMENT DETAIL Total Payment').toBeCloseTo(payment, 2);
      expect(income, 'INCOME DETAIL Total Payment vs KPI card').toBeCloseTo(card, 2);
    },
  );

  /**
   * Steps:
   *   1. Bấm vào chevron/tiêu đề `INCOME DETAIL`.
   *   2. Bấm lại.
   *
   * Expected:
   *   Nếu panel thu gọn được: các dòng bên trong ẩn/hiện tương ứng và có thuộc
   *   tính `aria-expanded`. *(Quét không tìm thấy phần tử role button — cần xác
   *   minh trực tiếp; nếu không tương tác được thì icon chevron là gây nhầm lẫn
   *   và nên báo lại team.)*
   */
  // TODO(manual/setup): the scan found no role=button / aria-expanded on the
  // INCOME DETAIL chevron, so there is no collapse contract to assert yet. Needs
  // live verification: either the chevron is interactive (then assert
  // aria-expanded toggling and the rows hiding) or it is decorative and the
  // finding goes back to the product team.
  test.fixme(
    'TC-INC-076 — INCOME DETAIL chevron collapses/expands the panel',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.waitForDataSettled();
      await expect(incomePage.incomeDetailHeading).toBeVisible();
    },
  );

  test(
    'TC-INC-077 — both panels reload on a date change and still balance',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.waitForDataSettled();

      // Baseline: today's panels are readable and internally consistent.
      const todayTotal = await incomePage.incomeDetailValue('Total Payment');
      expect(todayTotal, "today's INCOME DETAIL Total Payment").toMatch(INCOME_CURRENCY_PATTERN);

      await incomePage.gotoWithQuery({ tab: 'daily', date: OTHER_DAY });
      expect(incomePage.param('date'), '?date= should carry the selected day').toBe(OTHER_DAY);
      await incomePage.waitForDataSettled();

      // Both panels re-rendered for the new day…
      await expect(incomePage.incomeDetailHeading).toBeVisible();
      await expect(incomePage.paymentDetailHeading).toBeVisible();

      // …and the TC-INC-073 / TC-INC-074 relations still hold. Values are not
      // compared against the baseline: a quiet store can legitimately report the
      // same $0.00 on both days.
      await expectIncomeDetailBalances(incomePage);
      await expectPaymentDetailBalances(incomePage);
    },
  );
});
