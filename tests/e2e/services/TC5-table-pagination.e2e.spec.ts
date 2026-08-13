import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';

test.describe('Bảng dữ liệu & Phân trang (Table / Pagination) — Services', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.goto();
  });

  test(
    'TC-SVC-040 — header bảng đúng thứ tự và nhãn cột',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      const headers = productsPage.columnHeaders;
      await expect(headers).toHaveText([
        'NAME & DESCRIPTION',
        'PRICE',
        'DURATION',
        'SUPPLY FEE',
        'STATUS',
      ]);
    },
  );

  test(
    'TC-SVC-041 — định dạng cột PRICE và SUPPLY FEE hiển thị đúng tiền USD',
    {
      tag: [Tag.REGRESSION, Tag.UI],
    },
    async ({ page }) => {
      const priceCells = page.getByRole('cell', { name: /^\$[\d,]+\.\d{2}$/ });
      await expect(priceCells.first()).toBeVisible();
      const count = await priceCells.count();
      expect(count).toBeGreaterThan(0);
    },
  );

  /**
   * Steps:
   * 1. Quan sát cột DURATION trên các dòng không có thời gian thực hiện (đa số dòng mẫu) và trên dòng có thời gian (vd "Dipping Ombre" → "30 minutes").
   * Expected:
   * Dòng không đặt duration hiển thị "—"; dòng có đặt hiển thị đúng chuỗi thời gian dạng "N minutes".
   */
  /**
   * The note asked which rows have a duration; the answer is that the catalogue
   * holds both kinds (133 with, 126 without, of 259), so neither state has to be
   * guessed — search reaches a known example of each, and the whole first page
   * is checked to make sure nothing renders a third, malformed shape.
   */
  test(
    'TC-SVC-042 — cột DURATION hiển thị "—" khi không đặt thời gian',
    {
      tag: [Tag.REGRESSION, Tag.UI],
    },
    async ({ productsPage }) => {
      const durationOf = async (serviceName: string): Promise<string> => {
        await productsPage.search(serviceName);
        const row = productsPage.table.rowContaining(serviceName);
        await expect(row.first()).toBeVisible();
        return (await row.first().getByRole('cell').nth(2).innerText()).trim();
      };

      await test.step('A service with a duration shows it', async () => {
        expect(await durationOf('Dipping Ombre')).toMatch(/^\d+ (minutes?|hours?)/);
      });

      await test.step('A service without one shows the em dash', async () => {
        expect(await durationOf('Diamond Pedicure')).toBe('—');
      });

      await test.step('Every row uses one of those two shapes', async () => {
        await productsPage.search('');
        const rows = productsPage.table.rows;
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);
        for (let index = 0; index < count; index++) {
          const duration = (await rows.nth(index).getByRole('cell').nth(2).innerText()).trim();
          expect(duration, `row ${index} DURATION`).toMatch(
            /^(—|\d+ (minutes?|hours?)( \d+ (minutes?))?)$/,
          );
        }
      });
    },
  );

  /**
   * Steps:
   * 1. Quan sát dòng có mô tả (vd "Gel Manicure product 2" với mô tả "Gel nail polish") và dòng không có mô tả.
   * Expected:
   * Dòng có mô tả hiển thị tên chính + đoạn mô tả nhỏ bên dưới; dòng không có mô tả chỉ hiển thị tên, không có khoảng trắng thừa/dòng trống bất thường.
   */
  /**
   * Both shapes exist in the catalogue — "Gel Manicure product 2" carries the
   * description "Gel nail polish", most rows carry none — so each half is
   * reachable by search rather than dependent on what lands on page 1.
   */
  test(
    'TC-SVC-043 — NAME & DESCRIPTION hiển thị mô tả phụ khi có',
    {
      tag: [Tag.REGRESSION, Tag.UI],
    },
    async ({ productsPage }) => {
      const nameCellOf = async (serviceName: string): Promise<string> => {
        await productsPage.search(serviceName);
        const row = productsPage.table.rowContaining(serviceName);
        await expect(row.first()).toBeVisible();
        return (await row.first().getByRole('cell').first().innerText()).trim();
      };

      // The cell stacks a <span> name over a <p> description, which innerText
      // renders with a blank line between them — drop the empties rather than
      // indexing straight into the split.
      const linesOf = (cell: string): string[] =>
        cell
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

      await test.step('A described service shows name then description', async () => {
        const lines = linesOf(await nameCellOf('Gel Manicure product 2'));
        expect(lines).toEqual(['Gel Manicure product 2', 'Gel nail polish']);
      });

      await test.step('An undescribed service shows the name alone', async () => {
        const cell = await nameCellOf('Diamond Pedicure');
        // Never a stringified empty value — "no description" must render as
        // nothing at all, not as "null".
        expect(linesOf(cell)).toEqual(['Diamond Pedicure']);
        expect(cell).not.toMatch(/null|undefined/i);
      });
    },
  );

  test(
    'TC-SVC-044 — phân trang hiển thị đúng tổng số kết quả và số trang',
    {
      tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE],
    },
    async ({ productsPage }) => {
      await expect(productsPage.paginationFooter).toHaveText(/Showing \d+ to \d+ of \d+ results/);
      await expect(productsPage.pageIndicator).toHaveText(/^1 \/ \d+$/);
      await expect(productsPage.previousPageButton).toBeDisabled();
      await expect(productsPage.nextPageButton).toBeEnabled();
    },
  );

  test(
    'TC-SVC-045 — click "Next"/"Previous" chuyển trang đúng dữ liệu',
    {
      tag: [Tag.REGRESSION, Tag.UI],
    },
    async ({ productsPage }) => {
      const firstPageFooter = await productsPage.paginationFooterText();

      await productsPage.goToNextPage();
      await expect(productsPage.pageIndicator).toHaveText(/^2 \/ \d+$/);
      const secondPageFooter = await productsPage.paginationFooterText();
      expect(secondPageFooter).not.toBe(firstPageFooter);

      await productsPage.goToPreviousPage();
      await expect(productsPage.pageIndicator).toHaveText(/^1 \/ \d+$/);
      const backToFirstFooter = await productsPage.paginationFooterText();
      expect(backToFirstFooter).toBe(firstPageFooter);
    },
  );

  /**
   * Steps:
   * 1. Chuyển tới trang cuối (9/…) bằng cách click "Next" liên tục hoặc điều hướng trực tiếp qua query param page.
   * 2. Quan sát footer và nút Next.
   * Expected:
   * Nút "Next" bị disabled; footer hiển thị đúng số dòng còn lại (vd "Showing 241 to 259 of 259 results" nếu tổng là 259); không có dòng trống/lỗi hiển thị.
   */
  /**
   * The page count does not have to be known up front — it is on the screen.
   * Read "n / m" from the indicator, jump straight to page m by query param,
   * and derive the expected footer range from the total the footer itself
   * reports. That keeps the case honest as the catalogue grows.
   */
  test(
    'TC-SVC-046 — trang cuối cùng disable nút "Next" và hiển thị đủ số dòng còn lại',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      const firstPageFooter = await productsPage.paginationFooterText();
      const total = Number(firstPageFooter.match(/of (\d+) results/i)?.[1]);
      expect(total).toBeGreaterThan(0);

      const lastPage = Number((await productsPage.pageIndicatorText()).split('/')[1]?.trim());
      expect(lastPage).toBeGreaterThan(1);

      await page.goto(`${Urls.PRODUCTS}?page=${lastPage}`, { waitUntil: 'domcontentloaded' });
      await productsPage.waitForReady();

      const pageSize = 30;
      const from = (lastPage - 1) * pageSize + 1;
      await expect(productsPage.paginationFooter.first()).toHaveText(
        new RegExp(`Showing ${from} to ${total} of ${total} results`, 'i'),
      );
      await expect(productsPage.table.rows).toHaveCount(total - from + 1);
      await expect(productsPage.nextPageButton).toBeDisabled();
      await expect(productsPage.previousPageButton).toBeEnabled();

      // No placeholder or empty rows padding the short final page.
      for (const rowText of await productsPage.table.rows.allInnerTexts()) {
        expect(rowText.trim().length).toBeGreaterThan(0);
      }
    },
  );

  /**
   * Steps:
   * 1. Click vào một dòng bất kỳ trong bảng (ngoài các nút hành động).
   * Expected:
   * Mở modal/trang sửa dịch vụ hiển thị đầy đủ thông tin của dịch vụ đó (tên, mô tả, giá, thời gian, supply fee, trạng thái, category) — cần xác minh trực tiếp vì chưa quét được nội dung modal.
   */
  /**
   * The modal is now scanned: a row click opens "Edit Service", the same form
   * "Add Service" opens under a different title, pre-filled from the row.
   * Read-only here — it opens, checks the values, and cancels out.
   */
  test(
    'TC-SVC-047 — click vào một dòng dịch vụ mở chi tiết/sửa dịch vụ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      const row = productsPage.table.rows.first();
      const cells = (await row.innerText()).split('\t').map((cell) => cell.trim());
      const name = cells[0].split('\n')[0].trim();
      const price = cells[1];

      await row.click();

      await expect(productsPage.serviceDialog).toBeVisible();
      await expect(productsPage.serviceDialog).toContainText(/edit service/i);

      await test.step('The form carries this row’s values', async () => {
        await expect(productsPage.serviceNameInput).toHaveValue(name);
        await expect(productsPage.servicePriceInput).toHaveValue(price);
        // Every documented field is present, not just the two compared above.
        await expect(productsPage.serviceCategoryCombobox).toBeVisible();
        await expect(productsPage.serviceSupplyFeeInput).toBeVisible();
        await expect(productsPage.serviceDescriptionInput).toBeVisible();
        await expect(productsPage.serviceDialog).toContainText(/service duration/i);
        await expect(productsPage.serviceDialog).toContainText(/visibility settings/i);
      });

      await test.step('Cancel closes it without changing the row', async () => {
        await productsPage.serviceDialogCancelButton.click();
        await expect(productsPage.serviceDialog).toBeHidden();
        await expect(productsPage.table.rows.first()).toContainText(name);
        expect(page.url()).toContain('/services');
      });
    },
  );
});
