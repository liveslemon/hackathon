import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/env";
import { getSupabaseServer } from "@/lib/supabase-server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseFetch } from "@/lib/supabase-fetch";

export const dynamic = "force-dynamic";

function isMissingSchemaObjectError(error: {
  code?: string;
  message?: string;
}): boolean {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "42P01" ||
    error.code === "PGRST204" ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("does not exist") ||
    message.includes("column") ||
    message.includes("relation")
  );
}

function toSafeErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const maybeMessage = (payload as { error?: unknown; message?: unknown })
      .error;
    if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }

    const maybeFallback = (payload as { message?: unknown }).message;
    if (typeof maybeFallback === "string" && maybeFallback.trim().length > 0) {
      return maybeFallback;
    }
  }

  return "CV processing failed. Please try again.";
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        status: "error",
        code: "AUTH_REQUIRED",
        message: "Please sign in to upload your CV.",
      },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        status: "error",
        code: "INVALID_FILE",
        message: "Please upload a valid PDF CV.",
      },
      { status: 400 },
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      {
        status: "error",
        code: "INVALID_FILE_TYPE",
        message: "Only PDF files are accepted.",
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const { data: job, error: jobInsertError } = await supabase
    .from("cv_processing_jobs")
    .insert({
      user_id: user.id,
      status: "queued",
      source: "onboarding",
      error_message: null,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  const hasJobTracking = !jobInsertError;
  if (jobInsertError && !isMissingSchemaObjectError(jobInsertError)) {
    return NextResponse.json(
      {
        status: "error",
        code: "JOB_CREATE_FAILED",
        message: "Failed to start CV processing. Please try again.",
      },
      { status: 500 },
    );
  }

  const profileTrackingUpdate = await supabase
    .from("profiles")
    .update({
      onboarding_stage: "cv_processing",
      cv_processing_status: "processing",
      cv_processing_error: null,
      updated_at: now,
    })
    .eq("id", user.id);

  if (
    profileTrackingUpdate.error &&
    !isMissingSchemaObjectError(profileTrackingUpdate.error)
  ) {
    return NextResponse.json(
      {
        status: "error",
        code: "PROFILE_TRACKING_UPDATE_FAILED",
        message: "Unable to update CV processing state.",
      },
      { status: 500 },
    );
  }

  const backendForm = new FormData();
  backendForm.set("user_id", user.id);
  backendForm.set("file", file, file.name);

  // Get the user's JWT to authenticate with the backend.
  const cookieStore = await cookies();
  const sessionClient = createServerClient(
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
  const {
    data: { session },
  } = await sessionClient.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json(
      {
        status: "error",
        code: "SESSION_EXPIRED",
        message: "Your session has expired. Please sign in again and retry.",
      },
      { status: 401 },
    );
  }

  const authHeaders: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
  };

  try {
    const backendUrl = `${getBackendUrl()}/upload-and-analyze`;
    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers: authHeaders,
      body: backendForm,
    });

    const payload: unknown = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok || (payload as { error?: unknown })?.error) {
      const message = toSafeErrorMessage(payload);
      if (hasJobTracking && job?.id) {
        await supabase
          .from("cv_processing_jobs")
          .update({
            status: "failed",
            error_message: message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      }

      await supabase
        .from("profiles")
        .update({
          onboarding_stage: "cv_failed",
          cv_processing_status: "failed",
          cv_processing_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return NextResponse.json(
        {
          status: "error",
          code: "CV_PROCESSING_FAILED",
          message,
        },
        { status: 502 },
      );
    }

    const completedAt = new Date().toISOString();
    if (hasJobTracking && job?.id) {
      await supabase
        .from("cv_processing_jobs")
        .update({
          status: "complete",
          error_message: null,
          completed_at: completedAt,
          updated_at: completedAt,
        })
        .eq("id", job.id);
    }

    await supabase
      .from("profiles")
      .update({
        onboarding_stage: "completed",
        onboarding_completed_at: completedAt,
        cv_processing_status: "complete",
        cv_processing_error: null,
        updated_at: completedAt,
      })
      .eq("id", user.id);

    return NextResponse.json({
      status: "ok",
      jobId: job?.id ?? null,
      message: "CV processed successfully.",
    });
  } catch {
    const fallbackMessage = "CV processing failed due to a network issue.";

    if (hasJobTracking && job?.id) {
      await supabase
        .from("cv_processing_jobs")
        .update({
          status: "failed",
          error_message: fallbackMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    await supabase
      .from("profiles")
      .update({
        onboarding_stage: "cv_failed",
        cv_processing_status: "failed",
        cv_processing_error: fallbackMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json(
      {
        status: "error",
        code: "CV_PROCESSING_FAILED",
        message: fallbackMessage,
      },
      { status: 502 },
    );
  }
}
