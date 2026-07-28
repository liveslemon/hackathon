import { createServerClient } from "@supabase/ssr";
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
  if (!user) redirect("/login/employer");

  // Fetch viewer's profile to determine role
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isEmployerOrAdmin =
    viewerProfile?.role === "employer" || viewerProfile?.is_admin === true;
  const isOwnProfile = user.id === studentId;

  if (!isEmployerOrAdmin && !isOwnProfile) {
    // Students can't view other students' profiles
    redirect("/dashboard/student");
  }

  // Fetch student profile using service-level read (RLS allows admin/employer reads
  // via policy or we use the viewer's session which should have access)
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (!studentProfile || studentProfile.role !== "student") {
    notFound();
  }

  return (
    <DashboardShell userProfile={viewerProfile}>
      <div className="max-w-4xl mx-auto pb-12 px-4 sm:px-0">
        <StudentPublicProfile profile={studentProfile} />
      </div>
    </DashboardShell>
  );
}
