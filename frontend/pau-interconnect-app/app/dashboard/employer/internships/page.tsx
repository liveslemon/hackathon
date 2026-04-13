import React, { Suspense } from "react";
import { Stack, Typography, Skeleton } from "@/components/ui";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import DashboardShellWrapper from "../DashboardShellWrapper";
import { EmployerHeaderSection, EmployerInternshipListSection } from "../EmployerParts";

export const revalidate = 0;

export default async function EmployerInternshipsPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login/employer");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <DashboardShellWrapper userProfile={profile}>
      <main className="max-w-5xl mx-auto py-8 lg:py-12">
        <header className="mb-10">
          <Typography variant="h2" weight="bold" className="mb-2 text-slate-800">My Postings</Typography>
          <Typography color="muted">Manage and track your active internship opportunities.</Typography>
        </header>

        <Suspense fallback={
          <Stack spacing={4}>
            <div className="h-48 w-full bg-slate-100 rounded-[32px] animate-pulse" />
            <div className="h-48 w-full bg-slate-100 rounded-[32px] animate-pulse" />
            <div className="h-48 w-full bg-slate-100 rounded-[32px] animate-pulse" />
          </Stack>
        }>
          <EmployerInternshipListSection />
        </Suspense>
      </main>
    </DashboardShellWrapper>
  );
}
