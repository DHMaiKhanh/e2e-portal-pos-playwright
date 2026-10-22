import { type Locator, type Page, type Route, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';
import { env } from '@configs/env/loadEnv';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * Checkout setting card — Store Settings › Payment & Transactions (VP-4590).
 *
 * The card shares ONE form with "Setting point config": both are stored in the sys setting flag
 * `merchant_point_payment_config` and saved by a single `PUT /sys_settings/{id}` from the
 * floating "Unsaved changes" bar. Feature doc: docs/features/checkout-type-setting.md.
 *
 * Safety: specs call `mockSettingWrites()` before `goto()`. Every non-GET request is then
 * answered with a fake 200 (and recorded), and the `GET /sys_settings` refetch the app fires
 * after a save is overlaid with the last written value — so the UI behaves as after a real save
 * while DEV data is never touched.
 */

/** `selected_type` values of the flag. */
export const CheckoutType = {
  MANUAL: 'payment_method',
  AUTO: 'auto_checkout',
  HYBRID: 'hybrid_checkout',
} as const;

export type CheckoutTypeValue = (typeof CheckoutType)[keyof typeof CheckoutType];

/** Spec texts of the three option cards (English UI). */
export const CheckoutTypeText: Record<
  CheckoutTypeValue,
  { label: string; description: string; bonusSuffix: string | null }
> = {
  [CheckoutType.MANUAL]: {
    label: 'Manual Checkout',
    description:
      'Check-ins are checked out when their order is completed on POS. Points follow Point Config.',
    bonusSuffix: null,
  },
  [CheckoutType.AUTO]: {
    label: 'Auto Checkout',
    description:
      "Check-ins are checked out when their order is completed on POS. Point Config isn't used.",
    bonusSuffix: 'pts for each completed order, whatever the amount',
  },
  [CheckoutType.HYBRID]: {
    label: 'Hybrid Checkout',
    description:
      'Check-ins are checked out when their order is completed on POS, with points from Point Config. Check-ins still open at 11:59 PM are checked out automatically.',
    bonusSuffix: 'pts for each check-in checked out automatically at 11:59 PM',
  },
};

export const CheckoutMessages = {
  SAVED_CHECKOUT: 'Checkout setting saved.',
  SAVED_POINT: 'Point settings saved',
  SAVED_BOTH: 'Point and checkout settings saved.',
  BONUS_REQUIRED: 'Point bonus is required',
  BONUS_WHOLE_NUMBER: 'Point bonus must be a whole number of 0 or more',
  BONUS_MAX: 'Point bonus must be 2,147,483,647 or less',
  POINT_CONFIG_NOTE:
    'Saved point conversion rates. Manual and Hybrid Checkout earn points at these rates.',
  UNSAVED_DIALOG_TITLE: 'Discard unsaved changes?',
} as const;

export const POINT_CONFIG_FLAG = 'merchant_point_payment_config';

/** Point conversion methods — tile/list label → flag key. */
export const PointMethods = [
  { label: 'Cash', key: 'cash' },
  { label: 'Card', key: 'card' },
  { label: 'Gift card', key: 'gift_card' },
  { label: 'Other', key: 'other' },
] as const;

export type PointMethodKey = (typeof PointMethods)[number]['key'];

export interface PointMethodValue {
  enabled: boolean;
  /** Cents per point. */
  point: number;
}

/** `value` of the `merchant_point_payment_config` flag as the Portal writes it. */
export type PointPaymentConfigValue = Record<PointMethodKey, PointMethodValue> & {
  selected_type: CheckoutTypeValue;
  point_bonus: number;
};

export interface CapturedSettingWrite {
  method: string;
  url: string;
  body: unknown;
}

// API Platform routes may carry a format suffix (`/sys_settings.jsonld`, `/sys_settings/{id}.jsonld`).
const SYS_SETTING_ITEM = /\/sys_settings\/([^/?.]+)/;
const SYS_SETTING_COLLECTION = /\/sys_settings(\.\w+)?(\?|$)/;

/** The flag value may travel as an object or as a JSON string. */
const parseValue = (raw: unknown): unknown => {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

/** Settings URL for any store (same vertical segment as the suite's store). */
export const paymentTransactionsUrl = (storeId: string = env.STORE_ID): string =>
  `/pos/${env.POS_SEGMENT}/${storeId}/setting?tab=payment-transactions`;

export class CheckoutSettingPage extends BasePage {
  protected readonly path = Urls.SETTINGS_PAYMENT_TRANSACTIONS;

  readonly sidebar: Sidebar;
  /** The shared Point config + Checkout setting form. */
  readonly form: Locator;
  readonly checkoutTitle: Locator;
  readonly checkoutDescription: Locator;
  readonly pointConfigTitle: Locator;
  readonly typeGroup: Locator;
  readonly optionCards: Locator;
  readonly pointBonusInput: Locator;
  /** Read-only "Point Config" box under the option cards. */
  readonly pointConfigBox: Locator;
  readonly pointConfigNote: Locator;
  readonly saveBar: Locator;
  readonly saveButton: Locator;
  readonly discardButton: Locator;
  readonly unsavedDialog: Locator;
  readonly productTaxRateInput: Locator;

  /** Every non-GET request answered by `mockSettingWrites()`. */
  readonly writes: CapturedSettingWrite[] = [];
  private lastWrittenValue: unknown;
  private failWritesWith: number | null = null;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.typeGroup = page.getByRole('radiogroup', { name: 'Checkout type' });
    this.form = page.locator('form').filter({ has: this.typeGroup });
    this.checkoutTitle = this.form.getByText('Checkout setting', { exact: true });
    this.checkoutDescription = this.form.getByText(
      'Choose when check-ins are checked out and how they earn points.',
    );
    this.pointConfigTitle = this.form.getByText('Setting point config', { exact: true });
    this.optionCards = this.typeGroup.locator('[data-slot="merchant-option-card"]');
    this.pointBonusInput = this.typeGroup.getByLabel('Point Bonus');
    this.pointConfigBox = this.form.getByRole('group', { name: 'Point Config' });
    this.pointConfigNote = this.form.getByText(CheckoutMessages.POINT_CONFIG_NOTE);
    this.saveBar = page.getByRole('region', { name: 'Unsaved changes' });
    this.saveButton = this.saveBar.getByRole('button', { name: 'Save', exact: true });
    this.discardButton = this.saveBar.getByRole('button', { name: 'Discard', exact: true });
    this.unsavedDialog = page.getByRole('alertdialog', {
      name: CheckoutMessages.UNSAVED_DIALOG_TITLE,
    });
    this.productTaxRateInput = page.getByLabel(/Product tax rate/i);
  }

  async waitForReady(): Promise<void> {
    await expect(this.typeGroup).toBeVisible({ timeout: Timeouts.LONG });
    // The fieldset stays disabled until the stored flag (settingId) has loaded.
    await expect(this.radio(CheckoutType.MANUAL)).toBeEnabled({ timeout: Timeouts.MEDIUM });
  }

  /** Open the Payment & Transactions tab of another store (e.g. merchant #30). */
  async gotoStore(storeId: string): Promise<void> {
    await this.page.goto(paymentTransactionsUrl(storeId), { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  // ---------------------------------------------------------------------------
  // Network: write interception
  // ---------------------------------------------------------------------------

  /**
   * Answer every mutating request with a fake 200 and record it; overlay the last written flag
   * value on the `GET /sys_settings` refetch. Call before `goto()`.
   */
  async mockSettingWrites(): Promise<CapturedSettingWrite[]> {
    await this.page.route('**/*', async (route: Route) => {
      const req = route.request();
      const method = req.method().toUpperCase();
      const url = req.url();

      if (method === 'GET' && SYS_SETTING_COLLECTION.test(url) && this.lastWrittenValue) {
        await this.fulfillWithWrittenValue(route);
        return;
      }
      if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        await route.fallback();
        return;
      }

      const body = (() => {
        try {
          return req.postDataJSON() as unknown;
        } catch {
          return req.postData();
        }
      })();
      this.writes.push({ method, url, body });

      if (this.failWritesWith) {
        await route.fulfill({
          status: this.failWritesWith,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Not Found' }),
        });
        return;
      }

      const id = SYS_SETTING_ITEM.exec(url)?.[1];
      if (id && body && typeof body === 'object' && 'value' in body) {
        this.lastWrittenValue = (body as { value: unknown }).value;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id, ...(typeof body === 'object' && body ? body : {}) }),
      });
    });
    return this.writes;
  }

  /** Make subsequent intercepted writes fail with `status` (CHK-PTL-027). */
  failWrites(status: number): void {
    this.failWritesWith = status;
  }

  private async fulfillWithWrittenValue(route: Route): Promise<void> {
    const response = await route.fetch();
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      await route.fulfill({ response });
      return;
    }
    const written = parseValue(this.lastWrittenValue);
    const patch = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(patch);
        return;
      }
      if (!node || typeof node !== 'object') return;
      const obj = node as Record<string, unknown>;
      if (obj.key === POINT_CONFIG_FLAG && 'value' in obj) {
        obj.value = typeof obj.value === 'string' ? JSON.stringify(written) : written;
        return;
      }
      Object.values(obj).forEach(patch);
    };
    patch(json);
    await route.fulfill({ response, json });
  }

  /** Recorded `PUT /sys_settings/{id}` writes. */
  sysSettingWrites(): CapturedSettingWrite[] {
    return this.writes.filter((w) => SYS_SETTING_ITEM.test(w.url));
  }

  /** Flag values of the recorded sys setting writes, parsed. */
  writtenConfigs(): PointPaymentConfigValue[] {
    return this.sysSettingWrites()
      .map((w) => parseValue((w.body as { value?: unknown } | null)?.value))
      .filter(
        (v): v is PointPaymentConfigValue =>
          !!v && typeof v === 'object' && 'selected_type' in (v as object),
      );
  }

  lastWrittenConfig(): PointPaymentConfigValue {
    const all = this.writtenConfigs();
    expect(all.length, 'a PUT carrying merchant_point_payment_config').toBeGreaterThan(0);
    return all[all.length - 1];
  }

  // ---------------------------------------------------------------------------
  // Checkout type cards
  // ---------------------------------------------------------------------------

  radio(type: CheckoutTypeValue): Locator {
    return this.typeGroup.locator(`[id="checkout-type-${type}"]`);
  }

  card(type: CheckoutTypeValue): Locator {
    // `has` is resolved inside each card, so it must not be chained from the radiogroup.
    return this.optionCards.filter({ has: this.page.locator(`[id="checkout-type-${type}"]`) });
  }

  async selectType(type: CheckoutTypeValue): Promise<void> {
    await this.radio(type).click();
    await expect(this.radio(type)).toBeChecked();
  }

  async selectedType(): Promise<CheckoutTypeValue> {
    for (const type of Object.values(CheckoutType)) {
      if (await this.radio(type).isChecked()) return type;
    }
    throw new Error('No checkout type is selected');
  }

  /** A bonus-bearing type that differs from `current`, so selecting it always dirties the form. */
  bonusTypeOtherThan(current: CheckoutTypeValue): CheckoutTypeValue {
    return current === CheckoutType.AUTO ? CheckoutType.HYBRID : CheckoutType.AUTO;
  }

  async fillPointBonus(value: string): Promise<void> {
    await this.pointBonusInput.fill(value);
    await this.pointBonusInput.blur();
  }

  bonusError(message: string | RegExp): Locator {
    return this.typeGroup.getByText(message);
  }

  /**
   * Stored checkout state as loaded on the page. Reading the bonus of a Manual store needs a
   * bonus card opened, so the edit is discarded afterwards.
   */
  async readStoredCheckout(): Promise<{ type: CheckoutTypeValue; bonus: string }> {
    const type = await this.selectedType();
    if (type !== CheckoutType.MANUAL) {
      return { type, bonus: await this.pointBonusInput.inputValue() };
    }
    await this.selectType(CheckoutType.AUTO);
    const bonus = await this.pointBonusInput.inputValue();
    await this.discardIfDirty();
    await expect(this.radio(CheckoutType.MANUAL)).toBeChecked();
    return { type, bonus };
  }

  // ---------------------------------------------------------------------------
  // Point config (shared form)
  // ---------------------------------------------------------------------------

  pointTile(label: string): Locator {
    return this.form
      .locator('[data-slot="point-conversion-tile"]')
      .filter({ has: this.page.getByText(label, { exact: true }) });
  }

  pointInput(label: string): Locator {
    return this.pointTile(label).getByRole('textbox');
  }

  /** Type a conversion rate in cents, e.g. 200 → $2.00 (the money input works in digits). */
  async setPointRate(label: string, cents: number): Promise<void> {
    const input = this.pointInput(label);
    await input.click();
    await input.press('ControlOrMeta+a');
    await input.press('Backspace');
    if (cents > 0) await input.pressSequentially(String(cents));
    await input.blur();
  }

  /** Text shown for `label` in the read-only Point Config box: `1 Point = $1.00` or `No points`. */
  async pointConfigBoxValue(label: string): Promise<string> {
    const text = (await this.pointConfigBox.innerText()).replace(/\s+/g, ' ');
    const match = new RegExp(`${label}\\s*(1 Point = \\$[\\d,]+\\.\\d{2}|No points)`).exec(text);
    if (!match) throw new Error(`"${label}" not found in Point Config box: ${text}`);
    return match[1];
  }

  /** Same formatting as the box, from the editable tile (only meaningful while not dirty). */
  async pointTileDisplay(label: string): Promise<string> {
    const raw = await this.pointInput(label).inputValue();
    const cents = Number(raw.replace(/\D/g, '') || '0');
    if (cents === 0) return 'No points';
    return `1 Point = $${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  // ---------------------------------------------------------------------------
  // Save bar & toasts
  // ---------------------------------------------------------------------------

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async discardIfDirty(): Promise<void> {
    if (await this.saveBar.isVisible()) {
      await this.discardButton.click();
      await expect(this.saveBar).toBeHidden();
    }
  }

  toast(text: string | RegExp): Locator {
    return this.page.locator('[data-sonner-toast]').filter({ hasText: text });
  }

  /** Save and wait until the write has gone out and the bar has closed. */
  async saveAndWait(): Promise<void> {
    const before = this.sysSettingWrites().length;
    await this.save();
    await expect.poll(() => this.sysSettingWrites().length).toBeGreaterThan(before);
    await expect(this.saveBar).toBeHidden({ timeout: Timeouts.MEDIUM });
  }

  /**
   * Put the page in a known "stored" checkout state through mocked saves (requires
   * `mockSettingWrites()`): the overlaid refetch then serves it as the saved value, which is how
   * preconditions such as "Đã lưu Hybrid / bonus 7" are met without writing to DEV. A Manual
   * state with a given bonus takes two saves, since Manual always re-sends the stored bonus.
   * Clears the recorded writes and waits for the seed toasts to go away.
   */
  async seedStoredCheckout(type: CheckoutTypeValue, bonus: number): Promise<void> {
    const bonusType = type === CheckoutType.MANUAL ? CheckoutType.AUTO : type;
    await this.selectType(bonusType);
    await this.fillPointBonus(String(bonus));
    if (await this.saveBar.isVisible()) await this.saveAndWait();
    if (type === CheckoutType.MANUAL) {
      await this.selectType(CheckoutType.MANUAL);
      await this.saveAndWait();
    }
    this.writes.length = 0;
    await expect(this.page.locator('[data-sonner-toast]')).toHaveCount(0, {
      timeout: Timeouts.MEDIUM,
    });
  }

  /** Real (unmocked) save: wait for the `PUT /sys_settings/{id}` response and assert it succeeded. */
  async saveToBackend(): Promise<void> {
    const response = this.page.waitForResponse(
      (r) => r.request().method() === 'PUT' && SYS_SETTING_ITEM.test(r.url()),
      { timeout: Timeouts.API },
    );
    await this.save();
    expect((await response).ok(), 'PUT /sys_settings succeeded').toBe(true);
    await expect(this.saveBar).toBeHidden({ timeout: Timeouts.MEDIUM });
  }
}
