"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button, Typography, Stack, Card, Textarea, Badge } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";
import { FiBook, FiClock, FiCheckCircle, FiAlertCircle, FiStar, FiFileText } from "react-icons/fi";

interface LogbookEntry {
  id: string;
  date: string;
  activities_raw: string;
  activities_enhanced: string | null;
  status: string;
  employer_id: string;
}

const StudentLogbookPage = () => {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [todayEntry, setTodayEntry] = useState<LogbookEntry | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [rawText, setRawText] = useState("");
  const [enhancedText, setEnhancedText] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // The assigned employer from the accepted internship
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [internshipDetails, setInternshipDetails] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login/student");
        return;
      }

      // Fetch Profile and Internship Status in parallel
      const [profileRes, appliedRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).single(),
        supabase.from("applied_internships")
          .select("status, internship:internships (employer_id, role, company)")
          .eq("user_id", session.user.id)
          .eq("status", "accepted")
          .limit(1)
          .maybeSingle()
      ]);

      const profile = profileRes.data;
      const applied = appliedRes.data;

      setUserProfile(profile);

      const internshipData = Array.isArray(applied?.internship) ? applied?.internship[0] : applied?.internship;

      if (internshipData && internshipData.employer_id) {
        setHasStarted(true);
        setEmployerId(internshipData.employer_id);
        setInternshipDetails(internshipData);
      } else {
        setHasStarted(false);
        setLoading(false);
        return;
      }

      // Fetch Logbook Entries via backend
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const res = await fetch(`${backendUrl}/api/logbook/student?student_id=${session.user.id}`, {
          headers: {
            "Authorization": `Bearer ${session.access_token}`
          },
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          const allEntries: LogbookEntry[] = data.entries || [];
          setEntries(allEntries);
          
          const todayStr = new Date().toISOString().split("T")[0];
          const todays = allEntries.find(e => e.date === todayStr);
          if (todays) {
            setTodayEntry(todays);
            setRawText(todays.activities_raw);
            setEnhancedText(todays.activities_enhanced || "");
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.error("Backend request timed out when fetching logbook entries.");
      } else {
        console.error("Logbook fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnhance = async () => {
    if (!rawText.trim()) return;
    setIsEnhancing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/logbook/enhance`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ raw_text: rawText }),
      });
      const data = await res.json();
      if (res.ok && data.enhanced_text) {
        setEnhancedText(data.enhanced_text);
      } else {
        alert(data.detail || data.error || "Failed to enhance text. Please try again.");
      }
    } catch (err: any) {
      console.error("Enhance error:", err);
      alert(err?.message || "Could not connect to the server. Is the backend running?");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async () => {
    if (!rawText.trim() || !userProfile?.id || !employerId) return;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/logbook/entry`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          student_id: userProfile.id,
          employer_id: employerId,
          activities_raw: rawText,
          activities_enhanced: enhancedText || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Logbook entry saved for today!");
        fetchData(); // Refresh list
      } else {
        alert(data.detail || data.error || "Failed to save entry.");
      }
    } catch (err: any) {
      console.error("Logbook submit error:", err);
      alert(err?.message || "Could not connect to the server. Is the backend running?");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success" className="px-3 py-1 text-xs">Approved</Badge>;
      case "flagged":
        return <Badge variant="error" className="px-3 py-1 text-xs">Flagged</Badge>;
      default:
        return <Badge variant="warning" className="px-3 py-1 text-xs bg-amber-100 text-amber-700">Pending Review</Badge>;
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">Loading Logbook...</div>;
  }

  return (
    <DashboardShell userProfile={userProfile}>
      <div className="max-w-5xl mx-auto pb-12">
        <header className="mb-8 px-4 sm:px-0">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-brand/5 p-3 rounded-2xl border border-brand/10">
              <FiBook className="w-5 h-5 text-brand" />
            </div>
            <Typography variant="h3" weight="bold" className="text-slate-900 leading-tight">SIWES/IT Logbook</Typography>
          </div>
          <Typography variant="body2" className="text-slate-400 font-medium">Record daily activities. <span className="font-bold text-rose-500">Missed days cannot be recovered.</span></Typography>
        </header>

        {!hasStarted ? (
          <div className="px-4 sm:px-0">
            <Card className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
              <FiAlertCircle className="w-16 h-16 text-slate-200 mx-auto mb-6" />
              <Typography variant="h5" weight="bold" className="text-slate-800">No active internship</Typography>
              <Typography variant="body2" color="muted" className="mt-2 max-w-sm mx-auto">Once you are accepted into a role, your daily logbook will automatically unlock here.</Typography>
            </Card>
          </div>
        ) : (
          <Stack spacing={10} className="px-4 sm:px-0">
            {/* Today's Entry Section */}
            <div className="bg-white rounded-3xl p-8 md:p-10 border-2 border-brand/10 shadow-[0_20px_50px_rgba(79,70,229,0.05)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                <div>
                  <Typography variant="h4" weight="bold" className="text-slate-900 mb-1">
                     Today's Log <span className="text-sm font-medium text-slate-400 ml-2">({new Date().toLocaleDateString()})</span>
                  </Typography>
                  <Typography variant="caption" className="text-brand font-bold uppercase tracking-widest text-[10px]">
                    {internshipDetails?.role} at {internshipDetails?.company}
                  </Typography>
                </div>
                {todayEntry?.status === 'approved' && (
                  <Badge variant="success" className="px-6 py-2 rounded-full text-[11px] font-bold shadow-sm shadow-emerald-100"><FiCheckCircle className="mr-2 inline"/> Entry Approved</Badge>
                )}
              </div>

              {todayEntry?.status === 'approved' ? (
                <div className="bg-emerald-50 text-emerald-700 p-6 rounded-3xl text-sm border border-emerald-100/50 flex items-center gap-4">
                  <FiCheckCircle className="w-6 h-6 shrink-0" />
                  <p className="font-medium">Your supervisor has approved today's activities. The log is now locked for records.</p>
                </div>
              ) : (
                <Stack spacing={8} className="relative z-10">
                  <div>
                    <Typography variant="caption" className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-3 block">Rough Activities</Typography>
                    <Textarea 
                      placeholder="List your tasks for today..."
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      rows={5}
                      className="bg-[#fcfdfe] border-slate-100 rounded-2xl focus:ring-brand/5 focus:border-brand/20 transition-all p-5"
                    />
                    <div className="mt-4 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleEnhance} 
                        isLoading={isEnhancing}
                        disabled={!rawText.trim()}
                        className="bg-brand/5 text-brand rounded-xl px-6 h-10 font-bold flex items-center gap-2 hover:bg-brand/10 border border-brand/10"
                      >
                         <FiStar className="mr-2" /> Enhance with AI
                      </Button>
                    </div>
                  </div>

                  {enhancedText && (
                    <div className="bg-[#fcfdfe] p-6 rounded-3xl border border-brand/10 shadow-inner">
                       <Typography variant="caption" className="text-brand font-bold uppercase tracking-widest text-[10px] mb-3 block">AI Narrative Summary</Typography>
                       <Textarea 
                        value={enhancedText}
                        onChange={(e) => setEnhancedText(e.target.value)}
                        rows={6}
                        className="bg-white border-brand/10 rounded-2xl p-5 text-slate-700 leading-relaxed"
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-8 border-t border-slate-50">
                     <Button 
                       variant="solid" 
                       onClick={handleSubmit} 
                       isLoading={isSubmitting}
                       disabled={!rawText.trim()}
                       className="px-10 h-14 rounded-2xl shadow-xl shadow-brand/20 text-sm font-bold bg-brand text-white hover:bg-brand-dark transition-all"
                     >
                       {todayEntry ? "Update Entry" : "Finalize Today's Log"}
                     </Button>
                  </div>
                </Stack>
              )}
            </div>

            {/* History Section */}
            <div className="bg-white rounded-3xl p-8 md:p-10 border border-slate-100 shadow-sm">
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-50">
                <div>
                   <Typography variant="h4" weight="bold" className="text-slate-900 mb-1">Log History</Typography>
                   <Typography variant="caption" className="text-slate-400 font-medium">Review your past submissions and approval status</Typography>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open("/dashboard/student/logbook/print", "_blank")} 
                  className="rounded-xl px-6 h-11 font-bold flex items-center gap-2 border-slate-200 text-slate-600 hover:border-brand hover:text-brand transition-all"
                >
                  <FiFileText size={18} /> Export PDF
                </Button>
              </header>
              
              <div className="space-y-6">
                {entries.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <FiBook className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <Typography className="text-slate-400 font-medium font-bold">Your journey starts here. Submit your first log today!</Typography>
                  </div>
                ) : (
                  entries.filter(e => e.date !== new Date().toISOString().split("T")[0]).map((entry) => (
                    <div key={entry.id} className="group p-6 bg-[#fcfdfe] border border-slate-100/50 rounded-[28px] hover:border-brand/20 hover:shadow-lg hover:shadow-brand/5 transition-all">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                             <div className="px-5 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-sm font-bold text-slate-700">
                               {new Date(entry.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                             </div>
                             {getStatusBadge(entry.status)}
                          </div>
                          <div className="text-[14px] text-slate-600 leading-relaxed whitespace-pre-wrap bg-white p-6 rounded-2xl border border-slate-50 italic">
                            "{entry.activities_enhanced || entry.activities_raw}"
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Stack>
        )}
      </div>
    </DashboardShell>
  );
};

export default StudentLogbookPage;
