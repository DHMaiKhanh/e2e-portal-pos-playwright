import { faker } from './faker';

/**
 * Shapes mirroring the real (JSON-LD/Hydra) Volt POS `/orders` API, captured by
 * inspecting live network traffic. Used to build deterministic `page.route()`
 * fixtures for the Orders UI instead of depending on live backend data state.
 */

export interface MockOrderListItem {
  id: string;
  orderCode: string;
  total: number;
  status: string;
  settled: boolean;
  customerName?: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  cardInfos: unknown[];
  paymentTypes: string[];
  staffs: string[];
  /** Staff ids this order is assigned to — used only to satisfy the `staff=<id>`
   *  API filter in mocks; the real app ignores this extra field. */
  staffIds?: string[];
}

/** Rows the app renders per page in the Orders table (confirmed via live network capture). */
export const ORDERS_PAGE_SIZE = 30;

/** One row as returned inside the `/orders?...` collection's `member` array. */
export const buildMockOrderListItem = (
  overrides: Partial<MockOrderListItem> = {},
): MockOrderListItem => ({
  id: faker.string.uuid(),
  orderCode: `OD${faker.string.numeric({ length: 6 })}-${faker.string.numeric({ length: 6 })}`,
  total: faker.number.int({ min: 1000, max: 50000 }),
  status: 'successful',
  settled: true,
  completedAt: faker.date.recent({ days: 1 }).toISOString(),
  createdAt: faker.date.recent({ days: 1 }).toISOString(),
  updatedAt: faker.date.recent({ days: 1 }).toISOString(),
  cardInfos: [],
  paymentTypes: ['cash'],
  staffs: [faker.person.firstName()],
  ...overrides,
});

/** Wraps rows in the Hydra `Collection` envelope the `/orders?...` endpoint returns. */
export const buildMockOrdersCollection = (member: MockOrderListItem[], totalItems?: number) => ({
  '@context': '/contexts/Order',
  '@id': '/orders',
  '@type': 'Collection',
  totalItems: totalItems ?? member.length,
  member,
});

/** Single order as returned by `GET /orders/<uuid>` (the order detail sub-route). */
export const buildMockOrderDetail = (overrides: Record<string, unknown> = {}) => {
  const id = (overrides.id as string) ?? faker.string.uuid();
  const total = (overrides.total as number) ?? faker.number.int({ min: 1000, max: 50000 });

  return {
    '@context': '/contexts/Order',
    '@id': `/orders/${id}`,
    '@type': 'Order',
    id,
    orderCode: `OD${faker.string.numeric({ length: 6 })}-${faker.string.numeric({ length: 6 })}`,
    subtotal: total,
    taxAmount: 0,
    total,
    tipAmount: 0,
    status: 'successful',
    settled: true,
    totalDiscount: 0,
    totalPromotionDiscount: 0,
    rewardRedemptionAmount: 0,
    completedAt: faker.date.recent({ days: 1 }).toISOString(),
    createdAt: faker.date.recent({ days: 1 }).toISOString(),
    updatedAt: faker.date.recent({ days: 1 }).toISOString(),
    orderTransactions: [
      {
        '@id': `/order_transactions/${faker.string.uuid()}`,
        '@type': 'OrderTransaction',
        id: faker.string.uuid(),
        transactionType: 'sale',
        paymentType: 'card',
        amount: total,
        currencyCode: 'USD',
        cashTendered: 0,
        change: 0,
        cashDiscount: 0,
        tip: 0,
        taxAmount: 0,
        isCancelled: false,
        remainingAmount: total,
        createdAt: faker.date.recent({ days: 1 }).toISOString(),
        updatedAt: faker.date.recent({ days: 1 }).toISOString(),
      },
    ],
    orderItems: [
      {
        '@id': `/order_items/${faker.string.uuid()}`,
        '@type': 'OrderItem',
        id: faker.string.uuid(),
        currencyCode: 'USD',
        type: 'service',
        serviceName: 'Full Set (clear or polish)',
        servicePrice: total,
        staffName: 'Luna',
        staffPhone: '',
        finalPrice: total,
        updatedAt: faker.date.recent({ days: 1 }).toISOString(),
      },
    ],
    orderBlockItems: [],
    orderTipShares: [],
    ...overrides,
  };
};

/** A `void` order transaction — the detail page renders one Cancel Information
 *  credit note per void transaction. */
export const buildMockVoidTransaction = (overrides: Record<string, unknown> = {}) => {
  const amount = (overrides.amount as number) ?? faker.number.int({ min: 1000, max: 50000 });
  return {
    '@id': `/order_transactions/${faker.string.uuid()}`,
    '@type': 'OrderTransaction',
    id: faker.string.uuid(),
    transactionType: 'void',
    paymentType: 'cash',
    amount,
    currencyCode: 'USD',
    cashTendered: amount,
    change: 0,
    tip: 0,
    taxAmount: 0,
    isCancelled: false,
    staffName: 'Andy',
    reason: 'incorrect_order',
    remainingAmount: 0,
    createdAt: faker.date.recent({ days: 1 }).toISOString(),
    updatedAt: faker.date.recent({ days: 1 }).toISOString(),
    ...overrides,
  };
};

/**
 * Filters a master set of mock orders the same way the real `/orders?...` API
 * does, by reading the query params off the actual (Hydra-shaped) request URL.
 * Lets a single `page.route` fixture power filter tests deterministically:
 * applying more filters narrows the result, clearing them widens it back.
 */
export const filterMockOrders = (
  orders: MockOrderListItem[],
  requestUrl: string,
): MockOrderListItem[] => {
  const sp = new URL(requestUrl).searchParams;
  let result = orders;

  const search = sp.get('search');
  if (search) {
    const needle = search.toLowerCase();
    result = result.filter((o) =>
      `${o.orderCode} ${o.customerName ?? ''}`.toLowerCase().includes(needle),
    );
  }

  const statuses = sp.getAll('status[]');
  if (statuses.length > 0) {
    result = result.filter((o) => statuses.includes(o.status));
  }

  if (sp.has('is_settled')) {
    const settled = sp.get('is_settled') === 'true';
    result = result.filter((o) => o.settled === settled);
  }

  const paymentMethod = sp.get('payment_method');
  if (paymentMethod === 'cash') {
    result = result.filter((o) => o.paymentTypes.includes('cash'));
  } else if (paymentMethod === 'card') {
    result = result.filter((o) => o.cardInfos.length > 0);
  } else if (paymentMethod) {
    result = result.filter((o) => o.paymentTypes.includes(paymentMethod));
  }

  const staff = sp.get('staff');
  if (staff) {
    result = result.filter((o) => o.staffIds?.includes(staff));
  }

  return result;
};

/** Slices a result set to the page requested by the `page` query param. */
export const paginateMockOrders = (
  orders: MockOrderListItem[],
  requestUrl: string,
): MockOrderListItem[] => {
  const pageNum = Number(new URL(requestUrl).searchParams.get('page') ?? '1') || 1;
  const start = (pageNum - 1) * ORDERS_PAGE_SIZE;
  return orders.slice(start, start + ORDERS_PAGE_SIZE);
};
