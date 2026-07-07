import { env } from '@configs/env/loadEnv';

export interface PortalUser {
  username: string;
  password: string;
  role: 'admin' | 'manager' | 'staff';
}

/**
 * Known portal accounts for tests. The ADMIN credentials come from env so they
 * never get committed; add fixed non-secret test accounts inline as needed.
 */
export const USERS = {
  ADMIN: {
    username: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
    role: 'admin',
  } satisfies PortalUser,

  // Example seeded accounts — replace with real test data.
  MANAGER: {
    username: 'manager.test',
    password: 'changeme',
    role: 'manager',
  } satisfies PortalUser,
} as const;
