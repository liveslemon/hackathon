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
      source: "dashboard",
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

    // Auto-populate profile fields from cv_structured data
    const profileUpdate: Record<string, unknown> = {
      cv_processing_status: "complete",
      cv_processing_error: null,
      updated_at: completedAt,
    };

    // Read the freshly-written cv_structured to extract profile fields
    const { data: freshProfile } = await supabase
      .from("profiles")
      .select(
        "cv_structured, skills, experience, projects, certifications, bio, languages",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (freshProfile?.cv_structured) {
      const structured =
        typeof freshProfile.cv_structured === "string"
          ? (() => {
              try {
                return JSON.parse(freshProfile.cv_structured as string);
              } catch {
                return null;
              }
            })()
          : freshProfile.cv_structured;

      if (structured && typeof structured === "object") {
        // Extract skills
        const rawSkills = structured.skills;
        if (rawSkills) {
          const allSkills: string[] = Array.isArray(rawSkills)
            ? rawSkills
            : [
                ...(rawSkills.technical ?? []),
                ...(rawSkills.soft ?? []),
                ...(rawSkills.tools ?? []),
              ];

          if (allSkills.length > 0) {
            // Deduplicate, filter valid strings, take top 15
            const uniqueSkills = [
              ...new Set(
                allSkills.filter((s) => typeof s === "string" && s.trim()),
              ),
            ].slice(0, 15);
            if (uniqueSkills.length > 0 && !freshProfile.skills?.length) {
              profileUpdate.skills = uniqueSkills;
            }
          }
        }

        // Extract experience
        const rawExp = structured.experience;
        if (
          Array.isArray(rawExp) &&
          rawExp.length > 0 &&
          !freshProfile.experience?.length
        ) {
          profileUpdate.experience = rawExp
            .map(
              (exp: {
                title?: string;
                role?: string;
                organization?: string;
                company?: string;
                duration?: string;
                start_date?: string;
                end_date?: string;
                highlights?: string[];
                description?: string;
              }) => {
                // Parse 'duration' (e.g. "Jun 2021 - Present") into start/end dates if missing
                let startDate = exp.start_date || "";
                let endDate = exp.end_date || "";

                if (!startDate && exp.duration) {
                  const parts = exp.duration.split("-").map((p) => p.trim());
                  if (parts.length > 0) startDate = parts[0];
                  if (parts.length > 1) endDate = parts[1];
                }

                return {
                  company: (exp.organization || exp.company || "")
                    .substring(0, 100)
                    .trim(),
                  role: (exp.title || exp.role || "").substring(0, 100).trim(),
                  start_date: startDate.substring(0, 20).trim(),
                  end_date: endDate.substring(0, 20).trim(),
                  description: (
                    exp.description ||
                    (exp.highlights ? exp.highlights.join(". ") : "")
                  )
                    .substring(0, 500)
                    .trim(),
                };
              },
            )
            .filter((e) => e.company || e.role);

          if ((profileUpdate.experience as unknown[]).length === 0) {
            delete profileUpdate.experience;
          }
        }

        // Extract projects
        const rawProjects = structured.projects;
        if (
          Array.isArray(rawProjects) &&
          rawProjects.length > 0 &&
          !freshProfile.projects?.length
        ) {
          profileUpdate.projects = rawProjects
            .map(
              (proj: {
                name?: string;
                title?: string;
                description?: string;
                technologies?: string[] | string;
                github_url?: string;
                demo_url?: string;
                url?: string;
              }) => {
                const tech = Array.isArray(proj.technologies)
                  ? proj.technologies
                  : typeof proj.technologies === "string"
                    ? proj.technologies.split(",").map((s) => s.trim())
                    : [];

                return {
                  title: (proj.name || proj.title || "")
                    .substring(0, 100)
                    .trim(),
                  description: (proj.description || "")
                    .substring(0, 500)
                    .trim(),
                  technologies: tech
                    .filter((t) => typeof t === "string" && t.trim())
                    .slice(0, 10),
                  github_url: (proj.github_url || proj.url || "").trim(),
                  demo_url: (proj.demo_url || "").trim(),
                };
              },
            )
            .filter((p) => p.title);

          if ((profileUpdate.projects as unknown[]).length === 0) {
            delete profileUpdate.projects;
          }
        }

        // Extract certifications
        const rawCerts = structured.certifications;
        if (
          Array.isArray(rawCerts) &&
          rawCerts.length > 0 &&
          !freshProfile.certifications?.length
        ) {
          profileUpdate.certifications = rawCerts
            .map(
              (cert: {
                name?: string;
                issuer?: string;
                date?: string;
                credential_url?: string;
                url?: string;
              }) => ({
                name: (cert.name || "").substring(0, 100).trim(),
                issuer: (cert.issuer || "").substring(0, 100).trim(),
                date: (cert.date || "").substring(0, 20).trim(),
                credential_url: (cert.credential_url || cert.url || "").trim(),
              }),
            )
            .filter((c) => c.name);

          if ((profileUpdate.certifications as unknown[]).length === 0) {
            delete profileUpdate.certifications;
          }
        }

        // Extract bio/summary
        if (
          structured.summary &&
          typeof structured.summary === "string" &&
          !freshProfile.bio
        ) {
          profileUpdate.bio = structured.summary.slice(0, 300).trim();
        }

        // Extract contact info (phone)
        if (structured.contact && typeof structured.contact === "object") {
          const phone =
            structured.contact.phone || structured.contact.phone_number;
          if (phone && typeof phone === "string" && phone.trim()) {
            profileUpdate.phone = phone.trim().substring(0, 20);
          }
        }

        // Extract education info
        const rawEdu = structured.education;
        if (rawEdu) {
          const eduList = Array.isArray(rawEdu) ? rawEdu : [rawEdu];
          if (eduList.length > 0 && typeof eduList[0] === "object") {
            const degree = eduList[0].degree || eduList[0].course || "";
            // Only set course if not already set
            if (degree && typeof degree === "string") {
              const { data: currentProfile } = await supabase
                .from("profiles")
                .select("course")
                .eq("id", user.id)
                .maybeSingle();
              if (!currentProfile?.course) {
                profileUpdate.course = degree.substring(0, 100).trim();
              }
            }
          }
        }

        // Extract languages
        const rawLangs = structured.languages;
        const freshLangs = Array.isArray(freshProfile.languages)
          ? freshProfile.languages
          : typeof freshProfile.languages === "string"
            ? JSON.parse(freshProfile.languages)
            : [];
        if (
          Array.isArray(rawLangs) &&
          rawLangs.length > 0 &&
          !freshLangs.length
        ) {
          profileUpdate.languages = rawLangs
            .map(
              (lang: {
                name?: string;
                language?: string;
                proficiency?: string;
                level?: string;
              }) => ({
                name: (lang.name || lang.language || "")
                  .substring(0, 50)
                  .trim(),
                proficiency: (lang.proficiency || lang.level || "Intermediate")
                  .substring(0, 20)
                  .trim(),
              }),
            )
            .filter((l) => l.name);

          if ((profileUpdate.languages as unknown[]).length === 0) {
            delete profileUpdate.languages;
          }
        }
      }
    }

    await supabase.from("profiles").update(profileUpdate).eq("id", user.id);

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
