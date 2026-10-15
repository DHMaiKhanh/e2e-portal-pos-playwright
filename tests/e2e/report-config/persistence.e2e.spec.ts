import { test } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Real-persistence cases. The Report Configuration on DEV drives the live report
 * pages of every user, so nothing may be created, published, edited or deleted
 * there by the suite. These stay `test.fixme` until a disposable environment (or
 * a seeded, isolated merchant whose config is not shared) exists. The request
 * shapes they would exercise are already pinned by the mocked cases
 * TC-RCF-076 (create), 080 (clone), 082 (delete) and 083 (publish).
 */
test.describe('Ghi dữ liệu thật (Persistence) — Report Configuration', () => {
  // TODO(env): needs an isolated report-config tenant; DEV config is shared/live.
  test.fixme(
    'TC-RCF-170 — creating a page adds it to the list (Draft, Web layout only), then deleting removes it',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  // TODO(env): Publish ships a version to every POS — never on shared DEV.
  test.fixme(
    'TC-RCF-171 — Publish bumps "Published vN" to vN+1 and the live report serves the new layout',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  // TODO(env): editing a shared block changes every page that places it.
  test.fixme(
    'TC-RCF-172 — editing and saving a block persists after reload',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  // TODO(env): needs an API-level DELETE on an in-use source — a write against live data.
  test.fixme(
    'TC-RCF-173 — the API refuses to delete a source still used by a block (UI disables the button)',
    { tag: [Tag.REGRESSION, Tag.API] },
    async () => {},
  );
});
