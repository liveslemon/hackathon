"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSignupRedirectUrl } from "@/lib/env";
import { useRouter } from "next/navigation";
import { Button, Typography, Stack, Input, Textarea } from "@/components/ui";
import type { User } from "@supabase/supabase-js";
import { Building2, GraduationCap } from "lucide-react";

// --- Data ---
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
const levels = ["200", "300", "400", "500"];
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

type Role = "student" | "employer";

const studentSteps = [
  { title: "Role", subtitle: "Who are you joining as?" },
  { title: "Account", subtitle: "Personal details" },
  { title: "Academic", subtitle: "Course and level" },
  { title: "Interests", subtitle: "What are you into?" },
  { title: "Complete", subtitle: "Go to dashboard" },
];

const employerSteps = [
  { title: "Role", subtitle: "Who are you joining as?" },
  { title: "Account", subtitle: "Primary contact" },
  { title: "Company", subtitle: "Company details" },
  { title: "Complete", subtitle: "Go to dashboard" },
];

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return "Something went wrong.";
}

function getApiMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const maybeMessage = (payload as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

function isRedirectToValidationError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("redirect_to") ||
    normalized.includes("redirect") ||
    normalized.includes("422") ||
    normalized.includes("unprocessable")
  );
}

export default function OnboardingClient({
  initialUser,
  initialRolePreference,
}: {
  initialUser: User | null;
  initialRolePreference: Role | null;
}) {
  const [role, setRole] = useState<Role | null>(initialRolePreference);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState("");
  const [formData, setFormData] = useState({
    name:
      initialUser?.user_metadata?.full_name ||
      initialUser?.user_metadata?.name ||
      "",
    email: initialUser?.email || "",
    password: "",
    confirmPassword: "",
    course: "",
    level: "",
    interests: [] as string[],
    companyName: "",
    companyDescription: "",
    companyWebsite: "",
    industry: "",
    culture: "",
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "warning" | "info",
  });
  const router = useRouter();
  const steps = role === "employer" ? employerSteps : studentSteps;
  const totalSteps = steps.length;
  const safeStepIndex = Math.max(0, Math.min(step - 1, totalSteps - 1));
  const currentStep = steps[safeStepIndex];
  const isStudentFlow = role === "student";
  const isFinalInputStep = isStudentFlow ? step === 4 : step === 3;
  const isCompleteStep = step === totalSteps;
  const passwordMismatch =
    formData.confirmPassword.trim().length > 0 &&
    formData.password !== formData.confirmPassword;

  useEffect(() => {
    if (!initialUser) return;

    const loadOnboardingStatus = async () => {
      try {
        const res = await fetch("/api/onboarding/status", {
          cache: "no-store",
        });

        // Session is invalid or expired — treat as a fresh visitor.
        if (res.status === 401) {
          setFormData((prev) => ({ ...prev, name: "", email: "" }));
          return;
        }

        const payload: unknown = await res.json().catch(() => ({}));

        if (!res.ok) return;

        const onboarding = (
          payload as {
            onboarding?: {
              stage?: string;
              cvProcessingStatus?: string;
              role?: string;
            };
          }
        ).onboarding;
        if (!onboarding) return;

        const loadedRole: Role =
          onboarding.role === "employer" ? "employer" : "student";

        // If onboarding is already completed, redirect to the dashboard
        // instead of showing the form with stale pre-filled data.
        if (onboarding.stage === "completed") {
          router.push(
            loadedRole === "employer"
              ? "/dashboard/employer"
              : "/dashboard/student",
          );
          return;
        }

        setRole(loadedRole);

        if (loadedRole === "employer") {
          setStep(2);
        } else {
          setStep(2);
        }
      } catch {
        // Keep default onboarding step if status fetch fails.
      }
    };

    loadOnboardingStatus();
  }, [initialUser, router]);

  const handleInputChange = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = async () => {
    if (!role) {
      setSnackbar({
        open: true,
        message: "Please choose a role to continue.",
        severity: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    setOptimisticMessage("Creating your profile...");

    // Guard against requests that never return.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Request timed out. Please try again.")),
        15000,
      ),
    );

    try {
      let user_id = initialUser?.id;
      let hasSession = Boolean(initialUser);

      if (!user_id) {
        const signupRedirectUrl = getSignupRedirectUrl();
        const signupPayload = signupRedirectUrl
          ? {
              email: formData.email,
              password: formData.password,
              options: { emailRedirectTo: signupRedirectUrl },
            }
          : {
              email: formData.email,
              password: formData.password,
            };

        let { data: authData, error: authError } = await Promise.race([
          supabase.auth.signUp(signupPayload),
          timeout,
        ]);

        if (authError && isRedirectToValidationError(authError.message)) {
          ({ data: authData, error: authError } = await Promise.race([
            supabase.auth.signUp({
              email: formData.email,
              password: formData.password,
            }),
            timeout,
          ]));
        }

        if (authError) throw authError;
        user_id = authData?.user?.id;

        if (!user_id) {
          throw new Error(
            "Account created, but user data is unavailable. Please sign in and retry onboarding.",
          );
        }

        // If sign-up returns no session, try a direct sign-in once.
        // This handles environments where session propagation is delayed.
        if (!authData?.session) {
          const { data: signInData, error: signInError } = await Promise.race([
            supabase.auth.signInWithPassword({
              email: formData.email,
              password: formData.password,
            }),
            timeout,
          ]);

          if (signInError || !signInData.session || !signInData.user?.id) {
            setSnackbar({
              open: true,
              message:
                "Account created. Please verify your email, sign in, and continue onboarding.",
              severity: "warning",
            });
            return;
          }

          user_id = signInData.user.id;
          hasSession = true;
        } else {
          hasSession = true;
        }
      }

      if (!hasSession) {
        throw new Error("Please sign in again before completing onboarding.");
      }

      // If user is already authenticated and entered a password in onboarding,
      // persist it so the step-2 password input has effect.
      if (initialUser && formData.password.trim().length > 0) {
        if (
          formData.password.trim().length < 6 ||
          formData.password !== formData.confirmPassword
        ) {
          throw new Error("Please provide a valid matching password.");
        }

        const { error: updatePasswordError } = await Promise.race([
          supabase.auth.updateUser({
            password: formData.password,
          }),
          timeout,
        ]);

        if (updatePasswordError) {
          throw updatePasswordError;
        }
      }

      const completeRes = await Promise.race([
        fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role,
            full_name: formData.name,
            ...(role === "student"
              ? {
                  course: formData.course,
                  level: formData.level,
                  interests: formData.interests,
                  hasCvUpload: false,
                }
              : {
                  company_name: formData.companyName,
                  company_description: formData.companyDescription,
                  company_website: formData.companyWebsite,
                  industry: formData.industry,
                  culture: formData.culture,
                  hasCvUpload: false,
                }),
          }),
        }),
        timeout,
      ]);

      const completePayload: unknown = await completeRes
        .json()
        .catch(() => ({}));
      if (!completeRes.ok) {
        throw new Error(
          getApiMessage(
            completePayload,
            "Unable to save your onboarding details. Please try again.",
          ),
        );
      }

      setStep(totalSteps);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: getErrorMessage(err),
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = (() => {
    if (step === 1) return Boolean(role);

    if (step === 2) {
      const hasName = formData.name.trim().length >= 2;

      if (initialUser) {
        const touchedPassword =
          formData.password.trim().length > 0 ||
          formData.confirmPassword.trim().length > 0;

        if (!touchedPassword) return hasName;

        return (
          hasName &&
          formData.password.trim().length >= 6 &&
          formData.confirmPassword.trim().length >= 6 &&
          formData.password === formData.confirmPassword
        );
      }

      return (
        hasName &&
        formData.email.trim().length > 0 &&
        formData.password.trim().length >= 6 &&
        formData.confirmPassword.trim().length >= 6 &&
        formData.password === formData.confirmPassword
      );
    }

    if (role === "student" && step === 3) {
      return Boolean(formData.course && formData.level);
    }

    if (role === "employer" && step === 3) {
      return (
        formData.companyName.trim().length >= 2 &&
        formData.companyDescription.trim().length >= 15 &&
        formData.industry.trim().length >= 2 &&
        formData.culture.trim().length >= 10
      );
    }

    if (role === "student" && step === 4) {
      return formData.interests.length > 0;
    }

    return true;
  })();

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div
        className="flex flex-row bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl"
        style={{ minHeight: "620px" }}
      >
        <aside
          className="bg-slate-50 border-r border-slate-200 px-6 py-10 shrink-0"
          style={{ width: "260px" }}
        >
          <div className="mb-10">
            <Typography variant="h6" weight="bold" className="mb-1">
              PAU InterConnect
            </Typography>
            <Typography variant="body2" color="muted">
              Complete onboarding in a few steps.
            </Typography>
          </div>

          <div>
            {steps.map((item, index) => {
              const stepNumber = index + 1;
              const isDone = stepNumber < step;
              const isActive = stepNumber === step;
              const isLast = index === steps.length - 1;

              return (
                <div key={item.title} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`relative z-10 h-7 w-7 rounded-full border-2 shrink-0 flex items-center justify-center text-xs font-bold transition-colors ${
                        isDone
                          ? "bg-brand border-brand text-white"
                          : isActive
                            ? "bg-white border-brand text-brand"
                            : "bg-white border-slate-300 text-slate-400"
                      }`}
                    >
                      {isDone ? "✓" : stepNumber}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 flex-1 my-1 ${
                          isDone ? "bg-brand" : "bg-slate-200"
                        }`}
                        style={{ minHeight: "32px" }}
                      />
                    )}
                  </div>
                  <div className={`pb-8 ${isLast ? "pb-0" : ""}`}>
                    <Typography
                      variant="body2"
                      weight={isActive ? "bold" : "medium"}
                      className={isActive ? "text-slate-900" : "text-slate-500"}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      className="text-slate-400 leading-tight block mt-0.5"
                    >
                      {item.subtitle}
                    </Typography>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-8 py-10 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <Typography variant="h2" weight="bold" className="mb-2">
                {step === 1 && "Choose your role"}
                {step === 2 && "Set up your account"}
                {step === 3 && role === "student" && "Academic details"}
                {step === 3 && role === "employer" && "Company details"}
                {step === 4 && role === "student" && "Your interests"}
                {isCompleteStep && "Complete"}
              </Typography>
              <Typography color="muted">
                Step {step} of {totalSteps}: {currentStep.subtitle}
              </Typography>
            </div>

            <Typography variant="body2" className="text-slate-500">
              Having trouble?{" "}
              <span className="text-brand font-semibold">Get Help</span>
            </Typography>
          </div>

          <div className="min-h-80">
            {step === 1 && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-2xl">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`text-left rounded-2xl border p-4 sm:p-6 transition-colors ${
                    role === "student"
                      ? "border-brand bg-brand/5"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center mb-3 sm:mb-4">
                    <GraduationCap className="w-5 h-5 text-brand" />
                  </div>
                  <Typography variant="h6" weight="bold" className="mb-1">
                    Student
                  </Typography>
                  <Typography variant="body2" color="muted">
                    Apply for internships and build your profile.
                  </Typography>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("employer")}
                  className={`text-left rounded-2xl border p-4 sm:p-6 transition-colors ${
                    role === "employer"
                      ? "border-brand bg-brand/5"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center mb-3 sm:mb-4">
                    <Building2 className="w-5 h-5 text-brand" />
                  </div>
                  <Typography variant="h6" weight="bold" className="mb-1">
                    Employer
                  </Typography>
                  <Typography variant="body2" color="muted">
                    Post opportunities and review applicants.
                  </Typography>
                </button>
              </div>
            )}

            {step === 2 && (
              <Stack spacing={6}>
                <Typography variant="body2" color="muted">
                  {role === "employer"
                    ? "Set up your employer account credentials."
                    : "Set up your student account credentials."}
                </Typography>

                <Input
                  label={
                    role === "employer" ? "Contact Person Name" : "Full Name"
                  }
                  placeholder="First and last name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />

                <Input
                  label={role === "employer" ? "Work Email" : "School Email"}
                  type="email"
                  placeholder={
                    role === "employer" ? "name@company.com" : "you@pau.edu.ng"
                  }
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  disabled={Boolean(initialUser)}
                />
                <Input
                  label={
                    initialUser ? "Set / Update Password" : "Create Password"
                  }
                  type="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  error={
                    passwordMismatch ? "Passwords do not match." : undefined
                  }
                />
                {initialUser && (
                  <Typography variant="caption" className="text-slate-500">
                    You are already signed in. Leave password blank to keep your
                    current password.
                  </Typography>
                )}
              </Stack>
            )}

            {role === "student" && step === 3 && (
              <Stack spacing={6}>
                <div>
                  <Typography variant="body2" color="muted" className="mb-3">
                    Select your course.
                  </Typography>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {courses.map((c) => (
                      <Button
                        key={c}
                        variant={formData.course === c ? "solid" : "outline"}
                        className="justify-start h-12"
                        onClick={() => setFormData({ ...formData, course: c })}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Typography variant="body2" color="muted" className="mb-3">
                    Select your level.
                  </Typography>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {levels.map((l) => (
                      <Button
                        key={l}
                        variant={formData.level === l ? "solid" : "outline"}
                        className="h-14"
                        onClick={() => setFormData({ ...formData, level: l })}
                      >
                        {l}
                      </Button>
                    ))}
                  </div>
                </div>
              </Stack>
            )}

            {role === "student" && step === 4 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Typography variant="body2" color="muted">
                    Select interests for better internship matching.
                  </Typography>
                  <Typography variant="caption" className="text-slate-500">
                    {formData.interests.length} selected
                  </Typography>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {interests.map((i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={
                        formData.interests.includes(i) ? "solid" : "outline"
                      }
                      className="justify-start"
                      onClick={() => handleInterestToggle(i)}
                    >
                      {i}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {role === "employer" && step === 3 && (
              <Stack spacing={5}>
                <Typography variant="body2" color="muted">
                  Tell students about your organization. This appears on your
                  public profile.
                </Typography>
                <Input
                  label="Company Name"
                  placeholder="Acme Technologies"
                  value={formData.companyName}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                />
                <Input
                  label="Industry"
                  placeholder="e.g. Fintech, Healthcare, E-commerce"
                  value={formData.industry}
                  onChange={(e) =>
                    handleInputChange("industry", e.target.value)
                  }
                />
                <Input
                  label="Company Website"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.companyWebsite}
                  onChange={(e) =>
                    handleInputChange("companyWebsite", e.target.value)
                  }
                />
                <Textarea
                  label="Company Description"
                  rows={4}
                  placeholder="What does your company do and what type of interns are you looking for?"
                  value={formData.companyDescription}
                  onChange={(e) =>
                    handleInputChange("companyDescription", e.target.value)
                  }
                />
                <Textarea
                  label="Company Culture"
                  rows={3}
                  placeholder="Describe your work culture, values, and perks."
                  value={formData.culture}
                  onChange={(e) => handleInputChange("culture", e.target.value)}
                />
              </Stack>
            )}

            {isCompleteStep && (
              <div className="text-center py-10">
                <Typography variant="h3">You&apos;re all set!</Typography>
                <Typography color="muted" className="mt-4">
                  Your onboarding details are saved. Continue to your dashboard.
                </Typography>
                <Button
                  className="mt-8"
                  onClick={() =>
                    router.push(
                      role === "employer"
                        ? "/dashboard/employer"
                        : "/dashboard/student",
                    )
                  }
                >
                  Go to Dashboard
                </Button>
              </div>
            )}
          </div>

          {!isCompleteStep && (
            <div className="flex justify-between mt-auto pt-8 border-t border-slate-100">
              {step > 1 ? (
                <Button variant="ghost" onClick={handleBack}>
                  ← Back
                </Button>
              ) : (
                <span />
              )}

              {isFinalInputStep ? (
                <Button
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                  disabled={!canProceed || isSubmitting}
                >
                  {isSubmitting ? optimisticMessage : "Complete Setup"}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!canProceed}>
                  Next
                </Button>
              )}
            </div>
          )}
        </main>
      </div>

      {snackbar.open && (
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl border shadow-lg ${
            snackbar.severity === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : snackbar.severity === "warning"
                ? "bg-amber-50 text-amber-800 border-amber-100"
                : "bg-red-50 text-red-700 border-red-100"
          }`}
        >
          {snackbar.message}
        </div>
      )}
    </div>
  );
}
