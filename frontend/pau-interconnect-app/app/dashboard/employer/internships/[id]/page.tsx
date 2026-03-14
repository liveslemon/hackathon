"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { cx } from "@/utils/cx";
import {
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Badge,
  Divider,
  Input,
} from "@/components/ui";
import DashboardHeader from "@/components/DashboardHeader";

// Icons
import { 
  FiArrowLeft, 
  FiSearch, 
  FiChevronDown, 
  FiChevronUp, 
  FiFileText, 
  FiExternalLink, 
  FiCheckCircle, 
  FiXCircle,
  FiUser
} from "react-icons/fi";

export default function EmployerApplicantReview() {
  const params = useParams();
  const internshipId = params?.id as string;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [internship, setInternship] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedAppId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    fetchReviewData();
  }, [internshipId]);

  const fetchReviewData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login/employer");
        return;
      }

      // Fetch Profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(profileData);

      // Verify Ownership of Internship
      const { data: internshipData, error: internshipError } = await supabase
         .from("internships")
         .select("*")
         .eq("id", internshipId)
         .eq("employer_id", user.id)
         .single();
         
      if (internshipError || !internshipData) {
         router.push("/dashboard/employer"); // Not their internship or it doesnt exist
         return;
      }
      setInternship(internshipData);

      // Fetch Applications from Backend (bypasses RLS)
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/internships/${internshipId}/applicants`);
      
      if (res.ok) {
         const data = await res.json();
         setApplicants(data.applicants || []);
      } else {
         console.error("Error fetching applicants from backend");
         setApplicants([]);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
     try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const res = await fetch(`${backendUrl}/applications/${applicationId}/status`, {
           method: "PUT",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ status: newStatus })
        });
        
        if (!res.ok) {
           const errData = await res.json();
           throw new Error(errData.error || "Failed to update status securely");
        }

        // Optimistic UI Update
        setApplicants(prev => prev.map(app => app.id === applicationId ? { ...app, status: newStatus } : app));
     } catch (err: any) {
        alert("Failed to update student status: " + err.message);
     }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#667eea]"></div>
      </div>
    );
  }

  const filteredApplicants = applicants.filter(app => {
    const p = app.profiles || {};
    const textToSearch = `${p?.full_name || ""} ${p?.course || ""} ${p?.level || ""}`.toLowerCase();
    return textToSearch.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <DashboardHeader userProfile={profile} />

      <main className="max-w-5xl mx-auto px-6 md:px-10 py-12">
        <Button 
          variant="ghost" 
          leftIcon={<FiArrowLeft />} 
          onClick={() => router.push("/dashboard/employer")} 
          className="mb-8 -ml-4"
        >
          Back to Dashboard
        </Button>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="space-y-1">
            <Typography variant="h2" weight="bold">
              {internship?.title || internship?.role} Applicants
            </Typography>
            <Typography color="muted">
              Review the <span className="font-bold text-slate-900">{applicants.length}</span> students who applied for this position.
            </Typography>
          </div>
          
          <div className="w-full md:w-80">
            <Input 
              placeholder="Search applicants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white shadow-sm"
              // No adornment in custom Input yet, but we can add an icon class or just leave it
            />
          </div>
        </header>

        {applicants.length === 0 ? (
          <Card className="p-16 text-center border-dashed border-2 bg-slate-50/50">
            <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-slate-400">
               <FiUser size={40} />
            </div>
            <Typography variant="h4" weight="bold" className="mb-2">No applicants yet</Typography>
            <Typography color="muted">When students apply to this role, they'll appear here for review.</Typography>
          </Card>
        ) : (
          <Stack spacing={4}>
            {filteredApplicants.map((app) => {
              const studentInfo = app.profiles || {};
              const isExpanded = expandedAppId === app.id;
              
              return (
                <Card 
                  key={app.id} 
                  className={cx(
                    "transition-all duration-300 overflow-hidden",
                    isExpanded ? "ring-2 ring-[#667eea] shadow-xl" : "hover:shadow-md"
                  )}
                >
                  <CardContent className="p-0">
                    <div 
                      onClick={() => toggleExpand(app.id)} 
                      className="p-6 md:p-8 flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-[#667eea] text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-indigo-100/50 flex-shrink-0">
                           {studentInfo?.full_name?.charAt(0) || "S"}
                        </div>
                        <div className="space-y-1">
                          <Typography variant="h4" weight="bold" className="group-hover:text-[#667eea] transition-colors">
                             {studentInfo?.full_name || "Unknown Student"}
                          </Typography>
                          <Typography variant="body2" color="muted" weight="medium">
                             {studentInfo?.course || "Course N/A"} • {studentInfo?.level || "Level N/A"}
                          </Typography>
                          
                          <div className="flex items-center gap-3 mt-2">
                             <Badge 
                               variant={app.match_score >= 70 ? "success" : app.match_score >= 40 ? "warning" : "error"}
                               size="sm"
                               className="font-bold"
                             >
                               {app.match_score || 0}% Match
                             </Badge>
                             <Badge 
                                variant="slate"
                                size="sm" 
                                className={cx(
                                  "font-bold uppercase tracking-wider",
                                  app.status === "accepted" ? "text-emerald-600 bg-emerald-50" : 
                                  app.status === "rejected" ? "text-rose-600 bg-rose-50" : 
                                  "text-slate-600 bg-slate-50"
                                )}
                             >
                                {app.status || "PENDING"}
                             </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <button className={cx(
                        "p-3 rounded-xl transition-all",
                        isExpanded ? "bg-[#667eea]/10 text-[#667eea]" : "bg-slate-50 text-slate-400 group-hover:text-slate-600"
                      )}>
                        {isExpanded ? <FiChevronUp size={24} /> : <FiChevronDown size={24} />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="bg-slate-50/50 border-t border-slate-100 p-8 md:p-10 animate-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                          
                          <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center gap-2 text-slate-900 mb-2">
                               <FiFileText className="text-[#667eea]" size={20} />
                               <Typography variant="h4" weight="bold">Cover Letter</Typography>
                            </div>
                            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm min-h-[200px]">
                               {app.cover_letter ? (
                                  <Typography variant="body1" className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                     {app.cover_letter}
                                  </Typography>
                               ) : (
                                  <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                                    <FiFileText size={40} className="mb-2" />
                                    <Typography variant="body2" className="italic">No cover letter provided.</Typography>
                                  </div>
                               )}
                            </div>
                          </div>

                          <div className="space-y-8">
                            <div className="space-y-4">
                              <Typography variant="subtitle2" weight="bold" className="uppercase tracking-widest text-slate-400">Student Profile</Typography>
                              <Button 
                                variant="solid"
                                className="w-full h-14 bg-slate-900 hover:bg-slate-800 shadow-xl"
                                leftIcon={<FiExternalLink />}
                                onClick={() => {
                                   if (!studentInfo?.cv_url) return;
                                   const rawFullName = studentInfo?.full_name || "Student";
                                   const safeName = rawFullName.trim().replace(/\s+/g, '_') + ' CV';
                                   const viewerUrl = `/cv/view?name=${encodeURIComponent(safeName)}&url=${encodeURIComponent(studentInfo.cv_url)}`;
                                   window.open(viewerUrl, "_blank");
                                }}
                                disabled={!studentInfo?.cv_url}
                              >
                                View CV / Resume
                              </Button>
                            </div>
                            
                            <Divider className="opacity-50" />

                            <div className="space-y-4">
                              <Typography variant="subtitle2" weight="bold" className="uppercase tracking-widest text-slate-400">Application Status</Typography>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <Button 
                                  variant={app.status === "accepted" ? "solid" : "outline"}
                                  colorType={app.status === "accepted" ? "primary" : "primary"}
                                  className={cx(
                                    "h-12 border-emerald-100",
                                    app.status === "accepted" ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200" : "text-emerald-600 hover:bg-emerald-50"
                                  )}
                                  leftIcon={<FiCheckCircle />}
                                  onClick={() => handleStatusChange(app.id, "accepted")}
                                >
                                  Accept
                                </Button>
                                <Button 
                                  variant={app.status === "rejected" ? "solid" : "outline"}
                                  colorType="danger"
                                  className={cx(
                                    "h-12 border-rose-100",
                                    app.status === "rejected" ? "bg-rose-500 hover:bg-rose-600 shadow-rose-200" : "text-rose-600 hover:bg-rose-50"
                                  )}
                                  leftIcon={<FiXCircle />}
                                  onClick={() => handleStatusChange(app.id, "rejected")}
                                >
                                  Reject
                                </Button>
                              </div>

                              {app.status !== "pending" && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="w-full text-slate-400 hover:text-slate-600"
                                  onClick={() => handleStatusChange(app.id, "pending")}
                                >
                                  Reset to Pending
                                </Button>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    )}

                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </main>
    </div>
  );
}
