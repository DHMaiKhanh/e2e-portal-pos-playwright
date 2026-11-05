import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import type { Page, Response } from '@playwright/test';
import { CustomersPage } from '@pages/customers/CustomersPage';
import {
  type CustomerGroup,
  CustomerGroupApi,
  CustomerGroupsPage,
  isGroupList,
  isGroupWrite,
} from '@pages/customers/CustomerGroupsPage';

/**
 * VP-4566 — Customer Group names no longer have to be unique (in line with DTS).
 * https://linear.app/fastboy/issue/VP-4566 · test cases: docs/test-cases/customer-group-duplicate-name.md
 *
 * Writes to store #14 on DEV on purpose: every group a case creates is named
 * `E2E VP4566 <runId>-<case>…` and soft-deleted again in `afterEach`, including the ones the
 * page itself created (tracked from its POST responses). Groups that already exist are never
 * touched. Cases tagged with VP-5214 / VP-5215 / VP-5216 fail until those Portal fixes ship.
 */

const runId = Date.now().toString(36);
const base = (tc: string): string => `E2E VP4566 ${runId}-${tc}`;
const DUPLICATE_ERROR = /already in use/i;

let api: CustomerGroupApi;
let groups: CustomerGroupsPage;
/** Ids of every group this test created, through the API or through the page. */
let created: string[];

/** Records the id of each group the page creates, so `afterEach` can delete it. */
function trackPageCreates(page: Page): void {
  page.on('response', async (r: Response) => {
    if (!isGroupWrite(r, 'POST') || !r.ok()) return;
    const body = (await r.json().catch(() => null)) as CustomerGroup | null;
    if (body?.id) created.push(body.id);
  });
}

async function seed(name: string): Promise<CustomerGroup> {
  const group = await api.create(name);
  created.push(group.id);
  return group;
}

test.describe('VP-4566 — Customer Group cho phép trùng tên', () => {
  test.beforeEach(async ({ page }) => {
    created = [];
    api = new CustomerGroupApi(page);
    groups = new CustomerGroupsPage(page);
    trackPageCreates(page);
    await groups.goto();
  });

  test.afterEach(async () => {
    for (const id of created) await api.remove(id);
  });

  // ------------------------------------------------------------ B1. validate tên khi tạo

  test(
    'TC-VP4566-01 — bỏ trống Group name bị chặn',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {
      const post = await groups.submitCreate('', 3_000);
      await expect(groups.nameError).toHaveText('Group name is required');
      expect(post, 'không được gửi POST khi tên trống').toBeNull();
    },
  );

  test(
    'TC-VP4566-02 — Group name chỉ có khoảng trắng bị chặn (VP-5214)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {
      const post = await groups.submitCreate('     ');
      expect(post?.ok() ?? false, 'server không được tạo group tên toàn khoảng trắng').toBe(false);
      await expect(groups.nameError).toHaveText('Group name is required');
    },
  );

  test(
    'TC-VP4566-03 — khoảng trắng đầu/cuối được trim (VP-5215)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {
      const name = `${base('03')} Trim`;
      const post = await groups.submitCreate(`   ${name}   `);
      expect(post?.ok(), 'POST tạo group').toBeTruthy();
      const saved = (await post!.json()) as CustomerGroup;
      expect(saved.name, 'tên lưu trên server').toBe(name);

      await expect(groups.dialog).toBeHidden();
      await groups.search(name);
      await expect(groups.rowsNamed(name)).toHaveCount(1);
    },
  );

  // ------------------------------------------------------------ B2. tạo trùng tên

  test(
    'TC-VP4566-04 — tạo group trùng tên hoàn toàn thành công',
    { tag: [Tag.REGRESSION, Tag.CRITICAL] },
    async () => {
      const name = base('04');
      const first = await seed(name);

      const post = await groups.submitCreate(name);
      expect(post?.status(), 'POST group trùng tên').toBeLessThan(300);
      await expect(groups.page.getByText(DUPLICATE_ERROR)).toHaveCount(0);
      await expect(groups.dialog).toBeHidden();

      const same = await api.activeNamed(name);
      expect(same.map((g) => g.id)).toContain(first.id);
      expect(new Set(same.map((g) => g.id)).size, 'số group cùng tên trên server').toBe(2);

      await groups.search(name);
      await expect(groups.rowsNamed(name)).toHaveCount(2);
    },
  );

  test(
    'TC-VP4566-05 — tạo group trùng tên khác hoa/thường thành công',
    { tag: [Tag.REGRESSION] },
    async () => {
      const upper = `${base('05')} Case`;
      const lower = upper.toLowerCase();
      await seed(upper);

      const post = await groups.submitCreate(lower);
      expect(post?.ok(), 'POST group khác hoa/thường').toBeTruthy();
      expect(((await post!.json()) as CustomerGroup).name).toBe(lower);
      await expect(groups.dialog).toBeHidden();

      await groups.search(upper);
      await expect(groups.rowsNamed(upper)).toHaveCount(1);
      await expect(groups.rowsNamed(lower)).toHaveCount(1);
    },
  );

  test(
    'TC-VP4566-06 — server (API) chấp nhận tên trùng',
    { tag: [Tag.REGRESSION, Tag.API] },
    async () => {
      const name = `${base('06')} Api`;
      const a = await seed(name);
      const b = await seed(name);
      expect(b.id).not.toBe(a.id);

      const ids = (await api.activeNamed(name)).map((g) => g.id).sort();
      expect(ids).toEqual([a.id, b.id].sort());
    },
  );

  // ------------------------------------------------------------ B3. sửa tên

  test(
    'TC-VP4566-07 — đổi tên group thành tên đã tồn tại thành công',
    { tag: [Tag.REGRESSION] },
    async () => {
      const nameA = `${base('07')} A`;
      const nameB = `${base('07')} B`;
      await seed(nameA);
      const b = await seed(nameB);

      await groups.search(nameB);
      const put = await groups.submitEdit(groups.rowsNamed(nameB), nameA);
      expect(put?.ok(), 'PUT đổi tên trùng').toBeTruthy();
      await expect(groups.page.getByText(DUPLICATE_ERROR)).toHaveCount(0);
      await expect(groups.dialog).toBeHidden();

      expect((await api.get(b.id)).name).toBe(nameA);
      await groups.search(nameA);
      await expect(groups.rowsNamed(nameA)).toHaveCount(2);
    },
  );

  test(
    'TC-VP4566-08 — đổi tên thành chỉ khoảng trắng bị chặn (VP-5214)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {
      const name = `${base('08')} Edit`;
      const group = await seed(name);

      await groups.search(name);
      const put = await groups.submitEdit(groups.rowsNamed(name), '    ');
      const saved = await api.get(group.id);
      // Put the name back first so afterEach can still delete the group cleanly.
      if (saved.name !== name) await api.rename(saved, name);

      expect(put?.ok() ?? false, 'server không được lưu tên toàn khoảng trắng').toBe(false);
      expect(saved.name, 'tên trên server').toBe(name);
      await expect(groups.nameError).toHaveText('Group name is required');
    },
  );

  // ------------------------------------------------------------ B4. danh sách, tìm kiếm, bộ lọc

  test(
    'TC-VP4566-09 — tìm kiếm trả đủ mọi group trùng tên',
    { tag: [Tag.REGRESSION] },
    async () => {
      const name = `${base('09')} Search`;
      for (let i = 0; i < 3; i++) await seed(name);

      await groups.search(name);
      await expect(groups.rowsNamed(name)).toHaveCount(3);
      expect(await api.activeNamed(name)).toHaveLength(3);
    },
  );

  test(
    'TC-VP4566-10 — group cũ cùng tên không bị ảnh hưởng',
    { tag: [Tag.REGRESSION, Tag.CRITICAL] },
    async () => {
      const name = `${base('10')} Old`;
      const old = await api.get((await seed(name)).id);

      const post = await groups.submitCreate(name);
      expect(post?.ok(), 'POST group mới cùng tên').toBeTruthy();
      const fresh = (await post!.json()) as CustomerGroup;
      expect(fresh.id).not.toBe(old.id);
      await expect(groups.dialog).toBeHidden();

      // The list is newest first, so the first matching row is the group just created.
      const renamed = `${name} Renamed`;
      await groups.search(name);
      const put = await groups.submitEdit(groups.rowsNamed(name).first(), renamed);
      expect(put?.ok(), 'PUT đổi tên group mới').toBeTruthy();
      expect(new URL(put!.url()).pathname).toBe(`/customer_groups/${fresh.id}`);

      expect((await api.get(fresh.id)).name).toBe(renamed);
      expect(await api.get(old.id), 'group cũ giữ nguyên').toEqual(old);
    },
  );

  test(
    'TC-VP4566-11 — bộ lọc Group ở tab Customers có group mới tạo (VP-5216)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      const name = `${base('11')} Filter`;
      await seed(name);

      const customers = new CustomersPage(page);
      await customers.goto();
      await customers.openGroupFilter();
      await expect(page.getByRole('option', { name, exact: true })).toHaveCount(1);
    },
  );

  test(
    'TC-VP4566-12 — bộ lọc Group không hiện group đã xoá (VP-5216)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      const name = `${base('12')} Deleted`;
      const group = await seed(name);
      await api.remove(group.id);

      // The filter may load its groups with the page or on open, and the (mounted) groups tab
      // loads its own list too — so collect every group list from navigation on. The tab's list
      // asks for `status[]=active` and can only add active groups.
      const lists: Promise<CustomerGroup[]>[] = [];
      page.on('response', (r) => {
        if (isGroupList(r) && r.ok()) {
          lists.push(r.json().then((b: { member: CustomerGroup[] }) => b.member));
        }
      });

      const customers = new CustomersPage(page);
      await customers.goto();
      await customers.openGroupFilter();
      await expect(page.getByRole('option').first()).toBeVisible();

      await expect(page.getByRole('option', { name, exact: true })).toHaveCount(0);
      const loaded = (await Promise.all(lists)).flat();
      expect(loaded.length, 'bộ lọc đã tải danh sách group').toBeGreaterThan(0);
      const notActive = [
        ...new Set(loaded.filter((g) => g.status !== 'active').map((g) => g.name)),
      ];
      expect(notActive, 'group không active trong dữ liệu bộ lọc').toEqual([]);
    },
  );
});
