/**
 * Global ambient type declarations.
 * Extend this for any global augmentation (e.g. custom matchers, window props).
 */

export {};

declare global {
  // Example: surface custom env vars to TS without `process.env.X as string`.
  namespace NodeJS {
    interface ProcessEnv {
      ENV?: 'local' | 'stage' | 'prod';
      BASE_URL?: string;
      API_URL?: string;
      ADMIN_USERNAME?: string;
      ADMIN_PASSWORD?: string;
      STORAGE_STATE?: string;
      FAKER_SEED?: string;
      LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
    }
  }
}
