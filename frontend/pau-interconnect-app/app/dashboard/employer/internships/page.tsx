import React, { Suspense } from "react";
import { Stack, PageHeader, Button, Skeleton } from "@/components/ui";
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import DashboardShellWrapper from "../DashboardShellWrapper";
import { EmployerInternshipListSection } from "../EmployerParts";
import { getDashboardPathForRole, getUserRoleProfile } from "@/lib/role-guard";

export const revalidate = 0;

export default async function EmployerInternshipsPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/employer");

  const { role, isAdmin } = await getUserRoleProfile(supabase, user.id);
  if (!role) redirect("/onboarding");
  if (role !== "employer") {
    redirect(getDashboardPathForRole(role, isAdmin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  return (
    <DashboardShellWrapper userProfile={profile}>
      <main className="max-w-5xl mx-auto py-8 lg:py-12 px-4 sm:px-6">
        <PageHeader
          title="My Postings"
          description="Manage and track your active internship opportunities."
          actions={
            <Link href="/dashboard/post">
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                Post Internship
              </Button>
            </Link>
          }
          className="mb-8"
        />

        <Suspense
          fallback={
            <Stack spacing={4}>
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </Stack>
          }
        >
          <EmployerInternshipListSection />
        </Suspense>
      </main>
    </DashboardShellWrapper>
  );
}
