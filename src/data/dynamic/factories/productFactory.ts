import { faker } from './faker';
import type { Product, CreateProductInput } from '@api/models/Product';

const CATEGORIES = ['Service', 'Retail', 'Gift Card', 'Add-on'] as const;

/** Generate a `CreateProductInput` payload. */
export const buildProductInput = (
  overrides: Partial<CreateProductInput> = {},
): CreateProductInput => ({
  sku: faker.string.alphanumeric({ length: 8, casing: 'upper' }),
  name: faker.commerce.productName(),
  price: Number(faker.commerce.price({ min: 5, max: 200, dec: 2 })),
  category: faker.helpers.arrayElement(CATEGORIES),
  ...overrides,
});

/** Generate a full `Product` entity. */
export const buildProduct = (overrides: Partial<Product> = {}): Product => {
  const input = buildProductInput(overrides);
  return {
    id: faker.string.uuid(),
    active: true,
    ...input,
    ...overrides,
  };
};

/** Generate `count` product entities. */
export const buildProducts = (count: number, overrides: Partial<Product> = {}): Product[] =>
  Array.from({ length: count }, () => buildProduct(overrides));
