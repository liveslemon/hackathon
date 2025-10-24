import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  LinearProgress,
  FormControlLabel,
  Checkbox,
  TextareaAutosize,
  Stack,
} from "@mui/material";
import { AiOutlineArrowLeft, AiOutlineArrowRight } from "react-icons/ai";
import { useToast } from "@/hooks/use-toast";

const courses = [
  "Computer Science",
  "Engineering",
  "Business Administration",
  "Economics",
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "Design",
  "Marketing",
];

const interests = [
  "Software Development",
  "Data Science",
  "Engineering",
  "Business",
  "Consulting",
  "Finance",
  "Design",
  "Marketing",
  "Research",
  "Healthcare",
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    course: "",
    interests: [] as string[],
    cvLink: "",
  });
  const router = useRouter();
  const { toast } = useToast();

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.course || formData.interests.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.endsWith("@pau.edu.ng")) {
      toast({
        title: "Invalid Email",
        description: "Please use your PAU email address",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("userProfile", JSON.stringify(formData));
    localStorage.setItem("savedInternships", JSON.stringify([]));
    localStorage.setItem("appliedInternships", JSON.stringify([]));

    toast({
      title: "Welcome to PAU InterConnect!",
      description: "Your profile has been created successfully",
    });

    router.push("/dashboard");
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          {step === 1 && "Personal Information"}
          {step === 2 && "Academic Details"}
          {step === 3 && "Career Interests"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Step {step} of 3
        </Typography>
        <LinearProgress
          variant="determinate"
          value={(step / 3) * 100}
          sx={{ mt: 2, height: 10, borderRadius: 5 }}
        />
      </Box>

      {step === 1 && (
        <Stack spacing={3}>
          <TextField
            label="Full Name *"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
          />
          <TextField
            label="PAU Email *"
            type="email"
            placeholder="john.doe@pau.edu.ng"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            fullWidth
          />
        </Stack>
      )}

      {step === 2 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Select Your Course *
          </Typography>
          <Grid container spacing={2}>
            {courses.map((course) => (
              <Grid item xs={6} key={course}>
                <Button
                  variant={formData.course === course ? "contained" : "outlined"}
                  fullWidth
                  onClick={() => setFormData({ ...formData, course })}
                >
                  {course}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {step === 3 && (
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select Your Interests * (Choose at least one)
            </Typography>
            <Grid container spacing={1}>
              {interests.map((interest) => (
                <Grid item xs={6} key={interest}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.interests.includes(interest)}
                        onChange={() => handleInterestToggle(interest)}
                      />
                    }
                    label={interest}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              CV/Resume Link (Optional)
            </Typography>
            <TextareaAutosize
              minRows={3}
              placeholder="Paste a link to your CV or resume (Google Drive, Dropbox, etc.)"
              value={formData.cvLink}
              onChange={(e) => setFormData({ ...formData, cvLink: e.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 5, borderColor: "#ccc" }}
            />
          </Box>
        </Stack>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
        {step > 1 && (
          <Button
            variant="outlined"
            startIcon={<AiOutlineArrowLeft />}
            onClick={() => setStep(step - 1)}
          >
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button
            variant="contained"
            endIcon={<AiOutlineArrowRight />}
            onClick={() => setStep(step + 1)}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
          >
            Complete Setup
          </Button>
        )}
      </Box>
    </Container>
  );
};

export default Onboarding;
