// Columns the student-facing internship lists need. Avoid select("*"): it
// ships each posting's 1024-float embedding to the browser (~13x the payload).
export const INTERNSHIP_LIST_COLUMNS =
  "id, role, company, description, requirements, required_skills, category, field, interests, location, duration, stipend, slots, deadline, status, recruiter_link, employer_id, poster_id, view_count, created_at, updated_at";

export function isOpenInternship(internship: {
  status?: string | null;
  deadline?: string | null;
}): boolean {
  if ((internship.status ?? "active") !== "active") return false;
  return !internship.deadline || Date.parse(internship.deadline) >= Date.now();
}
