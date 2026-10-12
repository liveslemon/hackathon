"use client";
import { useEffect, useState } from "react";
import { PLACEMENT_COLUMNS, toPlacements, type Placement } from "@/lib/placements";
import { supabase } from "@/lib/supabaseClient";
import { authenticatedFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Printer, Download, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

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
  pending: "PENDING SUPERVISOR REVIEW",
  flagged: "RETURNED FOR REVISION",
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm font-semibold text-fg-muted uppercase tracking-widest animate-pulse">
          Generating SIWES Document…
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
    <div className="min-h-screen bg-surface-sunken py-6 md:py-10 print:p-0 print:m-0">
      {/* Print Stylesheet guaranteeing white paper regardless of active theme */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          html,
          body,
          #__next,
          div,
          main,
          section,
          article {
            background-color: white !important;
            color: black !important;
            background-image: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-border-black {
            border-color: black !important;
          }
          .print-text-black {
            color: black !important;
          }
        }
      `}</style>

      {/* Top Toolbar (screen only) */}
      <div className="max-w-4xl mx-auto px-4 mb-6 no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/dashboard/student/logbook"
          className="inline-flex items-center gap-2 text-xs font-semibold text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Logbook</span>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-fg-muted cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={approvedOnly}
              onChange={(e) => setApprovedOnly(e.target.checked)}
              className="rounded border-border text-brand focus:ring-focus-ring"
            />
            <span>Include only approved entries</span>
          </label>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface border border-border text-fg hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Data</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-fg-inverse hover:bg-brand-hover shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Official Document Sheet */}
      <div className="bg-surface text-fg max-w-4xl mx-auto p-8 md:p-12 rounded-2xl shadow-md border border-border print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none font-serif">
        {/* Header Block */}
        <div className="text-center mb-8 border-b-2 border-black pb-6">
          <p className="text-xs font-sans font-bold tracking-widest uppercase mb-1">
            Pan-Atlantic University · School of Science and Technology
          </p>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider mb-1">
            Students Industrial Work Experience Scheme
          </h1>
          <h2 className="text-base font-bold tracking-widest text-fg-muted print-text-black uppercase">
            Official SIWES Daily Training Logbook
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-xs mt-6 border-2 border-black p-5">
            <div className="space-y-1.5">
              <p>
                <strong>STUDENT NAME:</strong> {profile?.full_name?.toUpperCase() || "N/A"}
              </p>
              <p>
                <strong>INSTITUTION:</strong> PAN-ATLANTIC UNIVERSITY, LAGOS
              </p>
              <p>
                <strong>DEPARTMENT / COURSE:</strong> {profile?.course || "N/A"}
              </p>
              <p>
                <strong>ACADEMIC LEVEL:</strong> {profile?.level ? `${profile.level} LEVEL` : "N/A"}
              </p>
            </div>
            <div className="space-y-1.5 sm:border-l-2 sm:border-black sm:pl-5">
              {internship && (
                <>
                  <p>
                    <strong>HOST ORGANIZATION:</strong>{" "}
                    {internship.company?.toUpperCase()}
                  </p>
                  <p>
                    <strong>ASSIGNED ROLE:</strong> {internship.role?.toUpperCase()}
                  </p>
                  {placement?.started_at && (
                    <p>
                      <strong>TRAINING PERIOD:</strong>{" "}
                      {new Date(placement.started_at).toLocaleDateString()} –{" "}
                      {placement.ended_at
                        ? new Date(placement.ended_at).toLocaleDateString()
                        : "PRESENT"}
                    </p>
                  )}
                </>
              )}
              <p>
                <strong>TOTAL VERIFIED DAYS:</strong> {approvedCount} of {entries.length} entries
              </p>
              <p className="text-[10px] text-fg-muted print-text-black pt-1">
                <strong>DATE GENERATED:</strong> {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Weekly Content Tables */}
        <div className="space-y-10">
          {weeklyData.length === 0 ? (
            <p className="text-center italic py-16 text-fg-muted print-text-black text-sm">
              No daily entries recorded for this placement yet.
            </p>
          ) : (
            weeklyData.map((week) => (
              <div key={week.weekNumber} className="print-avoid-break">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-black uppercase bg-black text-white px-3 py-1 font-sans">
                    Week {week.weekNumber}
                  </span>
                  <span className="text-xs font-bold border-b-2 border-black flex-1 pb-1">
                    {week.startDate} — {week.endDate}
                  </span>
                </div>

                <div className="border-2 border-black">
                  {week.days.length === 0 ? (
                    <div className="p-4 text-center text-xs text-fg-muted print-text-black italic">
                      No training logs recorded for this weekly block.
                    </div>
                  ) : (
                    week.days.map((day, idx) => (
                      <div
                        key={day.id}
                        className={idx !== 0 ? "border-t border-black" : ""}
                      >
                        <div className="flex border-b border-black bg-surface-sunken text-[11px]">
                          <div className="w-36 border-r border-black p-2 font-bold uppercase shrink-0">
                            {localDate(day.date).toLocaleDateString([], {
                              weekday: "short",
                            })}
                            , {day.date}
                          </div>
                          <div className="p-2 font-semibold text-fg-muted print-text-black flex-1">
                            Daily Progress Description
                          </div>
                          <div
                            className={
                              "p-2 font-bold uppercase border-l border-black text-[10px] " +
                              (day.status === "approved"
                                ? "text-emerald-700 dark:text-emerald-400 print-text-black"
                                : "text-amber-700 dark:text-amber-400 print-text-black")
                            }
                          >
                            {STATUS_LABEL[day.status] ?? day.status?.toUpperCase()}
                            {day.status === "approved" && day.reviewed_at
                              ? ` · ${new Date(day.reviewed_at).toLocaleDateString()}`
                              : ""}
                          </div>
                        </div>
                        <div className="p-3.5 text-xs leading-relaxed min-h-[60px] whitespace-pre-line font-sans">
                          {day.activities_enhanced || day.activities_raw}
                        </div>
                        {day.feedback_notes && (
                          <div className="px-3.5 pb-2.5 text-[11px] italic bg-surface-sunken/60 border-t border-dotted border-border print-border-black font-sans">
                            <strong className="not-italic">Supervisor Review:</strong>{" "}
                            {day.feedback_notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Supervisor Signatures Box */}
                <div className="grid grid-cols-2 gap-4 border-2 border-black border-t-0 p-3.5 bg-surface-sunken/40 text-[10px]">
                  <div className="space-y-4">
                    <p className="font-bold border-b border-black pb-1">
                      INDUSTRY SUPERVISOR ENDORSEMENT
                    </p>
                    <div className="h-8"></div>
                    <p className="border-t border-dotted border-black pt-1">
                      SIGNATURE & DATE
                    </p>
                  </div>
                  <div className="space-y-4 border-l-2 border-black pl-3.5">
                    <p className="font-bold border-b border-black pb-1">
                      INSTITUTION SUPERVISOR ENDORSEMENT
                    </p>
                    <div className="h-8"></div>
                    <p className="border-t border-dotted border-black pt-1">
                      SIGNATURE & DATE
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
