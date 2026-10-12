import { getSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import PostInternshipView from "./PostInternshipView";
import DashboardShellWrapper from "../employer/DashboardShellWrapper";

export default async function PostPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/employer");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <DashboardShellWrapper userProfile={profile}>
      <PostInternshipView />
    </DashboardShellWrapper>
  );
}