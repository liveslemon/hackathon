import { getSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import EditInternshipClient from "./EditClient";
import DashboardShellWrapper from "../../../DashboardShellWrapper";

export default async function EditInternshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/employer");

  const [internshipRes, profileRes] = await Promise.all([
    supabase
      .from("internships")
      .select("*")
      .eq("id", id)
      .eq("employer_id", user.id)
      .single(),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);

  const internship = internshipRes.data;
  if (!internship) redirect("/dashboard/employer/internships");

  return (
    <DashboardShellWrapper userProfile={profileRes.data}>
      <EditInternshipClient internship={internship} />
    </DashboardShellWrapper>
  );

}

