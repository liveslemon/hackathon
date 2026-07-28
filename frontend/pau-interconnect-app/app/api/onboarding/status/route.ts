import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function isMissingColumnOrCacheError(error: {
  code?: string;
  message?: string;
}): boolean {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("column")
  );
}

export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        status: "error",
        code: "AUTH_REQUIRED",
        message: "Please sign in to continue onboarding.",
      },
      { status: 401 },
    );
  }

  let { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, role, onboarding_stage, onboarding_completed_at, cv_processing_status, cv_processing_error",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error && isMissingColumnOrCacheError(error)) {
    const fallback = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    profile = fallback.data
      ? {
          ...fallback.data,
          onboarding_stage: "started",
          onboarding_completed_at: null,
          cv_processing_status: "not_started",
          cv_processing_error: null,
        }
      : null;
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json(
      {
        status: "error",
        code: "PROFILE_FETCH_FAILED",
        message: "Failed to load onboarding state.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: "ok",
    onboarding: {
      stage: profile?.onboarding_stage ?? "started",
      completedAt: profile?.onboarding_completed_at ?? null,
      cvProcessingStatus: profile?.cv_processing_status ?? "not_started",
      cvProcessingError: profile?.cv_processing_error ?? null,
      role: profile?.role ?? null,
    },
  });
}
