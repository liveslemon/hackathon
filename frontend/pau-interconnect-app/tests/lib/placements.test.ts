import { describe, expect, it } from "vitest";
import {
  getActivePlacement,
  hasActivePlacement,
  placementLabel,
  toPlacements,
} from "@/lib/placements";

describe("toPlacements", () => {
  it("keeps only placements, active first then most recent", () => {
    const rows = [
      { id: "old", placement_status: "completed", started_at: "2026-03-01", ended_at: "2026-06-01", internship: { role: "A", company: "X" } },
      { id: "applied", placement_status: null, started_at: null, internship: { role: "B" } },
      { id: "newer", placement_status: "completed", started_at: "2026-07-01", ended_at: "2026-09-01", internship: [{ role: "C", company: "Y" }] },
      { id: "now", placement_status: "active", started_at: "2026-10-01", internship: { role: "D", company: "Z" } },
    ];
    const result = toPlacements(rows);
    expect(result.map((p) => p.id)).toEqual(["now", "newer", "old"]);
    expect(result[1]).toMatchObject({ role: "C", company: "Y" });
  });

  it("handles empty or null application lists", () => {
    expect(toPlacements(null)).toEqual([]);
    expect(toPlacements(undefined)).toEqual([]);
    expect(toPlacements([])).toEqual([]);
  });
});

describe("placement helpers", () => {
  it("resolves active placement and checks active presence", () => {
    const placements = [
      { id: "1", placement_status: "completed" as const, started_at: "2026-01-01", ended_at: "2026-03-01" },
      { id: "2", placement_status: "active" as const, started_at: "2026-04-01", ended_at: null },
    ];
    expect(getActivePlacement(placements)?.id).toBe("2");
    expect(hasActivePlacement(placements)).toBe(true);

    const completedOnly = [
      { id: "1", placement_status: "completed" as const, started_at: "2026-01-01", ended_at: "2026-03-01" },
    ];
    expect(getActivePlacement(completedOnly)).toBeNull();
    expect(hasActivePlacement(completedOnly)).toBe(false);
  });

  it("formats placement label appropriately for active and completed statuses", () => {
    const active = {
      id: "1",
      placement_status: "active" as const,
      started_at: "2026-04-01T00:00:00Z",
      ended_at: null,
      role: "Software Intern",
      company: "Acme Corp",
    };
    expect(placementLabel(active)).toContain("Software Intern · Acme Corp");
    expect(placementLabel(active)).toContain("since Apr 2026");

    const completed = {
      id: "2",
      placement_status: "completed" as const,
      started_at: "2026-01-01T00:00:00Z",
      ended_at: "2026-03-31T00:00:00Z",
      role: "Data Analyst",
      company: "Beta Ltd",
    };
    expect(placementLabel(completed)).toContain("Data Analyst · Beta Ltd");
    expect(placementLabel(completed)).toContain("Jan 2026 – Mar 2026");
  });
});

