import { test, expect } from '@fixtures/index';
import type { Page, Response } from '@playwright/test';
import { CustomersPage } from '@pages/customers/CustomersPage';
import {
  type CustomerGroup,
  CustomerGroupApi,
  CustomerGroupsPage,
  isGroupList,
  isGroupWrite,
} from '@pages/customers/CustomerGroupsPage';
import { armWriteGuard, assertProdTestStore, shot, visible } from './evidence';

/**
 * PROD evidence run (2026-11-03) for VP-4566 and its Portal bugs VP-5214 / VP-5215 / VP-5216.
 * Store #20258 only. Every group created is named `E2E VP4566 <runId>-…` and soft-deleted in
 * afterEach (ids tracked from API seeds and from the page's own POST responses).
 * Whitespace-only inputs run behind a write guard that aborts any POST/PUT before it leaves
 * the browser, so a regression can never create/rename a nameless group on PROD.
 */

const runId = `P${Date.now().toString(36)}`;
const base = (tc: string): string => `E2E VP4566 ${runId}-${tc}`;
const DUPLICATE_ERROR = /already in use/i;

let api: CustomerGroupApi;
let groups: CustomerGroupsPage;
let created: string[];

function trackPageCreates(page: Page): void {
  page.on('response', async (r: Response) => {
    if (!isGroupWrite(r, 'POST') || !r.ok()) return;
    const body = (await r.json().catch(() => null)) as CustomerGroup | null;
    if (body?.id) created.push(body.id);
  });
}

async function seed(name: string): Promise<CustomerGroup> {
  const g = await api.create(name);
  created.push(g.id);
  return g;
}

test.describe('PROD #20258 — VP-4566 family evidence', () => {
  test.beforeEach(async ({ page }) => {
    assertProdTestStore();
    created = [];
    api = new CustomerGroupApi(page);
    groups = new CustomerGroupsPage(page);
    trackPageCreates(page);
    await groups.goto();
  });

  test.afterEach(async () => {
    for (const id of created) await api.remove(id);
  });

  // =============================================================== VP-4566

  test('VP-4566 TC01 — bỏ trống Group name bị chặn', async ({ page }) => {
    await groups.createButton.click();
    await expect(groups.dialog).toBeVisible();
    await shot(page, 'VP-4566_TC01_a_create_dialog_empty.png', [
      'VP-4566 TC01: dialog Create customer group, Group name trống',
    ]);
    const post = page
      .waitForResponse((r) => isGroupWrite(r, 'POST'), { timeout: 3000 })
      .catch(() => null);
    await groups.dialog.getByRole('button', { name: 'Create group' }).click();
    await expect(groups.nameError).toHaveText('Group name is required');
    expect(await post, 'không gửi POST').toBeNull();
    await shot(page, 'VP-4566_TC01_b_blank_name_required.png', [
      'VP-4566 TC01: Create group với tên rỗng → "Group name is required", không có POST',
    ]);
  });

  test('VP-4566 TC04 — tạo group trùng tên hoàn toàn thành công', async ({ page }) => {
    const name = `${base('TC04')} Dup`;
    const first = await seed(name);
    await groups.createButton.click();
    await groups.nameInput.fill(name);
    await shot(page, 'VP-4566_TC04_a_create_same_name_dialog.png', [
      `VP-4566 TC04: đã có group ${visible(name)} (id …${first.id.slice(-12)}), tạo thêm group cùng tên`,
    ]);
    const postP = page.waitForResponse((r) => isGroupWrite(r, 'POST'));
    await groups.dialog.getByRole('button', { name: 'Create group' }).click();
    const post = await postP;
    expect(post.status(), 'POST group trùng tên').toBeLessThan(300);
    await expect(groups.dialog).toBeHidden();
    await expect(page.getByText(DUPLICATE_ERROR)).toHaveCount(0);
    const fresh = (await post.json()) as CustomerGroup;

    const same = await api.activeNamed(name);
    expect(new Set(same.map((g) => g.id)).size).toBe(2);
    await groups.search(name);
    await expect(groups.rowsNamed(name)).toHaveCount(2);
    await shot(
      page,
      'VP-4566_TC04_b_duplicate_names_coexist.png',
      [
        `VP-4566 TC04: POST ${post.status()} — không còn lỗi "Customer group name is already in use."`,
        `Search → 2 dòng cùng tên; id …${first.id.slice(-12)} & …${fresh.id.slice(-12)}`,
      ],
      { fullPage: true },
    );
  });

  test('VP-4566 TC05 — tạo group trùng tên khác hoa/thường thành công', async ({ page }) => {
    const upper = `${base('TC05')} VIP`;
    const lower = `${base('TC05')} vip`;
    await seed(upper);
    const post = await groups.submitCreate(lower);
    expect(post?.ok(), 'POST khác hoa/thường').toBeTruthy();
    expect(((await post!.json()) as CustomerGroup).name).toBe(lower);
    await expect(groups.dialog).toBeHidden();
    await groups.search(`${base('TC05')}`);
    await expect(groups.rowsNamed(upper)).toHaveCount(1);
    await expect(groups.rowsNamed(lower)).toHaveCount(1);
    await shot(
      page,
      'VP-4566_TC05_case_insensitive_duplicate_created.png',
      [
        `VP-4566 TC05: có ${visible(upper)} → tạo ${visible(lower)} thành công (POST ${post!.status()}), cả 2 hiện trong list`,
      ],
      { fullPage: true },
    );
  });

  test('VP-4566 TC06 — server (API) chấp nhận tên trùng', async ({ page }) => {
    const name = `${base('TC06')} Api`;
    const a = await seed(name);
    const b = await seed(name);
    expect(b.id).not.toBe(a.id);
    const ids = (await api.activeNamed(name)).map((g) => g.id).sort();
    expect(ids).toEqual([a.id, b.id].sort());
    await groups.search(name);
    await expect(groups.rowsNamed(name)).toHaveCount(2);
    await shot(
      page,
      'VP-4566_TC06_api_accepts_duplicate.png',
      [
        `VP-4566 TC06: POST /customer_groups 2 lần cùng tên ${visible(name)} → 2xx, 2 id khác nhau`,
        `${a.id} / ${b.id}`,
      ],
      { fullPage: true },
    );
  });

  test('VP-4566 TC07 — edit đổi tên thành tên đã tồn tại (kèm khoảng trắng đầu/cuối) thành công', async ({
    page,
  }) => {
    const nameA = `${base('TC07')} A`;
    const nameB = `${base('TC07')} B`;
    await seed(nameA);
    const b = await seed(nameB);
    await groups.search(nameB);
    const row = groups.rowsNamed(nameB);
    await row.getByRole('button', { name: /^Actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(groups.dialog).toBeVisible();
    const typed = `   ${nameA}   `;
    await groups.nameInput.fill(typed);
    await shot(page, 'VP-4566_TC07_a_edit_to_existing_name_dialog.png', [
      `VP-4566 TC07 / VP-5215: Edit ${visible(nameB)} → nhập ${visible(typed)} (trùng tên group A + khoảng trắng)`,
    ]);
    const putP = page.waitForResponse((r) => isGroupWrite(r, 'PUT'));
    await groups.dialog.getByRole('button', { name: 'Save changes' }).click();
    const put = await putP;
    expect(put.ok(), 'PUT đổi tên trùng').toBeTruthy();
    const sentName = (put.request().postDataJSON() as { name: string }).name;
    await expect(groups.dialog).toBeHidden();
    await expect(page.getByText(DUPLICATE_ERROR)).toHaveCount(0);
    const saved = await api.get(b.id);
    expect(saved.name, 'tên lưu trên server (đã trim)').toBe(nameA);
    await groups.search(nameA);
    await expect(groups.rowsNamed(nameA)).toHaveCount(2);
    await shot(
      page,
      'VP-4566_TC07_b_edit_duplicate_saved_trimmed.png',
      [
        `VP-4566 TC07: PUT ${put.status()}, body.name=${visible(sentName)}, server lưu ${visible(saved.name)}`,
        `Search ${visible(nameA)} → 2 dòng, không báo trùng`,
      ],
      { fullPage: true },
    );
  });

  test('VP-4566 TC09 — tìm kiếm trả đủ mọi group trùng tên', async ({ page }) => {
    const name = `${base('TC09')} Search`;
    for (let i = 0; i < 3; i++) await seed(name);
    await groups.search(name);
    await expect(groups.rowsNamed(name)).toHaveCount(3);
    expect(await api.activeNamed(name)).toHaveLength(3);
    await shot(
      page,
      'VP-4566_TC09_search_returns_all_duplicates.png',
      [`VP-4566 TC09: 3 group cùng tên ${visible(name)} → Search hiện đủ 3 dòng (API: 3)`],
      { fullPage: true },
    );
  });

  test('VP-4566 TC10 — group cũ cùng tên không bị ảnh hưởng', async ({ page }) => {
    const name = `${base('TC10')} Old`;
    const old = await api.get((await seed(name)).id);
    const post = await groups.submitCreate(name);
    expect(post?.ok()).toBeTruthy();
    const fresh = (await post!.json()) as CustomerGroup;
    await expect(groups.dialog).toBeHidden();
    const renamed = `${name} Renamed`;
    await groups.search(name);
    const put = await groups.submitEdit(groups.rowsNamed(name).first(), renamed);
    expect(put?.ok()).toBeTruthy();
    expect(new URL(put!.url()).pathname).toBe(`/customer_groups/${fresh.id}`);
    expect((await api.get(fresh.id)).name).toBe(renamed);
    expect(await api.get(old.id), 'group cũ giữ nguyên').toEqual(old);
    // A different term than the previous search, otherwise no new list request fires.
    await groups.search(base('TC10'));
    await expect(groups.rowsNamed(name)).toHaveCount(1);
    await expect(groups.rowsNamed(renamed)).toHaveCount(1);
    await shot(
      page,
      'VP-4566_TC10_old_group_unchanged.png',
      [
        `VP-4566 TC10: tạo group mới cùng tên rồi đổi tên group mới → group cũ …${old.id.slice(-12)} giữ nguyên`,
        `(name, status, members=${old.totalMember ?? 0}, updatedAt ${old.updatedAt})`,
      ],
      { fullPage: true },
    );
  });

  // =============================================================== VP-5214

  test('VP-5214 TC02 — Create: tên chỉ có khoảng trắng bị chặn', async ({ page }) => {
    const guard = await armWriteGuard(page);
    await groups.createButton.click();
    const typed = '     ';
    await groups.nameInput.fill(typed);
    await shot(page, 'VP-5214_TC02_a_whitespace_typed.png', [
      `VP-5214 TC02: nhập Group name = ${visible(typed)} (5 dấu cách)`,
    ]);
    await groups.dialog.getByRole('button', { name: 'Create group' }).click();
    await expect(groups.nameError).toHaveText('Group name is required');
    await page.waitForTimeout(1500);
    expect(guard.blocked, 'Portal không được gửi POST cho tên toàn khoảng trắng').toEqual([]);
    await expect(groups.dialog).toBeVisible();
    await shot(page, 'VP-5214_TC02_b_whitespace_rejected.png', [
      'VP-5214 TC02: "Group name is required", dialog vẫn mở, KHÔNG có POST /customer_groups',
    ]);
  });

  test('VP-5214 TC02b — Create: khoảng trắng hỗn hợp (tab + NBSP) bị chặn', async ({ page }) => {
    const guard = await armWriteGuard(page);
    await groups.createButton.click();
    const typed = ' \t    ';
    await groups.nameInput.fill(typed);
    const actual = await groups.nameInput.inputValue();
    await groups.dialog.getByRole('button', { name: 'Create group' }).click();
    await expect(groups.nameError).toHaveText('Group name is required');
    await page.waitForTimeout(1500);
    expect(guard.blocked, 'không gửi POST').toEqual([]);
    await shot(page, 'VP-5214_TC02b_mixed_whitespace_rejected.png', [
      `VP-5214 TC02b: nhập ${visible(actual)} (space/tab/NBSP) → "Group name is required", không có POST`,
    ]);
  });

  test('VP-5214 TC08 — Edit: đổi tên thành chỉ khoảng trắng bị chặn', async ({ page }) => {
    const name = `${base('TC08')} Edit`;
    const group = await seed(name);
    await groups.search(name);
    const guard = await armWriteGuard(page);
    await groups
      .rowsNamed(name)
      .getByRole('button', { name: /^Actions for/ })
      .click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(groups.dialog).toBeVisible();
    await groups.nameInput.fill('    ');
    await groups.dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(groups.nameError).toHaveText('Group name is required');
    await page.waitForTimeout(1500);
    expect(guard.blocked, 'không gửi PUT').toEqual([]);
    const saved = await api.get(group.id);
    expect(saved.name).toBe(name);
    await shot(page, 'VP-5214_TC08_edit_whitespace_rejected.png', [
      `VP-5214 TC08: Edit ${visible(name)} → ${visible('    ')} → "Group name is required", KHÔNG có PUT`,
      `Server vẫn giữ tên ${visible(saved.name)}`,
    ]);
  });

  // =============================================================== VP-5215

  test('VP-5215 TC03 — Create: tên được trim đầu/cuối', async ({ page }) => {
    const name = `${base('TC03')} Trim`;
    const typed = `   ${name}   `;
    await groups.createButton.click();
    await groups.nameInput.fill(typed);
    await shot(page, 'VP-5215_TC03_a_typed_with_spaces.png', [
      `VP-5215 TC03: nhập ${visible(typed)}`,
    ]);
    const postP = page.waitForResponse((r) => isGroupWrite(r, 'POST'));
    await groups.dialog.getByRole('button', { name: 'Create group' }).click();
    const post = await postP;
    expect(post.ok()).toBeTruthy();
    const sent = (post.request().postDataJSON() as { name: string }).name;
    const saved = (await post.json()) as CustomerGroup;
    expect(saved.name).toBe(name);
    const reread = await api.get(saved.id);
    expect(reread.name).toBe(name);
    await expect(groups.dialog).toBeHidden();
    await groups.search(name);
    await expect(groups.rowsNamed(name)).toHaveCount(1);
    await shot(
      page,
      'VP-5215_TC03_b_trimmed_name_stored.png',
      [
        `VP-5215 TC03: request body.name=${visible(sent)}`,
        `GET /customer_groups/…${saved.id.slice(-12)} → name=${visible(reread.name)} (đã trim)`,
      ],
      { fullPage: true },
    );
  });

  test('VP-5215 TC03c — (tham khảo) API trực tiếp với khoảng trắng cuối', async ({ page }) => {
    // Informational: the fix (fastboy-portal#913) is client-side. Trailing spaces only, so the
    // name still starts with the E2E prefix.
    const raw = `${base('TC03c')} ApiTrim   `;
    const g = await seed(raw);
    const reread = await api.get(g.id);
    console.log(`TC03c API stores: ${JSON.stringify(reread.name)} (sent ${JSON.stringify(raw)})`);
    await groups.search(`${base('TC03c')}`);
    await shot(
      page,
      'VP-5215_TC03c_api_direct_trailing_spaces_info.png',
      [
        `VP-5215 TC03c (info): POST trực tiếp API name=${visible(raw)} → server lưu ${visible(reread.name)}`,
      ],
      { fullPage: true },
    );
  });

  // =============================================================== VP-5216

  test('VP-5216 TC11 — bộ lọc Group có group mới tạo', async ({ page }) => {
    const name = `${base('TC11')} Filter`;
    await seed(name);
    const customers = new CustomersPage(page);
    const listReq = page.waitForResponse((r) => isGroupList(r) && r.ok());
    await customers.goto();
    await customers.openGroupFilter();
    const req = await listReq.catch(() => null);
    await expect(page.getByRole('option', { name, exact: true })).toHaveCount(1);
    await shot(page, 'VP-5216_TC11_filter_shows_new_group.png', [
      `VP-5216 TC11: Customers → + Group: group mới ${visible(name)} có trong dropdown`,
      req ? `GET ${new URL(req.url()).pathname}${new URL(req.url()).search}` : '',
    ]);
  });

  test('VP-5216 TC12 — bộ lọc Group không hiện group đã xóa (xóa qua UI)', async ({ page }) => {
    const name = `${base('TC12')} Deleted`;
    const g = await seed(name);
    await groups.search(name);
    await groups
      .rowsNamed(name)
      .getByRole('button', { name: /^Actions for/ })
      .click();
    await page.getByRole('menuitem', { name: /^Delete/ }).click();
    const alert = page.getByRole('alertdialog');
    await expect(alert).toBeVisible();
    await shot(page, 'VP-5216_TC12_a_delete_confirm.png', [
      `VP-5216 TC12: xóa group ${visible(name)} qua UI (Delete group)`,
    ]);
    const delP = page.waitForResponse((r) => isGroupWrite(r, 'PUT'));
    await alert.getByRole('button', { name: 'Delete group' }).click();
    const del = await delP;
    expect(del.ok()).toBeTruthy();
    expect((await api.get(g.id)).status).toBe('deleted');

    const lists: { url: string; groups: CustomerGroup[] }[] = [];
    page.on('response', async (r) => {
      if (isGroupList(r) && r.ok()) {
        const b = (await r.json().catch(() => ({ member: [] }))) as { member: CustomerGroup[] };
        lists.push({ url: new URL(r.url()).search, groups: b.member });
      }
    });
    const customers = new CustomersPage(page);
    await customers.goto();
    await customers.openGroupFilter();
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('option', { name, exact: true })).toHaveCount(0);
    const notActive = lists.flatMap((l) => l.groups).filter((x) => x.status !== 'active');
    expect(notActive.map((x) => x.name)).toEqual([]);
    const optionLabels = (await page.getByRole('option').allInnerTexts()).map((t) => t.trim());
    await shot(page, 'VP-5216_TC12_b0_filter_full_list_no_deleted.png', [
      `VP-5216 TC12: + Group (không search) → ${optionLabels.length} option, KHÔNG có ${visible(name)} (đã xóa)`,
      `Requests: ${lists.map((l) => l.url).join(' | ')}`,
    ]);
    const search = page.locator('[cmdk-input], [data-slot="pos-combobox-input"]').first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill(`${base('TC12')}`);
      await page.waitForTimeout(1500);
      await expect(page.getByRole('option', { name, exact: true })).toHaveCount(0);
    }
    await shot(page, 'VP-5216_TC12_b_filter_hides_deleted_group.png', [
      `VP-5216 TC12: group đã xóa ${visible(name)} (status=deleted) KHÔNG có trong + Group`,
      `Requests: ${lists.map((l) => l.url).join(' | ')}`,
    ]);
  });

  test('VP-5216 TC15 — lọc Customers theo group (read-only, group có sẵn "QA G1")', async ({
    page,
  }) => {
    const [qa] = await api.activeNamed('QA G1');
    expect(qa, 'group "QA G1" có sẵn trên #20258').toBeTruthy();
    const customers = new CustomersPage(page);
    await customers.goto();
    const custReq = page
      .waitForResponse(
        (r) =>
          new URL(r.url()).pathname.endsWith('/customers') &&
          r.request().method() === 'GET' &&
          r.url().includes(qa.id),
        { timeout: 15_000 },
      )
      .catch(() => null);
    await customers.selectGroup('QA G1');
    const res = await custReq;
    await customers.waitForReady();
    await expect(customers.groupFilterButtonWithLabel('QA G1')).toBeVisible();
    const rows = customers.table.rows;
    const range = (await customers.resultsFooter.textContent().catch(() => ''))?.trim();
    console.log(`TC15 rows=${rows} members=${qa.totalMember} range=${range} req=${res?.url()}`);
    await expect(rows).toHaveCount(qa.totalMember ?? 0);
    await shot(
      page,
      'VP-5216_TC15_filter_customers_by_group.png',
      [
        `VP-5216 TC15: + Group → "QA G1" (members=${qa.totalMember}) → bảng còn ${rows} customer (${range ?? ''})`,
      ],
      { fullPage: true },
    );
  });
});
