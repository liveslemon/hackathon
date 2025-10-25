import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Chip";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import InputLabel from "@mui/material/InputLabel";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import {
  FiArrowLeft,
  FiHome,
  FiCalendar,
  FiExternalLink,
  FiSend,
} from "react-icons/fi";

interface Internship {
  id: string;
  company: string;
  role: string;
  field: string;
  category: string;
  description: string;
  requirements: string[];
  deadline: string;
  recruiterLinkedIn: string;
}

interface InternshipDetailsProps {
  open: boolean;
  onClose: () => void;
  internship: Internship;
}

const InternshipDetails = ({ open, onClose, internship }: InternshipDetailsProps) => {
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [hasApplied, setHasApplied] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("info");

  useEffect(() => {
    const applied = JSON.parse(localStorage.getItem("appliedInternships") || "[]");
    setHasApplied(applied.includes(internship.id));
  }, [internship.id]);

  const handleApply = () => {
    if (!coverLetter.trim()) {
      setSnackbarMessage("Please write a cover letter to apply");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const applied = JSON.parse(
      localStorage.getItem("appliedInternships") || "[]"
    );
    if (!applied.includes(internship.id)) {
      applied.push(internship.id);
      localStorage.setItem("appliedInternships", JSON.stringify(applied));
    }

    const applications = JSON.parse(
      localStorage.getItem("applications") || "{}"
    );
    applications[internship.id] = {
      coverLetter,
      appliedAt: new Date().toISOString(),
    };
    localStorage.setItem("applications", JSON.stringify(applications));

    setHasApplied(true);
    setShowApplyDialog(false);
    setSnackbarMessage(
      "Application submitted! Good luck with your application"
    );
    setSnackbarSeverity("success");
    setSnackbarOpen(true);
  };

  if (!internship) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "background.default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "gray" }}>Loading...</p>
      </div>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "background.default",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 1024, margin: "0 auto" }}>
          <Button
            variant="text"
            startIcon={<FiArrowLeft />}
            onClick={onClose}
            sx={{ mb: 3 }}
          >
            Back
          </Button>

          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              boxShadow: "0px 10px 30px rgba(0,0,0,0.1)",
              padding: 32,
              animation: "scale-in 0.3s ease forwards",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background:
                    "linear-gradient(135deg, #6B46C1 0%, #B794F4 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FiHome color="white" size={32} />
              </div>
              <div style={{ flex: 1 }}>
                <h1
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: "#212121",
                  }}
                >
                  {internship.role}
                </h1>
                <p style={{ fontSize: 20, color: "gray", marginBottom: 16 }}>
                  {internship.company}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Badge label={internship.field} color="secondary" />
                  <Badge label={internship.category} color="secondary" />
                  <Badge
                    label={`Deadline: ${new Date(
                      internship.deadline
                    ).toLocaleDateString()}`}
                    variant="outlined"
                    icon={<FiCalendar size={16} />}
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <section>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    marginBottom: 12,
                    color: "#212121",
                  }}
                >
                  About the Role
                </h2>
                <p style={{ color: "gray", lineHeight: 1.6 }}>
                  {internship.description}
                </p>
              </section>

              <section>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    marginBottom: 12,
                    color: "#212121",
                  }}
                >
                  Requirements
                </h2>
                <ul
                  style={{
                    listStyle: "none",
                    paddingLeft: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {Array.isArray(internship.requirements) && internship.requirements.length > 0 ? (
                    internship.requirements.map((req, index) => (
                      <li
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: "#1976d2",
                            marginTop: 6,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: "gray" }}>{req}</span>
                      </li>
                    ))
                  ) : (
                    <li style={{ color: "gray" }}>No specific requirements listed.</li>
                  )}
                </ul>
              </section>

              <div
                style={{
                  display: "flex",
                  gap: 16,
                  paddingTop: 24,
                  borderTop: "1px solid #e0e0e0",
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<FiSend />}
                  onClick={() => setShowApplyDialog(true)}
                  disabled={hasApplied}
                  sx={{ flex: 1 }}
                >
                  {hasApplied ? "Already Applied" : "Apply Now"}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FiExternalLink />}
                  onClick={() =>
                    window.open(internship.recruiterLinkedIn, "_blank")
                  }
                >
                  Recruiter LinkedIn
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={showApplyDialog}
        onClose={() => setShowApplyDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Apply to {internship.company}</DialogTitle>
        <DialogContent dividers>
          <InputLabel htmlFor="coverLetter" required sx={{ mb: 1 }}>
            Cover Letter
          </InputLabel>
          <TextareaAutosize
            id="coverLetter"
            minRows={8}
            placeholder="Tell us why you're interested in this position and what makes you a great fit..."
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              fontSize: 16,
              borderRadius: 4,
              borderColor: "#c4c4c4",
              fontFamily: "Roboto, sans-serif",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApplyDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleApply} variant="contained">
            Submit Application
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbarSeverity}
          onClose={() => setSnackbarOpen(false)}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default InternshipDetails;
