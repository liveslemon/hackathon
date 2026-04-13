"use client";

import React, { useState } from "react";
import { Button, Typography, Stack, Card, Badge } from "@/components/ui";
import { FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";
import { authenticatedFetch } from "@/lib/api";

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

interface LogbookReviewClientProps {
  entries: LogbookEntry[];
  userProfile: any;
}

export default function LogbookReviewClient({ entries: initialEntries, userProfile }: LogbookReviewClientProps) {
  const [entries, setEntries] = useState<LogbookEntry[]>(initialEntries);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateStatus = async (entryId: string, newStatus: string) => {
    setUpdatingId(entryId);
    try {
      await authenticatedFetch(`/api/logbook/entry/${entryId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      
      // Optimistic UI update
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: newStatus } : e));
    } catch (err: any) {
      alert("Error updating status: " + err.message);
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
        return <Badge variant="warning" className="px-3 py-1 text-xs bg-amber-100 text-amber-700 font-bold uppercase tracking-wider">Pending Review</Badge>;
    }
  };

  const pendingEntries = entries.filter(e => e.status === "pending");
  const historyEntries = entries.filter(e => e.status !== "pending");

  return (
    <div className="space-y-12">
      <div>
        <Typography variant="h2" weight="bold" className="mb-2">Logbook Reviews</Typography>
        <Typography variant="body1" color="muted">
          Verify and approve your interns' daily logbook entries.
        </Typography>
      </div>

      <Stack spacing={10}>
        {/* Pending Reviews Section */}
        <div>
          <Typography variant="h4" weight="bold" className="mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
               <FiClock size={20} />
            </div>
            Pending Approval ({pendingEntries.length})
          </Typography>
          
          <Stack spacing={4}>
            {pendingEntries.length === 0 && (
              <Card className="p-16 text-center border-dashed border-2 bg-slate-50/50 rounded-[40px]">
                <Typography color="muted" weight="medium">All caught up! No pending logbook entries to review.</Typography>
              </Card>
            )}
            {pendingEntries.map((entry) => (
              <Card key={entry.id} className="p-8 bg-white border border-slate-100 rounded-[32px] hover:shadow-xl hover:ring-2 hover:ring-brand/5 transition-all group">
                <Stack direction="row" justify="between" align="start">
                  <div className="flex-1">
                    <Stack direction="row" align="center" spacing={4} className="mb-2">
                       <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                          {entry.profiles?.full_name?.charAt(0) || "S"}
                       </div>
                       <div>
                        <Typography variant="h4" weight="bold" className="text-slate-900 mb-0.5">
                           {entry.profiles?.full_name || "Unknown Student"}
                        </Typography>
                        <div className="flex items-center gap-3">
                           <Typography variant="caption" color="muted" className="font-medium">
                             {new Date(entry.date).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                           </Typography>
                           {getStatusBadge(entry.status)}
                        </div>
                       </div>
                    </Stack>
                    
                    <div className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-wrap mt-6 bg-slate-50/80 p-6 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors group-hover:shadow-inner">
                      {entry.activities_enhanced || entry.activities_raw}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 ml-10 pt-2">
                    <Button 
                      variant="solid" 
                      className="w-36 h-12 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-100 rounded-xl border-none font-bold"
                      onClick={() => handleUpdateStatus(entry.id, "approved")}
                      isLoading={updatingId === entry.id}
                      disabled={updatingId !== null}
                    >
                       <FiCheckCircle className="mr-2 inline" size={18} /> Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-36 h-12 border-rose-100 text-rose-600 hover:bg-rose-50 rounded-xl font-bold"
                      onClick={() => handleUpdateStatus(entry.id, "flagged")}
                      isLoading={updatingId === entry.id}
                      disabled={updatingId !== null}
                    >
                       <FiXCircle className="mr-2 inline" size={18} /> Flag Issue
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
             <Typography variant="h5" weight="bold" className="mb-6 text-slate-400 uppercase tracking-widest text-xs">Review History</Typography>
             <Stack spacing={3}>
               {historyEntries.map((entry) => (
                 <Card key={entry.id} className="p-6 bg-white/40 border border-slate-50 opacity-80 hover:opacity-100 transition-all rounded-2xl">
                   <Stack direction="row" justify="between" align="center">
                      <div className="flex-1">
                        <Stack direction="row" align="center" spacing={4}>
                          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 text-sm font-bold">
                             {entry.profiles?.full_name?.charAt(0) || "S"}
                          </div>
                          <Typography variant="body1" weight="bold" className="text-slate-700">
                             {entry.profiles?.full_name || "Unknown Student"} 
                             <span className="font-medium text-slate-400 ml-4">{entry.date}</span>
                          </Typography>
                          <div className="ml-auto">
                            {getStatusBadge(entry.status)}
                          </div>
                        </Stack>
                      </div>
                   </Stack>
                 </Card>
               ))}
             </Stack>
           </div>
        )}
      </Stack>
    </div>
  );
}
