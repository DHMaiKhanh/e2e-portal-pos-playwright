import { faker } from './faker';
import type { Customer, CreateCustomerInput } from '@api/models/Customer';

/** Generate a `CreateCustomerInput` payload (for API/UI creation). */
export const buildCustomerInput = (
  overrides: Partial<CreateCustomerInput> = {},
): CreateCustomerInput => ({
  name: faker.person.fullName(),
  // Digits-only phone keeps it portable across input masks.
  phone: faker.string.numeric({ length: 10 }),
  email: faker.internet.email().toLowerCase(),
  ...overrides,
});

/** Generate a full `Customer` entity (e.g. for mocking API responses). */
export const buildCustomer = (overrides: Partial<Customer> = {}): Customer => {
  const input = buildCustomerInput(overrides);
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.recent({ days: 30 }).toISOString(),
    ...input,
    ...overrides,
  };
};

/** Generate `count` customer inputs. */
export const buildCustomerInputs = (
  count: number,
  overrides: Partial<CreateCustomerInput> = {},
): CreateCustomerInput[] => Array.from({ length: count }, () => buildCustomerInput(overrides));
