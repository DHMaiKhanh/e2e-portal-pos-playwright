import * as fs from 'fs';
import { test, expect } from '@fixtures/index';
import type { Page } from '@playwright/test';
import { env } from '@configs/env/loadEnv';
import { PREFIX, STATE_FILE, nowUtc7, shot } from './_shared';
import {
  auditLogsSince,
  cdcTasks,
  describeLog,
  describeTask,
  isServiceCategoryIssue,
  openCdcReportTasks,
  storeTasksSince,
  type CdcTask,
} from './_monitor';
import { deleteCategory, deleteService, getCategory, getService, leftovers } from './_data';

/**
 * VP-4556 — PROD verification on the internal store #20258 (VOLT POS).
 * Create a throwaway category + 8 services in the Portal, delete the category, then watch
 * Monitoring → Report tasks (Type = Sys Notify Cdc Failure) for new failures at +3 and +6 min.
 * Everything created is prefixed "E2E VP4556" and soft-deleted in `finally`.
 */

const STORE = '20258';
const N_SERVICES = 8;

interface State {
  runTag: string;
  catName: string;
  catId?: string;
  svcIds: string[];
  startIso: string;
  createdIso?: string;
  delIso?: string;
  cleanupIso?: string;
  notes: string[];
}

function save(s: State): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

async function waitUntil(page: Page, epochMs: number, label: string): Promise<void> {
  console.log(
    `WAIT until ${new Date(epochMs + 7 * 3600_000).toISOString().slice(11, 19)} (UTC+7) — ${label}`,
  );
  while (Date.now() < epochMs) {
    await page.waitForTimeout(Math.min(30_000, epochMs - Date.now()));
  }
}

/** Fixed evidence box (bottom-right) — for facts that come from the Portal's API, not from the screen. */
async function evidence(page: Page, title: string, lines: string[]): Promise<void> {
  await page.evaluate(
    ({ title, lines }) => {
      document.getElementById('__qc_evidence')?.remove();
      const el = document.createElement('div');
      el.id = '__qc_evidence';
      el.setAttribute(
        'style',
        [
          'position:fixed',
          'right:16px',
          'bottom:16px',
          'z-index:2147483646',
          'max-width:860px',
          'background:rgba(15,23,42,0.94)',
          'color:#e2e8f0',
          'font:12px/1.45 Consolas,ui-monospace,monospace',
          'padding:10px 14px',
          'border-radius:8px',
          'pointer-events:none',
          'white-space:pre-wrap',
          'box-shadow:0 4px 14px rgba(0,0,0,.35)',
        ].join(';'),
      );
      const h = document.createElement('div');
      h.textContent = title;
      h.setAttribute(
        'style',
        'font:700 13px/1.4 system-ui,Segoe UI,Arial;color:#fbbf24;margin-bottom:4px',
      );
      el.appendChild(h);
      const body = document.createElement('div');
      body.textContent = lines.join('\n');
      el.appendChild(body);
      document.body.appendChild(el);
    },
    { title, lines },
  );
}

interface MonitorResult {
  newAll: CdcTask[];
  newFailed: CdcTask[];
  related: CdcTask[];
  relatedLogs: string[];
  storeLogsNonGroup: string[];
  logCount: number;
  baselineFailedTotal: number;
  failedTotal: number;
  allTotal: number;
}

async function monitorCheck(
  page: Page,
  sinceIso: string,
  tc: string,
  label: string,
): Promise<MonitorResult> {
  const all = await cdcTasks(page);
  const failed = await cdcTasks(page, { status: 'failed' });
  const since = Date.parse(sinceIso);
  const newAll = all.items.filter((t) => Date.parse(t.createdAt) >= since);
  const newFailed = failed.items.filter((t) => Date.parse(t.createdAt) >= since);
  const related = newAll.filter((t) => isServiceCategoryIssue(describeTask(t)));
  const logs = await auditLogsSince(page, sinceIso);
  const relatedLogs = logs.map(describeLog).filter(isServiceCategoryIssue);
  const storeLogsNonGroup = logs
    .filter((l) => String(l.merchant?.id) === STORE && l.requestBody?.table !== 'customer_group')
    .map(describeLog);
  const breakdown: Record<string, number> = {};
  for (const l of logs) {
    const k =
      `#${l.merchant?.id ?? '-'} ${l.requestBody?.tag ?? ''} ${l.requestBody?.table ?? ''}`.trim();
    breakdown[k] = (breakdown[k] ?? 0) + 1;
  }
  console.log(`== ${tc} ${label}: since ${sinceIso}`);
  console.log(`   CDC tasks total=${all.total} failed total=${failed.total}`);
  console.log(
    `   NEW cdc tasks (any status)=${newAll.length}, NEW failed=${newFailed.length}, NEW service/category-related=${related.length}`,
  );
  for (const t of newAll) console.log(`     new: ${describeTask(t)}`);
  console.log(
    `   audit logs since=${logs.length} related=${relatedLogs.length} store#${STORE}(non customer_group)=${storeLogsNonGroup.length}`,
  );
  console.log(`   audit breakdown ${JSON.stringify(breakdown)}`);
  for (const l of relatedLogs.slice(0, 10)) console.log(`     related log: ${l}`);
  for (const l of storeLogsNonGroup.slice(0, 10)) console.log(`     store log: ${l}`);

  const sinceLocal = new Date(since + 7 * 3600_000).toISOString().slice(0, 19).replace('T', ' ');
  const lines = [
    `Mốc so sánh (since): ${sinceLocal} (UTC+7)`,
    `Sys Notify Cdc Failure — Status Failed: total ${failed.total}, mới sau mốc: ${newFailed.length}`,
    `Sys Notify Cdc Failure — mọi status: total ${all.total}, mới sau mốc: ${newAll.length}` +
      (newAll.length
        ? ` → ${newAll.map((t) => `#${t.merchant?.id} ${t.data?.table}`).join(', ')}`
        : ''),
    `  trong đó liên quan service/category / fk_e19d9ad212469de2: ${related.length}`,
    `Sync logs (Syncing) sau mốc: ${logs.length}; liên quan service/category/FK: ${relatedLogs.length}`,
    `  #${STORE} ngoài customer_group: ${storeLogsNonGroup.length}`,
  ];

  const failedView = await openCdcReportTasks(page, { failed: true });
  console.log(
    `   UI failed view: ${failedView.pager} rows=${JSON.stringify(failedView.rows.slice(0, 3))}`,
  );
  await evidence(page, `${tc} · ${label} · API cross-check`, lines);
  await shot(page, `VP-4556_${tc}_failed`);
  const allView = await openCdcReportTasks(page);
  console.log(`   UI all view: ${allView.pager} top=${JSON.stringify(allView.rows.slice(0, 3))}`);
  await evidence(page, `${tc} · ${label} · API cross-check`, lines);
  await shot(page, `VP-4556_${tc}_all_status`);
  const storeView = await openCdcReportTasks(page, { merchant: STORE });
  console.log(
    `   UI store view: ${storeView.pager} top=${JSON.stringify(storeView.rows.slice(0, 3))}`,
  );
  await evidence(page, `${tc} · ${label} · API cross-check`, lines);
  await shot(page, `VP-4556_${tc}_store${STORE}`);

  return {
    newAll,
    newFailed,
    related,
    relatedLogs,
    storeLogsNonGroup,
    logCount: logs.length,
    baselineFailedTotal: 0,
    failedTotal: failed.total,
    allTotal: all.total,
  };
}

test.describe('VP-4556 PROD verify', () => {
  test('delete a category holding 8 services → no new CDC FK failure', async ({
    page,
    productsPage,
  }) => {
    expect(env.STORE_ID, 'PROD safety: only store #20258').toBe(STORE);
    expect(env.BASE_URL).toContain('v2.fastboypay.com');
    test.setTimeout(45 * 60_000);

    const runTag = nowUtc7().slice(5).replace(/[-: ]/g, ''); // MMDDHHmm
    const state: State = {
      runTag,
      catName: `${PREFIX} Cat ${runTag}`,
      svcIds: [],
      startIso: new Date().toISOString(),
      notes: [],
    };
    save(state);
    const svcNames = Array.from(
      { length: N_SERVICES },
      (_, i) => `${PREFIX} Svc ${String(i + 1).padStart(2, '0')} ${runTag}`,
    );
    const results: Record<string, unknown> = {};

    try {
      // ---------------------------------------------------------------- TC01 baseline
      await test.step('TC01 — baseline of Sys Notify Cdc Failure tasks', async () => {
        await productsPage.goto(); // lets the SPA refresh the session before API calls
        const all = await cdcTasks(page);
        const failed = await cdcTasks(page, { status: 'failed' });
        const store = await cdcTasks(page, { merchant: STORE });
        results.baseline = {
          allTotal: all.total,
          allNewest: all.items[0] ? describeTask(all.items[0]) : null,
          failedTotal: failed.total,
          failedNewest: failed.items[0] ? describeTask(failed.items[0]) : null,
          storeTotal: store.total,
          storeNewest: store.items[0] ? describeTask(store.items[0]) : null,
        };
        console.log('BASELINE', JSON.stringify(results.baseline, null, 2));
        const lines = [
          `Baseline lúc ${nowUtc7(true)} (UTC+7)`,
          `Sys Notify Cdc Failure — Status Failed: ${failed.total} task` +
            (failed.items[0] ? ` (mới nhất ${failed.items[0].createdAt})` : ' (không có task nào)'),
          `Sys Notify Cdc Failure — mọi status: ${all.total} task, mới nhất ${all.items[0]?.createdAt ?? '-'} #${all.items[0]?.merchant?.id ?? '-'} ${all.items[0]?.data?.table ?? ''}`,
          `Sys Notify Cdc Failure — store #${STORE}: ${store.total} task, mới nhất ${store.items[0]?.createdAt ?? '-'} ${store.items[0]?.data?.table ?? ''}`,
        ];
        await openCdcReportTasks(page, { failed: true });
        await evidence(page, 'TC01 · Baseline · API cross-check', lines);
        await shot(page, 'VP-4556_TC01_baseline_failed');
        await openCdcReportTasks(page);
        await evidence(page, 'TC01 · Baseline · API cross-check', lines);
        await shot(page, 'VP-4556_TC01_baseline_all_status');
        await openCdcReportTasks(page, { merchant: STORE });
        await evidence(page, 'TC01 · Baseline · API cross-check', lines);
        await shot(page, `VP-4556_TC01_baseline_store${STORE}`);
      });

      // ---------------------------------------------------------------- TC02 create category
      await test.step('TC02 — create category in the Portal', async () => {
        await productsPage.goto();
        await productsPage.waitForCategoryList();
        await productsPage.addCategoryButton.click();
        await expect(productsPage.categoryDialog).toBeVisible();
        await productsPage.categoryNameInput.fill(state.catName);
        await shot(page, 'VP-4556_TC02_add_category_form');
        const isPost = (r: { url(): string; request(): { method(): string } }) =>
          new URL(r.url()).pathname === '/categories' && r.request().method() === 'POST';
        let resp = await Promise.all([
          page.waitForResponse(isPost, { timeout: 30_000 }).catch(() => null),
          productsPage.categoryDialogCreateButton.click(),
        ]).then(([r]) => r);
        if (!resp) {
          state.notes.push('category submit swallowed once (token refresh) — re-submitted');
          resp = await Promise.all([
            page.waitForResponse(isPost, { timeout: 30_000 }),
            productsPage.categoryDialogCreateButton.click(),
          ]).then(([r]) => r);
        }
        if (!resp) throw new Error('no POST /categories response');
        expect(resp.ok(), `POST /categories → ${resp.status()}`).toBeTruthy();
        const created = (await resp.json()) as { id: string; name: string; status: string };
        state.catId = created.id;
        save(state);
        console.log('CATEGORY created', JSON.stringify(created));
        await expect(productsPage.categoryDialog).toBeHidden({ timeout: 15_000 });
        await expect(productsPage.categoryButton(state.catName)).toBeVisible({ timeout: 15_000 });
        await productsPage.categoryButton(state.catName).scrollIntoViewIfNeeded();
        await shot(page, 'VP-4556_TC02_category_created');
        results.category = created;
      });

      // ---------------------------------------------------------------- TC03 create 8 services
      await test.step('TC03 — create 8 services in that category', async () => {
        const isPost = (r: { url(): string; request(): { method(): string } }) =>
          new URL(r.url()).pathname === '/services' && r.request().method() === 'POST';
        for (const [i, name] of svcNames.entries()) {
          await productsPage.openAddService();
          await productsPage.serviceNameInput.fill(name);
          await pickCategory(page, state.catName);
          await productsPage.servicePriceInput.fill(String(i + 1));
          if (i === 0) await shot(page, 'VP-4556_TC03_add_service_form');
          let resp = await Promise.all([
            page.waitForResponse(isPost, { timeout: 30_000 }).catch(() => null),
            productsPage.serviceDialogCreateButton.click(),
          ]).then(([r]) => r);
          if (!resp) {
            state.notes.push(`service "${name}" submit swallowed once — re-submitted`);
            resp = await Promise.all([
              page.waitForResponse(isPost, { timeout: 30_000 }),
              productsPage.serviceDialogCreateButton.click(),
            ]).then(([r]) => r);
          }
          if (!resp) throw new Error(`no POST /services response for ${name}`);
          expect(
            resp.ok(),
            `POST /services "${name}" → ${resp.status()} ${await resp.text().catch(() => '')}`,
          ).toBeTruthy();
          const s = (await resp.json()) as {
            id: string;
            category?: { id?: string } | string | null;
          };
          state.svcIds.push(s.id);
          save(state);
          await expect(productsPage.serviceDialog).toBeHidden({ timeout: 15_000 });
        }
        state.createdIso = new Date().toISOString();
        save(state);
        const svcs = await Promise.all(state.svcIds.map((id) => getService(page, id)));
        console.log('SERVICE[0] full', JSON.stringify(svcs[0]).slice(0, 1500));
        const inCat = svcs.filter((s) => s.category?.id === state.catId && s.status === 'active');
        console.log(`SERVICES created=${svcs.length} active-in-category=${inCat.length}`);
        expect(inCat).toHaveLength(N_SERVICES);
        await productsPage.goto();
        await productsPage.waitForCategoryList();
        await productsPage.categoryButton(state.catName).click();
        await page.waitForTimeout(2500);
        await expect(page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0, {
          timeout: 15_000,
        });
        const rows = (await productsPage.table.rows.allInnerTexts()).map((t) =>
          t.replace(/\s+/g, ' '),
        );
        console.log(`TABLE after selecting category: ${rows.length} rows\n${rows.join('\n')}`);
        await shot(page, 'VP-4556_TC03_category_with_8_services');
        results.servicesCreated = {
          count: svcs.length,
          activeInCategory: inCat.length,
          rowsShown: rows.length,
        };
      });

      // Let the POS → GCI sync (syncing-dts) push the new category/services before deleting.
      await test.step('TC03b — wait for sync, check no sync errors for the new data', async () => {
        await waitUntil(
          page,
          Date.parse(state.createdIso!) + 90_000,
          'DTS sync of new category/services',
        );
        await productsPage.goto();
        const logs = await auditLogsSince(page, state.startIso);
        const mine = logs
          .filter(
            (l) => String(l.merchant?.id) === STORE && l.requestBody?.table !== 'customer_group',
          )
          .map(describeLog);
        const related = logs.map(describeLog).filter(isServiceCategoryIssue);
        const syncSvc = await storeTasksSince(page, STORE, 'sync_service', state.startIso);
        const syncCat = await storeTasksSince(page, STORE, 'sync_category', state.startIso);
        console.log(
          `SYNC after create: audit logs since start=${logs.length}, #${STORE} non-group=${mine.length}, related=${related.length}`,
        );
        for (const l of [...mine, ...related].slice(0, 10)) console.log('   ', l);
        console.log(
          `   sync_service tasks=${syncSvc.length} sync_category tasks=${syncCat.length}`,
        );
        for (const t of [...syncSvc, ...syncCat].slice(0, 10)) console.log('   ', describeTask(t));
        results.syncAfterCreate = {
          logs: logs.length,
          storeNonGroup: mine.length,
          related: related.length,
          syncSvc: syncSvc.length,
          syncCat: syncCat.length,
        };
      });

      // ---------------------------------------------------------------- TC04 delete category
      await test.step('TC04 — delete the category (holding 8 services)', async () => {
        await productsPage.goto();
        await productsPage.waitForCategoryList();
        await productsPage.openCategoryActions(state.catName);
        const menu = await productsPage
          .categoryActionsMenu(state.catName)
          .getByRole('menuitem')
          .allInnerTexts();
        console.log('ACTIONS menu', menu.join(' | '));
        await shot(page, 'VP-4556_TC04a_category_actions_menu_no_delete');
        await productsPage.categoryEditButton(state.catName).click();
        await expect(productsPage.categoryDialog).toBeVisible();
        await page.waitForTimeout(1000);
        const btns = await productsPage.categoryDialog.getByRole('button').allInnerTexts();
        console.log('EDIT dialog buttons', btns.join(' | '));
        await shot(page, 'VP-4556_TC04b_edit_category_dialog_no_delete');
        await productsPage.categoryDialogCancelButton.click();
        await expect(productsPage.categoryDialog).toBeHidden();
        results.deleteControl = { menu, editButtons: btns };

        state.delIso = new Date().toISOString();
        save(state);
        const del = await deleteCategory(page, state.catId!);
        console.log(
          `DELETE category → HTTP ${del.status} ${JSON.stringify(del.body).slice(0, 400)}`,
        );
        expect(del.status, 'category delete accepted').toBeLessThan(300);
        const after = await getCategory(page, state.catId!);
        expect(after.status).toBe('deleted');
        await evidence(
          page,
          'TC04 · Xoá category (soft delete như POS — Portal không có nút Delete)',
          [
            `Thời điểm xoá: ${new Date(Date.parse(state.delIso) + 7 * 3600_000).toISOString().slice(0, 19).replace('T', ' ')} (UTC+7)`,
            `PUT https://volt-pos.v2.fastboypay.com/categories/${state.catId}`,
            `  body: {"name":"${state.catName}","status":"deleted","colorHex":"${after.colorHex}"}`,
            `→ HTTP ${del.status}; GET lại: status="${after.status}", updatedAt=${after.updatedAt}`,
            `Category đang chứa ${N_SERVICES} service "${PREFIX} Svc 01..08 ${runTag}"`,
          ],
        );
        await shot(page, 'VP-4556_TC04c_category_delete_confirmation');
        await productsPage.goto();
        await productsPage.waitForCategoryList();
        const names = await productsPage.categoryNamesInOrder();
        console.log('CATEGORIES after delete', JSON.stringify(names));
        expect(names).not.toContain(state.catName);
        await evidence(page, 'TC04 · Sau khi xoá', [
          `Category "${state.catName}" không còn trong danh sách category.`,
          `Danh sách: ${names.join(' · ')}`,
        ]);
        await shot(page, 'VP-4556_TC04d_category_gone_from_list');
        results.delete = { http: del.status, statusAfter: after.status, delIso: state.delIso };
      });

      // ---------------------------------------------------------------- TC05 / TC06 monitor
      await test.step('TC05 — Monitoring ~3 min after the delete', async () => {
        await waitUntil(
          page,
          Date.parse(state.delIso!) + 3 * 60_000 + 10_000,
          '+3 min after delete',
        );
        await productsPage.goto();
        const r = await monitorCheck(
          page,
          state.delIso!,
          'TC05_after3min',
          '~3 phút sau khi xoá category',
        );
        results.after3 = summarize(r);
      });

      await test.step('TC06 — Monitoring ~6 min after the delete', async () => {
        await waitUntil(
          page,
          Date.parse(state.delIso!) + 6 * 60_000 + 10_000,
          '+6 min after delete',
        );
        await productsPage.goto();
        const r = await monitorCheck(
          page,
          state.delIso!,
          'TC06_after6min',
          '~6 phút sau khi xoá category',
        );
        results.after6 = summarize(r);
      });

      // ---------------------------------------------------------------- TC07 data after delete
      await test.step('TC07 — state of the 8 services after the category was deleted', async () => {
        await productsPage.goto();
        const svcs = await Promise.all(state.svcIds.map((id) => getService(page, id)));
        const summary = svcs.map(
          (s) =>
            `${s.name}: status=${s.status}, category=${s.category ? `${s.category.name} (${s.category.status})` : 'null'}`,
        );
        console.log('SERVICES after category delete\n' + summary.join('\n'));
        await productsPage.search(PREFIX);
        await page.waitForTimeout(1500);
        const rows = (await productsPage.table.rows.allInnerTexts()).map((t) =>
          t.replace(/\s+/g, ' '),
        );
        console.log(`UI search "${PREFIX}" → ${rows.length} rows`);
        await evidence(page, 'TC07 · Trạng thái service sau khi xoá category (API)', summary);
        await shot(page, 'VP-4556_TC07_services_after_category_delete');
        results.servicesAfterDelete = {
          statuses: [...new Set(svcs.map((s) => s.status))],
          categoryRefs: [
            ...new Set(
              svcs.map((s) => (s.category ? `${s.category.id}:${s.category.status}` : 'null')),
            ),
          ],
          uiRows: rows.length,
        };
      });
    } finally {
      // ---------------------------------------------------------------- TC08 cleanup
      await test.step('TC08 — cleanup: delete the 8 services (and the category if still there)', async () => {
        await productsPage.goto().catch(() => undefined);
        state.cleanupIso = new Date().toISOString();
        save(state);
        const out: string[] = [];
        for (const id of state.svcIds) {
          const s = await getService(page, id);
          if (s.status === 'deleted') {
            out.push(`${s.name}: already deleted`);
            continue;
          }
          const r = await deleteService(page, id);
          out.push(`${s.name}: PUT status=deleted → HTTP ${r.status} (${r.body.status})`);
        }
        if (state.catId) {
          const c = await getCategory(page, state.catId);
          if (c.status !== 'deleted') {
            const r = await deleteCategory(page, state.catId);
            out.push(`${c.name}: category PUT status=deleted → HTTP ${r.status}`);
          } else out.push(`${c.name}: category already deleted`);
        }
        console.log('CLEANUP\n' + out.join('\n'));
        const left = await leftovers(page);
        console.log(
          `LEFTOVERS categories=${left.categories.length} services=${left.services.length}`,
        );
        await productsPage.goto();
        await productsPage.search(PREFIX);
        await page.waitForTimeout(1500);
        await evidence(page, 'TC08 · Dọn dữ liệu', [
          ...out,
          `Còn lại (active/inactive) có tiền tố "${PREFIX}": category=${left.categories.length}, service=${left.services.length}`,
        ]);
        await shot(page, 'VP-4556_TC08_cleanup_active_tab');
        await productsPage.switchToInactiveTab().catch(() => undefined);
        await page.waitForTimeout(2000);
        await productsPage.search(PREFIX).catch(() => undefined);
        await page.waitForTimeout(1500);
        await shot(page, 'VP-4556_TC08_cleanup_inactive_tab');
        results.cleanup = {
          actions: out,
          leftCategories: left.categories.length,
          leftServices: left.services.length,
        };
        expect(left.categories.length + left.services.length, 'no E2E VP4556 leftovers').toBe(0);
      });
    }

    // ---------------------------------------------------------------- TC09 after cleanup
    await test.step('TC09 — Monitoring ~3 min after deleting the services', async () => {
      await waitUntil(
        page,
        Date.parse(state.cleanupIso!) + 3 * 60_000 + 10_000,
        '+3 min after cleanup',
      );
      await productsPage.goto();
      const r = await monitorCheck(
        page,
        state.cleanupIso!,
        'TC09_after_cleanup',
        '~3 phút sau khi xoá 8 service',
      );
      results.afterCleanup = summarize(r);
    });

    console.log('RESULTS ' + JSON.stringify(results, null, 2));
    console.log('STATE ' + JSON.stringify(state, null, 2));
    const r3 = results.after3 as ReturnType<typeof summarize>;
    const r6 = results.after6 as ReturnType<typeof summarize>;
    expect.soft(r3.newFailed, 'no new FAILED cdc tasks at +3').toBe(0);
    expect.soft(r6.newFailed, 'no new FAILED cdc tasks at +6').toBe(0);
    expect.soft(r6.related, 'no new service/category CDC failure').toBe(0);
    expect.soft(r6.relatedLogs, 'no service/category sync errors').toBe(0);
  });
});

/**
 * Add service → Category picker. The trigger first shows "Loading categories…", and an option
 * clicked while the list refetches is dropped (popover stays open) — so search, click the exact
 * option, and confirm the trigger shows it, retrying a couple of times.
 */
async function pickCategory(page: Page, name: string): Promise<void> {
  const trigger = page
    .getByRole('dialog', { name: /^(add|create|edit) service$/i })
    .locator('#category');
  await expect(trigger).not.toContainText(/loading/i, { timeout: 15_000 });
  for (let attempt = 0; attempt < 3; attempt++) {
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
    const search = page.getByPlaceholder('Search category...');
    await expect(search).toBeVisible();
    await search.fill(name);
    const option = page.getByRole('option', { name, exact: true });
    await expect(option).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(400);
    await option.click();
    try {
      await expect(trigger).toHaveText(name, { timeout: 5_000 });
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      return;
    } catch {
      await page.waitForTimeout(1_000);
    }
  }
  throw new Error(`could not pick category "${name}"`);
}

function summarize(r: MonitorResult) {
  return {
    allTotal: r.allTotal,
    failedTotal: r.failedTotal,
    newAll: r.newAll.length,
    newAllDetail: r.newAll.map(describeTask),
    newFailed: r.newFailed.length,
    related: r.related.length,
    relatedLogs: r.relatedLogs.length,
    relatedLogsDetail: r.relatedLogs.slice(0, 10),
    storeLogsNonGroup: r.storeLogsNonGroup.length,
    storeLogsNonGroupDetail: r.storeLogsNonGroup.slice(0, 10),
    logCount: r.logCount,
  };
}
