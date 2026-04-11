"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button, Typography, Stack, Card, Textarea, Badge } from "@/components/ui";
import DashboardHeader from "@/components/DashboardHeader";
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

      // Fetch Profile
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setUserProfile(profile);

      // Check if student has an accepted internship
      const { data: applied } = await supabase
        .from("applied_internships")
        .select("status, internship:internships (employer_id, role, company)")
        .eq("user_id", session.user.id)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();

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
        clearTimeout(timeoutId);
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
    <div className="min-h-screen bg-[#f8fafc]">
      <DashboardHeader userProfile={userProfile} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Typography variant="h3" weight="bold" className="mb-2">SIWES/IT Logbook</Typography>
        <Typography variant="body1" color="muted" className="mb-8">
          Record your daily internship activities. <span className="font-bold text-red-500">Missed days cannot be recovered.</span>
        </Typography>

        {!hasStarted ? (
          <Card className="p-8 text-center bg-white rounded-3xl border border-slate-200">
            <FiAlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <Typography variant="h5" color="muted">You don't have an active internship yet.</Typography>
            <Typography variant="body2" color="muted" className="mt-2">Once you are accepted into a role, your logbook will unlock here.</Typography>
          </Card>
        ) : (
          <Stack spacing={8}>
            {/* Today's Entry Section */}
            <Card className="p-6 md:p-8 bg-white border-brand border-2 shadow-sm rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none" />
              
              <Stack direction="row" justify="between" align="center" className="mb-6">
                <div>
                  <Typography variant="h5" weight="bold" className="flex items-center gap-2">
                     Today's Log <span className="text-sm font-normal text-slate-500">({new Date().toLocaleDateString()})</span>
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {internshipDetails?.role} at {internshipDetails?.company}
                  </Typography>
                </div>
                {todayEntry?.status === 'approved' && (
                  <Badge variant="success" className="px-4 py-1.5"><FiCheckCircle className="mr-1 inline"/> Approved</Badge>
                )}
              </Stack>

              {todayEntry?.status === 'approved' ? (
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm border border-emerald-100">
                  Your supervisor has already approved today's entry. Content is locked.
                </div>
              ) : (
                <Stack spacing={6}>
                  <div>
                    <Typography variant="caption" weight="bold" className="mb-2 block text-slate-700">Rough Notes</Typography>
                    <Textarea 
                      placeholder="What did you work on today? Give a quick summary, don't worry about sounding perfect."
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      rows={4}
                      className="bg-slate-50"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleEnhance} 
                        isLoading={isEnhancing}
                        disabled={!rawText.trim()}
                        className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                      >
                         <FiStar className="mr-2" /> Enhance with AI
                      </Button>
                    </div>
                  </div>

                  {enhancedText && (
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                       <Typography variant="caption" weight="bold" className="mb-2 block text-indigo-800">AI Polished Version</Typography>
                       <Textarea 
                        value={enhancedText}
                        onChange={(e) => setEnhancedText(e.target.value)}
                        rows={5}
                        className="bg-white border-indigo-200"
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                     <Button 
                       variant="solid" 
                       onClick={handleSubmit} 
                       isLoading={isSubmitting}
                       disabled={!rawText.trim()}
                       className="px-8"
                     >
                       {todayEntry ? "Update Entry" : "Submit Today's Log"}
                     </Button>
                  </div>
                </Stack>
              )}
            </Card>

            {/* History Section */}
            <div>
              <Stack direction="row" justify="between" align="center" className="mb-6">
                <Typography variant="h5" weight="bold">Logbook History</Typography>
                <Button variant="ghost" size="sm" onClick={() => window.open("/dashboard/student/logbook/print", "_blank")} className="text-brand flex items-center gap-2">
                  <FiFileText /> Export PDF
                </Button>
              </Stack>
              
              <Stack spacing={4}>
                {entries.length === 0 && (
                  <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                    <Typography color="muted">No history yet. Start logging today!</Typography>
                  </div>
                )}
                {entries.filter(e => e.date !== new Date().toISOString().split("T")[0]).map((entry) => (
                  <Card key={entry.id} className="p-5 bg-white border border-slate-100 hover:shadow-md transition-shadow">
                    <Stack direction="row" justify="between" align="start">
                      <div className="flex-1">
                        <Stack direction="row" align="center" spacing={3} className="mb-2">
                          <Typography variant="body1" weight="bold">{new Date(entry.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Typography>
                          {getStatusBadge(entry.status)}
                        </Stack>
                        <div className="text-sm text-slate-700 whitespace-pre-wrap mt-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          {entry.activities_enhanced || entry.activities_raw}
                        </div>
                      </div>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </div>
          </Stack>
        )}
      </main>
    </div>
  );
};

export default StudentLogbookPage;
