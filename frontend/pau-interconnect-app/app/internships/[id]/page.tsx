"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { cx } from "@/utils/cx";

import {
  Typography,
  Stack,
  Button,
  Badge,
  Card,
  CardContent,
  Divider,
  Modal,
  Input,
  Textarea,
} from "@/components/ui";
import DashboardHeader from "@/components/DashboardHeader";

// Icons
import { 
  FiBriefcase, 
  FiMapPin, 
  FiClock, 
  FiStar, 
  FiSend, 
  FiX, 
  FiArrowLeft,
  FiCheckCircle,
  FiAlertTriangle,
  FiZap
} from "react-icons/fi";

export default function InternshipDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const internshipId = params?.id as string;

  // --- DATA STATES ---
  const [internship, setInternship] = useState<any>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [matchingSkills, setMatchingSkills] = useState<string[]>([]);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  // --- MODAL & ACTION STATES ---
  const [isApplyModalOpen, setApplyModalOpen] = useState(false);
  const [isCvReviewModalOpen, setCvReviewModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);

  // --- FETCH REAL DATA FROM SUPABASE ---
  useEffect(() => {
    async function fetchInternshipData() {
      if (!internshipId) return;

      try {
        const { data, error } = await supabase
          .from("internships")
          .select("*")
          .eq("id", internshipId)
          .single();

        if (error) throw error;
        setInternship(data);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .single();
            if (profileData) {
               setUserProfile(profileData);
            }
          } catch(e) {
             console.log("no profile data");
          }

          const { data: appliedData } = await supabase
            .from("applied_internships")
            .select("id, status")
            .eq("user_id", user.id)
            .eq("internship_id", internshipId)
            .maybeSingle();

          if (appliedData) {
            setHasApplied(true);
            // We can repurpose userProfile or add a new state, but for simplicity let's use a local variable or update a state if needed
            // Actually, let's add a state for status to be cleaner
            setApplicationStatus(appliedData.status);
          }

          try {
            const { data: matchData, error: matchError } = await supabase
              .from("match_results")
              .select("match_score, matching_skills, missing_skills")
              .eq("user_id", user.id)
              .eq("internship_id", internshipId)
              .maybeSingle();

            if (matchData) {
              setMatchScore(matchData.match_score);
              
              if (matchData.matching_skills && Array.isArray(matchData.matching_skills)) {
                  setMatchingSkills(matchData.matching_skills);
              }
              
              if (matchData.missing_skills && Array.isArray(matchData.missing_skills)) {
                  setMissingSkills(matchData.missing_skills);
              }
            }
          } catch (err) {
            console.error("Failed to fetch match score:", err);
          }
        }
      } catch (error) {
        console.error("Error fetching internship details:", error);
      } finally {
        setIsPageLoading(false);
      }
    }

    fetchInternshipData();
  }, [internshipId]);

  // --- HANDLERS ---
  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        alert("Please sign in to apply.");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/submit-application`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           user_id: userId,
           internship_id: internship.id,
           cover_letter: coverLetter,
        })
      });
      
      const result = await response.json();
      if (!response.ok) {
         throw new Error(result.error || "Failed to submit application");
      }

      setHasApplied(true);
      setApplyModalOpen(false);
      alert("Application submitted successfully! The employer has been notified.");
    } catch (error: any) {
      console.error("Application error:", error);
      alert(error?.message || "Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCvReview = () => {
    setCvReviewModalOpen(true);
  };

  const handleDraftCoverLetter = async () => {
    setIsDrafting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please sign in to use this feature.");
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/draft-cover-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, internship_id: internship.id }),
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate cover letter.");
      }
      
      const data = await response.json();
      if (data.cover_letter) {
        setCoverLetter(data.cover_letter);
      }
    } catch (error: any) {
      console.error("Drafting error:", error);
      alert(error.message || "An error occurred while drafting the cover letter.");
    } finally {
      setIsDrafting(false);
    }
  };

  // --- LOADING & FALLBACK STATES ---
  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#667eea]"></div>
      </div>
    );
  }

  if (!internship) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[32px] flex items-center justify-center mb-6">
          <FiX className="w-10 h-10" />
        </div>
        <Typography variant="h2" weight="bold">Internship not found</Typography>
        <Typography variant="body1" color="muted" className="mt-2 max-w-md">
          The internship you are looking for does not exist or has been removed.
        </Typography>
        <Button onClick={() => router.push("/dashboard/student")} className="mt-8">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const requirementsList = Array.isArray(internship.requirements)
    ? internship.requirements
    : internship.requirements?.split("\n") || [];

  const responsibilitiesList = Array.isArray(internship.responsibilities)
    ? internship.responsibilities
    : internship.responsibilities?.split("\n") || [];

  const displayScore = matchScore !== null ? matchScore : (internship.matchPercentage || 0);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <DashboardHeader userProfile={userProfile} />

      <main className="max-w-5xl mx-auto px-6 md:px-10 py-12">
        <Button
          variant="ghost"
          leftIcon={<FiArrowLeft />}
          onClick={() => router.push("/dashboard/student")}
          className="mb-8 -ml-4"
        >
          Back to Listings
        </Button>

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
              <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] p-8 text-white relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <FiBriefcase size={80} />
                </div>
                <Typography variant="h4" color="white" weight="bold" className="mb-1 text-center">Compatibility</Typography>
                <div className="flex flex-col items-center">
                  <div className="text-5xl font-black mb-1">{displayScore}%</div>
                  <Typography variant="caption" color="white" className="opacity-80 font-bold uppercase tracking-widest">Profile Match</Typography>
                </div>
              </div>
              
              <CardContent className="p-8 space-y-4">
                <Button
                  size="lg"
                  onClick={() => setApplyModalOpen(true)}
                  disabled={hasApplied}
                  leftIcon={hasApplied ? (
                    applicationStatus?.toLowerCase() === 'accepted' ? <FiCheckCircle /> :
                    applicationStatus?.toLowerCase() === 'rejected' ? <FiX /> : <FiClock />
                  ) : <FiSend />}
                  className={cx(
                    "w-full", 
                    hasApplied && applicationStatus?.toLowerCase() === 'accepted' ? "bg-emerald-500 text-white" :
                    hasApplied && applicationStatus?.toLowerCase() === 'rejected' ? "bg-rose-500 text-white" :
                    hasApplied ? "bg-indigo-500 text-white" : ""
                  )}
                >
                  {hasApplied ? (
                    applicationStatus?.toLowerCase() === 'accepted' ? "Application Approved" :
                    applicationStatus?.toLowerCase() === 'rejected' ? "Application Denied" : "Application Pending"
                  ) : "Apply Now"}
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  leftIcon={<FiZap className="text-amber-500" />}
                  onClick={handleCvReview}
                  className="w-full border-amber-100 hover:border-amber-200 hover:bg-amber-50"
                >
                  AI CV Review
                </Button>

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
      </main>

      {/* Apply Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => !isSubmitting && setApplyModalOpen(false)}
        title="Quick Application"
        size="md"
        footer={
          <Stack direction="row" spacing={3} className="w-full">
            <Button 
              variant="outline" 
              leftIcon={<FiZap className="text-indigo-500" />}
              onClick={handleDraftCoverLetter} 
              disabled={isDrafting || isSubmitting}
              className="flex-1"
            >
              {isDrafting ? "Drafting..." : "Draft with AI"}
            </Button>
            <Button 
              onClick={handleApply} 
              disabled={isSubmitting || isDrafting} 
              isLoading={isSubmitting}
              rightIcon={<FiSend />}
              className="flex-1"
            >
              Submit Application
            </Button>
          </Stack>
        }
      >
        <div className="space-y-6">
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
            <Typography variant="body2" weight="bold" color="primary" className="mb-2">WHY YOU'RE A FIT</Typography>
            <Typography variant="body1" className="text-slate-700">
              Share a brief cover letter or statement about why you're interested in {internship.company}.
            </Typography>
          </div>
          
          <Textarea
            label="Cover Letter"
            placeholder="Tell us about yourself and why you're perfect for this role..."
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            disabled={isSubmitting}
            rows={6}
          />
        </div>
      </Modal>

      {/* AI Review Modal */}
      <Modal
        isOpen={isCvReviewModalOpen}
        onClose={() => !isReviewing && setCvReviewModalOpen(false)}
        title="AI Keyword Analysis"
        size="md"
      >
        <div className="space-y-8">
          <Typography variant="body1" color="muted">
            I've compared your profile keywords with the requirements for this {internship.role || "position"}.
          </Typography>

          {isReviewing ? (
            <div className="flex flex-col items-center py-10 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
              <Typography variant="body2">Deep scanning requirements...</Typography>
            </div>
          ) : (
            <div className="space-y-6">
              {matchingSkills.length > 0 && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-[32px] space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <FiCheckCircle size={20} />
                    <Typography variant="h4" weight="bold">Matched Strengths</Typography>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matchingSkills.map((skill, index) => (
                      <Badge key={index} variant="success" size="md" className="rounded-xl px-4 py-1.5 font-bold">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {missingSkills.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-[32px] space-y-4">
                  <div className="flex items-center gap-2 text-amber-600">
                    <FiAlertTriangle size={20} />
                    <Typography variant="h4" weight="bold">Missing Keywords</Typography>
                  </div>
                  <Typography variant="body1" className="text-amber-900/70 leading-relaxed">
                    Recruiters for this role are looking for <strong>{missingSkills.join(", ")}</strong>. 
                    Consider highlighting these in your profile or CV if you have the experience.
                  </Typography>
                </div>
              )}
              
              {matchingSkills.length === 0 && missingSkills.length === 0 && (
                <div className="bg-slate-50 border border-slate-100 p-8 rounded-[32px] text-center">
                  <Typography variant="body1" color="muted">
                    Resume data is still processing or unavailable for this listing.
                  </Typography>
                </div>
              )}

              <Button onClick={() => setCvReviewModalOpen(false)} variant="solid" className="mt-4 w-full">
                Got it, Thanks!
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
