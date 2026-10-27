import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { StaffDetailPage } from '@pages/staffs/StaffsPage';
import type { Locator, Page } from '@playwright/test';
import {
  type StaffRecord,
  getStaff,
  isStaffWrite,
  openStaffDetail,
  openStaffWithRole,
  restoreStaff,
  sameStaff,
} from './helpers';

/**
 * VP-3787 — Staff Detail: toggling Status / Appointment Staff wiped the staff's Role.
 * https://linear.app/fastboy/issue/VP-3787
 *
 * Both header switches save on click with a full `PUT /staffs/<id>`. The bug sent `role: null` in
 * that body, so the staff lost its role (and every role permission) for good. These cases toggle
 * a real staff on DEV, check the write and the reloaded record, toggle back, and restore the
 * snapshot in `finally` if anything is still off.
 */
test.describe('VP-3787 — toggle Status / Appointment Staff giữ nguyên Role', () => {
  test.describe.configure({ mode: 'serial' });

  /** Clicks a header switch and returns the body of the save it fires. */
  async function toggleAndCapture(page: Page, toggle: Locator, staffId: string) {
    const write = page.waitForResponse((r) => isStaffWrite(r, staffId), { timeout: 30_000 });
    await toggle.click();
    const res = await write;
    expect(res.ok(), `PUT /staffs/${staffId} → ${res.status()}`).toBeTruthy();
    return res.request().postDataJSON() as {
      role: string | null;
      status: string;
      isAllowBooking: boolean;
    };
  }

  async function expectRoleKept(page: Page, detail: StaffDetailPage, original: StaffRecord) {
    const reloaded = await openStaffDetail(page, original.id);
    expect(reloaded.role?.id, 'role after reload').toBe(original.role?.id);
    await detail.rolePermissionsTab.click();
    await expect(detail.roleSelect).toHaveText(original.role?.name ?? '');
    await detail.profileTab.click();
  }

  const cases = [
    {
      id: 'TC-VP3787-01',
      title: 'bật/tắt Status không xoá Role',
      toggle: (d: StaffDetailPage) => d.statusToggle,
      field: 'status' as const,
    },
    {
      id: 'TC-VP3787-02',
      title: 'bật/tắt Appointment Staff không xoá Role',
      toggle: (d: StaffDetailPage) => d.appointmentStaffToggle,
      field: 'isAllowBooking' as const,
    },
  ];

  for (const c of cases) {
    test(`${c.id} — ${c.title}`, { tag: [Tag.REGRESSION, Tag.CRITICAL] }, async ({ page }) => {
      const detail = new StaffDetailPage(page);
      const original = await openStaffWithRole(page);
      const roleIri = original.role?.['@id'];

      try {
        await test.step('toggle lần 1: request lưu vẫn mang role hiện tại', async () => {
          const body = await toggleAndCapture(page, c.toggle(detail), original.id);
          expect(body[c.field], `${c.field} đã đổi`).not.toBe(original[c.field]);
          expect(body.role, 'PUT body role').toBe(roleIri);
        });

        await test.step('reload: Role vẫn đúng ở API và tab Role & permissions', async () => {
          await expectRoleKept(page, detail, original);
        });

        await test.step('toggle lần 2 (trả lại): role vẫn còn', async () => {
          const body = await toggleAndCapture(page, c.toggle(detail), original.id);
          expect(body[c.field]).toBe(original[c.field]);
          expect(body.role, 'PUT body role').toBe(roleIri);
        });

        await test.step('bản ghi trở về đúng như ban đầu', async () => {
          expect(sameStaff(await getStaff(page, original.id), original)).toBeTruthy();
        });
      } finally {
        if (!sameStaff(await getStaff(page, original.id), original)) {
          await restoreStaff(page, original);
        }
      }
    });
  }
});
