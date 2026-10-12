// SIWES logbook date rules, shared by the logbook page and its API route.
// "Today" is Nigerian time, not the server's UTC clock.

export const LOGBOOK_TIMEZONE = "Africa/Lagos";
/** Students may log or edit entries this many days back (today included). */
export const BACKFILL_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function todayInLagos(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LOGBOOK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value);
}

/** Whole days from `date` to `today` (both YYYY-MM-DD). Negative = future. */
export function daysAgo(date: string, today: string): number {
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / DAY_MS);
}

export function earliestBackfillDate(today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (BACKFILL_DAYS - 1));
  return d.toISOString().slice(0, 10);
}

export function isFutureDate(date: string, today: string = todayInLagos()): boolean {
  return daysAgo(date, today) < 0;
}

/**
 * Approved entries are locked. Entries a supervisor returned ("flagged") can
 * always be corrected, but future dates are strictly rejected. Otherwise only dates in the backfill window.
 */
export function canEditEntry(
  entry: { date: string; status?: string | null } | null,
  date: string,
  today: string,
): boolean {
  if (isFutureDate(date, today)) return false;
  if (entry?.status === "approved") return false;
  if (entry?.status === "flagged") return true;
  const age = daysAgo(date, today);
  return age >= 0 && age < BACKFILL_DAYS;
}
