"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  AutoAwesomeOutlined as SparklesIcon,
  CheckCircleOutline,
  ErrorOutline as FlaggedIcon,
  PrintOutlined,
  Schedule as PendingIcon,
} from "@mui/icons-material";

import DashboardShell from "@/components/DashboardShell";
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

const LogbookClient = ({
  initialProfile,
  placements,
  initialEntries,
  session: initialSession,
}: LogbookClientProps) => {
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
  // One logbook per placement. Default to the active one; past ones are read-only.
  const activePlacement = placements.find((p) => p.placement_status === "active") ?? null;
  const [placementId, setPlacementId] = useState<string | null>(
    activePlacement?.id ?? placements[0]?.id ?? null,
  );
  const selectedPlacement = placements.find((p) => p.id === placementId) ?? null;
  const placementIsActive = selectedPlacement?.placement_status === "active";
  const hasStarted = placements.length > 0;
  const internshipDetails = selectedPlacement;
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
        // Open today's entry so saving updates it instead of starting blank.
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


  // Entries for the placement being viewed. Rows from before placements
  // existed have no application_id and belong to the active placement.
  const visibleEntries = entries.filter((e) =>
    e.application_id ? e.application_id === placementId : placementIsActive,
  );

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
        "and you'll be able to accept a new offer.",
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
      toast.success("Internship marked complete. Your logbook is saved and read-only.");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete the internship.");
      setIsCompleting(false);
    }
  };

  const selectEntry = (entry: LogbookEntry) => {
    setSelectedEntry(entry);
    setRawText(entry.activities_raw || "");
    setEnhancedText(entry.activities_enhanced || "");
  };

  const handleEnhance = async () => {
    if (!rawText.trim()) {
      return;
    }

    setIsEnhancing(true);
    try {
      const data = await authenticatedFetch<{ enhanced_text?: string }>(
        backendUrl("/api/logbook/enhance"),
        {
          method: "POST",
          body: JSON.stringify({ raw_text: rawText }),
        },
        45000, // LLM call with provider fallback
        existingSession,
      );
      if (data.enhanced_text) {
        setEnhancedText(data.enhanced_text);
        toast.success("AI draft ready for review. Click 'Use this Narrative' to apply.");
      }
    } catch (err) {
      console.error(err);
      toast.error("AI service could not enhance notes at this time. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async () => {
    if (!rawText.trim()) return;
    if (!studentId || !placementIsActive || !placementId) {
      console.error("Cannot save: no active placement", { studentId, placementId });
      toast.error("Unable to save entry — your internship assignment could not be resolved. Please reload the page.");
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

    // Optimistic UI update
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

      toast.success(selectedEntry ? "Entry updated." : "Entry saved.");
      setSelectedEntry(null);
      setRawText("");
      setEnhancedText("");
      setNewEntryDate(today);

      if (result?.entry) {
        setEntries((prev) => {
          const idx = prev.findIndex((e) => e.date === targetDate);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = result.entry!;
            return next;
          }
          return [result.entry!, ...prev];
        });
      }
    } catch (err) {
      // Rollback optimistic update on failure
      console.error(err);
      setEntries(previousEntries);
      const msg = err instanceof Error ? err.message : "Could not save this entry.";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasStarted) {
    return (
      <DashboardShell userProfile={initialProfile || authProfile}>
        <Box sx={{ maxWidth: 640, mx: "auto", mt: 8, px: 2 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>
              No Internship Active
            </Typography>
            <Typography variant="body2">
              Once your application status is updated to{" "}
              <strong>Accepted</strong>, your logbook will become available
              here.
            </Typography>
          </Alert>
        </Box>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userProfile={initialProfile || authProfile}>
      <Box sx={{ maxWidth: 800, mx: "auto", py: 8, px: 3 }}>
        <Stack spacing={4} sx={{ mb: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                letterSpacing: 2,
                fontWeight: 700,
                color: "primary.main",
                textTransform: "uppercase",
                mb: 1,
                display: "block",
              }}
            >
              SIWES Logbook
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, letterSpacing: -1, mb: 0.5 }}
            >
              {internshipDetails?.role}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={500}
              >
                at
              </Typography>
              <Typography variant="body2" color="text.primary" fontWeight={700}>
                {internshipDetails?.company}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                · {placementIsActive ? "Active placement" : "Completed placement (read only)"}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }} flexWrap="wrap">
              {placements.length > 1 && (
                <select
                  aria-label="Choose internship placement"
                  value={placementId ?? ""}
                  onChange={(e) => switchPlacement(e.target.value)}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "6px 8px",
                    fontSize: 13,
                    maxWidth: "100%",
                  }}
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
                  size="small"
                  onClick={handleCompletePlacement}
                  disabled={isCompleting}
                  sx={{ textTransform: "none", fontSize: 12 }}
                >
                  {isCompleting ? "Completing..." : "Mark internship complete"}
                </Button>
              )}
            </Stack>
          </Box>
          <Divider />

          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 2,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: 1,
                fontSize: 11,
              }}
            >
              {(() => {
                const date = selectedEntry?.date ?? newEntryDate;
                if (date === today) return "Today's Entry";
                return `Entry for ${new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
              })()}
            </Typography>

            {(() => {
              // "isPastEntry" = read-only: approved, or older than the backfill window.
              const isPastEntry =
                (!placementIsActive && selectedEntry?.status !== "flagged") ||
                !canEditEntry(selectedEntry, selectedEntry?.date ?? newEntryDate, today);
              const isApproved =
                selectedEntry?.status === "approved" ||
                (todayEntry?.status === "approved" && !selectedEntry);

              if (isApproved) {
                return (
                  <Alert
                    icon={<CheckCircleOutline fontSize="small" />}
                    severity="success"
                    sx={{
                      bgcolor: "transparent",
                      border: "1px solid",
                      borderColor: "success.light",
                      borderRadius: 0,
                    }}
                  >
                    This entry has been approved and is locked.
                  </Alert>
                );
              }

              return (
                <Stack spacing={3}>
                  {selectedEntry?.status === "flagged" && (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                      <strong>Revision Requested:</strong>{" "}
                      {selectedEntry.feedback_notes ||
                        "Please update and save this entry again."}
                    </Alert>
                  )}
                  {isPastEntry && (
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                      {placementIsActive ? (
                        <>
                          Entries older than {BACKFILL_DAYS} days are{" "}
                          <strong>read only</strong>.
                        </>
                      ) : (
                        <>
                          This internship has ended, so its logbook is{" "}
                          <strong>read only</strong>.
                        </>
                      )}
                    </Alert>
                  )}
                  {!selectedEntry && placementIsActive && (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <label
                        htmlFor="logbook-date"
                        style={{ fontSize: 13, color: "#64748b" }}
                      >
                        Date
                      </label>
                      <input
                        id="logbook-date"
                        type="date"
                        value={newEntryDate}
                        min={earliestBackfillDate(today)}
                        max={today}
                        onChange={(e) => {
                          const date = e.target.value;
                          const existing = visibleEntries.find((en) => en.date === date);
                          if (existing) selectEntry(existing);
                          else setNewEntryDate(date);
                        }}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: "4px 8px",
                          fontSize: 13,
                        }}
                      />
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        Missed a day? You can log up to {BACKFILL_DAYS} days back.
                      </span>
                    </Stack>
                  )}
                  {saveError && (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                      {saveError}
                    </Alert>
                  )}

                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      overflow: "hidden",
                      opacity: isPastEntry ? 0.7 : 1,
                    }}
                  >
                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      variant="standard"
                      placeholder="Record your progress..."
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      disabled={isPastEntry}
                      InputProps={{
                        disableUnderline: true,
                        sx: {
                          fontSize: 15,
                          lineHeight: 1.6,
                          cursor: isPastEntry ? "not-allowed" : "text",
                        },
                      }}
                      sx={{
                        p: 2,
                        bgcolor: isPastEntry ? "grey.50" : "transparent",
                      }}
                    />
                  </Box>

                  {!isPastEntry && (
                    <Stack
                      direction="row"
                      spacing={2}
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Button
                        startIcon={
                          isEnhancing ? (
                            <CircularProgress size={14} />
                          ) : (
                            <SparklesIcon />
                          )
                        }
                        onClick={handleEnhance}
                        disabled={isEnhancing || !rawText.trim()}
                        sx={{
                          textTransform: "none",
                          color: "text.secondary",
                          fontSize: 13,
                          borderRadius: 2,
                        }}
                      >
                        AI Enhance
                      </Button>
                      <Stack direction="row" spacing={1}>
                        <Button
                          onClick={() => {
                            setRawText("");
                            setEnhancedText("");
                            setSelectedEntry(null);
                            setNewEntryDate(today);
                            setSaveError("");
                          }}
                          sx={{
                            textTransform: "none",
                            color: "text.secondary",
                            fontSize: 13,
                            borderRadius: 2,
                          }}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="contained"
                          disableElevation
                          onClick={handleSubmit}
                          disabled={isSubmitting || !rawText.trim()}
                          sx={{
                            bgcolor: "black",
                            color: "white",
                            px: 4,
                            borderRadius: 2,
                            textTransform: "none",
                            "&:hover": { bgcolor: "#333" },
                          }}
                        >
                          {isSubmitting
                            ? "Saving..."
                            : selectedEntry
                              ? "Update"
                              : "Save Entry"}
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                  {(isEnhancing || enhancedText) && !isPastEntry && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        borderLeft: "2px solid",
                        borderColor: "primary.main",
                        bgcolor: "grey.50",
                        borderRadius: "0 8px 8px 0",
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 1.5 }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: "primary.main",
                            letterSpacing: 1,
                          }}
                        >
                          AI NARRATIVE
                        </Typography>
                        {enhancedText && !isEnhancing && !isPastEntry && (
                          <Button
                            size="small"
                            onClick={() => {
                              setRawText(enhancedText);
                              setEnhancedText("");
                            }}
                            sx={{
                              textTransform: "none",
                              fontSize: 11,
                              fontWeight: 700,
                              py: 0,
                            }}
                          >
                            Use this Narrative
                          </Button>
                        )}
                      </Stack>

                      {isEnhancing ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CircularProgress size={12} />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontStyle: "italic" }}
                          >
                            Drafting professional narrative...
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            fontStyle: "italic",
                            color: "text.secondary",
                            lineHeight: 1.6,
                          }}
                        >
                          {enhancedText}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Stack>
              );
            })()}
          </Box>

          <Divider />

          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontSize: 11,
                }}
              >
                History
              </Typography>
              <Button
                component="a"
                href={`/dashboard/student/logbook/print${placementId ? `?placement=${placementId}` : ""}`}
                target="_blank"
                size="small"
                startIcon={<PrintOutlined />}
                sx={{ textTransform: "none", fontSize: 12 }}
              >
                Export
              </Button>
            </Stack>

            {isLoadingHistory ? (
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">
                  Loading logbook history...
                </Typography>
              </Stack>
            ) : historyError ? (
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={() => void loadHistory()}>
                    Retry
                  </Button>
                }
                sx={{ borderRadius: 2, mb: 2 }}
              >
                {historyError}
              </Alert>
            ) : visibleEntries.length === 0 ? (
              <Box
                sx={{
                  py: 6,
                  px: 3,
                  textAlign: "center",
                  bgcolor: "grey.50",
                  borderRadius: 2,
                  border: "1px dashed",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  No entries logged yet for this placement.
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {placementIsActive
                    ? "Record your activities above to create your first daily entry."
                    : "This placement ended with no recorded entries."}
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {visibleEntries.map((entry) => (
                  <ListItemButton
                    key={entry.id}
                    onClick={() => selectEntry(entry)}
                    selected={selectedEntry?.id === entry.id}
                    sx={{
                      border: "1px solid",
                      borderColor:
                        selectedEntry?.id === entry.id
                          ? "primary.main"
                          : "divider",
                      py: 2,
                      borderRadius: 2,
                      mb: 1.5,
                    }}
                  >
                    <ListItemText
                      primary={new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      secondary={entry.activities_raw}
                      primaryTypographyProps={{
                        variant: "body2",
                        fontWeight: 600,
                      }}
                      secondaryTypographyProps={{
                        variant: "caption",
                        noWrap: true,
                        sx: { maxWidth: 300 },
                      }}
                    />
                    <Box sx={{ ml: "auto" }}>
                      {entry.status === "approved" && (
                        <CheckCircleOutline
                          sx={{ fontSize: 16, color: "success.main" }}
                        />
                      )}
                      {entry.status === "pending" && (
                        <PendingIcon
                          sx={{ fontSize: 16, color: "text.disabled" }}
                        />
                      )}
                      {entry.status === "flagged" && (
                        <FlaggedIcon sx={{ fontSize: 16, color: "error.main" }} />
                      )}
                    </Box>
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Stack>
      </Box>
    </DashboardShell>
  );
};

export default LogbookClient;

