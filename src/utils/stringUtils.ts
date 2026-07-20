/** Common string helpers. */

/** Collapse runs of whitespace and trim — handy for comparing scraped text. */
export const normalizeWhitespace = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** Strip currency symbols/commas and parse to a number (e.g. "$1,234.50" -> 1234.5). */
export const parseMoney = (s: string): number => Number(s.replace(/[^0-9.-]+/g, '')) || 0;

/** Random alphanumeric suffix for unique test data (deterministic length). */
export const randomSuffix = (len = 6): string =>
  Math.random()
    .toString(36)
    .slice(2, 2 + len);
