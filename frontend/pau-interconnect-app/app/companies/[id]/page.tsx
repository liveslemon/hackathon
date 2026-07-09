import React from "react";
import DashboardShellWrapper from "../../dashboard/student/DashboardShellWrapper";
import CompanyClient from "./CompanyClient";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function CompanyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  let profile = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    profile = data;
  }

  // NOTE: Depending on role, we might want to use the student or employer wrapper.
  // Using the Student wrapper for generic public viewing, but they are similar.

  return (
    <DashboardShellWrapper userProfile={profile}>
      <CompanyClient employerId={id} />
    </DashboardShellWrapper>
  );
}
