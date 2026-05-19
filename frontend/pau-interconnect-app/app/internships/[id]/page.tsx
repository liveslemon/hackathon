import React from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
  ExternalLink
} from "lucide-react";

import DashboardShell from "@/components/DashboardShell";
import InternshipClientParts from "./InternshipClientParts";
import { supabaseFetch } from "@/lib/supabase-fetch";

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
        getAll() { return cookieStore.getAll(); },
        setAll() {}
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  
  // Fetch internship data
  const { data: internship, error: internshipError } = await supabase
    .from("internships")
    .select("*")
    .eq("id", internshipId)
    .single();

  if (internshipError || !internship) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Briefcase className="w-6 h-6 text-slate-300" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Internship not found</h2>
        <p className="text-sm text-slate-400 mb-6">This listing may have been removed or is no longer available.</p>
        <Link href="/dashboard/student">
          <button className="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors">
            Back to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  // Fetch user-specific data if logged in
  let hasApplied = false;
  let applicationStatus: string | null = null;
  let matchScore: number | null = null;
  let matchingSkills: string[] = [];
  let missingSkills: string[] = [];
  let userProfile: any = null;

  if (session) {
    const [appliedRes, matchRes, profileRes] = await Promise.all([
      supabase.from("applied_internships")
        .select("id, status")
        .eq("user_id", session.user.id)
        .eq("internship_id", internshipId)
        .maybeSingle(),
      supabase.from("match_results")
        .select("match_score, matching_skills, missing_skills")
        .eq("user_id", session.user.id)
        .eq("internship_id", internshipId)
        .maybeSingle(),
      supabase.from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()
    ]);

    if (appliedRes.data) {
      hasApplied = true;
      applicationStatus = appliedRes.data.status;
    }

    if (matchRes.data) {
      matchScore = matchRes.data.match_score;
      matchingSkills = matchRes.data.matching_skills || [];
      missingSkills = matchRes.data.missing_skills || [];
    }
    
    userProfile = profileRes.data;
  }

  const requirementsList = Array.isArray(internship.requirements)
    ? internship.requirements
    : internship.requirements?.split("\n").filter(Boolean) || [];

  const responsibilitiesList = Array.isArray(internship.responsibilities)
    ? internship.responsibilities
    : internship.responsibilities?.split("\n").filter(Boolean) || [];

  const displayScore = matchScore !== null ? matchScore : (internship.matchPercentage || 0);
  
  const daysUntilDeadline = internship.deadline
    ? Math.ceil((new Date(internship.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const matchColor = displayScore >= 70 ? "text-emerald-600" : displayScore >= 40 ? "text-amber-600" : "text-slate-500";
  const matchBg = displayScore >= 70 ? "bg-emerald-50" : displayScore >= 40 ? "bg-amber-50" : "bg-slate-50";

  return (
    <DashboardShell userProfile={userProfile}>
      <div className="max-w-4xl mx-auto px-4 md:px-0 py-6 md:py-10">
        
        {/* Back link */}
        <Link href="/dashboard/student" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to internships
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 leading-tight">
                    {internship.role || internship.title}
                  </h1>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm font-medium text-indigo-600">{internship.company}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-600 rounded-md text-xs font-medium border border-slate-100">
                  <Briefcase className="w-3 h-3" /> {internship.category || internship.field || "Internship"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-600 rounded-md text-xs font-medium border border-slate-100">
                  <MapPin className="w-3 h-3" /> {internship.location || "Remote"}
                </span>
                {internship.duration && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-600 rounded-md text-xs font-medium border border-slate-100">
                    <Clock className="w-3 h-3" /> {internship.duration}
                  </span>
                )}
                {daysUntilDeadline !== null && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                    daysUntilDeadline > 7 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                      : daysUntilDeadline > 0 
                        ? "bg-amber-50 text-amber-600 border-amber-100" 
                        : "bg-red-50 text-red-500 border-red-100"
                  }`}>
                    <CalendarDays className="w-3 h-3" />
                    {daysUntilDeadline > 0 ? `${daysUntilDeadline} days left` : "Deadline passed"}
                  </span>
                )}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Description */}
            <section>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">About the role</h3>
              <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">
                {internship.description || "No description provided."}
              </p>
            </section>

            {/* Requirements */}
            {requirementsList.length > 0 && (
              <section className="bg-white p-5 rounded-xl border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Requirements</h3>
                <ul className="space-y-2.5">
                  {requirementsList.map((req: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-slate-600">{req}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Responsibilities */}
            {responsibilitiesList.length > 0 && (
              <section className="bg-white p-5 rounded-xl border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">What you'll do</h3>
                <ul className="space-y-2.5">
                  {responsibilitiesList.map((res: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Zap className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-slate-600">{res}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="sticky top-20 space-y-4">
              
              {/* Match Score Card */}
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <div className="p-5 text-center border-b border-slate-50">
                  <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest mb-2">Profile match</p>
                  <div className={`text-4xl font-bold ${matchColor}`}>{displayScore}%</div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        displayScore >= 70 ? "bg-emerald-500" : displayScore >= 40 ? "bg-amber-500" : "bg-slate-300"
                      }`}
                      style={{ width: `${displayScore}%` }}
                    />
                  </div>
                </div>
                
                <div className="p-5 space-y-3">
                  {session ? (
                    <InternshipClientParts 
                      internship={internship}
                      hasApplied={hasApplied}
                      applicationStatus={applicationStatus}
                      matchingSkills={matchingSkills}
                      missingSkills={missingSkills}
                      userId={session.user.id}
                      studentEmail={session.user.email}
                    />
                  ) : (
                    <Link href="/login/student">
                      <button className="w-full py-2.5 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors">
                        Sign in to Apply
                      </button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Details Card */}
              <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
                <div className="flex items-center gap-2.5 text-sm">
                  <Clock className="w-4 h-4 text-slate-300" />
                  <span className="text-slate-500">
                    Posted {internship.created_at ? new Date(internship.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "recently"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <CalendarDays className="w-4 h-4 text-slate-300" />
                  <span className="text-slate-500">
                    Deadline: {internship.deadline ? new Date(internship.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                  </span>
                </div>
                {internship.company_website && (
                  <a href={internship.company_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-indigo-600 hover:text-indigo-700 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    Company website
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
