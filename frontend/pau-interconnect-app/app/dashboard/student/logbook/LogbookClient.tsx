"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Calendar,
  RotateCcw,
  Save,
  Check,
  ChevronRight,
  BookOpen,
  Building,
  Filter,
} from "lucide-react";

import DashboardShell from "@/components/DashboardShell";
import {
  Button,
  Typography,
  Card,
  StatusPill,
  EmptyState,
  PageHeader,
  Badge,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch, backendUrl } from "@/lib/api";
import {
  BACKFILL_DAYS,
  canEditEntry,
  earliestBackfillDate,
  todayInLagos,
} from "@/lib/logbook-dates";
import { placementLabel, type Placement } from "@/lib/placements";
import type { AuthSessionLike } from "@/types/domain";
import { cx } from "@/utils/cx";

interface LogbookEntry {
  id: string;
  date: string;
  activities_raw: string;
  activities_enhanced: string | null;
  status: string;
  employer_id: string;
  application_id?: string | null;
  feedback_notes?: string;
}

interface LogbookClientProps {
  initialProfile: { id?: string } | null;
  placements: Placement[];
  initialEntries: LogbookEntry[];
  session: { access_token?: string; user?: { id?: string } } | null;
}

export default function LogbookClient({
  initialProfile,
  placements,
  initialEntries,
  session: initialSession,
}: LogbookClientProps) {
  const {
    user: authUser,
    profile: authProfile,
    loading: authLoading,
  } = useAuth();

  const [entries, setEntries] = useState<LogbookEntry[]>(initialEntries);
  const [todayEntry, setTodayEntry] = useState<LogbookEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);
  const today = todayInLagos();
  const [newEntryDate, setNewEntryDate] = useState(today);
  const [saveError, setSaveError] = useState("");
  const [rawText, setRawText] = useState("");
  const [enhancedText, setEnhancedText] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // One logbook per placement. Default to the active one; past ones are read-only.
  const activePlacement =
    placements.find((p) => p.placement_status === "active") ?? null;
  const [placementId, setPlacementId] = useState<string | null>(
    activePlacement?.id ?? placements[0]?.id ?? null,
  );
  const selectedPlacement =
    placements.find((p) => p.id === placementId) ?? null;
  const placementIsActive = selectedPlacement?.placement_status === "active";
  const hasStarted = placements.length > 0;
  const [isCompleting, setIsCompleting] = useState(false);

  const studentId =
    initialProfile?.id ||
    authProfile?.id ||
    initialSession?.user?.id ||
    authUser?.id;

  const existingSession: AuthSessionLike | undefined = useMemo(
    () =>
      initialSession?.access_token
        ? { access_token: initialSession.access_token }
        : undefined,
    [initialSession?.access_token],
  );

  const loadHistory = useCallback(async () => {
    if (!studentId) return;
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const data = await authenticatedFetch<{ entries?: LogbookEntry[] }>(
        `/api/logbook/student?student_id=${studentId}`,
        {},
        15000,
        existingSession,
      );
      const fetchedEntries = data.entries || [];
      setEntries(fetchedEntries);
      const todays = fetchedEntries.find((e) => e.date === todayInLagos());
      if (todays) {
        setTodayEntry(todays);
        setSelectedEntry(todays);
        setRawText(todays.activities_raw || "");
        setEnhancedText(todays.activities_enhanced || "");
      }
    } catch (err) {
      console.error("History fetch error:", err);
      setHistoryError(
        err instanceof Error ? err.message : "Failed to load logbook history.",
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }, [studentId, existingSession]);

  useEffect(() => {
    if (studentId && !authLoading) {
      void loadHistory();
    }
  }, [studentId, authLoading, loadHistory]);

  const visibleEntries = entries.filter((e) =>
    e.application_id ? e.application_id === placementId : placementIsActive,
  );

  const filteredEntries = useMemo(() => {
    if (statusFilter === "all") return visibleEntries;
    return visibleEntries.filter((e) => e.status === statusFilter);
  }, [visibleEntries, statusFilter]);

  const switchPlacement = (id: string) => {
    setPlacementId(id);
    setSelectedEntry(null);
    setRawText("");
    setEnhancedText("");
    setSaveError("");
  };

  const handleCompletePlacement = async () => {
    if (!activePlacement) return;
    const ok = window.confirm(
      `Mark your internship at ${activePlacement.company ?? "this company"} as complete? ` +
        "Its logbook becomes read-only (your supervisor can still review pending entries), " +
        "and you will be able to accept a new placement.",
    );
    if (!ok) return;
    setIsCompleting(true);
    try {
      await authenticatedFetch(
        `/api/applications/${activePlacement.id}/complete`,
        { method: "POST" },
        15000,
        existingSession,
      );
      toast.success(
        "Internship marked complete. Your logbook is saved and read-only.",
      );
      window.location.reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not complete the internship.",
      );
      setIsCompleting(false);
    }
  };

  const selectEntry = (entry: LogbookEntry) => {
    setSelectedEntry(entry);
    setRawText(entry.activities_raw || "");
    setEnhancedText(entry.activities_enhanced || "");
    setSaveError("");
  };

  const handleEnhance = async () => {
    if (!rawText.trim()) return;

    setIsEnhancing(true);
    try {
      const data = await authenticatedFetch<{ enhanced_text?: string }>(
        backendUrl("/api/logbook/enhance"),
        {
          method: "POST",
          body: JSON.stringify({ raw_text: rawText }),
        },
        45000,
        existingSession,
      );
      if (data.enhanced_text) {
        setEnhancedText(data.enhanced_text);
        toast.success(
          "AI narrative generated. Click 'Apply Narrative' to replace your draft.",
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("AI service could not enhance notes. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async () => {
    if (!rawText.trim()) return;
    if (!studentId || !placementIsActive || !placementId) {
      console.error("Cannot save: no active placement", {
        studentId,
        placementId,
      });
      toast.error(
        "Unable to save entry — your internship assignment could not be resolved. Please reload.",
      );
      return;
    }

    const targetDate = selectedEntry?.date ?? newEntryDate;
    const previousEntries = [...entries];
    const optimisticEntry: LogbookEntry = {
      id: selectedEntry?.id || `temp-${Date.now()}`,
      date: targetDate,
      activities_raw: rawText,
      activities_enhanced: enhancedText || null,
      status: "pending",
      employer_id: selectedPlacement?.company || "",
      application_id: placementId,
      feedback_notes: selectedEntry?.feedback_notes,
    };

    setEntries((prev) => {
      const existingIdx = prev.findIndex((e) => e.date === targetDate);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = optimisticEntry;
        return next;
      }
      return [optimisticEntry, ...prev];
    });

    setIsSubmitting(true);
    setSaveError("");
    try {
      const result = await authenticatedFetch<{ entry?: LogbookEntry }>(
        "/api/logbook/entry",
        {
          method: "POST",
          body: JSON.stringify({
            student_id: studentId,
            application_id: placementId,
            date: targetDate,
            activities_raw: rawText,
            activities_enhanced: enhancedText || null,
          }),
        },
        15000,
        existingSession,
      );

      const saved = result.entry ?? optimisticEntry;
      setEntries((prev) =>
        prev.map((e) => (e.date === targetDate ? saved : e)),
      );
      setSelectedEntry(saved);
      if (targetDate === today) setTodayEntry(saved);
      toast.success(
        selectedEntry
          ? "Logbook entry updated successfully."
          : "Daily logbook entry submitted for supervisor review.",
      );
    } catch (err) {
      setEntries(previousEntries);
      const msg =
        err instanceof Error ? err.message : "Failed to save logbook entry.";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPastEntry =
    (!placementIsActive && selectedEntry?.status !== "flagged") ||
    !canEditEntry(
      selectedEntry,
      selectedEntry?.date ?? newEntryDate,
      today,
    );

  const isApproved =
    selectedEntry?.status === "approved" ||
    (todayEntry?.status === "approved" && !selectedEntry);

  if (!hasStarted) {
    return (
      <DashboardShell userProfile={initialProfile || authProfile}>
        <div className="max-w-4xl mx-auto px-4 sm:px-0 py-8">
          <PageHeader
            title="SIWES Logbook"
            description="Official daily record of your industrial training placement."
            className="mb-8"
          />
          <EmptyState
            icon={<BookOpen className="w-8 h-8" />}
            title="No Active Internship Placement"
            description="Your daily SIWES logbook activates automatically once you accept an offer and begin your placement."
            action={{
              label: "Browse Internships",
              href: "/dashboard/student",
            }}
          />
        </div>
      </DashboardShell>
    );
  }

  const activeDate = selectedEntry?.date ?? newEntryDate;
  const isSelectedDateToday = activeDate === today;

  return (
    <DashboardShell userProfile={initialProfile || authProfile}>
      <div className="max-w-6xl mx-auto px-4 sm:px-0 py-6 md:py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-fg leading-tight">
                SIWES Daily Logbook
              </h1>
              <span
                className={cx(
                  "px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
                  placementIsActive
                    ? "bg-success-subtle text-success-fg"
                    : "bg-surface-sunken text-fg-muted",
                )}
              >
                {placementIsActive ? "Active" : "Completed"}
              </span>
            </div>
            <p className="text-sm text-fg-muted mt-1">
              {selectedPlacement?.company || "Pan-Atlantic University Internship"} ·{" "}
              {selectedPlacement?.role || "Student Trainee"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {placements.length > 1 && (
              <select
                aria-label="Choose internship placement"
                value={placementId ?? ""}
                onChange={(e) => switchPlacement(e.target.value)}
                className="h-10 px-3 rounded-xl border border-border bg-surface text-fg text-xs font-medium focus:ring-2 focus:ring-focus-ring"
              >
                {placements.map((p) => (
                  <option key={p.id} value={p.id}>
                    {placementLabel(p)}
                  </option>
                ))}
              </select>
            )}

            {placementIsActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCompletePlacement}
                isLoading={isCompleting}
                className="text-xs"
              >
                Mark Internship Complete
              </Button>
            )}

            <a
              href={`/dashboard/student/logbook/print${placementId ? `?placement=${placementId}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-sunken hover:bg-surface-raised border border-border text-fg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Official Printout</span>
            </a>
          </div>
        </div>

        {/* Main 2-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: History & Weekly Entries (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-fg uppercase tracking-wider">
                Logged Days ({visibleEntries.length})
              </h2>
              <div className="flex gap-1 text-xs">
                {["all", "approved", "flagged", "pending"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={cx(
                      "px-2 py-0.5 rounded-lg capitalize transition-colors font-medium cursor-pointer text-[11px]",
                      statusFilter === st
                        ? "bg-brand text-fg-inverse"
                        : "text-fg-subtle hover:text-fg",
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* New Entry Button */}
            {placementIsActive && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEntry(null);
                  setRawText("");
                  setEnhancedText("");
                  setNewEntryDate(today);
                  setSaveError("");
                }}
                className={cx(
                  "w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer",
                  !selectedEntry && newEntryDate === today
                    ? "bg-brand-subtle border-brand text-brand shadow-xs"
                    : "bg-surface border-border text-fg hover:border-brand/40",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">
                    +
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">Log Today</p>
                    <p className="text-[11px] text-fg-muted mt-0.5">
                      {today}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-fg-subtle" />
              </button>
            )}

            {/* List of Entries */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {isLoadingHistory ? (
                <div className="p-8 text-center text-xs text-fg-muted space-y-2">
                  <Clock className="w-5 h-5 animate-spin mx-auto text-brand" />
                  <p>Loading entries…</p>
                </div>
              ) : historyError ? (
                <div className="p-4 bg-danger-subtle border border-danger/20 text-danger-fg rounded-xl text-xs">
                  <p>{historyError}</p>
                  <button
                    type="button"
                    onClick={() => void loadHistory()}
                    className="underline font-bold mt-1"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="p-6 bg-surface-sunken border border-dashed border-border rounded-2xl text-center">
                  <p className="text-xs text-fg-muted font-medium">
                    No entries match this filter.
                  </p>
                </div>
              ) : (
                filteredEntries.map((entry) => {
                  const isSelected = selectedEntry?.id === entry.id;
                  const dateObj = new Date(`${entry.date}T00:00:00`);
                  const formattedDate = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                  });

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => selectEntry(entry)}
                      className={cx(
                        "w-full p-3 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 cursor-pointer",
                        isSelected
                          ? "bg-surface-raised border-brand shadow-xs ring-1 ring-brand"
                          : "bg-surface border-border hover:border-border-strong",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-bold text-fg">
                            {formattedDate}
                          </p>
                          {entry.date === today && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-subtle text-brand font-bold uppercase">
                              Today
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-fg-muted line-clamp-2 leading-relaxed">
                          {entry.activities_raw}
                        </p>
                      </div>
                      <div className="shrink-0 pt-0.5">
                        <StatusPill
                          status={
                            entry.status === "flagged"
                              ? "needs_revision"
                              : entry.status
                          }
                          size="sm"
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Entry Editor & Detail (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 shadow-xs">
              {/* Active Date Header & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-fg leading-tight">
                      {isSelectedDateToday
                        ? "Today's Log"
                        : `Entry for ${new Date(`${activeDate}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
                    </h3>
                    <p className="text-xs text-fg-muted mt-0.5">
                      {activeDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedEntry && (
                    <StatusPill
                      status={
                        selectedEntry.status === "flagged"
                          ? "needs_revision"
                          : selectedEntry.status
                      }
                    />
                  )}
                </div>
              </div>

              {/* Status Notices */}
              {isApproved && (
                <div className="mb-5 flex items-center gap-3 p-4 rounded-xl bg-success-subtle border border-success/20 text-success-fg">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-medium">
                    This daily entry has been officially verified and approved
                    by your industry supervisor. It is locked from further edits.
                  </p>
                </div>
              )}

              {/* CORRECTION / REVISION FLOW */}
              {selectedEntry?.status === "flagged" && (
                <div className="mb-5 p-4 rounded-xl bg-danger-subtle border border-danger/20 text-danger-fg space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Supervisor Requested Revision</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    <strong>Feedback:</strong>{" "}
                    {selectedEntry.feedback_notes ||
                      "Please revise your logged tasks with more detail and resubmit."}
                  </p>
                  <p className="text-[11px] opacity-80 pt-1">
                    Update the description below and click &quot;Update Entry&quot; to resubmit for approval.
                  </p>
                </div>
              )}

              {isPastEntry && !isApproved && selectedEntry?.status !== "flagged" && (
                <div className="mb-5 flex items-center gap-3 p-4 rounded-xl bg-warning-subtle border border-warning/20 text-warning-fg">
                  <Clock className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-medium">
                    {placementIsActive
                      ? `Entries older than ${BACKFILL_DAYS} days are in read-only mode.`
                      : "This internship has ended; all logbook entries are archived in read-only mode."}
                  </p>
                </div>
              )}

              {/* Backfill Date Selector for new entry */}
              {!selectedEntry && placementIsActive && (
                <div className="mb-5 p-4 rounded-xl bg-surface-sunken border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="logbook-date-input"
                      className="text-xs font-bold text-fg shrink-0"
                    >
                      Logging Date:
                    </label>
                    <input
                      id="logbook-date-input"
                      type="date"
                      value={newEntryDate}
                      min={earliestBackfillDate(today)}
                      max={today}
                      onChange={(e) => {
                        const date = e.target.value;
                        const existing = visibleEntries.find(
                          (en) => en.date === date,
                        );
                        if (existing) selectEntry(existing);
                        else setNewEntryDate(date);
                      }}
                      className="h-8 px-2.5 rounded-lg border border-border bg-surface text-fg text-xs font-medium"
                    />
                  </div>
                  <span className="text-[11px] text-fg-subtle">
                    Backfill allowed up to {BACKFILL_DAYS} days back
                  </span>
                </div>
              )}

              {saveError && (
                <div className="mb-5 p-3.5 rounded-xl bg-danger-subtle border border-danger/20 text-danger-fg text-xs">
                  {saveError}
                </div>
              )}

              {/* Textarea Area */}
              <div className="space-y-2 mb-6">
                <label className="text-xs font-semibold text-fg block">
                  Daily Activities & Tasks Completed
                </label>
                <textarea
                  rows={8}
                  placeholder="Record your daily tasks, learning points, projects worked on, or technical milestones..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  disabled={isPastEntry}
                  className={cx(
                    "w-full p-4 rounded-xl border border-border text-sm text-fg placeholder:text-fg-subtle leading-relaxed focus:outline-none focus:ring-2 focus:ring-focus-ring resize-y",
                    isPastEntry
                      ? "bg-surface-sunken opacity-80 cursor-not-allowed"
                      : "bg-surface",
                  )}
                />
                <div className="flex justify-between items-center text-[11px] text-fg-subtle">
                  <span>Describe specific tools, frameworks, or problems solved.</span>
                  <span>{rawText.length} characters</span>
                </div>
              </div>

              {/* AI Enhance Preview Narrative */}
              {(isEnhancing || enhancedText) && !isPastEntry && (
                <div className="mb-6 p-4 rounded-xl bg-brand-subtle/50 border border-brand/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-brand uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Professional Narrative</span>
                    </div>
                    {enhancedText && !isEnhancing && (
                      <button
                        type="button"
                        onClick={() => {
                          setRawText(enhancedText);
                          setEnhancedText("");
                        }}
                        className="text-xs font-bold text-brand hover:underline cursor-pointer"
                      >
                        Apply Narrative
                      </button>
                    )}
                  </div>

                  {isEnhancing ? (
                    <div className="flex items-center gap-2 text-xs text-brand italic py-2">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing structured industrial narrative…</span>
                    </div>
                  ) : (
                    <p className="text-xs text-fg leading-relaxed italic bg-surface/70 p-3 rounded-lg border border-brand/10">
                      {enhancedText}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {!isPastEntry && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnhance}
                    disabled={isEnhancing || !rawText.trim()}
                    className="gap-1.5 w-full sm:w-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand" />
                    <span>AI Enhance</span>
                  </Button>

                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRawText("");
                        setEnhancedText("");
                        setSelectedEntry(null);
                        setNewEntryDate(today);
                        setSaveError("");
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      colorType="primary"
                      size="sm"
                      onClick={handleSubmit}
                      isLoading={isSubmitting}
                      disabled={!rawText.trim()}
                      className="gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>
                        {selectedEntry?.status === "flagged"
                          ? "Resubmit Corrected Entry"
                          : selectedEntry
                            ? "Update Entry"
                            : "Save Daily Entry"}
                      </span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
