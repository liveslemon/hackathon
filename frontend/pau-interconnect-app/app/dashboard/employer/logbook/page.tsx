"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button, Typography, Stack, Card, Badge } from "@/components/ui";
import DashboardHeader from "@/components/DashboardHeader";
import { FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";

interface LogbookEntry {
  id: string;
  student_id: string;
  date: string;
  activities_raw: string;
  activities_enhanced: string | null;
  status: string;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url: string;
  };
}

const EmployerLogbookPage = () => {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login/employer");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setUserProfile(profile);

      if (profile?.role !== "employer") {
        router.push("/dashboard/student");
        return;
      }

      // Fetch Logbook Entries
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/logbook/employer?employer_id=${session.user.id}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (entryId: string, newStatus: string) => {
    setUpdatingId(entryId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/logbook/entry/${entryId}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        // Optimistic UI update
        setEntries(entries.map(e => e.id === entryId ? { ...e, status: newStatus } : e));
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Failed to update status.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating status.");
    } finally {
      setUpdatingId(null);
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

  const pendingEntries = entries.filter(e => e.status === "pending");
  const historyEntries = entries.filter(e => e.status !== "pending");

  if (loading) {
    return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">Loading Logbook Reviews...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <DashboardHeader userProfile={userProfile} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Typography variant="h3" weight="bold" className="mb-2">Logbook Reviews</Typography>
        <Typography variant="body1" color="muted" className="mb-8">
          Verify and approve your interns' daily logbook entries.
        </Typography>

        <Stack spacing={8}>
          {/* Pending Reviews Section */}
          <div>
            <Typography variant="h5" weight="bold" className="mb-4 flex items-center gap-2">
              <FiClock className="text-amber-500" /> Pending Approval ({pendingEntries.length})
            </Typography>
            
            <Stack spacing={4}>
              {pendingEntries.length === 0 && (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                  <Typography color="muted">All caught up! No pending logbook entries to review.</Typography>
                </div>
              )}
              {pendingEntries.map((entry) => (
                <Card key={entry.id} className="p-6 bg-white border border-slate-200 hover:shadow-md transition-shadow">
                  <Stack direction="row" justify="between" align="start">
                    <div className="flex-1">
                      <Stack direction="row" align="center" spacing={3} className="mb-1">
                        <Typography variant="body1" weight="bold">
                           {entry.profiles?.full_name || "Unknown Student"}
                        </Typography>
                        {getStatusBadge(entry.status)}
                      </Stack>
                      <Typography variant="caption" color="muted" className="mb-3 block">
                        Logged for: {new Date(entry.date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </Typography>
                      
                      <div className="text-sm text-slate-700 whitespace-pre-wrap mt-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {entry.activities_enhanced || entry.activities_raw}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-6">
                      <Button 
                        variant="solid" 
                        size="sm" 
                        colorType="primary"
                        className="w-32 bg-emerald-500 hover:bg-emerald-600 border-none"
                        onClick={() => handleUpdateStatus(entry.id, "approved")}
                        isLoading={updatingId === entry.id}
                        disabled={updatingId !== null}
                      >
                         <FiCheckCircle className="mr-1 inline" /> Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        colorType="danger"
                        className="w-32 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleUpdateStatus(entry.id, "flagged")}
                        isLoading={updatingId === entry.id}
                        disabled={updatingId !== null}
                      >
                         <FiXCircle className="mr-1 inline" /> Flag Issue
                      </Button>
                    </div>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </div>

          {/* Review History Section */}
          {historyEntries.length > 0 && (
             <div>
               <Typography variant="h5" weight="bold" className="mb-4">Review History</Typography>
               <Stack spacing={4}>
                 {historyEntries.map((entry) => (
                   <Card key={entry.id} className="p-5 bg-white/60 border border-slate-100 opacity-80 hover:opacity-100 transition-opacity">
                     <Stack direction="row" justify="between" align="center">
                        <div className="flex-1">
                          <Stack direction="row" align="center" spacing={3}>
                            <Typography variant="body2" weight="bold">
                               {entry.profiles?.full_name || "Unknown Student"} 
                               <span className="font-normal text-slate-500 ml-2">({entry.date})</span>
                            </Typography>
                            {getStatusBadge(entry.status)}
                          </Stack>
                        </div>
                     </Stack>
                   </Card>
                 ))}
               </Stack>
             </div>
          )}
        </Stack>
      </main>
    </div>
  );
};

export default EmployerLogbookPage;
