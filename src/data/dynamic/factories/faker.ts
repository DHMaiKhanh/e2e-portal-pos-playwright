import { faker } from '@faker-js/faker';

/**
 * Shared faker instance for all factories.
 *
 * Set `FAKER_SEED=<number>` to make generated data reproducible (handy for
 * debugging a flaky run or pinning a CI dataset). Without it, data is random
 * per run. Seeding once here keeps every factory on the same stream.
 */
const seed = process.env.FAKER_SEED;
if (seed !== undefined && seed !== '') {
  const n = Number(seed);
  if (Number.isFinite(n)) faker.seed(n);
}

export { faker };
