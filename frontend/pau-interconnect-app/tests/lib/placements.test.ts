import { describe, expect, it } from "vitest";
import { toPlacements } from "@/lib/placements";

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
});
