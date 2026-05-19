"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Divider, 
  Stack, 
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Alert
} from "@mui/material";
import { 
  AutoAwesomeOutlined as SparklesIcon,
  Schedule as PendingIcon,
  CheckCircleOutline,
  ErrorOutline as FlaggedIcon,
  PrintOutlined
} from "@mui/icons-material";
import DashboardShell from "@/components/DashboardShell";
import { authenticatedFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

interface LogbookEntry {
  id: string;
  date: string;
  activities_raw: string;
  activities_enhanced: string | null;
  status: string;
  employer_id: string;
}

interface LogbookClientProps {
  initialProfile: any;
  initialApplications: any[];
  initialEntries: LogbookEntry[];
  session: any;
}

const LogbookClient = ({ initialProfile, initialApplications, initialEntries, session: initialSession }: LogbookClientProps) => {
  const { user: authUser, profile: authProfile, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<LogbookEntry[]>(initialEntries);
  const [todayEntry, setTodayEntry] = useState<LogbookEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);
  const [rawText, setRawText] = useState("");
  const [enhancedText, setEnhancedText] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [internshipDetails, setInternshipDetails] = useState<any>(null);

  const studentId = initialProfile?.id || authProfile?.id || initialSession?.user?.id || authUser?.id;

  useEffect(() => {
    // 1. Process applications from props
    if (initialApplications && initialApplications.length > 0) {
      const acceptedApp = initialApplications.find(a => 
        a.status?.toLowerCase() === "accepted" || a.status?.toLowerCase() === "approved"
      );
      if (acceptedApp) {
        const internshipData = Array.isArray(acceptedApp.internship) ? acceptedApp.internship[0] : acceptedApp.internship;
        if (internshipData) {
          setHasStarted(true);
          setEmployerId(internshipData.poster_id || internshipData.employer_id);
          setInternshipDetails(internshipData);
        }
      }
    }

    // 2. Load History
    if (studentId && !authLoading) {
      const loadHistory = async () => {
        try {
          const data = await authenticatedFetch(`/api/logbook/student?student_id=${studentId}`, {}, 15000, initialSession);
          const fetchedEntries = data.entries || [];
          setEntries(fetchedEntries);
          const todayStr = new Date().toISOString().split("T")[0];
          const todays = fetchedEntries.find((e: any) => e.date === todayStr);
          if (todays) setTodayEntry(todays);
        } catch (err) { console.error("History fetch error:", err); }
      };
      loadHistory();
    }
  }, [initialApplications, studentId, authLoading]);

  const selectEntry = (entry: LogbookEntry) => {
    setSelectedEntry(entry);
    setRawText(entry.activities_raw || "");
    setEnhancedText(entry.activities_enhanced || "");
  };

  const handleEnhance = async () => {
    if (!rawText.trim()) return;
    setIsEnhancing(true);
    try {
      const data = await authenticatedFetch("/api/logbook/enhance", {
        method: "POST",
        body: JSON.stringify({ raw_text: rawText }),
      }, 15000, initialSession);
      if (data.enhanced_text) setEnhancedText(data.enhanced_text);
    } catch (err) { console.error(err); }
    finally { setIsEnhancing(false); }
  };

  const handleSubmit = async () => {
    if (!rawText.trim() || !studentId || !employerId) return;
    setIsSubmitting(true);
    try {
      await authenticatedFetch("/api/logbook/entry", {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId,
          employer_id: employerId,
          activities_raw: rawText,
          activities_enhanced: enhancedText || null,
        }),
      }, 15000, initialSession);
      setSelectedEntry(null); setRawText(""); setEnhancedText("");
      // Refresh list
      const data = await authenticatedFetch(`/api/logbook/student?student_id=${studentId}`, {}, 15000, initialSession);
      setEntries(data.entries || []);
    } catch (err) { console.error(err); }
    finally { setIsSubmitting(false); }
  };

  if (!hasStarted) {
    return (
      <DashboardShell userProfile={initialProfile || authProfile}>
        <Box sx={{ maxWidth: 640, mx: 'auto', mt: 8, px: 2 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>No Internship Active</Typography>
            <Typography variant="body2">
              Once your application status is updated to <strong>Accepted</strong>, your logbook will become available here.
            </Typography>
          </Alert>
        </Box>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userProfile={initialProfile || authProfile}>
      <Box sx={{ maxWidth: 800, mx: 'auto', py: 8, px: 3 }}>
        <Stack spacing={4} sx={{ mb: 6 }}>
          <Box>
            <Typography variant="caption" sx={{ letterSpacing: 2, fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', mb: 1, display: 'block' }}>
              SIWES Logbook
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -1, mb: 0.5 }}>
              {internshipDetails?.role}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>at</Typography>
              <Typography variant="body2" color="text.primary" fontWeight={700}>
                {internshipDetails?.company}
              </Typography>
            </Stack>
          </Box>
          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
              {(() => {
                const todayStr = new Date().toISOString().split("T")[0];
                if (!selectedEntry || selectedEntry.date === todayStr) return "Today's Entry";
                return `Entry for ${new Date(selectedEntry.date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
              })()}
            </Typography>
            
            {(() => {
              const todayStr = new Date().toISOString().split("T")[0];
              const isPastEntry = Boolean(selectedEntry && selectedEntry.date !== todayStr);
              const isApproved = selectedEntry?.status === 'approved' || (todayEntry?.status === 'approved' && !selectedEntry);

              if (isApproved) {
                return (
                  <Alert icon={<CheckCircleOutline fontSize="small" />} severity="success" sx={{ bgcolor: 'transparent', border: '1px solid', borderColor: 'success.light', borderRadius: 0 }}>
                    This entry has been approved and is locked.
                  </Alert>
                );
              }

              return (
                <Stack spacing={3}>
                  {isPastEntry && (
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                      This is an entry from a previous day. It is now <strong>Read Only</strong>.
                    </Alert>
                  )}
                  
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', opacity: isPastEntry ? 0.7 : 1 }}>
                    <TextField
                      fullWidth multiline rows={8} variant="standard"
                      placeholder="Record your progress..."
                      value={rawText} 
                      onChange={(e) => setRawText(e.target.value)}
                      disabled={isPastEntry}
                      InputProps={{ disableUnderline: true, sx: { fontSize: 15, lineHeight: 1.6, cursor: isPastEntry ? 'not-allowed' : 'text' } }}
                      sx={{ p: 2, bgcolor: isPastEntry ? 'grey.50' : 'transparent' }}
                    />
                  </Box>

                  {!isPastEntry && (
                    <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                      <Button 
                        startIcon={isEnhancing ? <CircularProgress size={14} /> : <SparklesIcon />}
                        onClick={handleEnhance} disabled={isEnhancing || !rawText.trim()}
                        sx={{ textTransform: 'none', color: 'text.secondary', fontSize: 13, borderRadius: 2 }}
                      >
                        AI Enhance
                      </Button>
                      <Stack direction="row" spacing={1}>
                        <Button 
                          onClick={() => { setRawText(""); setEnhancedText(""); setSelectedEntry(null); }} 
                          sx={{ textTransform: 'none', color: 'text.secondary', fontSize: 13, borderRadius: 2 }}
                        >
                          Clear
                        </Button>
                        <Button 
                          variant="contained" disableElevation
                          onClick={handleSubmit} disabled={isSubmitting || !rawText.trim()}
                          sx={{ bgcolor: 'black', color: 'white', px: 4, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#333' } }}
                        >
                          {isSubmitting ? "Saving..." : (selectedEntry ? "Update" : "Save Entry")}
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                  {(isEnhancing || enhancedText) && !isPastEntry && (
                    <Box sx={{ mt: 2, p: 2, borderLeft: '2px solid', borderColor: 'primary.main', bgcolor: 'grey.50', borderRadius: '0 8px 8px 0' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: 1 }}>AI NARRATIVE</Typography>
                        {enhancedText && !isEnhancing && !isPastEntry && (
                          <Button 
                            size="small" 
                            onClick={() => { setRawText(enhancedText); setEnhancedText(""); }}
                            sx={{ textTransform: 'none', fontSize: 11, fontWeight: 700, py: 0 }}
                          >
                            Use this Narrative
                          </Button>
                        )}
                      </Stack>
                      
                      {isEnhancing ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CircularProgress size={12} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Drafting professional narrative...</Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', lineHeight: 1.6 }}>
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
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>History</Typography>
              <Button 
                size="small" startIcon={<PrintOutlined />} sx={{ textTransform: 'none', fontSize: 12 }}
                onClick={() => window.open("/dashboard/student/logbook/print", "_blank")}
              >
                Export
              </Button>
            </Stack>

            <List disablePadding>
              {entries.map((entry) => (
                <ListItemButton 
                  key={entry.id} onClick={() => selectEntry(entry)}
                  selected={selectedEntry?.id === entry.id}
                  sx={{ border: '1px solid', borderColor: selectedEntry?.id === entry.id ? 'primary.main' : 'divider', py: 2, borderRadius: 2, mb: 1.5 }}
                >
                  <ListItemText 
                    primary={new Date(entry.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                    secondary={entry.activities_raw}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: 'caption', noWrap: true, sx: { maxWidth: 300 } }}
                  />
                  <Box sx={{ ml: 'auto' }}>
                    {entry.status === 'approved' && <CheckCircleOutline sx={{ fontSize: 16, color: 'success.main' }} />}
                    {entry.status === 'pending' && <PendingIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                  </Box>
                </ListItemButton>
              ))}
            </List>
          </Box>
        </Stack>
      </Box>
    </DashboardShell>
  );
};

export default LogbookClient;
