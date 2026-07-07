import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

export type EnvName = 'local' | 'stage' | 'prod';

export interface AppEnv {
  ENV: EnvName;
  HEADLESS: boolean;
  SLOW_MO: number;

  BASE_URL: string;
  API_URL: string;

  API_TIMEOUT: number;

  /** Default portal credentials used by the login flow / global setup. */
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;

  /** Path to the persisted storageState (logged-in session) for UI projects. */
  STORAGE_STATE: string;

  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

const toBool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const toInt = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Loads environment-specific .env file from configs/env/.
 * Priority:
 *   1. Real OS env vars (CI/CD secret store) — never overridden
 *   2. configs/env/.env.<ENV>
 *   3. configs/env/.env.example (defaults)
 */
export const loadEnv = (): AppEnv => {
  const envName = (process.env.ENV ?? 'local') as EnvName;
  const envDir = path.resolve(__dirname);

  for (const file of [`.env.${envName}`, '.env.example']) {
    const full = path.join(envDir, file);
    if (fs.existsSync(full)) {
      dotenv.config({ path: full, override: false });
    }
  }

  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

  return {
    ENV: envName,
    HEADLESS: toBool(process.env.HEADLESS, true),
    SLOW_MO: toInt(process.env.SLOW_MO, 0),

    BASE_URL: baseUrl,
    API_URL: process.env.API_URL ?? `${baseUrl}/api`,

    API_TIMEOUT: toInt(process.env.API_TIMEOUT, 30000),

    ADMIN_USERNAME: process.env.ADMIN_USERNAME ?? 'admin',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? 'changeme',

    STORAGE_STATE: process.env.STORAGE_STATE ?? 'src/data/dynamic/auth/admin.json',

    LOG_LEVEL: (process.env.LOG_LEVEL as AppEnv['LOG_LEVEL']) ?? 'info',
  };
};

export const env: AppEnv = loadEnv();
