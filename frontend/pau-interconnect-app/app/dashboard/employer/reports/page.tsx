import { getSupabaseServer } from "@/lib/supabase-server";
import ReportsClient from "./ReportsClient";
import { redirect } from "next/navigation";
import DashboardShellWrapper from "../DashboardShellWrapper";

export default async function ReportsPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/employer");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: interns } = await supabase
    .from("applied_internships")
    .select(
      `
      student_id,
      status,
      internships!inner(employer_id, role),
      profiles!student_id(full_name, email, course, level)
    `,
    )
    .eq("internships.employer_id", user.id)
    .eq("status", "accepted");

  return (
    <DashboardShellWrapper userProfile={profile}>
      <main className="max-w-6xl mx-auto py-12 px-6">
        <ReportsClient interns={interns || []} />
      </main>
    </DashboardShellWrapper>
  );
}
