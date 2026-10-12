import React from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  Briefcase,
  MapPin,
  Clock,
  CalendarDays,
  ArrowLeft,
  CheckCircle2,
  Zap,
  Building2,
  ExternalLink,
} from "lucide-react";

import DashboardShell from "@/components/DashboardShell";
import InternshipClientParts from "./InternshipClientParts";
import { supabaseFetch } from "@/lib/supabase-fetch";
import type { Profile } from "@/types/domain";

import { notFound } from "next/navigation";
import { getDaysUntilDeadline } from "@/lib/deadlines";
import { getMatchScores, type MatchScoreData } from "@/lib/matching";
import { MatchScore } from "@/components/match/MatchScore";

export default async function InternshipDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: internshipId } = await params;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch internship data
  const { data: internship, error: internshipError } = await supabase
    .from("internships")
    .select("*")
    .eq("id", internshipId)
    .single();

  if (internshipError || !internship) {
    notFound();
  }

  // Fetch user-specific data if logged in
  let hasApplied = false;
  let applicationStatus: string | null = null;
  let applicationStage: string | null = null;
  let applicationId: string | null = null;
  let matchScoreData: MatchScoreData | null = null;
  let matchingSkills: string[] = [];
  let missingSkills: string[] = [];
  let userProfile: Profile | null = null;
  let hasCvFromTable = false;

  if (user) {
    const [appliedRes, matchScoresMap, profileRes, cvRes] = await Promise.all([
      supabase
        .from("applied_internships")
        .select("id, status, stage")
        .eq("user_id", user.id)
        .eq("internship_id", internshipId)
        .maybeSingle(),
      getMatchScores(supabase, user.id, [internshipId]),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("student_cvs")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (appliedRes.data) {
      hasApplied = true;
      applicationStatus = appliedRes.data.status;
      applicationStage = appliedRes.data.stage || "applied";
      applicationId = appliedRes.data.id;
    }

    matchScoreData = matchScoresMap[internshipId] || null;
    matchingSkills = matchScoreData?.matchingSkills || [];
    missingSkills = matchScoreData?.missingSkills || [];

    userProfile = profileRes.data;
    if (cvRes.data?.id) {
      hasCvFromTable = true;
    }
  }

  // Hide draft internships from anyone who is not the creator or admin
  if (internship.status === "draft") {
    const isOwner = Boolean(
      user?.id &&
        (internship.poster_id === user.id ||
          internship.employer_id === user.id),
    );
    const isAdmin = Boolean(
      userProfile?.is_admin || userProfile?.role === "admin",
    );
    if (!isOwner && !isAdmin) {
      notFound();
    }
  }

  const rawProfile = userProfile as
    | (Profile & {
        resume_url?: string;
        cv_url?: string;
        cv_text?: string;
        course?: string;
      })
    | null;

  const hasCv = Boolean(
    hasCvFromTable ||
      rawProfile?.resume_url ||
      rawProfile?.cv_url ||
      rawProfile?.cv_text,
  );
  const isProfileComplete = Boolean(
    userProfile?.full_name?.trim() &&
      (userProfile?.course_of_study?.trim() || rawProfile?.course?.trim()),
  );

  const requirementsList = Array.isArray(internship.requirements)
    ? internship.requirements
    : internship.requirements?.split("\n").filter(Boolean) || [];

  const responsibilitiesList = Array.isArray(internship.responsibilities)
    ? internship.responsibilities
    : internship.responsibilities?.split("\n").filter(Boolean) || [];

  const daysUntilDeadline = getDaysUntilDeadline(internship.deadline);

  return (
    <DashboardShell userProfile={userProfile}>
      <div className="max-w-5xl mx-auto px-4 md:px-0 py-6 md:py-10">
        {/* Back link */}
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-brand mb-6 transition-colors group font-medium"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to internships</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 shadow-xs">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-fg leading-tight">
                    {internship.role || internship.title}
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <Building2 className="w-4 h-4 text-fg-subtle" />
                    <span className="text-sm font-semibold text-brand">
                      {internship.company}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-sunken text-fg-muted rounded-xl text-xs font-medium border border-border">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{internship.category || internship.field || "Internship"}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-sunken text-fg-muted rounded-xl text-xs font-medium border border-border">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{internship.location || "Remote"}</span>
                </span>
                {internship.duration && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-sunken text-fg-muted rounded-xl text-xs font-medium border border-border">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{internship.duration}</span>
                  </span>
                )}
                {daysUntilDeadline !== null && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${
                      daysUntilDeadline > 7
                        ? "bg-success-subtle text-success-fg border-success/20"
                        : daysUntilDeadline >= 0
                          ? "bg-warning-subtle text-warning-fg border-warning/20"
                          : "bg-danger-subtle text-danger-fg border-danger/20"
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>
                      {daysUntilDeadline > 0
                        ? `${daysUntilDeadline} days left`
                        : daysUntilDeadline === 0
                          ? "Ends today"
                          : "Deadline passed"}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 shadow-xs">
              <h2 className="text-base font-bold text-fg mb-4">
                About the role
              </h2>
              <p className="text-sm text-fg-muted leading-relaxed whitespace-pre-line">
                {internship.description || "No description provided."}
              </p>
            </div>

            {/* Requirements */}
            {requirementsList.length > 0 && (
              <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 shadow-xs">
                <h2 className="text-base font-bold text-fg mb-4">
                  Requirements
                </h2>
                <ul className="space-y-3">
                  {requirementsList.map((req: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-success-fg mt-0.5 shrink-0" />
                      <span className="text-sm text-fg-muted leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Responsibilities */}
            {responsibilitiesList.length > 0 && (
              <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 shadow-xs">
                <h2 className="text-base font-bold text-fg mb-4">
                  What you&apos;ll do
                </h2>
                <ul className="space-y-3">
                  {responsibilitiesList.map((res: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Zap className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                      <span className="text-sm text-fg-muted leading-relaxed">{res}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="sticky top-20 space-y-6">
              {/* Match Score & Action Card */}
              <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
                <div className="p-6 border-b border-border">
                  <p className="text-xs font-bold text-fg-subtle uppercase tracking-wider mb-3">
                    Profile compatibility
                  </p>
                  {!user ? (
                    <div className="py-2 text-center">
                      <div className="text-3xl font-bold text-fg-subtle">--%</div>
                      <p className="text-xs text-fg-muted mt-1">
                        Sign in to view personalized match compatibility
                      </p>
                    </div>
                  ) : (
                    <MatchScore
                      scoreData={matchScoreData}
                      showExplanation={true}
                      className="w-full"
                    />
                  )}
                </div>

                <div className="p-6 space-y-4">
                  {user ? (
                    <InternshipClientParts
                      internship={internship}
                      hasApplied={hasApplied}
                      applicationStatus={applicationStatus}
                      applicationStage={applicationStage}
                      applicationId={applicationId}
                      matchingSkills={matchingSkills}
                      missingSkills={missingSkills}
                      userId={user.id}
                      studentEmail={user.email}
                      hasCv={hasCv}
                      isProfileComplete={isProfileComplete}
                    />
                  ) : (
                    <Link href="/login/student" className="block">
                      <button className="w-full py-3 bg-brand text-fg-inverse rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors cursor-pointer">
                        Sign in to Apply
                      </button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Details Card */}
              <div className="bg-surface rounded-2xl border border-border p-6 space-y-3.5 shadow-xs">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-fg-subtle" />
                  <span className="text-fg-muted">
                    Posted{" "}
                    {internship.created_at
                      ? new Date(internship.created_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : "recently"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CalendarDays className="w-4 h-4 text-fg-subtle" />
                  <span className="text-fg-muted">
                    Deadline:{" "}
                    {internship.deadline
                      ? new Date(internship.deadline).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : "TBD"}
                  </span>
                </div>
                {internship.company_website && (
                  <a
                    href={internship.company_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm font-medium text-brand hover:text-brand-hover transition-colors pt-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Company website</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
