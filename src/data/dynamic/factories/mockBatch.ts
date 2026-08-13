import { faker } from './faker';

/**
 * Shapes mirroring the real (JSON-LD/Hydra) Volt POS `/batches` API, captured
 * from live network traffic on 2026-08-12:
 *
 *   GET https://volt-pos.<host>/batches?page=1&batch_date_range[batchDate][after]=…
 *   { "@type": "Collection", "totalItems": 34, "member": [ {
 *       "@id": "/batches/019dbeef-…", "@type": "MerchantBatchClose",
 *       "id": "019dbeef-…", "batchDate": "2026-06-11T17:00:00+00:00",
 *       "batchNumber": 103, "totalAmount": 79365, "totalCount": 3,
 *       "status": "closed" } ] }
 *
 * Note the field mapping the ledger applies when rendering a row:
 *   batchNumber 103        -> "B-00103"   (zero-padded to 5, "B-" prefixed)
 *   totalAmount 79365      -> "$793.65"   (minor units)
 *   totalCount  3          -> TOTAL PAYMENT "3"
 *   status "closed"        -> "Closed"
 *   batchDate  …T17:00Z    -> "Jun 12, 2026 (UTC+7)"
 */

export interface MockBatch {
  id: string;
  batchDate: string | null;
  batchNumber: number;
  /** Minor units (cents), like the real API. */
  totalAmount: number;
  totalCount: number;
  status: 'open' | 'closed';
}

/** Rows the ledger renders per page (confirmed live: 88 results over 3 pages). */
export const BATCHES_PAGE_SIZE = 30;

export const buildMockBatch = (overrides: Partial<MockBatch> = {}): MockBatch => {
  const id = overrides.id ?? faker.string.uuid();
  return {
    id,
    batchDate: faker.date.recent({ days: 30 }).toISOString(),
    batchNumber: faker.number.int({ min: 1, max: 999 }),
    totalAmount: faker.number.int({ min: 1000, max: 500000 }),
    totalCount: faker.number.int({ min: 1, max: 50 }),
    status: 'closed',
    ...overrides,
  };
};

/** Wraps rows in the Hydra `Collection` envelope `/batches?…` returns. */
export const buildMockBatchesCollection = (member: MockBatch[], totalItems?: number) => ({
  '@context': '/contexts/MerchantBatchClose',
  '@id': '/batches',
  '@type': 'Collection',
  totalItems: totalItems ?? member.length,
  member: member.map((batch) => ({
    '@id': `/batches/${batch.id}`,
    '@type': 'MerchantBatchClose',
    ...batch,
  })),
});

/** Slices a result set to the page requested by the `page` query param. */
export const paginateMockBatches = (batches: MockBatch[], requestUrl: string): MockBatch[] => {
  const pageNum = Number(new URL(requestUrl).searchParams.get('page') ?? '1') || 1;
  const start = (pageNum - 1) * BATCHES_PAGE_SIZE;
  return batches.slice(start, start + BATCHES_PAGE_SIZE);
};

/** The ledger's rendering of a batch number, e.g. 103 -> "B-00103". */
export const formatBatchNumber = (batchNumber: number): string =>
  `B-${String(batchNumber).padStart(5, '0')}`;

/** The ledger's rendering of a minor-unit amount, e.g. 79365 -> "$793.65". */
export const formatBatchAmount = (minorUnits: number): string =>
  `$${(minorUnits / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
