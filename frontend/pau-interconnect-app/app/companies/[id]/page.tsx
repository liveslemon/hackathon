import React from "react";
import { notFound } from "next/navigation";
import DashboardShellWrapper from "../../dashboard/student/DashboardShellWrapper";
import CompanyClient from "./CompanyClient";
import { getSupabaseServer } from "@/lib/supabase-server";
import { isOpenInternship } from "@/lib/deadlines";

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userProfile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", user.id)
      .maybeSingle();
    userProfile = data;
  }

  // Fetch employer profile - only public company fields
  const { data: employerProfile } = await supabase
    .from("profiles")
    .select(
      "id, role, full_name, company_name, company_banner_url, company_logo_url, company_description, company_website, industry, culture",
    )
    .eq("id", id)
    .maybeSingle();

  if (!employerProfile || employerProfile.role !== "employer") {
    notFound();
  }

  // Query open roles posted by this employer (via employer_id or poster_id)
  const { data: rawInternships } = await supabase
    .from("internships")
    .select(
      "id, company, role, location, deadline, category, field, status, poster_id, employer_id",
    )
    .or(`employer_id.eq.${id},poster_id.eq.${id}`)
    .order("created_at", { ascending: false });

  // Filter only active, non-expired internships in Lagos time
  const openInternships = (rawInternships || []).filter((job) =>
    isOpenInternship(job),
  );

  return (
    <DashboardShellWrapper userProfile={userProfile}>
      <CompanyClient
        company={employerProfile}
        internships={openInternships}
      />
    </DashboardShellWrapper>
  );
}
