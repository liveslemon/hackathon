"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
import { 
  FiArrowLeft, 
  FiChevronDown, 
  FiChevronUp, 
  FiFileText, 
  FiExternalLink, 
  FiCheckCircle, 
  FiXCircle,
  FiUser
} from "react-icons/fi";
import { authenticatedFetch } from "@/lib/api";

interface ApplicantReviewClientProps {
  internship: any;
  applicants: any[];
  userProfile: any;
}

export default function ApplicantReviewClient({ internship, applicants: initialApplicants, userProfile }: ApplicantReviewClientProps) {
  const router = useRouter();
  const [applicants, setApplicants] = useState<any[]>(initialApplicants);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedAppId(prev => prev === id ? null : id);
  };

  // --- Search Sync ---
  React.useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
       const query = (e as CustomEvent).detail;
       setSearchQuery(query || "");
    };
    window.addEventListener("dashboardSearch", handleGlobalSearch);
    return () => window.removeEventListener("dashboardSearch", handleGlobalSearch);
  }, []);

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
     try {
        await authenticatedFetch(`/applications/${applicationId}/status`, {
           method: "PUT",
           body: JSON.stringify({ status: newStatus })
        });
        
        // Optimistic UI Update
        setApplicants(prev => prev.map(app => app.id === applicationId ? { ...app, status: newStatus } : app));
     } catch (err: any) {
        alert("Failed to update student status: " + err.message);
     }
  };

  const filteredApplicants = applicants.filter(app => {
    const p = app.profiles || {};
    const textToSearch = `${p?.full_name || ""} ${p?.course || ""} ${p?.level || ""}`.toLowerCase();
    return textToSearch.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <Typography variant="h2" weight="bold" className="text-slate-900 tracking-tight">
            {internship?.role || "Internship"} Applicants
          </Typography>
          <Typography color="muted" className="font-medium text-sm">
            Reviewing <span className="text-brand font-bold">{filteredApplicants.length}</span> candidates for this role.
          </Typography>
        </div>
      </header>

      {applicants.length === 0 ? (
        <div className="p-20 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-[28px] flex items-center justify-center mx-auto mb-6 text-slate-300">
             <FiUser size={32} />
          </div>
          <Typography variant="h4" weight="bold" className="mb-2 text-slate-900">No applicants yet</Typography>
          <Typography color="muted" className="max-w-md mx-auto text-sm">When students apply, they'll appear here for your professional review.</Typography>
        </div>
      ) : (
        <Stack spacing={2}>
          {filteredApplicants.map((app) => {
            const studentInfo = app.profiles || {};
            const isExpanded = expandedAppId === app.id;
            
            return (
              <div 
                key={app.id} 
                className={cx(
                  "bg-white rounded-[32px] transition-all duration-300 overflow-hidden",
                  isExpanded ? "border border-slate-200 shadow-xl shadow-slate-200/40" : "border border-slate-100/60 hover:border-slate-200 hover:shadow-md"
                )}
              >
                {/* Unified Header & Info Strip */}
                <div 
                  onClick={() => toggleExpand(app.id)} 
                  className="p-5 flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className={cx(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold transition-all",
                      isExpanded ? "bg-brand text-white" : "bg-slate-50 text-slate-400 group-hover:bg-brand/5 group-hover:text-brand"
                    )}>
                       {studentInfo?.full_name?.charAt(0) || "S"}
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center gap-x-6 gap-y-1 min-w-0 flex-1">
                      <div className="min-w-0">
                        <Typography variant="body1" weight="bold" className="text-slate-900 truncate">
                           {studentInfo?.full_name || "Unknown Student"}
                        </Typography>
                        <Typography variant="caption" color="muted" className="font-medium">
                           {studentInfo?.course || "Course N/A"} • Lv.{studentInfo?.level || "N/A"}
                        </Typography>
                      </div>

                      <div className="flex items-center gap-3">
                         <Badge variant="slate" size="sm" className="bg-slate-50 border-none text-[10px] font-bold text-slate-400 tracking-wider">
                           {app.match_score || 0}% MATCH
                         </Badge>
                         <Badge 
                           size="sm" 
                           className={cx(
                             "text-[10px] font-bold tracking-wider border-none",
                             app.status === "accepted" ? "bg-emerald-50 text-emerald-600" : 
                             app.status === "rejected" ? "bg-rose-50 text-rose-600" : 
                             "bg-brand/5 text-brand"
                           )}
                         >
                           {app.status?.toUpperCase() || "PENDING"}
                         </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className={cx(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    isExpanded ? "bg-brand/10 text-brand rotate-180" : "bg-slate-50 text-slate-300"
                  )}>
                    <FiChevronDown size={18} />
                  </div>
                </div>

                {/* Expanded Details Dossier */}
                {isExpanded && (
                  <div className="px-5 pb-6 border-t border-slate-50 bg-[#fcfdfe]/50 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
                      
                      {/* Left Column (70%) - Cover Letter focus */}
                      <div className="lg:col-span-8">
                        <Typography variant="caption" weight="bold" className="text-slate-400 uppercase tracking-widest text-[10px] block mb-3 ml-1">Cover Letter</Typography>
                        <div className="bg-slate-100/50 p-6 rounded-2xl border border-slate-200/40 max-h-[220px] overflow-y-auto group hover:bg-white transition-colors">
                           <Typography variant="body2" className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                              {app.cover_letter || "The candidate did not provide a personal statement."}
                           </Typography>
                        </div>
                      </div>

                      {/* Right Column (30%) - Student Actions */}
                      <div className="lg:col-span-4 space-y-6">
                        <div className="space-y-4">
                          <Typography variant="caption" weight="bold" className="text-slate-400 uppercase tracking-widest text-[10px] block mb-2">Student Actions</Typography>
                          
                          <Button 
                            variant="outline"
                            className="w-full h-11 border-slate-200 text-slate-600 hover:border-brand hover:text-brand hover:bg-brand/5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all p-0"
                            onClick={() => {
                               if (!studentInfo?.cv_url) return;
                               const rawFullName = studentInfo?.full_name || "Student";
                               const safeName = rawFullName.trim().replace(/\s+/g, '_') + ' CV';
                               const viewerUrl = `/cv/view?name=${encodeURIComponent(safeName)}&url=${encodeURIComponent(studentInfo.cv_url)}`;
                               window.open(viewerUrl, "_blank");
                            }}
                            disabled={!studentInfo?.cv_url}
                          >
                            <FiFileText size={18} />
                            View CV / Resume
                          </Button>

                          <div className="flex flex-col gap-2 pt-2">
                             <div className="flex justify-between items-center mb-1 px-1">
                               <Typography variant="caption" weight="bold" className="text-slate-400">STATUS:</Typography>
                               <Typography variant="caption" weight="bold" className={cx(
                                 app.status === "accepted" ? "text-emerald-500" : app.status === "rejected" ? "text-rose-500" : "text-brand"
                               )}>
                                 {app.status?.toUpperCase() || "PENDING"}
                               </Typography>
                             </div>

                             <div className="grid grid-cols-2 gap-3">
                               <button 
                                 onClick={() => handleStatusChange(app.id, "accepted")}
                                 className={cx(
                                   "h-11 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm",
                                   app.status === "accepted" 
                                     ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                                     : "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                                 )}
                               >
                                 <FiCheckCircle size={18} />
                                 Accept
                               </button>
                               
                               <button 
                                 onClick={() => handleStatusChange(app.id, "rejected")}
                                 className={cx(
                                   "h-11 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm",
                                   app.status === "rejected" 
                                     ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" 
                                     : "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50"
                                 )}
                               >
                                 <FiXCircle size={18} />
                                 Reject
                               </button>
                             </div>

                             {app.status !== "pending" && (
                               <button 
                                 onClick={() => handleStatusChange(app.id, "pending")}
                                 className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] hover:text-brand transition-colors text-center py-2"
                               >
                                 Reset to Pending
                               </button>
                             )}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Stack>
      )}
    </div>
  );
}
