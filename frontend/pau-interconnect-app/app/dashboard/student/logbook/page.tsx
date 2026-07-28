import { redirect } from "next/navigation";
import LogbookClient from "./LogbookClient";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getDashboardPathForRole, getUserRoleProfile } from "@/lib/role-guard";

export default async function StudentLogbookPage() {
  const supabase = await getSupabaseServer();

  // 1. Get User/Session immediately
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/student");

  const { role, isAdmin } = await getUserRoleProfile(supabase, user.id);
  if (!role) redirect("/onboarding");
  if (role !== "student") {
    redirect(getDashboardPathForRole(role, isAdmin));
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 2. Fetch critical internship info on server (High priority, no spinner needed)
  const { data: apps } = await supabase
    .from("applied_internships")
    .select("status, internship:internships (poster_id, role, company)")
    .eq("user_id", user.id);

  console.log(
    `[Logbook Server] Found ${apps?.length || 0} applications for ${user.id}`,
  );

  return (
    <LogbookClient
      initialProfile={null}
      initialApplications={apps || []}
      initialEntries={[]} // Still deferred to client to keep page load snappy
      session={session}
    />
  );
}
