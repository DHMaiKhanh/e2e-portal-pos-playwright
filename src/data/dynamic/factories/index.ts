/**
 * Dynamic test-data factories (powered by @faker-js/faker).
 *
 *   import { buildCustomerInput, buildOrder } from '@data/dynamic/factories';
 *
 * Each entity exposes:
 *   - build<Entity>Input(overrides)  → a Create* payload for API/UI creation
 *   - build<Entity>(overrides)       → a full entity (e.g. for response mocks)
 *   - build<Entity>s(count, ...)     → arrays
 *
 * Set FAKER_SEED=<n> for reproducible data. See ./faker.ts.
 */
export * from './faker';
export * from './customerFactory';
export * from './productFactory';
export * from './orderFactory';
export * from './mockOrder';
export * from './mockStaff';
