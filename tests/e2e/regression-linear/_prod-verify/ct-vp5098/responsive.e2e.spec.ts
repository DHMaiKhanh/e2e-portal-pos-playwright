import { test, expect } from '@fixtures/index';
import { CheckoutType, type CheckoutSettingPage } from '@pages/settings/CheckoutSettingPage';
import { annotate, log, scrollToTop, shot } from './_shared';
import { checkFlag, rect, vp, watchConsole } from './_vp5098';

/** VP-5098 PROD #20258 — responsive layout + console errors. NO WRITES (mocked). */
async function open(cs: CheckoutSettingPage): Promise<ReturnType<typeof watchConsole>> {
  const errors = watchConsole(cs.page);
  await cs.mockSettingWrites();
  await cs.goto();
  await cs.waitForReady();
  return errors;
}

const WIDTHS = [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1280, h: 800 },
  { w: 390, h: 844 },
] as const;

test.describe('VP-5098 PROD #20258 — responsive & console (mocked writes)', () => {
  for (const { w, h } of WIDTHS) {
    test(`TC15 — ${w}x${h}: thứ tự giữ nguyên, tile không tràn, không scroll ngang`, async ({
      page,
      checkoutSettingPage: cs,
    }) => {
      await page.setViewportSize({ width: w, height: h });
      const errors = await open(cs);
      const v = vp(cs);
      await cs.selectType(CheckoutType.HYBRID);
      await expect(v.pointStep).toBeVisible();
      const card = await rect(v.checkoutCard);
      const hybrid = await rect(cs.card(CheckoutType.HYBRID));
      const point = await rect(v.pointStep);
      const tiles = await v.tiles.evaluateAll((ts) =>
        ts.map((t) => {
          const r = t.getBoundingClientRect();
          return {
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            right: Math.round(r.right),
          };
        }),
      );
      const overflow = await page.evaluate(() => {
        const content = document.getElementById('pos-main');
        const over = Array.from(
          document.querySelectorAll(
            '[data-slot="point-conversion-tile"] *, [data-slot="merchant-option-card"] *',
          ),
        )
          .filter((e) => {
            const el = e as HTMLElement;
            return (
              el.scrollWidth > el.clientWidth + 1 &&
              getComputedStyle(el).overflowX !== 'visible' &&
              el.tagName !== 'INPUT'
            );
          })
          .map((e) => `${e.tagName}.${(e as HTMLElement).dataset.slot ?? ''}`);
        return {
          doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          main: content ? content.scrollWidth - content.clientWidth : null,
          clipped: over.slice(0, 5),
        };
      });
      const cols = new Set(tiles.map((t) => t.x)).size;
      log(
        `TC15 ${w}x${h}: card=${JSON.stringify(card)} hybridBottom=${hybrid.bottom} pointTop=${point.top} tiles=${JSON.stringify(tiles)} cols=${cols} overflow=${JSON.stringify(overflow)} console=${JSON.stringify(errors)} http=${JSON.stringify(errors.http)}`,
      );
      expect(overflow.doc, 'no horizontal page scroll').toBeLessThanOrEqual(0);
      expect(overflow.main ?? 0, 'no horizontal scroll in content').toBeLessThanOrEqual(0);
      expect(point.top, 'point config still under Hybrid').toBeGreaterThanOrEqual(hybrid.bottom);
      expect(point.top - hybrid.bottom).toBeLessThan(40);
      for (const t of tiles) {
        expect(t.x, 'tile inside card (left)').toBeGreaterThanOrEqual(card.left);
        expect(t.right, 'tile inside card (right)').toBeLessThanOrEqual(card.right + 1);
      }
      await scrollToTop(cs.checkoutTitle, 20);
      await annotate(cs.card(CheckoutType.HYBRID), 'Hybrid', '#16a34a');
      await annotate(v.pointStep, 'Setting point config', '#2563eb');
      await shot(
        page,
        `VP-5098_TC15_responsive_${w}`,
        `TC15 · ${w}×${h} · Hybrid (mocked) · tiles ${cols} col · no horizontal scroll`,
      );
      if (w <= 1366) {
        // Second frame: the tiles themselves.
        await scrollToTop(v.pointStep, 20);
        await annotate(v.pointStep, 'Setting point config', '#2563eb');
        await shot(
          page,
          `VP-5098_TC15b_responsive_${w}_tiles`,
          `TC15 · ${w}×${h} · Setting point config tiles (${cols} col)`,
        );
      }
      expect(
        errors.appErrors(),
        `no console errors (raw: ${JSON.stringify(errors)} · http: ${JSON.stringify(errors.http)})`,
      ).toEqual([]);
      expect(cs.writes).toHaveLength(0);
    });
  }

  test('TC16 — không có console error khi load + chuyển 3 type + sửa rate + Discard', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    const errors = await open(cs);
    for (const t of [
      CheckoutType.AUTO,
      CheckoutType.HYBRID,
      CheckoutType.MANUAL,
      CheckoutType.HYBRID,
    ]) {
      await cs.selectType(t);
      await page.waitForTimeout(250);
    }
    await cs.setPointRate('Cash', 0);
    await cs.discardIfDirty();
    await page.waitForTimeout(800);
    const app = errors.appErrors();
    log(
      `TC16 console/page errors raw=${JSON.stringify(errors)} http=${JSON.stringify(errors.http)} app=${JSON.stringify(app)}`,
    );
    await scrollToTop(cs.checkoutTitle);
    const authNote =
      errors.length - app.length
        ? ` (+${errors.length - app.length} expected 401 on sessions/current = stored-token refresh)`
        : '';
    await shot(
      page,
      'VP-5098_TC16_no_console_errors',
      `TC16 · load + switch Auto/Hybrid/Manual/Hybrid + edit + Discard → page console errors: ${app.length}${authNote}`,
    );
    expect(app).toEqual([]);
    expect(cs.writes).toHaveLength(0);
  });

  test('TC99 — final: flag vẫn = original (read-only, API + reload)', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await open(cs);
    const { equal, value } = await checkFlag(page, 'final');
    expect(equal, `flag equals original — got ${JSON.stringify(value)}`).toBe(true);
    await page.reload();
    await cs.waitForReady();
    await expect(cs.radio(CheckoutType.MANUAL)).toBeChecked();
    await expect(cs.pointInput('Cash')).toHaveValue('$0.50');
    await expect(cs.pointInput('Card')).toHaveValue('$0.01');
    await expect(cs.pointInput('Gift card')).toHaveValue('$2.00');
    await expect(cs.pointInput('Other')).toHaveValue('$1.00');
    await expect(cs.earnOnTipSwitch).toHaveAttribute('aria-checked', 'true');
    await scrollToTop(cs.checkoutTitle);
    await shot(
      page,
      'VP-5098_TC99_final_flag_unchanged',
      'Final · flag unchanged: Manual · bonus 0 · Cash $0.50 / Card $0.01 / Gift card $2.00 / Other $1.00 · Earn on tip ON',
    );
  });
});
