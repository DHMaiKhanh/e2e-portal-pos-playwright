import { test, expect } from '@fixtures/index';
import {
  CheckoutType,
  CheckoutTypeText,
  type CheckoutSettingPage,
} from '@pages/settings/CheckoutSettingPage';
import { OUT_DIR, SHOTS_DIR, annotate, log, scrollToTop, shot } from './_shared';
import {
  DEV_CARD_CROP,
  TEXT,
  checkFlag,
  cropOf,
  rect,
  sideBySide,
  vp,
  watchConsole,
} from './_vp5098';

/**
 * VP-5098 PROD #20258 — layout / UX of Checkout setting + Setting point config.
 * NO WRITES: `mockSettingWrites()` answers every POS-API non-GET with a fake 200; nothing is saved.
 */
const TYPES = [CheckoutType.MANUAL, CheckoutType.AUTO, CheckoutType.HYBRID] as const;
const NAME = {
  payment_method: 'manual',
  auto_checkout: 'auto',
  hybrid_checkout: 'hybrid',
} as const;

async function open(cs: CheckoutSettingPage): Promise<string[]> {
  const errors = watchConsole(cs.page);
  await cs.mockSettingWrites();
  await cs.goto();
  await cs.waitForReady();
  return errors;
}

test.describe('VP-5098 PROD #20258 — layout (mocked writes)', () => {
  test('TC00 — preflight: flag = original (read-only)', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await open(cs);
    const { equal, value } = await checkFlag(page, 'preflight-layout');
    expect(equal, `flag equals original — got ${JSON.stringify(value)}`).toBe(true);
    await expect(cs.radio(CheckoutType.MANUAL)).toBeChecked();
  });

  test('TC01 — Checkout setting card; Setting point config không còn là card riêng phía trên', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    const errors = await open(cs);
    const v = vp(cs);
    const cardTitles = await v.tabPanel
      .locator('[data-slot="settings-card-section-title"]')
      .allInnerTexts();
    log(`TC01 tab card titles (DOM order): ${JSON.stringify(cardTitles)}`);
    expect(cardTitles, 'a "Checkout setting" card exists').toContain(TEXT.checkoutTitle);
    expect(cardTitles, 'no standalone "Setting point config" card').not.toContain(TEXT.pointTitle);
    // The only "Setting point config" on the tab is the step inside the Checkout card.
    await expect(page.getByText(TEXT.pointTitle, { exact: true })).toHaveCount(1);
    await expect(v.pointStepTitle).toHaveText(TEXT.pointTitle);
    await expect(
      page.getByText('Point conversion', { exact: true }),
      'old "Point conversion" header gone',
    ).toHaveCount(0);
    // Checkout type (the checkout setting proper) sits above the point config.
    const type = await rect(v.typeStep);
    const point = await rect(v.pointStep);
    expect(type.bottom).toBeLessThanOrEqual(point.top);

    // Whole tab in one frame (taller viewport, then back).
    await page.setViewportSize({ width: 1920, height: 2450 });
    await page.waitForTimeout(500);
    await annotate(v.checkoutCard, 'Checkout setting (card)');
    await annotate(v.pointStep, 'Setting point config — step INSIDE Checkout setting', '#2563eb');
    await shot(
      page,
      'VP-5098_TC01_tab_full_layout',
      `TC01 · Payment & transactions tab — cards: ${cardTitles.join(' → ')} · no standalone "Setting point config" card`,
    );
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(300);

    await scrollToTop(v.checkoutCard);
    await annotate(v.checkoutCard, 'Checkout setting (card)');
    await annotate(v.typeStep, '1 · Checkout type', '#16a34a');
    await annotate(v.pointStep, '2 · Setting point config', '#2563eb');
    const crop01 = await cropOf(v.checkoutCard);
    const prod01 = await shot(
      page,
      'VP-5098_TC01b_checkout_above_point_config',
      'TC01 · Checkout type (Checkout setting) is ABOVE Setting point config — stored Manual',
    );
    await sideBySide(
      page,
      `${SHOTS_DIR}/VP-5098_TC01c_compare_expected_dev_vs_prod_manual.png`,
      {
        title:
          'EXPECTED — QC DEV 2026-10-26 (ticket comment, 01_manual_checkout_setting_tren_point_config)',
        img: `${OUT_DIR}/expected/qc_dev_01_manual.jpg`,
        crop: DEV_CARD_CROP,
      },
      { title: 'ACTUAL — PROD #20258, Manual (stored)', img: prod01, crop: crop01 },
      'TC01 · Manual: Checkout type (3 cards) → "Setting point config" step → tiles, all inside ONE "Checkout setting" card — same as expected. PROD additionally has step "Tip" (VP-4812, shipped later).',
    );
    expect(cs.writes).toHaveLength(0);
    log(`TC01 console errors: ${JSON.stringify(errors)}`);
  });

  test('TC02 — Setting point config là sub-section (tiêu đề + mô tả riêng) bên trong card Checkout setting', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await open(cs);
    const v = vp(cs);
    await expect(v.pointStepTitle).toHaveText(TEXT.pointTitle);
    await expect(v.pointStepDesc).toHaveText(TEXT.pointDesc);
    const inside = await v.checkoutCard.evaluate((card) => {
      const step = Array.from(card.querySelectorAll('[data-slot="settings-card-step"]')).find(
        (s) =>
          s.querySelector('[data-slot="settings-card-step-title"]')?.textContent?.trim() ===
          'Setting point config',
      );
      const sectionTitle = card
        .querySelector('[data-slot="settings-card-section-title"]')
        ?.textContent?.trim();
      return {
        found: !!step,
        sectionTitle,
        tag: step?.querySelector('[data-slot="settings-card-step-title"]')?.tagName,
      };
    });
    log(`TC02 inside card: ${JSON.stringify(inside)}`);
    expect(inside.found, 'step is a descendant of the Checkout setting card').toBe(true);
    expect(inside.sectionTitle).toBe(TEXT.checkoutTitle);
    expect(inside.tag, 'sub-section heading (h4 step title, not a card h3)').toBe('H4');
    const card = await rect(v.checkoutCard);
    const step = await rect(v.pointStep);
    expect(step.top).toBeGreaterThan(card.top);
    expect(step.bottom).toBeLessThan(card.bottom);
    await expect(v.tiles).toHaveCount(4);

    await scrollToTop(v.pointStep, 200);
    await annotate(v.checkoutCard, 'Checkout setting (card)');
    await annotate(v.pointStepTitle, 'own title', '#2563eb');
    await annotate(v.pointStepDesc, 'own description', '#2563eb');
    await shot(
      page,
      'VP-5098_TC02_point_config_subsection_inside_checkout_card',
      'TC02 · "Setting point config" = sub-section (own title + description) inside the Checkout setting card',
    );
  });

  test('TC03 — Setting point config nằm ngay dưới thẻ Hybrid Checkout, không nằm trong thẻ option nào', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await open(cs);
    const v = vp(cs);
    await cs.selectType(CheckoutType.HYBRID);
    await expect(cs.pointBonusInput).toBeVisible();
    // Hybrid is the last option card and the point config step comes right after the type step.
    await expect(cs.optionCards.last()).toContainText(CheckoutTypeText[CheckoutType.HYBRID].label);
    const hybrid = await rect(cs.card(CheckoutType.HYBRID));
    const point = await rect(v.pointStep);
    const gap = point.top - hybrid.bottom;
    log(`TC03 hybrid.bottom=${hybrid.bottom} point.top=${point.top} gap=${gap}`);
    expect(gap, 'point config starts just under the Hybrid card').toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(40);
    const dom = await v.typeStep.evaluate((typeStep) => {
      const next = typeStep.nextElementSibling;
      const tiles = Array.from(document.querySelectorAll('[data-slot="point-conversion-tile"]'));
      return {
        nextTitle: next
          ?.querySelector('[data-slot="settings-card-step-title"]')
          ?.textContent?.trim(),
        tiles: tiles.length,
        tilesInsideOptionCard: tiles.filter((t) => t.closest('[data-slot="merchant-option-card"]'))
          .length,
        tilesInsideRadioGroup: tiles.filter((t) => t.closest('[role="radiogroup"]')).length,
      };
    });
    log(`TC03 dom: ${JSON.stringify(dom)}`);
    expect(dom.nextTitle, 'next block after Checkout type = Setting point config').toBe(
      TEXT.pointTitle,
    );
    expect(dom.tiles).toBe(4);
    expect(dom.tilesInsideOptionCard, 'no tile inside an option card').toBe(0);
    expect(dom.tilesInsideRadioGroup).toBe(0);

    await scrollToTop(cs.checkoutTitle);
    await annotate(
      cs.card(CheckoutType.HYBRID),
      'Hybrid Checkout (selected, Point Bonus inside)',
      '#16a34a',
    );
    await annotate(
      v.pointStep,
      'Setting point config — right below Hybrid, outside option cards',
      '#2563eb',
    );
    const crop03 = await cropOf(v.checkoutCard);
    const prod = await shot(
      page,
      'VP-5098_TC03_point_config_right_below_hybrid',
      'TC03 · Hybrid selected (not saved, mocked) — Setting point config directly under the Hybrid card, not inside it',
    );
    await sideBySide(
      page,
      `${SHOTS_DIR}/VP-5098_TC03b_compare_expected_dev_vs_prod_hybrid.png`,
      {
        title: 'EXPECTED — QC DEV 2026-10-26 (ticket comment, 03_hybrid_point_config_ngay_duoi)',
        img: `${OUT_DIR}/expected/qc_dev_03_hybrid.jpg`,
        crop: DEV_CARD_CROP,
      },
      {
        title: 'ACTUAL — PROD #20258, Hybrid selected (mocked, not saved)',
        img: prod,
        crop: crop03,
      },
      'TC03 · same structure: Hybrid card (Point Bonus) → "Setting point config" title + description → 4 tiles (2×2)',
    );
    await cs.discardIfDirty();
    expect(cs.writes).toHaveLength(0);
  });

  for (const type of TYPES) {
    test(`TC04/TC05 — ${NAME[type]}: không còn khối Point Config read-only; Setting point config vẫn hiển thị`, async ({
      page,
      checkoutSettingPage: cs,
    }) => {
      await open(cs);
      const v = vp(cs);
      if (type !== CheckoutType.MANUAL) await cs.selectType(type);
      await expect(cs.radio(type)).toBeChecked();
      // TC04: old read-only box gone.
      await expect(cs.pointConfigBox, 'role=group "Point Config"').toHaveCount(0);
      await expect(cs.pointConfigNote, 'old note text').toHaveCount(0);
      await expect(
        cs.form.getByText('Point Config', { exact: true }),
        'old "Point Config" label',
      ).toHaveCount(0);
      await expect(
        cs.form.getByText(/^1 Point = \$/),
        'no read-only "1 Point = $x" rows',
      ).toHaveCount(0);
      // TC05: editable point config shown for every type.
      await expect(v.pointStep).toBeVisible();
      await expect(v.tiles).toHaveCount(4);
      for (const label of ['Cash', 'Card', 'Gift card', 'Other']) {
        await expect(v.tile(label)).toBeVisible();
        await expect(v.tile(label).getByRole('textbox')).toBeEditable();
        await expect(v.tile(label)).toContainText('1 Point =');
      }
      await expect(v.tiles.locator('label')).toHaveText(['Cash', 'Card', 'Gift card', 'Other']);
      const order = await v.tiles.locator('label').allInnerTexts();
      const bonusCount = await cs.pointBonusInput.count();
      log(`TC04/05 ${type}: tiles=${order.join(',')} bonusInputs=${bonusCount}`);

      await scrollToTop(cs.checkoutTitle);
      await annotate(
        cs.card(type),
        `${CheckoutTypeText[type].label} (selected${type === CheckoutType.MANUAL ? ', stored' : ', not saved'})`,
        '#16a34a',
      );
      await annotate(
        v.pointStep,
        'Setting point config (editable) — no read-only "Point Config" block',
        '#2563eb',
      );
      const crop04 = await cropOf(v.checkoutCard);
      const prod04 = await shot(
        page,
        `VP-5098_TC04_${NAME[type]}_no_readonly_point_config`,
        `TC04/TC05 · ${CheckoutTypeText[type].label}: no read-only "Point Config" list; editable Setting point config (4 tiles) shown`,
      );
      if (type === CheckoutType.HYBRID) {
        await sideBySide(
          page,
          `${SHOTS_DIR}/VP-5098_TC04d_compare_before_vs_prod_hybrid.png`,
          {
            title: 'BEFORE — ticket attachment "Store Settings – layout hiện tại" (bug)',
            img: `${OUT_DIR}/expected/ticket_before_layout.png`,
          },
          {
            title: 'PROD #20258 now — Hybrid selected (mocked, not saved)',
            img: prod04,
            crop: crop04,
          },
          'TC04 · before: separate "Setting point config" card on top + read-only "Point Config" under Hybrid → now: one card, editable step under Hybrid, read-only list removed',
        );
      }
      if (type === CheckoutType.AUTO) {
        await sideBySide(
          page,
          `${SHOTS_DIR}/VP-5098_TC05b_compare_expected_dev_vs_prod_auto.png`,
          {
            title: 'EXPECTED — QC DEV 2026-10-26 (ticket comment, 02_auto_checkout)',
            img: `${OUT_DIR}/expected/qc_dev_02_auto.jpg`,
            crop: DEV_CARD_CROP,
          },
          {
            title: 'ACTUAL — PROD #20258, Auto selected (mocked, not saved)',
            img: prod04,
            crop: crop04,
          },
          'TC05 · Auto: Point Bonus inside the Auto card; Setting point config still shown under the 3 cards (agreed in PR #886: shown for Manual / Auto / Hybrid)',
        );
      }
      await cs.discardIfDirty();
      expect(cs.writes).toHaveLength(0);
    });
  }

  test('TC06 — Point Bonus chỉ ở thẻ Auto/Hybrid đang chọn, text đúng, chuyển thẻ giữ giá trị', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await open(cs);
    const v = vp(cs);
    await expect(cs.pointBonusInput, 'Manual: no Point Bonus').toHaveCount(0);

    await cs.selectType(CheckoutType.AUTO);
    await expect(cs.pointBonusInput).toHaveCount(1);
    await expect(cs.card(CheckoutType.AUTO).getByLabel('Point Bonus')).toBeVisible();
    await expect(cs.card(CheckoutType.AUTO)).toContainText(
      CheckoutTypeText[CheckoutType.AUTO].bonusSuffix!,
    );
    await expect(cs.pointBonusInput, 'stored bonus 0').toHaveValue('0');
    await cs.fillPointBonus('10');
    await scrollToTop(cs.checkoutTitle);
    await annotate(
      cs.card(CheckoutType.AUTO),
      'Auto: Point Bonus inside the selected card',
      '#16a34a',
    );
    await annotate(v.pointStep, 'Setting point config still shown', '#2563eb');
    await shot(
      page,
      'VP-5098_TC06_auto_point_bonus_10',
      'TC06 · Auto selected, Point Bonus typed 10 (mocked, not saved) — "pts for each completed order, whatever the amount"',
    );

    await cs.selectType(CheckoutType.HYBRID);
    await expect(cs.pointBonusInput).toHaveCount(1);
    await expect(cs.card(CheckoutType.HYBRID).getByLabel('Point Bonus')).toHaveValue('10');
    await expect(cs.card(CheckoutType.AUTO).getByLabel('Point Bonus')).toHaveCount(0);
    await expect(cs.card(CheckoutType.HYBRID)).toContainText(
      CheckoutTypeText[CheckoutType.HYBRID].bonusSuffix!,
    );
    await annotate(cs.card(CheckoutType.HYBRID), 'Hybrid: Point Bonus kept = 10', '#16a34a');
    await shot(
      page,
      'VP-5098_TC06b_hybrid_point_bonus_kept_10',
      'TC06 · Auto → Hybrid keeps Point Bonus 10 — "pts for each check-in checked out automatically at 11:59 PM"',
    );

    await cs.selectType(CheckoutType.MANUAL);
    await expect(cs.pointBonusInput).toHaveCount(0);
    await cs.selectType(CheckoutType.AUTO);
    await expect(cs.pointBonusInput).toHaveValue('10');
    await cs.discardIfDirty();
    await expect(cs.radio(CheckoutType.MANUAL)).toBeChecked();
    expect(cs.writes).toHaveLength(0);
  });

  test('TC14 — text các khối khớp spec (Checkout setting / 3 thẻ / Setting point config / Tip)', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await open(cs);
    const v = vp(cs);
    await expect(cs.checkoutTitle).toBeVisible();
    await expect(
      cs.form.locator('[data-slot="settings-card-section-description"]').first(),
    ).toHaveText(TEXT.checkoutDesc);
    await expect(v.typeStep.locator('[data-slot="settings-card-step-title"]')).toHaveText(
      TEXT.typeStep,
    );
    for (const [i, type] of TYPES.entries()) {
      await expect(cs.optionCards.nth(i)).toContainText(CheckoutTypeText[type].label);
      await expect(cs.optionCards.nth(i)).toContainText(CheckoutTypeText[type].description);
    }
    await expect(v.pointStepTitle).toHaveText(TEXT.pointTitle);
    await expect(v.pointStepDesc).toHaveText(TEXT.pointDesc);
    const stepTitles = await cs.form
      .locator('[data-slot="settings-card-step-title"]')
      .allInnerTexts();
    log(`TC14 step titles in Checkout card: ${JSON.stringify(stepTitles)}`);
    expect(stepTitles.slice(0, 2)).toEqual([TEXT.typeStep, TEXT.pointTitle]);
    const tiles: string[] = [];
    for (const label of ['Cash', 'Card', 'Gift card', 'Other']) {
      const val = await v.tile(label).getByRole('textbox').inputValue();
      const pill = val === '$0.00' ? 'No points' : 'Earning';
      await expect(v.pill(label)).toHaveText(pill);
      tiles.push(`${label}=${val}/${pill}`);
    }
    log(`TC14 tiles (stored): ${tiles.join(' · ')}`);
    await scrollToTop(cs.checkoutTitle);
    await annotate(cs.checkoutTitle, 'title', '#16a34a');
    await annotate(v.pointStepTitle, 'step title', '#2563eb');
    await shot(
      page,
      'VP-5098_TC14_texts_checkout_card',
      `TC14 · texts as spec · stored rates: ${tiles.join(' · ')}`,
    );
  });
});
