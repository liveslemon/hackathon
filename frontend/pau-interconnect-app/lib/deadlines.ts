// Lagos timezone-aware internship deadline calculations.
// Nigeria operates on West Africa Time (WAT = UTC+1, Africa/Lagos) without DST.

export const LAGOS_TIMEZONE = "Africa/Lagos";
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Current date string (YYYY-MM-DD) in Lagos time. */
export function todayInLagos(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Parses deadline into a timestamp (epoch ms).
 * If a date-only string (e.g. "2026-10-15") is provided, the deadline is
 * treated as the end of that day in Lagos (23:59:59.999 WAT = +01:00).
 */
export function parseDeadlineTimestamp(
  deadline: string | null | undefined,
): number | null {
  if (!deadline || typeof deadline !== "string") return null;
  const trimmed = deadline.trim();
  if (!trimmed) return null;

  if (ISO_DATE_ONLY.test(trimmed)) {
    // End of the deadline day in Lagos time (UTC+1)
    return Date.parse(`${trimmed}T23:59:59.999+01:00`);
  }

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Check if the deadline has passed according to Lagos time. */
export function isDeadlinePassed(
  deadline: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!deadline) return false;
  const targetTs = parseDeadlineTimestamp(deadline);
  if (targetTs === null) return false;
  return now.getTime() > targetTs;
}

/**
 * Returns whether an internship is actively accepting applications.
 * Must have active status (defaults to "active") and deadline not passed.
 */
export function isOpenInternship(
  internship: {
    status?: string | null;
    deadline?: string | null;
  },
  now: Date = new Date(),
): boolean {
  if ((internship.status ?? "active") !== "active") return false;
  return !isDeadlinePassed(internship.deadline, now);
}

/**
 * Days remaining until deadline in Lagos time.
 * Returns:
 * - null if no deadline
 * - 0 if deadline is today in Lagos
 * - positive integer if in future
 * - negative integer if passed
 */
export function getDaysUntilDeadline(
  deadline: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!deadline || typeof deadline !== "string") return null;
  const trimmed = deadline.trim();
  if (!trimmed) return null;

  if (ISO_DATE_ONLY.test(trimmed)) {
    const today = todayInLagos(now);
    const diffMs =
      Date.parse(`${trimmed}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
    return Math.round(diffMs / DAY_MS);
  }

  const targetTs = parseDeadlineTimestamp(trimmed);
  if (targetTs === null) return null;
  const diffMs = targetTs - now.getTime();
  if (diffMs < 0) {
    return Math.floor(diffMs / DAY_MS);
  }
  return Math.ceil(diffMs / DAY_MS);
}

export interface DeadlineBadgeInfo {
  label: string;
  daysLeft: number | null;
  isClosed: boolean;
}

/** Helper for UI badges in cards and listings. */
export function formatDeadlineBadge(
  deadline: string | null | undefined,
  status?: string | null,
  now: Date = new Date(),
): DeadlineBadgeInfo {
  if ((status ?? "active") !== "active") {
    return { label: "Closed", daysLeft: null, isClosed: true };
  }

  const days = getDaysUntilDeadline(deadline, now);
  if (days === null) {
    return { label: "Open", daysLeft: null, isClosed: false };
  }

  if (days < 0) {
    return { label: "Closed", daysLeft: days, isClosed: true };
  }

  if (days === 0) {
    return { label: "Ends today", daysLeft: 0, isClosed: false };
  }

  return { label: `${days}d left`, daysLeft: days, isClosed: false };
}
