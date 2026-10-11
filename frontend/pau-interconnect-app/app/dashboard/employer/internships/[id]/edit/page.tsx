import { getSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import EditInternshipClient from "./EditClient";

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

  const { data: internship } = await supabase
    .from("internships")
    .select("*")
    .eq("id", id)
    .eq("employer_id", user.id)
    .single();

  if (!internship) redirect("/dashboard/employer/internships");

  return <EditInternshipClient internship={internship} />;
}
