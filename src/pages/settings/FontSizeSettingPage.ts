import { type Locator, type Page, type Route, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * Font size card — Store Settings › Configuration (VP-4809).
 *
 * Scanned on DEV 2026-11-02 (store #14): card "Font size" ("Text size on every POS terminal of
 * this merchant.") holds `radiogroup "Font size"` with Small / Medium / Large option cards
 * (`#font-size-<value>`). Picking an option saves straight away — no "Unsaved changes" bar — with
 * `PUT /sys_settings/<id> {"value":{"font_size":"<value>"}}` on flag `merchant_theme_pos_style`
 * (default `medium`). A failed save puts the previous option back.
 *
 * Safety: specs call `mockWrites()` before `goto()`. Writes to the data host are answered with a
 * fake 200 (or `failWrites` status) and recorded; the flag GETs are overlaid with the last
 * written value, so a reload shows what was "saved" while DEV is never written.
 */

export const FONT_SIZE_FLAG = 'merchant_theme_pos_style';
export const FontSizes = ['small', 'medium', 'large'] as const;
export type FontSize = (typeof FontSizes)[number];

export const FontSizeText: Record<FontSize, { label: string; description: string }> = {
  small: { label: 'Small', description: 'Fits more on each screen.' },
  medium: { label: 'Medium', description: 'The standard POS text size.' },
  large: { label: 'Large', description: 'Easier to read from a distance.' },
};

export interface FontSizeWrite {
  url: string;
  body: { value?: { font_size?: string } } | null;
}

const SYS_SETTING_ITEM = /\/sys_settings\/[^/?.]+/;
const SYS_SETTINGS_ANY = /\/sys_settings(\/|\?|$)/;

export class FontSizeSettingPage extends BasePage {
  protected readonly path = `${Urls.SETTINGS}?tab=configuration`;

  readonly card: Locator;
  readonly cardTitle: Locator;
  readonly description: Locator;
  readonly group: Locator;

  readonly writes: FontSizeWrite[] = [];
  private lastWritten: FontSize | null = null;
  private failWritesWith: number | null = null;

  constructor(page: Page) {
    super(page);
    this.group = page.getByRole('radiogroup', { name: 'Font size' });
    this.card = page.locator('[data-slot="settings-card"]').filter({ has: this.group });
    this.cardTitle = this.card.locator('[data-slot="settings-card-section-title"]');
    this.description = this.card.locator('[data-slot="settings-card-section-description"]');
  }

  async waitForReady(): Promise<void> {
    await expect(this.group).toBeVisible({ timeout: Timeouts.LONG });
    await expect(this.checkedRadio).toHaveCount(1, { timeout: Timeouts.MEDIUM });
  }

  radio(size: FontSize): Locator {
    return this.group.locator(`[id="font-size-${size}"]`);
  }

  option(size: FontSize): Locator {
    return this.group
      .locator('[data-slot="merchant-option-card"]')
      .filter({ has: this.page.locator(`[id="font-size-${size}"]`) });
  }

  get checkedRadio(): Locator {
    return this.group.locator('[role="radio"][aria-checked="true"]');
  }

  async selected(): Promise<FontSize> {
    return (await this.checkedRadio.getAttribute('value')) as FontSize;
  }

  /** Click an option and wait for its (mocked) save to go out. */
  async choose(size: FontSize): Promise<void> {
    const before = this.writes.length;
    await this.radio(size).click();
    await expect
      .poll(() => this.writes.length, { timeout: Timeouts.MEDIUM })
      .toBeGreaterThan(before);
  }

  toast(text: string | RegExp): Locator {
    return this.page.locator('[data-sonner-toast]').filter({ hasText: text });
  }

  failWrites(status: number): void {
    this.failWritesWith = status;
  }

  async mockWrites(): Promise<FontSizeWrite[]> {
    await this.page.route(/\/\/volt-pos\./, async (route: Route) => {
      const req = route.request();
      const method = req.method().toUpperCase();
      const url = req.url();
      if (method === 'GET' && SYS_SETTINGS_ANY.test(url) && this.lastWritten) {
        await this.fulfillWithWritten(route);
        return;
      }
      if (['GET', 'HEAD', 'OPTIONS'].includes(method) || /\/refresh_token(\?|$)/.test(url)) {
        await route.fallback();
        return;
      }
      let body: FontSizeWrite['body'] = null;
      try {
        body = req.postDataJSON() as FontSizeWrite['body'];
      } catch {
        // not JSON
      }
      this.writes.push({ url, body });
      if (this.failWritesWith) {
        await route.fulfill({ status: this.failWritesWith, json: { message: 'Mocked failure' } });
        return;
      }
      const size = body?.value?.font_size;
      if (SYS_SETTING_ITEM.test(url) && size) this.lastWritten = size as FontSize;
      await route.fulfill({ status: 200, json: { ...(body ?? {}) } });
    });
    return this.writes;
  }

  private async fulfillWithWritten(route: Route): Promise<void> {
    const response = await route.fetch();
    const json = (await response.json().catch(() => null)) as unknown;
    if (!json) {
      await route.fulfill({ response });
      return;
    }
    const patch = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(patch);
      if (!node || typeof node !== 'object') return;
      const obj = node as Record<string, unknown>;
      if (obj.key === FONT_SIZE_FLAG && 'value' in obj) {
        obj.value = { ...(obj.value as object), font_size: this.lastWritten };
        return;
      }
      Object.values(obj).forEach(patch);
    };
    patch(json);
    await route.fulfill({ response, json });
  }
}
