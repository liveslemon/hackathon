import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const StudentOnboardingSchema = z.object({
  role: z.literal("student"),
  full_name: z.string().trim().min(2, "Please enter your full name."),
  course: z.string().trim().min(2, "Please select your course."),
  level: z.string().trim().min(1, "Please select your level."),
  interests: z
    .array(z.string().trim().min(1))
    .min(1, "Please select at least one interest."),
  hasCvUpload: z.boolean().default(false),
});

const EmployerOnboardingSchema = z.object({
  role: z.literal("employer"),
  full_name: z.string().trim().min(2, "Please enter your name."),
  company_name: z.string().trim().min(2, "Please enter your company name."),
  company_description: z
    .string()
    .trim()
    .min(15, "Please provide a longer company description."),
  company_website: z.string().trim().optional(),
  industry: z.string().trim().min(2, "Please enter your industry."),
  culture: z.string().trim().min(10, "Please describe your company culture."),
  hasCvUpload: z.boolean().default(false),
});

const OnboardingCompleteSchema = z.discriminatedUnion("role", [
  StudentOnboardingSchema,
  EmployerOnboardingSchema,
]);

type DbErrorShape = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function isMissingColumnOrCacheError(error: DbErrorShape): boolean {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("column")
  );
}

function toSaveErrorMessage(error: DbErrorShape): string {
  if (isMissingColumnOrCacheError(error)) {
    return "Database schema is out of date. Run the latest Supabase migrations and try again.";
  }

  if (error.code === "42501") {
    return "Permission denied while saving onboarding details. Please sign out, sign in, and retry.";
  }

  if (error.code === "23503") {
    return "Could not link this account to your profile. Please try again.";
  }

  if (error.code === "23505") {
    return "A conflicting profile record exists. Please refresh and retry.";
  }

  if (error.message && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unable to save your onboarding details. Please try again.";
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
        message:
          "Please verify your email and sign in before completing onboarding.",
      },
      { status: 401 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = OnboardingCompleteSchema.safeParse(rawBody);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid request.";
    return NextResponse.json(
      {
        status: "error",
        code: "VALIDATION_ERROR",
        message: firstIssue,
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const body = parsed.data;

  const basePayload =
    body.role === "student"
      ? {
          id: user.id,
          full_name: body.full_name,
          email: user.email ?? null,
          course: body.course,
          level: body.level,
          interests: body.interests,
          role: "student" as const,
          updated_at: now,
        }
      : {
          id: user.id,
          full_name: body.full_name,
          email: user.email ?? null,
          company_name: body.company_name,
          company_description: body.company_description,
          company_website: body.company_website ?? null,
          industry: body.industry,
          culture: body.culture,
          role: "employer" as const,
          updated_at: now,
        };

  const trackingPayload =
    body.role === "student"
      ? {
          onboarding_stage: body.hasCvUpload ? "cv_processing" : "completed",
          onboarding_completed_at: body.hasCvUpload ? null : now,
          cv_processing_status: body.hasCvUpload ? "queued" : "not_started",
          cv_processing_error: null,
        }
      : {
          onboarding_stage: "completed",
          onboarding_completed_at: now,
          cv_processing_status: "not_started",
          cv_processing_error: null,
        };

  const updatePayload = { ...basePayload, ...trackingPayload };

  let { data, error } = await supabase
    .from("profiles")
    .upsert(updatePayload, { onConflict: "id" })
    .select(
      "id, role, onboarding_stage, onboarding_completed_at, cv_processing_status",
    )
    .single();

  // Fallback for environments where onboarding tracking columns are not yet migrated.
  if (error && isMissingColumnOrCacheError(error)) {
    logger.warn(
      "onboarding.complete",
      "Retrying profile save without onboarding tracking columns",
      {
        code: error.code,
        message: error.message,
        role: body.role,
        userId: user.id,
      },
    );

    const fallback = await supabase
      .from("profiles")
      .upsert(basePayload, { onConflict: "id" })
      .select("id, role")
      .single();

    if (!fallback.error) {
      data = {
        id: fallback.data.id,
        role: fallback.data.role,
        onboarding_stage:
          body.role === "student" && body.hasCvUpload
            ? "cv_processing"
            : "completed",
        onboarding_completed_at:
          body.role === "student" && body.hasCvUpload ? null : now,
        cv_processing_status:
          body.role === "student" && body.hasCvUpload
            ? "queued"
            : "not_started",
      };
      error = null;
    } else {
      error = fallback.error;
    }
  }

  if (error) {
    logger.error("onboarding.complete", "Profile save failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      role: body.role,
      userId: user.id,
    });

    return NextResponse.json(
      {
        status: "error",
        code: "PROFILE_SAVE_FAILED",
        message: toSaveErrorMessage(error),
      },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        status: "error",
        code: "PROFILE_SAVE_FAILED",
        message: "Profile save returned no data. Please try again.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: "ok",
    onboarding: {
      role: data.role,
      stage: data.onboarding_stage,
      completedAt: data.onboarding_completed_at,
      cvProcessingStatus: data.cv_processing_status,
    },
    nextStep:
      body.role === "student" && body.hasCvUpload ? "cv_upload" : "done",
    message:
      body.role === "student" && body.hasCvUpload
        ? "Profile saved. CV processing will start now."
        : "Onboarding complete.",
  });
}
