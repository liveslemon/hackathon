"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  PageHeader,
  StatusPill,
  EmptyState,
  Modal,
  Textarea,
} from "@/components/ui";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  CheckSquare,
  Square,
  Calendar,
} from "lucide-react";

import { authenticatedFetch } from "@/lib/api";

interface LogbookEntry {
  id: string;
  student_id: string;
  date: string;
  activities_raw: string;
  activities_enhanced: string | null;
  status: string;
  feedback_notes?: string;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface LogbookReviewClientProps {
  entries: LogbookEntry[];
}

export default function LogbookReviewClient({
  entries: initialEntries,
}: LogbookReviewClientProps) {
  const [entries, setEntries] = useState<LogbookEntry[]>(initialEntries);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // Revision Modal State
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagTargetEntryId, setFlagTargetEntryId] = useState<string | null>(null);
  const [flagFeedback, setFlagFeedback] = useState("");
  const [submittingFlag, setSubmittingFlag] = useState(false);

  const pendingEntries = entries.filter((e) => e.status === "pending");
  const historyEntries = entries.filter((e) => e.status !== "pending");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingEntries.map((e) => e.id)));
    }
  };

  const openFlagModal = (entryId: string) => {
    setFlagTargetEntryId(entryId);
    setFlagFeedback("");
    setFlagModalOpen(true);
  };

  const handleConfirmFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagTargetEntryId) return;
    if (!flagFeedback.trim()) {
      toast.error("Please enter a revision reason for the student.");
      return;
    }

    setSubmittingFlag(true);
    const targetId = flagTargetEntryId;
    const note = flagFeedback.trim();
    const previousEntries = [...entries];

    // Optimistic UI
    setEntries((prev) =>
      prev.map((item) =>
        item.id === targetId ? { ...item, status: "flagged", feedback_notes: note } : item,
      ),
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(targetId);
      return next;
    });

    try {
      await authenticatedFetch(`/api/logbook/entry/${targetId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "flagged", feedback_notes: note }),
      });
      toast.success("Entry returned to student for revision.");
      setFlagModalOpen(false);
      setFlagTargetEntryId(null);
    } catch (err) {
      setEntries(previousEntries);
      toast.error(
        "Failed to request revision: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    } finally {
      setSubmittingFlag(false);
    }
  };

  const handleApprove = async (entryId: string) => {
    const previousEntries = [...entries];
    // Optimistic UI update
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, status: "approved" } : e,
      ),
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(entryId);
      return next;
    });

    setUpdatingId(entryId);
    try {
      await authenticatedFetch(`/api/logbook/entry/${entryId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" }),
      });
      toast.success("Logbook entry approved.");
    } catch (err: unknown) {
      setEntries(previousEntries);
      toast.error(
        "Failed to update status: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkApprove = async () => {
    const idsToApprove = Array.from(selectedIds);
    if (idsToApprove.length === 0) return;

    const previousEntries = [...entries];
    setEntries((prev) =>
      prev.map((e) =>
        selectedIds.has(e.id) ? { ...e, status: "approved" } : e,
      ),
    );
    setSelectedIds(new Set());
    setIsBulkApproving(true);

    try {
      await authenticatedFetch("/api/logbook/bulk-status", {
        method: "POST",
        body: JSON.stringify({
          entry_ids: idsToApprove,
          status: "approved",
        }),
      });
      toast.success(`Successfully approved ${idsToApprove.length} entries.`);
    } catch (err: unknown) {
      setEntries(previousEntries);
      setSelectedIds(new Set(idsToApprove));
      toast.error(
        "Bulk approval failed: " +
          (err instanceof Error ? err.message : "Please try again."),
      );
    } finally {
      setIsBulkApproving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <PageHeader
        title="Logbook Reviews"
        description="Verify SIWES logbook activity entries submitted by your active interns."
        actions={
          pendingEntries.length > 0 ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="gap-2 text-xs"
              >
                {selectedIds.size === pendingEntries.length ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-primary" /> Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4" /> Select All ({pendingEntries.length})
                  </>
                )}
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={handleBulkApprove}
                  isLoading={isBulkApproving}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Selected ({selectedIds.size})
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Pending Reviews Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Clock className="w-4 h-4 text-warning-fg" />
            <span>Pending Approval ({pendingEntries.length})</span>
          </div>
        </div>

        {pendingEntries.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-8 h-8 text-success-fg" />}
            title="All caught up!"
            description="There are no pending student logbook entries awaiting employer sign-off."
          />
        ) : (
          <div className="space-y-4">
            {pendingEntries.map((entry) => {
              const isSelected = selectedIds.has(entry.id);
              return (
                <Card
                  key={entry.id}
                  className={`transition-all border ${
                    isSelected
                      ? "ring-2 ring-primary border-primary bg-primary-subtle/20"
                      : "hover:border-border-strong"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleSelect(entry.id)}
                          className="mt-1 text-muted-fg hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                          aria-label={isSelected ? "Deselect entry" : "Select entry"}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="w-9 h-9 rounded-full bg-surface-raised border border-border flex items-center justify-center font-bold text-xs text-fg">
                              {entry.profiles?.full_name?.charAt(0) || "S"}
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-fg">
                                {entry.profiles?.full_name || "Unknown Student"}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-fg">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>
                                  {new Date(entry.date).toLocaleDateString([], {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="ml-auto">
                              <StatusPill status="pending" />
                            </div>
                          </div>

                          <div className="text-sm text-fg leading-relaxed whitespace-pre-wrap bg-surface-sunken/60 p-4 rounded-xl border border-border">
                            {entry.activities_enhanced || entry.activities_raw}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col gap-2 shrink-0 md:w-36 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 md:w-full gap-2"
                          onClick={() => handleApprove(entry.id)}
                          isLoading={updatingId === entry.id}
                          disabled={updatingId !== null || isBulkApproving}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 md:w-full gap-2 text-danger-fg hover:bg-danger-subtle"
                          onClick={() => openFlagModal(entry.id)}
                          isLoading={updatingId === entry.id}
                          disabled={updatingId !== null || isBulkApproving}
                        >
                          <AlertCircle className="w-4 h-4" />
                          Flag Issue
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review History Section */}
      {historyEntries.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
            Review History ({historyEntries.length})
          </div>
          <div className="space-y-3">
            {historyEntries.map((entry) => (
              <Card
                key={entry.id}
                className="opacity-90 hover:opacity-100 transition-opacity"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center text-xs font-bold text-muted-fg">
                        {entry.profiles?.full_name?.charAt(0) || "S"}
                      </div>
                      <div>
                        <span className="font-medium text-sm text-fg">
                          {entry.profiles?.full_name || "Unknown Student"}
                        </span>
                        <span className="text-xs text-muted-fg ml-3">
                          {entry.date}
                        </span>
                        {entry.feedback_notes && (
                          <p className="text-xs text-danger-fg mt-1 italic">
                            Feedback: &quot;{entry.feedback_notes}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusPill
                        status={
                          entry.status === "approved"
                            ? "approved"
                            : "needs_revision"
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Revision Request Modal */}
      <Modal
        isOpen={flagModalOpen}
        onClose={() => setFlagModalOpen(false)}
        title="Request Entry Revision"
      >
        <p className="text-xs text-muted-fg mb-4">
          Provide feedback explaining why this logbook entry requires student correction.
        </p>
        <form onSubmit={handleConfirmFlag} className="space-y-4">

          <Textarea
            label="Revision Guidance & Notes"
            placeholder="Explain specifically what needs additional detail, documentation, or technical elaboration..."
            value={flagFeedback}
            onChange={(e) => setFlagFeedback(e.target.value)}
            rows={4}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFlagModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              className="text-danger-fg hover:bg-danger-subtle"
              isLoading={submittingFlag}
            >
              Send Revision Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


