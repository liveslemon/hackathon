import { describe, it, expect } from "vitest";
import {
  todayInLagos,
  parseDeadlineTimestamp,
  isDeadlinePassed,
  isOpenInternship,
  getDaysUntilDeadline,
  formatDeadlineBadge,
} from "../../lib/deadlines";

describe("Lagos deadline calculations", () => {
  it("computes today in Lagos (WAT = UTC+1)", () => {
    // 2026-10-12 23:30 UTC is 2026-10-13 00:30 in Lagos
    const nearMidnightUtc = new Date("2026-10-12T23:30:00Z");
    expect(todayInLagos(nearMidnightUtc)).toBe("2026-10-13");

    // 2026-10-12 05:00 UTC is 2026-10-12 in Lagos
    const morningUtc = new Date("2026-10-12T05:00:00Z");
    expect(todayInLagos(morningUtc)).toBe("2026-10-12");
  });

  it("treats date-only strings as open through 23:59:59.999 in Lagos", () => {
    const deadline = "2026-10-15";
    expect(parseDeadlineTimestamp(deadline)).not.toBeNull();
    expect(parseDeadlineTimestamp("not-a-date")).toBeNull();

    // At 10:00 AM Lagos time on Oct 15 (09:00 UTC)
    const onDayMorning = new Date("2026-10-15T09:00:00Z");
    expect(isDeadlinePassed(deadline, onDayMorning)).toBe(false);
    expect(isOpenInternship({ status: "active", deadline }, onDayMorning)).toBe(true);

    // At 23:50 Lagos time on Oct 15 (22:50 UTC)
    const onDayNight = new Date("2026-10-15T22:50:00Z");
    expect(isDeadlinePassed(deadline, onDayNight)).toBe(false);
    expect(isOpenInternship({ status: "active", deadline }, onDayNight)).toBe(true);

    // After midnight Lagos time on Oct 16 (23:01 UTC on Oct 15 = 00:01 WAT on Oct 16)
    const afterMidnight = new Date("2026-10-15T23:01:00Z");
    expect(isDeadlinePassed(deadline, afterMidnight)).toBe(true);
    expect(isOpenInternship({ status: "active", deadline }, afterMidnight)).toBe(false);
  });

  it("handles non-active statuses regardless of deadline", () => {
    const futureDate = "2099-01-01";
    expect(isOpenInternship({ status: "closed", deadline: futureDate })).toBe(false);
    expect(isOpenInternship({ status: "draft", deadline: futureDate })).toBe(false);
    expect(isOpenInternship({ status: "expired", deadline: futureDate })).toBe(false);
  });

  it("defaults to active if status is omitted", () => {
    const futureDate = "2099-01-01";
    expect(isOpenInternship({ deadline: futureDate })).toBe(true);
    expect(isOpenInternship({})).toBe(true);
  });

  it("calculates getDaysUntilDeadline accurately", () => {
    // Current time: 2026-10-12 12:00 WAT (11:00 UTC)
    const now = new Date("2026-10-12T11:00:00Z");

    // Same day: 0 days left
    expect(getDaysUntilDeadline("2026-10-12", now)).toBe(0);

    // Tomorrow: 1 day left
    expect(getDaysUntilDeadline("2026-10-13", now)).toBe(1);

    // 5 days later: 5 days left
    expect(getDaysUntilDeadline("2026-10-17", now)).toBe(5);

    // Yesterday: -1 days (passed)
    expect(getDaysUntilDeadline("2026-10-11", now)).toBe(-1);

    // Missing: null
    expect(getDaysUntilDeadline(null, now)).toBeNull();
  });

  it("formats deadline badge for UI appropriately", () => {
    const now = new Date("2026-10-12T11:00:00Z");

    // Ends today
    expect(formatDeadlineBadge("2026-10-12", "active", now)).toEqual({
      label: "Ends today",
      daysLeft: 0,
      isClosed: false,
    });

    // 3 days left
    expect(formatDeadlineBadge("2026-10-15", "active", now)).toEqual({
      label: "3d left",
      daysLeft: 3,
      isClosed: false,
    });

    // Closed (past)
    expect(formatDeadlineBadge("2026-10-01", "active", now)).toEqual({
      label: "Closed",
      daysLeft: -11,
      isClosed: true,
    });

    // Closed by status
    expect(formatDeadlineBadge("2026-10-20", "closed", now)).toEqual({
      label: "Closed",
      daysLeft: null,
      isClosed: true,
    });

    // No deadline specified
    expect(formatDeadlineBadge(null, "active", now)).toEqual({
      label: "Open",
      daysLeft: null,
      isClosed: false,
    });
  });
});
