import React from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crossFetch from "cross-fetch";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  FiBriefcase, 
  FiMapPin, 
  FiClock, 
  FiStar, 
  FiArrowLeft,
  FiCheckCircle,
  FiZap 
} from "react-icons/fi";

import {
  Typography,
  Badge,
  Card,
  CardContent,
  Divider,
} from "@/components/ui";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardShell from "@/components/DashboardShell";
import InternshipClientParts from "./InternshipClientParts";

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
      global: { fetch: crossFetch },
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
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
        <Typography variant="h2" weight="bold">Internship not found</Typography>
        <Link href="/dashboard/student">
          <button className="mt-8 px-6 py-3 bg-brand text-white rounded-2xl font-bold">Back to Dashboard</button>
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
    : internship.requirements?.split("\n") || [];

  const responsibilitiesList = Array.isArray(internship.responsibilities)
    ? internship.responsibilities
    : internship.responsibilities?.split("\n") || [];

  const displayScore = matchScore !== null ? matchScore : (internship.matchPercentage || 0);

  return (
    <DashboardShell userProfile={userProfile}>
      <div className="max-w-5xl mx-auto px-4 md:px-0 py-12">
        <Link href="/dashboard/student">
          <div className="flex items-center gap-3 text-slate-400 hover:text-brand mb-10 font-bold transition-all group w-fit">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center p-2 shadow-sm group-hover:border-brand/20">
              <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Dashboard
          </div>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            <header className="space-y-6">
              <div className="space-y-2">
                <Typography variant="h1" weight="bold" className="text-4xl">
                  {internship.role || internship.title}
                </Typography>
                <Typography variant="h3" color="primary" weight="bold">
                  {internship.company}
                </Typography>
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge variant="primary" size="md" className="rounded-xl px-4 py-2 flex items-center gap-2">
                  <FiBriefcase /> {internship.category || internship.field || "Internship"}
                </Badge>
                <Badge variant="slate" size="md" className="rounded-xl px-4 py-2 flex items-center gap-2">
                  <FiMapPin /> {internship.location || "Remote / Undefined"}
                </Badge>
                {internship.duration && (
                  <Badge variant="slate" size="md" className="rounded-xl px-4 py-2 flex items-center gap-2">
                    <FiClock /> {internship.duration}
                  </Badge>
                )}
              </div>
            </header>

            <Divider />

            <section className="space-y-4">
              <Typography variant="h3" weight="bold">About the Role</Typography>
              <Typography variant="body1" className="text-slate-600 leading-relaxed text-lg whitespace-pre-line">
                {internship.description || "No description provided."}
              </Typography>
            </section>

            {requirementsList.length > 0 && (
              <section className="space-y-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <Typography variant="h3" weight="bold">Requirements</Typography>
                <ul className="space-y-4">
                  {requirementsList.map((req: string, idx: number) => (
                    <li key={idx} className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FiCheckCircle size={14} />
                      </div>
                      <Typography variant="body1" className="text-slate-600">{req}</Typography>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {responsibilitiesList.length > 0 && (
              <section className="space-y-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <Typography variant="h3" weight="bold">Responsibilities</Typography>
                <ul className="space-y-4">
                  {responsibilitiesList.map((res: string, idx: number) => (
                    <li key={idx} className="flex gap-4">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center flex-shrink-0 mt-1">
                        <FiZap size={14} />
                      </div>
                      <Typography variant="body1" className="text-slate-600">{res}</Typography>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-28 overflow-hidden rounded-[32px] border-slate-100 shadow-2xl shadow-indigo-100/30">
              <div className="bg-gradient-to-br from-brand to-brand-secondary p-8 text-white relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <FiBriefcase size={80} />
                </div>
                <Typography variant="h4" color="white" weight="bold" className="mb-1 text-center font-bold">Compatibility</Typography>
                <div className="flex flex-col items-center">
                  <div className="text-5xl font-black mb-1">{displayScore}%</div>
                  <Typography variant="caption" color="white" className="opacity-80 font-bold uppercase tracking-widest">Profile Match</Typography>
                </div>
              </div>
              
              <CardContent className="p-8 space-y-4">
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
                    <button className="w-full py-4 bg-brand text-white rounded-2xl font-bold">Sign in to Apply</button>
                  </Link>
                )}

                <div className="pt-4 px-2 space-y-4">
                  <div className="flex items-center gap-3">
                    <FiClock className="text-slate-400" />
                    <Typography variant="body2" color="muted">
                      Posted {internship.created_at ? new Date(internship.created_at).toLocaleDateString() : "recently"}
                    </Typography>
                  </div>
                  <div className="flex items-center gap-3">
                    <FiStar className="text-slate-400" />
                    <Typography variant="body2" color="muted">
                      Deadline: {internship.deadline ? new Date(internship.deadline).toLocaleDateString() : "TBD"}
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
