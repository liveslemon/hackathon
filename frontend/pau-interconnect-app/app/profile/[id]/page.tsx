import { createServerClient } from "@supabase/ssr";
import { maskStudentForEmployer } from "@/lib/privacy";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { supabaseFetch } from "@/lib/supabase-fetch";
import DashboardShell from "@/components/DashboardShell";
import StudentPublicProfile from "./StudentPublicProfile";

export default async function ViewStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: studentId } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  // Viewer must be logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/student");

  // Fetch viewer's profile to determine role
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isOwnProfile = user.id === studentId;
  const isAdmin = viewerProfile?.is_admin === true || viewerProfile?.role === "admin";
  const isEmployer = viewerProfile?.role === "employer";

  if (!isOwnProfile && !isAdmin && !isEmployer) {
    // Students cannot view other students' profiles
    redirect("/dashboard/student");
  }

  // Employers may ONLY view students who applied to their internships or whose logbooks they supervise
  if (isEmployer && !isAdmin && !isOwnProfile) {
    const [{ data: application }, { data: logbookEntry }] = await Promise.all([
      supabase
        .from("applied_internships")
        .select("id, internships!inner(employer_id, poster_id)")
        .eq("user_id", studentId)
        .or(`internships.employer_id.eq.${user.id},internships.poster_id.eq.${user.id}`)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("logbook_entries")
        .select("id")
        .eq("student_id", studentId)
        .eq("employer_id", user.id)
        .limit(1)
        .maybeSingle(),
    ]);

    const canView = Boolean(application || logbookEntry);
    if (!canView) {
      notFound();
    }
  }

  // Fetch student profile using viewer's session (enforced by RLS)
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (!studentProfile || studentProfile.role !== "student") {
    notFound();
  }

  // Owner and admins see full profile; employers see server-side masked profile
  const displayProfile = isOwnProfile || isAdmin
    ? studentProfile
    : maskStudentForEmployer(studentProfile);

  return (
    <DashboardShell userProfile={viewerProfile}>
      <div className="max-w-4xl mx-auto pb-12 px-4 sm:px-0">
        <StudentPublicProfile profile={displayProfile} />
      </div>
    </DashboardShell>
  );
}

