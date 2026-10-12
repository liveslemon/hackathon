// Internship placements = accepted applications. A student has at most one
// active placement (enforced in the database); each logbook entry belongs to
// one placement via logbook_entries.application_id.

export const PLACEMENT_COLUMNS =
  "id, stage, status, placement_status, started_at, ended_at, internship:internships (role, company)";

export type PlacementStatus = "active" | "completed" | "withdrawn";

export interface Placement {
  id: string;
  placement_status: PlacementStatus;
  started_at: string | null;
  ended_at: string | null;
  role?: string;
  company?: string;
}

type ApplicationRow = {
  id: string;
  placement_status?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  internship?: { role?: string; company?: string } | Array<{ role?: string; company?: string }> | null;
};

/** Placements, active first, then most recent. */
export function toPlacements(rows: ApplicationRow[] | null | undefined): Placement[] {
  return (rows ?? [])
    .filter((r) => r.placement_status)
    .map((r) => {
      const internship = Array.isArray(r.internship) ? r.internship[0] : r.internship;
      return {
        id: r.id,
        placement_status: r.placement_status as PlacementStatus,
        started_at: r.started_at ?? null,
        ended_at: r.ended_at ?? null,
        role: internship?.role,
        company: internship?.company,
      };
    })
    .sort((a, b) => {
      if (a.placement_status === "active") return -1;
      if (b.placement_status === "active") return 1;
      return (b.started_at ?? "").localeCompare(a.started_at ?? "");
    });
}

export function placementLabel(p: Placement): string {
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "";
  const range =
    p.placement_status === "active"
      ? `since ${fmt(p.started_at)}`
      : `${fmt(p.started_at)} – ${fmt(p.ended_at)}`;
  return `${p.role ?? "Internship"} · ${p.company ?? ""} (${range})`;
}

export function getActivePlacement(placements: Placement[]): Placement | null {
  return placements.find((p) => p.placement_status === "active") ?? null;
}

export function hasActivePlacement(placements: Placement[]): boolean {
  return placements.some((p) => p.placement_status === "active");
}
