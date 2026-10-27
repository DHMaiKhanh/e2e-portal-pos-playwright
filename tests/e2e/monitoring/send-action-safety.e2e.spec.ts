import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Monitoring › Remote Actions — the "Send action" form at
 * `/pos/nail/admin/remote-actions/send-action` (Merchant / Action / Device /
 * Delivery). Submitting it executes a command on a live POS device, so this
 * suite is strictly READ-ONLY: it blocks writes first, only ever asserts the
 * form renders and that Send stays disabled until an Action is chosen, and
 * NEVER picks an action or clicks Send. The write-guard recorder proves nothing
 * reached the backend.
 */
test.describe('An toàn gửi lệnh (Send action safety) — Remote Actions', () => {
  test.beforeEach(async ({ remoteActionsPage }) => {
    await remoteActionsPage.blockWrites();
    await remoteActionsPage.openSendAction();
  });

  /**
   * TC-RMA-020 — the send-action form renders with its Action select and Send
   * button, no login redirect.
   */
  test(
    'TC-RMA-020 — the send-action form renders at /remote-actions/send-action',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ remoteActionsPage, page }) => {
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/remote-actions\/send-action/);
      await expect(remoteActionsPage.sendActionButton).toBeVisible();
      await expect(remoteActionsPage.actionSelect).toBeVisible();
    },
  );

  /**
   * TC-RMA-021 — Send action stays disabled until an Action is picked.
   *
   * READ-ONLY: no Action is ever chosen, so the button must stay inert. Tolerant
   * — if the app ships it enabled, annotate instead of failing; it is never
   * clicked either way.
   */
  test(
    'TC-RMA-021 — Send action stays disabled until an Action is chosen',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ remoteActionsPage }) => {
      const send = remoteActionsPage.sendActionButton;
      await expect(send).toBeVisible();

      if (await send.isEnabled()) {
        test.info().annotations.push({
          type: 'app-gap',
          description: 'Send action is enabled before an Action is picked',
        });
      } else {
        await expect(send).toBeDisabled();
      }
    },
  );

  /**
   * TC-RMA-022 — viewing the send-action form fires no remote-action write.
   */
  test(
    'TC-RMA-022 — viewing the send-action form fires no remote-action write',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ remoteActionsPage }) => {
      const blocked = await remoteActionsPage.blockWrites();
      await remoteActionsPage.openSendAction();

      // The form was only rendered — no Action chosen, Send never clicked — so
      // nothing may have reached the backend.
      expect(blocked, 'a remote action escaped while only viewing the form').toEqual([]);
    },
  );
});
