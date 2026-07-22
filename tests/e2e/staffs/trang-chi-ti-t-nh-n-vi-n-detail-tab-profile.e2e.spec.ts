import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { StaffDetailPage } from '@pages/staffs/StaffsPage';

test.describe('Trang chi tiết nhân viên (Detail — tab Profile) — Staffs', () => {
  test.beforeEach(async ({ staffsPage }) => {
    await staffsPage.goto();
    await staffsPage.waitForReady();
  });

  test(
    'TC-STF-060 — mở trang chi tiết mặc định vào tab Profile',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ staffsPage, page }) => {
      const firstRow = staffsPage.table.rows.first();
      await expect(firstRow).toBeVisible();
      await firstRow.click();

      await expect(page).toHaveURL(/tab=profile/i);

      const detail = new StaffDetailPage(page);
      await detail.waitForReady();
      await expect(detail.profileTab).toBeVisible();
      await expect(detail.nickNameHeading).toBeVisible();
      await expect(detail.statusBadge).toBeVisible();
      await expect(detail.appointmentStaffToggle).toBeVisible();
    },
  );

  test(
    'TC-STF-061 — chuyển đổi giữa các tab cập nhật URL và nội dung',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const firstRow = staffsPage.table.rows.first();
      await firstRow.click();

      const detail = new StaffDetailPage(page);
      await detail.waitForReady();

      await detail.rolePermissionsTab.click();
      await expect(page).toHaveURL(/tab=permissions/i);

      await detail.compensationTab.click();
      await expect(page).toHaveURL(/tab=compensation/i);

      await detail.serviceSkillsTab.click();
      await expect(page).toHaveURL(/tab=(skills|serviceSkills)/i);

      await detail.workHoursTab.click();
      await expect(page).toHaveURL(/tab=(hours|workHours)/i);

      await detail.profileTab.click();
      await expect(page).toHaveURL(/tab=profile/i);
    },
  );

  /**
   * Steps:
   * 1. Ở tab Profile, đổi First Name/Last Name/Phone.
   * 2. Click "Save Changes".
   * Expected: Thông báo lưu thành công hiển thị; reload lại trang, thông tin mới vẫn được giữ.
   */
  // TODO(manual/setup): mutates backend staff data — needs seeded/disposable staff record to avoid corrupting shared test data
  test.fixme(
    'TC-STF-062 — chỉnh sửa thông tin Profile và Save Changes',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({}) => {},
  );

  /**
   * Steps:
   * 1. Sửa 1 trường bất kỳ ở tab Profile mà không Save.
   * 2. Điều hướng sang màn hình khác (vd click "Orders").
   * Expected: Hoặc có cảnh báo "thay đổi chưa lưu", hoặc thay đổi bị huỷ bỏ khi quay lại (không lưu ngầm).
   */
  // TODO(manual/setup): needs verification of unsaved-changes guard behavior across navigation; risk of unintended data mutation
  test.fixme(
    'TC-STF-063 — sửa thông tin nhưng không lưu, điều hướng ra khỏi trang',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({}) => {},
  );

  /**
   * Steps:
   * 1. Click "Change" cạnh Profile Photo, chọn ảnh hợp lệ.
   * Expected: Ảnh mới hiển thị preview; sau khi "Save Changes", ảnh được cập nhật và hiển thị lại đúng khi tải lại trang.
   */
  // TODO(manual/setup): requires file upload + backend persistence verification across reload
  test.fixme(
    'TC-STF-064 — đổi ảnh đại diện qua nút "Change"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({}) => {},
  );

  /**
   * Steps:
   * 1. Đổi Staff Role từ "Staff" sang "Manager".
   * 2. Save Changes.
   * Expected: Thay đổi được lưu, badge/role hiển thị đúng giá trị mới sau khi tải lại.
   */
  // TODO(manual/setup): mutates staff role — needs seeded/disposable staff record to avoid corrupting shared test data
  test.fixme(
    'TC-STF-065 — đổi Staff Role tại trang chi tiết',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({}) => {},
  );

  /**
   * Steps:
   * 1. Đổi status của nhân viên đang Active sang Inactive.
   * 2. Save Changes.
   * 3. Quay lại danh sách Staffs.
   * Expected: Badge status ở trang chi tiết cập nhật; ở danh sách, nhân viên này không còn hiển thị khi filter = Active và xuất hiện khi filter = Inactive.
   */
  // TODO(manual/setup): mutates staff status and requires cross-screen state verification — needs seeded/disposable staff record
  test.fixme(
    'TC-STF-066 — đổi Status (Active ⇄ Inactive) tại trang chi tiết',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({}) => {},
  );

  /**
   * Steps:
   * 1. Bật/tắt toggle "Appointment Staff", lưu thay đổi (nếu có nút save riêng hoặc lưu ngay lập tức — cần xác minh trực tiếp hành vi).
   * Expected: Trạng thái toggle được lưu và phản ánh đúng khi tải lại trang.
   */
  // TODO(manual/setup): needs live verification of whether toggle autosaves or requires Save Changes, and persistence across reload
  test.fixme(
    'TC-STF-067 — toggle "Appointment Staff"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({}) => {},
  );

  test(
    'TC-STF-068 — tab "Role & Permissions" — Expand All mở rộng các nhóm quyền',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const firstRow = staffsPage.table.rows.first();
      await firstRow.click();

      const detail = new StaffDetailPage(page);
      await detail.waitForReady();
      await detail.rolePermissionsTab.click();
      await expect(page).toHaveURL(/tab=permissions/i);

      await expect(detail.expandAllButton).toBeVisible();
      await detail.expandAllButton.click();
      await expect(detail.saveChangesButton).toBeVisible();
    },
  );

  test(
    'TC-STF-069 — truy cập trực tiếp URL chi tiết với ID không tồn tại',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const detail = new StaffDetailPage(page);
      await detail.gotoTab('00000000-0000-0000-0000-000000000000', 'profile');

      const notFoundIndicator = page
        .getByText(/not found|404|no.*staff.*found|không tìm thấy/i)
        .or(staffsPage.emptyState);
      await expect(notFoundIndicator.first()).toBeVisible();
    },
  );

  /**
   * Steps:
   * 1. Điều hướng tới `.../staffs/<uuid>?tab=unknown_tab`.
   * Expected: Ứng dụng fallback về tab mặc định "Profile" thay vì hiển thị màn hình trắng/lỗi.
   */
  // TODO(manual/setup): needs a valid existing staff uuid seeded ahead of time to combine with an invalid tab query param
  test.fixme(
    'TC-STF-070 — truy cập trang chi tiết với `?tab=` giá trị không hợp lệ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({}) => {},
  );
});
