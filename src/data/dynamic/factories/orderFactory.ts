import { faker } from './faker';
import type { Order, OrderLineItem, CreateOrderInput, OrderStatus } from '@api/models/Order';
import type { Product } from '@api/models/Product';
import { buildProduct } from './productFactory';

const TAX_RATE = 0.0825; // 8.25% — adjust to the merchant's configured rate.
const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Generate a `CreateOrderInput`. Pass a `products` pool to reference real
 * product IDs; otherwise random ids are used. `lineCount` controls how many
 * items the order has (default 1–3).
 */
export const buildOrderInput = (
  overrides: { customerId?: string; products?: Product[]; lineCount?: number } = {},
): CreateOrderInput => {
  const { customerId, products, lineCount } = overrides;
  const n = lineCount ?? faker.number.int({ min: 1, max: 3 });

  const items = Array.from({ length: n }, () => {
    const product = products?.length ? faker.helpers.arrayElement(products) : buildProduct();
    return { productId: product.id, quantity: faker.number.int({ min: 1, max: 4 }) };
  });

  return { customerId, items };
};

/**
 * Generate a full `Order` entity with computed subtotal/tax/total. Pass a
 * `products` pool so line-item names/prices match real catalog data.
 */
export const buildOrder = (overrides: Partial<Order> & { products?: Product[] } = {}): Order => {
  const { products, items: itemsOverride, ...rest } = overrides;

  const items: OrderLineItem[] =
    itemsOverride ??
    Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => {
      const product = products?.length ? faker.helpers.arrayElement(products) : buildProduct();
      return {
        productId: product.id,
        name: product.name,
        quantity: faker.number.int({ min: 1, max: 4 }),
        unitPrice: product.price,
      };
    });

  const subtotal = round2(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));
  const tax = round2(subtotal * TAX_RATE);
  const total = round2(subtotal + tax);

  const status: OrderStatus = 'paid';

  return {
    id: faker.string.uuid(),
    orderNumber: `OD${faker.string.numeric({ length: 6 })}-${faker.string.numeric({ length: 6 })}`,
    status,
    customerId: undefined,
    createdAt: faker.date.recent({ days: 7 }).toISOString(),
    ...rest,
    items,
    subtotal,
    tax,
    total,
  };
};

/** Generate `count` order entities. */
export const buildOrders = (
  count: number,
  overrides: Partial<Order> & { products?: Product[] } = {},
): Order[] => Array.from({ length: count }, () => buildOrder(overrides));
