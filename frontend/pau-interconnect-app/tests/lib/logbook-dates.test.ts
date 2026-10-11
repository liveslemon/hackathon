import { describe, expect, it } from "vitest";
import {
  canEditEntry,
  daysAgo,
  earliestBackfillDate,
  todayInLagos,
} from "@/lib/logbook-dates";

describe("todayInLagos", () => {
  it("uses Nigerian time, not UTC", () => {
    // 23:30 UTC on 10 Oct is 00:30 on 11 Oct in Lagos (UTC+1).
    expect(todayInLagos(new Date("2026-10-10T23:30:00Z"))).toBe("2026-10-11");
    expect(todayInLagos(new Date("2026-10-10T22:30:00Z"))).toBe("2026-10-10");
  });
});

describe("backfill window", () => {
  it("covers today and the previous 6 days", () => {
    expect(earliestBackfillDate("2026-10-11")).toBe("2026-10-05");
    expect(daysAgo("2026-10-05", "2026-10-11")).toBe(6);
  });
});

describe("canEditEntry", () => {
  const today = "2026-10-11";
  it("allows new entries inside the window only", () => {
    expect(canEditEntry(null, "2026-10-11", today)).toBe(true);
    expect(canEditEntry(null, "2026-10-05", today)).toBe(true);
    expect(canEditEntry(null, "2026-10-04", today)).toBe(false);
    expect(canEditEntry(null, "2026-10-12", today)).toBe(false);
  });
  it("locks approved entries even if recent", () => {
    expect(canEditEntry({ date: today, status: "approved" }, today, today)).toBe(false);
  });
  it("always lets students correct entries returned by their supervisor", () => {
    expect(canEditEntry({ date: "2026-09-01", status: "flagged" }, "2026-09-01", today)).toBe(true);
  });
});
