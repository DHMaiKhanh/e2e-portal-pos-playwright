export const Tag = {
  SMOKE: '@smoke',
  REGRESSION: '@regression',
  CRITICAL: '@critical',
  SLOW: '@slow',
  FLAKY: '@flaky',
  API: '@api',
  UI: '@ui',
  VISUAL: '@visual',
  AUTH: '@auth',
} as const;

export type TagKey = keyof typeof Tag;
export type TagValue = (typeof Tag)[TagKey];
