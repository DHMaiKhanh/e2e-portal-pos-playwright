/** Common date helpers for building date-range filters and assertions. */

/** Format a Date as `YYYY-MM-DD`. */
export const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10);

/** Today as `YYYY-MM-DD` (UTC). Override TZ via the browser timezoneId in config. */
export const today = (): string => toIsoDate(new Date());

/** Add (or subtract, with a negative value) days to a date and return a new Date. */
export const addDays = (d: Date, days: number): Date => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};
