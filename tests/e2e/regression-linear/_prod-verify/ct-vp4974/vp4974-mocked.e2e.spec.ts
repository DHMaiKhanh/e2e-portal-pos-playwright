import { test, expect } from '@fixtures/index';
import {
  CheckoutMessages,
  CheckoutType,
  CheckoutTypeText,
  type CheckoutSettingPage,
  type CheckoutTypeValue,
  type PointPaymentConfigValue,
} from '@pages/settings/CheckoutSettingPage';
import {
  canon,
  focusCard,
  expectUiShows,
  isOriginal,
  lockHeld,
  panel,
  readFlag,
  record,
  saveBarText,
  shot,
} from './_shared';

/**
 * VP-4974 — PROD #20258, NO REAL WRITES: every non-GET to the POS API is answered by
 * `mockSettingWrites()` (fake 200 + recorded) and the post-save refetch is overlaid with the written
 * value, so prod data never changes here. The real round trip lives in vp4974-real.e2e.spec.ts.
 *
 * Bug: draft Point Bonus typed on Auto/Hybrid (invalid or valid) → Manual → Save → the form kept
 * the draft (Auto/Hybrid showed it again with its error + "1 unsaved change") instead of resetting
 * to the saved value; toast said "Point settings saved" instead of "Checkout setting saved.".
 */
const { MANUAL, AUTO, HYBRID } = CheckoutType;
const name = (t: CheckoutTypeValue) => CheckoutTypeText[t].label.replace(' Checkout', '');
const other = (t: CheckoutTypeValue) => (t === AUTO ? HYBRID : AUTO);

/** Page with mocked writes on the stored ORIGINAL flag (waits out a parallel agent's real write). */
async function openOnOriginal(cs: CheckoutSettingPage): Promise<PointPaymentConfigValue> {
  await cs.mockSettingWrites();
  for (let i = 0; i < 12; i++) {
    if (i === 0) await cs.goto();
    else await cs.page.reload({ waitUntil: 'domcontentloaded' }).then(() => cs.waitForReady());
    const flag = (await readFlag(cs.page)).value;
    if (isOriginal(flag)) {
      await expectUiShows(cs, flag);
      return flag;
    }
    console.log(`flag != original (lock dir exists: ${lockHeld()}) → retry in 15s`, canon(flag));
    await cs.page.waitForTimeout(15_000);
  }
  throw new Error('merchant_point_payment_config never matched the original value');
}

/** Visible field-error text under Point Bonus ('' when none). */
async function bonusErrorText(cs: CheckoutSettingPage): Promise<string> {
  const err = cs.typeGroup.getByText(/^Point bonus /);
  return (await err.count()) ? (await err.first().innerText()).trim() : '';
}

/** Opening `type` shows the saved bonus, no error, the field not invalid. */
async function expectSavedBonus(
  cs: CheckoutSettingPage,
  type: CheckoutTypeValue,
  saved: string,
): Promise<void> {
  await cs.selectType(type);
  await expect(cs.pointBonusInput).toBeVisible();
  await expect(
    cs.pointBonusInput,
    `${name(type)} shows the SAVED bonus, not the draft`,
  ).toHaveValue(saved);
  await expect(cs.pointBonusInput).not.toHaveAttribute('aria-invalid', 'true');
  await expect(cs.typeGroup.getByText(/^Point bonus /)).toHaveCount(0);
}

interface DraftCase {
  id: string;
  slug: string;
  label: string;
  draft: string;
  typeIn: CheckoutTypeValue;
  error: string | null;
}

const DRAFTS: DraftCase[] = [
  {
    id: 'TC02',
    slug: 'abc',
    label: 'chữ "abc" (đúng repro ticket)',
    draft: 'abc',
    typeIn: AUTO,
    error: CheckoutMessages.BONUS_WHOLE_NUMBER,
  },
  {
    id: 'TC03',
    slug: 'abc_on_hybrid',
    label: '"abc" nhập ở Hybrid',
    draft: 'abc',
    typeIn: HYBRID,
    error: CheckoutMessages.BONUS_WHOLE_NUMBER,
  },
  {
    id: 'TC04',
    slug: 'empty',
    label: 'để trống',
    draft: '',
    typeIn: AUTO,
    error: CheckoutMessages.BONUS_REQUIRED,
  },
  {
    id: 'TC05',
    slug: 'negative',
    label: 'số âm "-5"',
    draft: '-5',
    typeIn: AUTO,
    error: CheckoutMessages.BONUS_WHOLE_NUMBER,
  },
  {
    id: 'TC06',
    slug: 'decimal',
    label: 'số thập phân "1.5"',
    draft: '1.5',
    typeIn: HYBRID,
    error: CheckoutMessages.BONUS_WHOLE_NUMBER,
  },
  {
    id: 'TC07',
    slug: 'decimal_comma',
    label: 'số thập phân "1,5"',
    draft: '1,5',
    typeIn: AUTO,
    error: CheckoutMessages.BONUS_WHOLE_NUMBER,
  },
  {
    id: 'TC08',
    slug: 'huge',
    label: 'số quá lớn "99999999999"',
    draft: '99999999999',
    typeIn: AUTO,
    error: CheckoutMessages.BONUS_MAX,
  },
  {
    id: 'TC09',
    slug: 'exp_1e2',
    label: 'ký tự lạ "1e2"',
    draft: '1e2',
    typeIn: HYBRID,
    error: 'invalid',
  },
  {
    id: 'TC10',
    slug: 'plus_5',
    label: 'ký tự lạ "+5"',
    draft: '+5',
    typeIn: AUTO,
    error: 'invalid',
  },
  {
    id: 'TC11',
    slug: 'symbols',
    label: 'ký tự lạ "5@#"',
    draft: '5@#',
    typeIn: AUTO,
    error: 'invalid',
  },
  {
    id: 'TC12',
    slug: 'valid_5',
    label: 'giá trị HỢP LỆ "5" (biến thể ticket)',
    draft: '5',
    typeIn: AUTO,
    error: null,
  },
  {
    id: 'TC13',
    slug: 'valid_999999',
    label: 'giá trị hợp lệ lớn "999999"',
    draft: '999999',
    typeIn: HYBRID,
    error: null,
  },
];

test.describe('VP-4974 PROD #20258 — draft Point Bonus reset after Manual save (mocked writes)', () => {
  test.setTimeout(150_000);

  test('TC01 — baseline: lưu Manual · Point Bonus 0 (API = UI); Auto/Hybrid hiện 0', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    const stored = await openOnOriginal(cs);
    const flag = await readFlag(page);
    await focusCard(cs);
    await expect(cs.pointBonusInput).toHaveCount(0);
    await expect(cs.saveBar).toBeHidden();
    await panel(
      page,
      `GET /sys_settings?key=merchant_point_payment_config (updatedAt ${flag.updatedAt})`,
      JSON.stringify(stored, null, 1),
    );
    await shot(
      page,
      'VP-4974_TC01_baseline_manual_bonus0_api',
      'baseline: stored Manual · point_bonus 0 (API panel = UI)',
    );
    await panel(page, null);
    for (const t of [AUTO, HYBRID]) {
      await expectSavedBonus(cs, t, String(stored.point_bonus));
      await shot(
        page,
        `VP-4974_TC01_baseline_open_${name(t).toLowerCase()}_shows_0`,
        `baseline: open ${name(t)} → Point Bonus = stored 0`,
      );
    }
    await cs.discardIfDirty();
    await expect(cs.radio(MANUAL)).toBeChecked();
    expect(cs.writes, 'no write').toHaveLength(0);
    record({ tc: 'TC01', stored, updatedAt: flag.updatedAt });
  });

  for (const c of DRAFTS) {
    test(`${c.id} — draft ${c.label} ở ${name(c.typeIn)} → Manual → Save → Auto/Hybrid hiện giá trị đã lưu`, async ({
      page,
      checkoutSettingPage: cs,
    }) => {
      const stored = await openOnOriginal(cs);
      const saved = String(stored.point_bonus);
      const reopen = other(c.typeIn);
      const pfx = `VP-4974_${c.id}`;

      // 1. Draft value on Auto/Hybrid.
      await cs.selectType(c.typeIn);
      await expect(cs.pointBonusInput).toHaveValue(saved);
      await cs.fillPointBonus(c.draft);
      await expect(cs.pointBonusInput).toHaveValue(c.draft);
      const err = await bonusErrorText(cs);
      if (c.error === null) {
        await expect(cs.pointBonusInput).not.toHaveAttribute('aria-invalid', 'true');
        expect(err, 'valid draft → no error').toBe('');
      } else {
        await expect(cs.pointBonusInput).toHaveAttribute('aria-invalid', 'true');
        if (c.error !== 'invalid') await expect(cs.bonusError(c.error)).toBeVisible();
        else expect(err, 'some field error').not.toBe('');
      }
      const barDraft = await saveBarText(cs);
      await focusCard(cs);
      await shot(
        page,
        `${pfx}_1_draft_${c.slug}_typed`,
        `${name(c.typeIn)} · draft "${c.draft}" typed → ${err ? `error "${err}"` : 'no error (valid draft)'} · bar "${barDraft}"`,
      );

      // 2. Back to Manual (bonus field hidden, form dirty).
      await cs.selectType(MANUAL);
      await expect(cs.pointBonusInput).toHaveCount(0);
      await expect(cs.saveBar).toBeVisible();
      const barManual = await saveBarText(cs);
      await shot(
        page,
        `${pfx}_2_switched_manual_savebar`,
        `switched back to Manual (draft "${c.draft}" hidden) · bar "${barManual}"`,
      );

      // 3. Save → one PUT carrying exactly the stored value; checkout toast.
      await cs.saveAndWait();
      const sent = cs.lastWrittenConfig();
      expect(cs.sysSettingWrites(), 'exactly one PUT').toHaveLength(1);
      expect(canon(sent), 'PUT body = stored value (Manual · bonus 0 · rates · earn_on_tip)').toBe(
        canon(stored),
      );
      await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toBeVisible();
      await expect(cs.toast(CheckoutMessages.SAVED_POINT)).toHaveCount(0);
      const toasts = (await page.locator('[data-sonner-toast]').allInnerTexts()).map((t) =>
        t.trim(),
      );
      await expect(cs.saveBar).toBeHidden();
      await expect(cs.radio(MANUAL)).toBeChecked();
      await shot(
        page,
        `${pfx}_3_saved_toast`,
        `Save (mocked) → toast "${toasts.join(' | ')}" · PUT selected_type=${sent.selected_type} point_bonus=${sent.point_bonus} · bar hidden`,
      );

      // 4. Re-open Auto/Hybrid → the SAVED value, not the draft.
      await expectSavedBonus(cs, reopen, saved);
      const barReopen = await saveBarText(cs);
      expect(barReopen, 'only the type change is unsaved (no stale bonus draft)').not.toMatch(
        /\b2 unsaved/,
      );
      await shot(
        page,
        `${pfx}_4_reopen_${name(reopen).toLowerCase()}_shows_saved`,
        `after Save → open ${name(reopen)}: Point Bonus = "${saved}" (saved), not "${c.draft}" · no error · bar "${barReopen}"`,
      );
      await expectSavedBonus(cs, c.typeIn, saved);
      await shot(
        page,
        `${pfx}_4b_reopen_${name(c.typeIn).toLowerCase()}_shows_saved`,
        `after Save → open ${name(c.typeIn)} (where the draft was typed): Point Bonus = "${saved}"`,
      );

      // 5. Discard the type change → back to the saved Manual, bar gone. (The bar itself is sticky
      //    by design — TanStack isDirty is persistent: Manual → Auto → Manual keeps "1 unsaved
      //    change" even with no save at all, see probe-dirty — so Discard is the clean way back.)
      await cs.discardIfDirty();
      await expect(cs.radio(MANUAL)).toBeChecked();
      await expect(cs.saveBar).toBeHidden({ timeout: 5_000 });
      await focusCard(cs);
      await shot(
        page,
        `${pfx}_5_discard_back_manual_no_unsaved`,
        'Discard → saved Manual again · no "unsaved change" bar',
      );

      // 6. Reload → still Manual, bonus = saved.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await cs.waitForReady();
      await expectUiShows(cs, stored);
      await expectSavedBonus(cs, reopen, saved);
      await focusCard(cs);
      await shot(
        page,
        `${pfx}_6_after_reload_${name(reopen).toLowerCase()}_shows_saved`,
        `after reload: Manual stored · open ${name(reopen)} → Point Bonus = "${saved}"`,
      );
      await cs.discardIfDirty();

      // 7. Bug symptom "Save bị chặn bởi lỗi validation": now Save from the re-opened card goes out
      //    (mocked) with the SAVED bonus.
      await cs.selectType(reopen);
      await expect(cs.pointBonusInput).toHaveValue(saved);
      await cs.saveAndWait();
      const sent2 = cs.lastWrittenConfig();
      expect(sent2.selected_type).toBe(reopen);
      expect(sent2.point_bonus, 'Save not blocked, carries the saved bonus').toBe(
        stored.point_bonus,
      );
      await focusCard(cs);
      await shot(
        page,
        `${pfx}_7_save_from_${name(reopen).toLowerCase()}_not_blocked`,
        `Save from ${name(reopen)} (mocked) NOT blocked → PUT selected_type=${sent2.selected_type} point_bonus=${sent2.point_bonus}`,
      );

      // Real flag untouched (mocked run).
      const api = (await readFlag(page)).value;
      expect(isOriginal(api) || lockHeld(), 'real flag still original').toBe(true);
      record({
        tc: c.id,
        draft: c.draft,
        typeIn: c.typeIn,
        error: err,
        barDraft,
        barManual,
        toasts,
        sent,
        barReopen,
        sent2,
        apiAfter: api,
      });
    });
  }

  test('TC14 — Save bị chặn khi draft "abc" ở Auto (không PUT) → chọn Manual → Save → Hybrid hiện 0', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    const stored = await openOnOriginal(cs);
    const saved = String(stored.point_bonus);
    await cs.selectType(AUTO);
    await cs.fillPointBonus('abc');
    await cs.save();
    await page.waitForTimeout(1_200);
    expect(cs.sysSettingWrites(), 'invalid Auto save blocked → no PUT').toHaveLength(0);
    await expect(cs.bonusError(CheckoutMessages.BONUS_WHOLE_NUMBER)).toBeVisible();
    await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toHaveCount(0);
    await focusCard(cs);
    await shot(
      page,
      'VP-4974_TC14_1_auto_abc_save_blocked',
      'Auto · "abc" · Save clicked → blocked, error shown, 0 PUT',
    );

    await cs.selectType(MANUAL);
    await cs.saveAndWait();
    expect(canon(cs.lastWrittenConfig())).toBe(canon(stored));
    await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toBeVisible();
    await shot(
      page,
      'VP-4974_TC14_2_manual_saved_toast',
      'then Manual → Save (mocked) → "Checkout setting saved."',
    );
    await expectSavedBonus(cs, HYBRID, saved);
    await shot(
      page,
      'VP-4974_TC14_3_reopen_hybrid_shows_saved',
      `open Hybrid → Point Bonus = "${saved}", no "abc", no error`,
    );
    await cs.discardIfDirty();
    await expect(cs.radio(MANUAL)).toBeChecked();
  });

  test('TC15 — lặp 2 vòng: "abc" → Save Manual → "-3" → Save Manual → vẫn hiện giá trị đã lưu', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    const stored = await openOnOriginal(cs);
    const saved = String(stored.point_bonus);
    for (const [i, draft] of ['abc', '-3'].entries()) {
      await cs.selectType(i ? HYBRID : AUTO);
      await expect(cs.pointBonusInput).toHaveValue(saved);
      await cs.fillPointBonus(draft);
      await cs.selectType(MANUAL);
      await cs.saveAndWait();
      expect(canon(cs.lastWrittenConfig())).toBe(canon(stored));
      await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT).first()).toBeVisible();
      await expectSavedBonus(cs, i ? AUTO : HYBRID, saved);
      await focusCard(cs);
      await shot(
        page,
        `VP-4974_TC15_round${i + 1}_reopen_shows_saved`,
        `round ${i + 1}: draft "${draft}" → Manual → Save → reopen: Point Bonus = "${saved}"`,
      );
      await cs.discardIfDirty();
      await expect(cs.radio(MANUAL)).toBeChecked();
    }
    expect(cs.sysSettingWrites()).toHaveLength(2);
  });

  test('TC16 — đúng precondition ticket: đã lưu Manual · bonus 8 (mock) → "abc" / "5" → Save Manual → Hybrid hiện 8', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await openOnOriginal(cs);
    await cs.seedStoredCheckout(MANUAL, 8); // mocked saves; refetch overlay serves Manual · 8
    await page.reload({ waitUntil: 'domcontentloaded' });
    await cs.waitForReady();
    await expect(cs.radio(MANUAL)).toBeChecked();
    for (const draft of ['abc', '5']) {
      cs.writes.length = 0;
      await cs.selectType(AUTO);
      await expect(cs.pointBonusInput).toHaveValue('8');
      await cs.fillPointBonus(draft);
      await focusCard(cs);
      await shot(
        page,
        `VP-4974_TC16_${draft}_1_draft_typed`,
        `mock-stored Manual · 8 → Auto · draft "${draft}"`,
      );
      await cs.selectType(MANUAL);
      await cs.saveAndWait();
      const sent = cs.lastWrittenConfig();
      expect(sent.selected_type).toBe(MANUAL);
      expect(sent.point_bonus, 'Manual save keeps stored bonus 8').toBe(8);
      await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT).first()).toBeVisible();
      await expect(cs.toast(CheckoutMessages.SAVED_POINT)).toHaveCount(0);
      await shot(
        page,
        `VP-4974_TC16_${draft}_2_saved_toast`,
        `Manual → Save (mocked) → PUT point_bonus=${sent.point_bonus} · "Checkout setting saved."`,
      );
      await expectSavedBonus(cs, HYBRID, '8');
      await shot(
        page,
        `VP-4974_TC16_${draft}_3_reopen_hybrid_shows_8`,
        `open Hybrid → Point Bonus = "8" (saved), not "${draft}"`,
      );
      await cs.discardIfDirty();
      await expect(cs.radio(MANUAL)).toBeChecked();
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await cs.waitForReady();
    await expectSavedBonus(cs, HYBRID, '8');
    await focusCard(cs);
    await shot(
      page,
      'VP-4974_TC16_4_after_reload_hybrid_shows_8',
      'after reload (mock-stored Manual · 8) → open Hybrid → "8"',
    );
    await cs.discardIfDirty();
  });

  test('TC17 — baseline QC: đã lưu Hybrid · bonus 10 (mock) → Auto "abc" → Manual → Save → Auto hiện 10', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await openOnOriginal(cs);
    await cs.seedStoredCheckout(HYBRID, 10);
    await expect(cs.radio(HYBRID)).toBeChecked();
    await expect(cs.pointBonusInput).toHaveValue('10');
    await cs.selectType(AUTO);
    await cs.fillPointBonus('abc');
    await expect(cs.bonusError(CheckoutMessages.BONUS_WHOLE_NUMBER)).toBeVisible();
    await focusCard(cs);
    await shot(
      page,
      'VP-4974_TC17_1_auto_abc_error',
      'mock-stored Hybrid · 10 → Auto · "abc" → error',
    );
    await cs.selectType(MANUAL);
    await cs.saveAndWait();
    const sent = cs.lastWrittenConfig();
    expect(sent.selected_type).toBe(MANUAL);
    expect(sent.point_bonus).toBe(10);
    await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT).first()).toBeVisible();
    await shot(
      page,
      'VP-4974_TC17_2_manual_saved_toast',
      `Manual → Save (mocked) → PUT payment_method · point_bonus=${sent.point_bonus}`,
    );
    await expectSavedBonus(cs, AUTO, '10');
    await shot(
      page,
      'VP-4974_TC17_3_reopen_auto_shows_10',
      'open Auto → Point Bonus = "10" (saved), no "abc", no error',
    );
    await expectSavedBonus(cs, HYBRID, '10');
    await cs.discardIfDirty();
    await expect(cs.radio(MANUAL)).toBeChecked();
  });

  test('TC18 — Discard sau draft "abc" → về Manual · 0, không ghi', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    const stored = await openOnOriginal(cs);
    await cs.selectType(AUTO);
    await cs.fillPointBonus('abc');
    await cs.discardIfDirty();
    await expectUiShows(cs, stored);
    await expectSavedBonus(cs, HYBRID, String(stored.point_bonus));
    await focusCard(cs);
    await shot(
      page,
      'VP-4974_TC18_discard_then_hybrid_shows_saved',
      'Auto "abc" → Discard → Manual; open Hybrid → "0"',
    );
    await cs.discardIfDirty();
    expect(cs.writes).toHaveLength(0);
  });

  test('TC19 — Save ở Auto với "007" → form chuẩn hoá về 7, không còn unsaved', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await openOnOriginal(cs);
    await cs.selectType(AUTO);
    await cs.fillPointBonus('007');
    await cs.saveAndWait();
    const sent = cs.lastWrittenConfig();
    expect(sent.selected_type).toBe(AUTO);
    expect(sent.point_bonus).toBe(7);
    await expect(cs.pointBonusInput).toHaveValue('7');
    await expect(cs.saveBar).toBeHidden();
    await focusCard(cs);
    await shot(
      page,
      'VP-4974_TC19_auto_007_saved_normalized_7',
      `Auto · "007" → Save (mocked) → PUT point_bonus=${sent.point_bonus} · field "7" · no unsaved`,
    );
    await cs.selectType(HYBRID);
    await expect(cs.pointBonusInput).toHaveValue('7');
  });
});
