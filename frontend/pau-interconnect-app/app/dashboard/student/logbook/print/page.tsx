"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { authenticatedFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface LogbookEntry {
  id: string;
  date: string;
  activities_enhanced: string | null;
  activities_raw: string;
  status: string;
}

interface InternshipSummary {
  role?: string;
  company?: string;
}

interface ProfileSummary {
  full_name?: string;
  department?: string;
}

interface AppliedInternship {
  status?: string;
  internship?: InternshipSummary | InternshipSummary[];
}

interface LogbookFetchResponse {
  entries?: LogbookEntry[];
}

export default function LogbookPrintView() {
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [internship, setInternship] = useState<InternshipSummary | null>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Wait for auth to be resolved before fetching data
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      window.location.href = "/login/student";
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
        if (authProfile) setProfile(authProfile as ProfileSummary);
        else {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          setProfile((data ?? null) as ProfileSummary | null);
        }
        const { data: apps } = await supabase
          .from("applied_internships")
          .select("status, internship:internships (role, company)")
          .eq("user_id", user.id);
        const accepted = (apps as AppliedInternship[] | null)?.find((a) => {
          const s = a.status?.toLowerCase();
          return s === "accepted" || s === "approved";
        });
        if (accepted) {
          const internshipData = Array.isArray(accepted.internship)
            ? accepted.internship[0]
            : accepted.internship;
          if (internshipData) setInternship(internshipData);
        }

        const logRes = await authenticatedFetch<LogbookFetchResponse>(
          `/api/logbook/student?student_id=${user.id}`,
          {},
          10000,
        );
        const sorted = (logRes.entries || []).sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        setEntries(sorted);
      } catch (err) {
        console.error("Print page fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user, authLoading, authProfile]);

  // Group entries by week number (relative to first entry)
  const groupEntriesByWeek = () => {
    if (entries.length === 0) return [];

    // Use the sorted entries we already have from the fetch
    const firstDate = new Date(entries[0].date);
    const weeks: {
      weekNumber: number;
      startDate: string;
      endDate: string;
      days: LogbookEntry[];
    }[] = [];

    entries.forEach((entry) => {
      const entryDate = new Date(entry.date);
      const diffTime = Math.abs(entryDate.getTime() - firstDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const weekNumber = Math.floor(diffDays / 7) + 1;

      let week = weeks.find((w) => w.weekNumber === weekNumber);
      if (!week) {
        const wStart = new Date(firstDate);
        wStart.setDate(firstDate.getDate() + (weekNumber - 1) * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 6);

        week = {
          weekNumber,
          startDate: wStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          endDate: wEnd.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          days: [],
        };
        weeks.push(week);
      }
      week.days.push(entry);
    });

    return weeks;
  };

  const weeklyData = groupEntriesByWeek();

  // Auto-print triggered manually by button for cleaner experience

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm font-medium text-slate-500 uppercase">
          Loading Logbook...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white text-black min-h-screen p-8 max-w-4xl mx-auto font-serif print:p-0 print:m-0">
      <div className="text-center mb-10 border-b-2 border-black pb-6">
        <h1 className="text-3xl font-black uppercase tracking-widest mb-2">
          Students Industrial Work Experience Scheme
        </h1>
        <h2 className="text-xl font-bold tracking-widest mb-6">
          OFFICIAL SIWES LOGBOOK
        </h2>

        <div className="grid grid-cols-2 gap-4 text-left text-sm mt-8 border-2 border-black p-6">
          <div className="space-y-1">
            <p>
              <strong>NAME:</strong> {profile?.full_name?.toUpperCase()}
            </p>
            <p>
              <strong>INSTITUTION:</strong> PAN-ATLANTIC UNIVERSITY
            </p>
            <p>
              <strong>DEPARTMENT:</strong> {profile?.department || "N/A"}
            </p>
          </div>
          <div className="space-y-1 border-l-2 border-black pl-6">
            {internship && (
              <>
                <p>
                  <strong>ORGANIZATION:</strong>{" "}
                  {internship.company?.toUpperCase()}
                </p>
                <p>
                  <strong>ROLE:</strong> {internship.role?.toUpperCase()}
                </p>
              </>
            )}
            <p>
              <strong>TOTAL ENTRIES:</strong> {entries.length} Days
            </p>
            <p className="text-xs mt-2 text-slate-500 print:text-black">
              <strong>EXPORT GENERATED:</strong> {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {weeklyData.length === 0 ? (
          <p className="text-center italic mt-20">
            No logbook entries available for this period.
          </p>
        ) : (
          weeklyData.map((week) => (
            <div key={week.weekNumber} className="break-inside-avoid">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-lg font-black uppercase bg-black text-white px-3 py-1">
                  Week {week.weekNumber}
                </h3>
                <span className="text-sm font-bold border-b-2 border-black flex-1 pb-1">
                  {week.startDate} — {week.endDate}
                </span>
              </div>

              <div className="border-2 border-black">
                {week.days.map((day, idx) => (
                  <div
                    key={day.id}
                    className={idx !== 0 ? "border-t-2 border-black" : ""}
                  >
                    <div className="flex border-b border-black bg-slate-50">
                      <div className="w-40 border-r border-black p-2 font-bold text-xs uppercase shrink-0">
                        {new Date(day.date).toLocaleDateString([], {
                          weekday: "long",
                        })}
                        <br />
                        <span className="font-normal opacity-60 font-sans">
                          {day.date}
                        </span>
                      </div>
                      <div className="p-2 text-[10px] font-bold text-slate-400 uppercase flex items-center">
                        Daily Progress Report
                      </div>
                    </div>
                    <div className="p-4 text-sm leading-relaxed min-h-[80px]">
                      {day.activities_enhanced || day.activities_raw}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 border-2 border-black border-t-0 p-4 bg-slate-50/50">
                <div className="text-[11px] space-y-4">
                  <p className="font-bold border-b border-black pb-1">
                    INDUSTRY SUPERVISOR&apos;S COMMENTS
                  </p>
                  <div className="h-10"></div>
                  <p className="border-t border-dotted border-black pt-1">
                    NAME & SIGNATURE / DATE
                  </p>
                </div>
                <div className="text-[11px] space-y-4 border-l-2 border-black pl-4">
                  <p className="font-bold border-b border-black pb-1">
                    INSTITUTION SUPERVISOR&apos;S COMMENTS
                  </p>
                  <div className="h-10"></div>
                  <p className="border-t border-dotted border-black pt-1">
                    NAME & SIGNATURE / DATE
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-12 text-center print:hidden pb-20">
        <button
          onClick={() => window.print()}
          className="bg-black text-white px-10 py-3 rounded-full font-bold hover:scale-105 transition-transform shadow-lg"
        >
          Print Logbook / Export PDF
        </button>
      </div>
    </div>
  );
}
