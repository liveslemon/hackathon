"use client";
import { useEffect, useState } from "react";
import { PLACEMENT_COLUMNS, toPlacements, type Placement } from "@/lib/placements";
import { supabase } from "@/lib/supabaseClient";
import { authenticatedFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface LogbookEntry {
  id: string;
  date: string;
  activities_enhanced: string | null;
  activities_raw: string;
  status: string;
  feedback_notes?: string | null;
  reviewed_at?: string | null;
  application_id?: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" parsed as a local date (new Date("YYYY-MM-DD") is UTC midnight).
function localDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function mondayOf(date: Date): Date {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return monday;
}

const STATUS_LABEL: Record<string, string> = {
  approved: "APPROVED",
  pending: "PENDING REVIEW",
  flagged: "RETURNED FOR CORRECTION",
};

interface InternshipSummary {
  role?: string;
  company?: string;
}

interface ProfileSummary {
  full_name?: string;
  course?: string;
  level?: string;
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
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);

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
            .select("full_name, course, level")
            .eq("id", user.id)
            .single();
          setProfile((data ?? null) as ProfileSummary | null);
        }
        const { data: apps } = await supabase
          .from("applied_internships")
          .select(PLACEMENT_COLUMNS)
          .eq("user_id", user.id)
          .not("placement_status", "is", null);
        const placements = toPlacements(apps);
        const wanted = new URLSearchParams(window.location.search).get("placement");
        const chosen =
          placements.find((p) => p.id === wanted) ?? placements[0] ?? null;
        setPlacement(chosen);
        if (chosen) setInternship({ role: chosen.role, company: chosen.company });

        const logRes = await authenticatedFetch<LogbookFetchResponse>(
          `/api/logbook/student?student_id=${user.id}`,
          {},
          10000,
        );
        // Only this placement's entries (pre-placement rows belong to the active one).
        const forPlacement = (logRes.entries || []).filter((e) =>
          e.application_id
            ? e.application_id === chosen?.id
            : chosen?.placement_status === "active",
        );
        const sorted = forPlacement.sort(
          (a, b) => localDate(a.date).getTime() - localDate(b.date).getTime(),
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

  const approvedCount = entries.filter((e) => e.status === "approved").length;
  const visibleEntries = approvedOnly
    ? entries.filter((e) => e.status === "approved")
    : entries;

  // Group into continuous calendar weeks (Mon-Sun) from first week to last week.
  // Empty weeks are preserved so the SIWES logbook accounts for all weeks.
  const groupEntriesByWeek = () => {
    if (visibleEntries.length === 0) return [];

    const firstEntryDate = localDate(visibleEntries[0].date);
    const lastEntryDate = localDate(visibleEntries[visibleEntries.length - 1].date);
    const firstMonday = mondayOf(
      placement?.started_at ? localDate(placement.started_at) : firstEntryDate,
    );
    const lastMonday = mondayOf(
      placement?.ended_at ? localDate(placement.ended_at) : lastEntryDate,
    );

    const totalWeeks = Math.max(
      1,
      Math.round((lastMonday.getTime() - firstMonday.getTime()) / (7 * DAY_MS)) + 1,
    );

    const weeks: {
      weekNumber: number;
      startDate: string;
      endDate: string;
      days: LogbookEntry[];
    }[] = [];

    // Initialize all continuous weeks
    for (let w = 1; w <= totalWeeks; w++) {
      const wStart = new Date(firstMonday.getTime() + (w - 1) * 7 * DAY_MS);
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 6);

      weeks.push({
        weekNumber: w,
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
      });
    }

    // Populate entries into corresponding week bucket
    visibleEntries.forEach((entry) => {
      const entryMonday = mondayOf(localDate(entry.date));
      const weekIndex = Math.round(
        (entryMonday.getTime() - firstMonday.getTime()) / (7 * DAY_MS),
      );
      if (weekIndex >= 0 && weekIndex < weeks.length) {
        weeks[weekIndex].days.push(entry);
      }
    });

    return weeks;
  };

  const weeklyData = groupEntriesByWeek();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm font-medium text-slate-500 uppercase">
          Loading Logbook...
        </p>
      </div>
    );
  }

  const handleDownloadCsv = () => {
    if (!user) return;
    const url = `/api/reports/logbook?format=csv&student=${user.id}`;
    window.open(url, "_blank");
  };

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
              <strong>COURSE:</strong> {profile?.course || "N/A"}
            </p>
            <p>
              <strong>LEVEL:</strong> {profile?.level || "N/A"}
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
                {placement?.started_at && (
                  <p>
                    <strong>PERIOD:</strong>{" "}
                    {new Date(placement.started_at).toLocaleDateString()} –{" "}
                    {placement.ended_at
                      ? new Date(placement.ended_at).toLocaleDateString()
                      : "PRESENT"}
                  </p>
                )}
              </>
            )}
            <p>
              <strong>TOTAL ENTRIES:</strong> {entries.length} days (
              {approvedCount} approved by supervisor)
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
                {week.days.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500 italic">
                    No entries logged for this week.
                  </div>
                ) : (
                  week.days.map((day, idx) => (
                    <div
                      key={day.id}
                      className={idx !== 0 ? "border-t-2 border-black" : ""}
                    >
                      <div className="flex border-b border-black bg-slate-50">
                        <div className="w-40 border-r border-black p-2 font-bold text-xs uppercase shrink-0">
                          {localDate(day.date).toLocaleDateString([], {
                            weekday: "long",
                          })}
                          <br />
                          <span className="font-normal opacity-60 font-sans">
                            {day.date}
                          </span>
                        </div>
                        <div className="p-2 text-[10px] font-bold text-slate-400 uppercase flex items-center flex-1">
                          Daily Progress Report
                        </div>
                        <div
                          className={
                            "p-2 text-[10px] font-bold uppercase flex items-center border-l border-black " +
                            (day.status === "approved"
                              ? "text-emerald-700 print:text-black"
                              : "text-amber-700 print:text-black")
                          }
                        >
                          {STATUS_LABEL[day.status] ?? day.status?.toUpperCase()}
                          {day.status === "approved" && day.reviewed_at
                            ? ` · ${new Date(day.reviewed_at).toLocaleDateString()}`
                            : ""}
                        </div>
                      </div>
                      <div className="p-4 text-sm leading-relaxed min-h-[80px] whitespace-pre-line">
                        {day.activities_enhanced || day.activities_raw}
                      </div>
                      {day.feedback_notes && (
                        <div className="px-4 pb-3 text-xs italic">
                          <strong className="not-italic">Supervisor feedback:</strong>{" "}
                          {day.feedback_notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
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

      <div className="mt-12 text-center print:hidden pb-20 space-y-4">
        <label className="flex items-center justify-center gap-2 text-sm font-sans">
          <input
            type="checkbox"
            checked={approvedOnly}
            onChange={(e) => setApprovedOnly(e.target.checked)}
          />
          Only include entries approved by my supervisor
        </label>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => window.print()}
            className="bg-black text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform shadow-lg text-sm"
          >
            Print Logbook / Export PDF
          </button>
          <button
            onClick={handleDownloadCsv}
            className="bg-white text-black border-2 border-black px-8 py-3 rounded-full font-bold hover:bg-slate-50 transition-colors shadow-lg text-sm"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
