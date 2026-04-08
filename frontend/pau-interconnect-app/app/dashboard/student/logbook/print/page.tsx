"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface LogbookEntry {
  id: string;
  date: string;
  activities_enhanced: string | null;
  activities_raw: string;
  status: string;
}

export default function LogbookPrintView() {
  const [profile, setProfile] = useState<any>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        setProfile(p);

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const res = await fetch(`${backendUrl}/api/logbook/student?student_id=${session.user.id}`, {
           headers: {
             "Authorization": `Bearer ${session.access_token}`
           }
        });
        if (res.ok) {
          const data = await res.json();
          // Sort ascending for the printed logbook (Week 1, Day 1...)
          const sorted = (data.entries || []).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setEntries(sorted);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && profile) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, profile]);

  if (loading) return <div className="p-10 text-center">Preparing Document...</div>;

  return (
    <div className="bg-white text-black min-h-screen p-8 max-w-4xl mx-auto font-serif print:p-0 print:m-0">
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-widest mb-1">Students Industrial Work Experience Scheme (SIWES)</h1>
        <h2 className="text-xl font-bold mb-4">Official Logbook</h2>
        
        <div className="flex justify-between text-left text-sm mt-6 border border-black p-4">
          <div>
            <p><strong>Student Name:</strong> {profile?.full_name}</p>
            <p className="mt-1"><strong>Institution:</strong> Pan-Atlantic University</p>
          </div>
          <div>
            <p><strong>Period:</strong> {entries.length > 0 ? entries[0].date : 'N/A'} - {entries.length > 0 ? entries[entries.length-1].date : 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {entries.length === 0 ? (
          <p className="text-center italic">No logbook entries available.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="border border-black break-inside-avoid">
              <div className="bg-gray-100 border-b border-black p-2 font-bold flex justify-between">
                <span>Date: {new Date(entry.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span className="text-xs font-normal align-middle uppercase border border-black px-1 leading-tight">
                  {entry.status}
                </span>
              </div>
              <div className="p-4 whitespace-pre-wrap text-sm min-h-[100px]">
                {entry.activities_enhanced || entry.activities_raw}
              </div>
              <div className="border-t border-black p-2 flex justify-between text-xs mt-4">
                <span>Student Signature: ______________________</span>
                <span>Supervisor Signature: ______________________</span>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Hide Print button during actual print */}
      <div className="mt-8 text-center print:hidden">
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded">
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
