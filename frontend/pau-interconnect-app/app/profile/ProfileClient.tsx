"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Input, Button, Card, Badge } from "@/components/ui";
import {
  ArrowLeft,
  Edit2,
  Save,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  ExternalLink,
  Eye,
  Plus,
  X,
  GraduationCap,
  Briefcase,
  FolderOpen,
  Award,
  Globe,
  Languages,
  Sparkles,
} from "lucide-react";
import { cx } from "@/utils/cx";

// --- Data Options ---
const courseOptions = [
  "Computer Science",
  "Software Engineering",
  "Information Technology",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Business Administration",
  "Economics",
  "Accounting",
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "Design",
  "Marketing",
  "Mass Communication",
];

const levelOptions = ["100", "200", "300", "400", "500"];

const interestOptions = [
  "Software Development",
  "Data Science",
  "AI/Machine Learning",
  "Cybersecurity",
  "Cloud Computing",
  "Engineering",
  "Business",
  "Consulting",
  "Finance",
  "Design",
  "Marketing",
  "Research",
  "Healthcare",
  "Product Management",
];

const workTypeOptions = ["Remote", "Hybrid", "On-site"];
const employmentTypeOptions = [
  "Internship",
  "SIWES",
  "Graduate Internship",
  "Part-time",
];
const availabilityOptions = [
  "Immediately",
  "Next semester",
  "Summer",
  "Flexible",
];

const suggestedSkills = [
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "FastAPI",
  "Django",
  "Java",
  "C++",
  "SQL",
  "PostgreSQL",
  "MongoDB",
  "Git",
  "Docker",
  "AWS",
  "Figma",
  "Excel",
  "Power BI",
  "TensorFlow",
  "Flutter",
  "React Native",
  "Tailwind CSS",
  "GraphQL",
];

// --- Types ---
type Experience = {
  company: string;
  role: string;
  start_date: string;
  end_date: string;
  description: string;
};

type Project = {
  title: string;
  description: string;
  technologies: string[];
  github_url: string;
  demo_url: string;
};

type Certification = {
  name: string;
  issuer: string;
  date: string;
  credential_url: string;
};

type Language = {
  name: string;
  proficiency: string;
};

type ProfileState = {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  course?: string;
  level?: string;
  expected_graduation?: string;
  cgpa?: string;
  interests?: string[] | string;
  bio?: string;
  skills?: string[];
  languages?: Language[];
  experience?: Experience[];
  projects?: Project[];
  certifications?: Certification[];
  preferred_work_type?: string;
  employment_type?: string;
  availability?: string;
  preferred_locations?: string[];
  portfolio_links?: {
    github?: string;
    linkedin?: string;
    portfolio?: string;
    other?: string;
  };
  cv_url?: string;
  cv_structured?: Record<string, unknown>;
  [key: string]: unknown;
};

type ProfileTab = "academic" | "skills" | "experience" | "credentials";

function isHttpUrl(value: string): boolean {
  if (!value || !value.trim()) return true;
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Returns a message for the first invalid field, or null. */
function validateProfile(
  profile: ProfileState,
  projects: Project[],
  certifications: Certification[],
  experience: Experience[],
  languages: Language[],
): string | null {
  const fullName = profile.full_name?.trim();
  if (fullName && (fullName.length < 2 || fullName.length > 100)) {
    return "Full name must be between 2 and 100 characters.";
  }

  const phone = profile.phone?.trim();
  if (phone && !/^\+?[\d\s()-]{7,20}$/.test(phone)) {
    return "Enter a valid phone number, e.g. +234 801 234 5678.";
  }

  const bio = profile.bio?.trim();
  if (bio && bio.length > 300) {
    return "Bio must not exceed 300 characters.";
  }

  const cgpa = profile.cgpa?.toString().trim();
  if (cgpa) {
    const n = Number(cgpa);
    if (Number.isNaN(n) || n < 0 || n > 5) {
      return "CGPA must be a number between 0.0 and 5.0.";
    }
  }

  const grad = profile.expected_graduation?.trim();
  if (grad) {
    const yearMatch = grad.match(/\d{4}/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0], 10);
      if (year < 2020 || year > 2040) {
        return "Expected graduation year should be between 2020 and 2040.";
      }
    }
  }

  // Validate Experience
  for (const exp of experience) {
    const hasCompany = Boolean(exp.company?.trim());
    const hasRole = Boolean(exp.role?.trim());
    if (hasCompany || hasRole) {
      if (!hasCompany) return "Experience entry is missing company name.";
      if (!hasRole) return "Experience entry is missing role/title.";
      if (exp.company.trim().length < 2) return "Company name must be at least 2 characters.";
      if (exp.role.trim().length < 2) return "Role title must be at least 2 characters.";
      if (exp.description && exp.description.trim().length > 1000) {
        return `Description for role "${exp.role}" must not exceed 1000 characters.`;
      }
    }
  }

  // Validate Projects
  for (const proj of projects) {
    const hasTitle = Boolean(proj.title?.trim());
    const hasDesc = Boolean(proj.description?.trim());
    const hasUrl = Boolean(proj.github_url?.trim() || proj.demo_url?.trim());
    if (hasTitle || hasDesc || hasUrl) {
      if (!hasTitle) return "Project is missing a title.";
      if (proj.title.trim().length < 2) return "Project title must be at least 2 characters.";
      if (proj.description && proj.description.trim().length > 1000) {
        return `Description for project "${proj.title}" must not exceed 1000 characters.`;
      }
      if (proj.github_url && proj.github_url.trim() && !isHttpUrl(proj.github_url)) {
        return `Project "${proj.title}" GitHub link must be a valid URL.`;
      }
      if (proj.demo_url && proj.demo_url.trim() && !isHttpUrl(proj.demo_url)) {
        return `Project "${proj.title}" demo link must be a valid URL.`;
      }
    }
  }

  // Validate Certifications
  for (const cert of certifications) {
    const hasName = Boolean(cert.name?.trim());
    const hasIssuer = Boolean(cert.issuer?.trim());
    const hasUrl = Boolean(cert.credential_url?.trim());
    if (hasName || hasIssuer || hasUrl) {
      if (!hasName) return "Certification is missing a name.";
      if (!hasIssuer) return `Certification "${cert.name}" is missing an issuing organization.`;
      if (cert.credential_url && cert.credential_url.trim() && !isHttpUrl(cert.credential_url)) {
        return `Credential link for "${cert.name}" must be a valid URL.`;
      }
    }
  }

  // Validate Languages
  for (const lang of languages) {
    if (lang.name && lang.name.trim() && lang.name.trim().length < 2) {
      return "Language name must be at least 2 characters.";
    }
  }

  // Validate Portfolio links
  const links: Array<[string, string | undefined]> = [
    ...Object.entries(profile.portfolio_links || {}).map(
      ([k, v]) => [`${k} link`, v as string | undefined] as [string, string | undefined],
    ),
  ];
  for (const [label, value] of links) {
    if (value && value.trim() && !isHttpUrl(value.trim())) {
      return `The ${label} must be a valid URL.`;
    }
  }

  return null;
}

export default function ProfileClient({
  initialProfile,
  userEmail,
}: {
  initialProfile: ProfileState | null;
  userEmail: string | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>("academic");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileState>(initialProfile || {});
  const [status, setStatus] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // --- Derived State ---
  const interestsArray: string[] = Array.isArray(profile.interests)
    ? profile.interests
    : typeof profile.interests === "string" && profile.interests
      ? profile.interests.split(",").map((s) => s.trim())
      : [];

  const skillsArray: string[] = Array.isArray(profile.skills)
    ? profile.skills
    : [];

  const experienceArray: Experience[] = Array.isArray(profile.experience)
    ? profile.experience
    : [];

  const projectsArray: Project[] = Array.isArray(profile.projects)
    ? profile.projects
    : [];

  const certificationsArray: Certification[] = Array.isArray(
    profile.certifications,
  )
    ? profile.certifications
    : [];

  const languagesArray: Language[] = Array.isArray(profile.languages)
    ? profile.languages
    : [];

  const portfolioLinks = profile.portfolio_links || {};

  // --- Profile Strength ---
  const computeProfileStrength = () => {
    let score = 0;
    const total = 10;
    if (profile.full_name) score++;
    if (profile.course) score++;
    if (profile.level) score++;
    if (interestsArray.length > 0) score++;
    if (profile.bio) score++;
    if (skillsArray.length > 0) score++;
    if (experienceArray.length > 0) score++;
    if (projectsArray.length > 0) score++;
    if (profile.cv_url || profile.cv_structured) score++;
    if (portfolioLinks.github || portfolioLinks.linkedin) score++;
    return Math.round((score / total) * 100);
  };

  const profileStrength = computeProfileStrength();

  // --- Handlers ---
  const toggleInterest = (interest: string) => {
    if (!isEditing) return;
    const updated = interestsArray.includes(interest)
      ? interestsArray.filter((i) => i !== interest)
      : [...interestsArray, interest];
    setProfile({ ...profile, interests: updated });
    setHasUnsavedChanges(true);
  };

  const addSkill = (skill: string) => {
    if (!skill.trim() || skillsArray.includes(skill.trim())) return;
    setProfile({ ...profile, skills: [...skillsArray, skill.trim()] });
    setNewSkill("");
    setHasUnsavedChanges(true);
  };

  const removeSkill = (skill: string) => {
    setProfile({ ...profile, skills: skillsArray.filter((s) => s !== skill) });
    setHasUnsavedChanges(true);
  };

  const addExperience = () => {
    setProfile({
      ...profile,
      experience: [
        ...experienceArray,
        {
          company: "",
          role: "",
          start_date: "",
          end_date: "",
          description: "",
        },
      ],
    });
    setHasUnsavedChanges(true);
  };

  const updateExperience = (
    index: number,
    field: keyof Experience,
    value: string,
  ) => {
    const updated = [...experienceArray];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, experience: updated });
    setHasUnsavedChanges(true);
  };

  const removeExperience = (index: number) => {
    setProfile({
      ...profile,
      experience: experienceArray.filter((_, i) => i !== index),
    });
    setHasUnsavedChanges(true);
  };

  const addProject = () => {
    setProfile({
      ...profile,
      projects: [
        ...projectsArray,
        {
          title: "",
          description: "",
          technologies: [],
          github_url: "",
          demo_url: "",
        },
      ],
    });
    setHasUnsavedChanges(true);
  };

  const updateProject = (
    index: number,
    field: keyof Project,
    value: string | string[],
  ) => {
    const updated = [...projectsArray];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, projects: updated });
    setHasUnsavedChanges(true);
  };

  const removeProject = (index: number) => {
    setProfile({
      ...profile,
      projects: projectsArray.filter((_, i) => i !== index),
    });
    setHasUnsavedChanges(true);
  };

  const addCertification = () => {
    setProfile({
      ...profile,
      certifications: [
        ...certificationsArray,
        { name: "", issuer: "", date: "", credential_url: "" },
      ],
    });
    setHasUnsavedChanges(true);
  };

  const updateCertification = (
    index: number,
    field: keyof Certification,
    value: string,
  ) => {
    const updated = [...certificationsArray];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, certifications: updated });
    setHasUnsavedChanges(true);
  };

  const removeCertification = (index: number) => {
    setProfile({
      ...profile,
      certifications: certificationsArray.filter((_, i) => i !== index),
    });
    setHasUnsavedChanges(true);
  };

  const addLanguage = () => {
    setProfile({
      ...profile,
      languages: [...languagesArray, { name: "", proficiency: "Intermediate" }],
    });
    setHasUnsavedChanges(true);
  };

  const updateLanguage = (
    index: number,
    field: keyof Language,
    value: string,
  ) => {
    const updated = [...languagesArray];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, languages: updated });
    setHasUnsavedChanges(true);
  };

  const removeLanguage = (index: number) => {
    setProfile({
      ...profile,
      languages: languagesArray.filter((_, i) => i !== index),
    });
    setHasUnsavedChanges(true);
  };

  // Warn about unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && isEditing) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, isEditing]);

  const handleSave = async () => {
    const invalid = validateProfile(
      profile,
      projectsArray,
      certificationsArray,
      experienceArray,
      languagesArray,
    );
    if (invalid) {
      setStatus({ type: "error", message: invalid });
      return;
    }
    setIsSaving(true);
    setStatus(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || profile.id;
      if (!userId) throw new Error("You must be logged in to save your profile.");

      // Filter out empty entries before saving
      const cleanExperience = experienceArray.filter(
        (e) => e.company.trim() && e.role.trim(),
      );
      const cleanProjects = projectsArray.filter((p) => p.title.trim());
      const cleanCerts = certificationsArray.filter((c) => c.name.trim() && c.issuer.trim());
      const cleanLanguages = languagesArray.filter((l) => l.name.trim());
      const cleanSkills = skillsArray.filter((s) => s.trim());

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name || null,
          phone: profile.phone || null,
          course: profile.course || null,
          level: profile.level || null,
          expected_graduation: profile.expected_graduation || null,
          cgpa: profile.cgpa || null,
          interests: interestsArray.length > 0 ? interestsArray : null,
          bio: profile.bio || null,
          skills: cleanSkills.length > 0 ? cleanSkills : null,
          languages: cleanLanguages.length > 0 ? cleanLanguages : null,
          experience: cleanExperience.length > 0 ? cleanExperience : null,
          projects: cleanProjects.length > 0 ? cleanProjects : null,
          certifications: cleanCerts.length > 0 ? cleanCerts : null,
          preferred_work_type: profile.preferred_work_type || null,
          employment_type: profile.employment_type || null,
          availability: profile.availability || null,
          preferred_locations: profile.preferred_locations || null,
          portfolio_links:
            Object.keys(portfolioLinks).length > 0 ? portfolioLinks : null,
        })
        .eq("id", userId);
      if (error) throw error;

      // Update local profile state with cleaned arrays so no stale empty items persist
      setProfile((prev) => ({
        ...prev,
        skills: cleanSkills,
        languages: cleanLanguages,
        experience: cleanExperience,
        projects: cleanProjects,
        certifications: cleanCerts,
      }));

      // Skills, projects and experience feed internship matching; refresh
      // matches in the background whenever the student has CV or profile skills.
      const shouldRematch = Boolean(
        hasCv ||
        cleanSkills.length > 0 ||
        cleanProjects.length > 0 ||
        cleanExperience.length > 0
      );

      if (shouldRematch) {
        import("@/lib/api")
          .then(({ authenticatedFetch, backendUrl }) =>
            authenticatedFetch(backendUrl("/api/me/refresh-matches"), { method: "POST" }),
          )
          .catch((refreshErr) => {
            console.warn("[ProfileClient] Rematch request:", refreshErr);
          });
      }

      setHasUnsavedChanges(false);
      setStatus({
        type: "success",
        message: shouldRematch
          ? "Profile saved! Your internship matches will update shortly."
          : "Profile saved successfully!",
      });
      setIsEditing(false);
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save profile",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasCv = Boolean(profile.cv_url || profile.cv_structured);

  const tabs: Array<{ id: ProfileTab; label: string; icon: typeof User }> = [
    { id: "academic", label: "Personal & Academic", icon: User },
    { id: "skills", label: "Skills & Interests", icon: Sparkles },
    { id: "experience", label: "Experience & Projects", icon: Briefcase },
    { id: "credentials", label: "Certifications & Links", icon: Award },
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => {
          if (hasUnsavedChanges && isEditing) {
            if (!window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
              return;
            }
          }
          router.push("/dashboard/student");
        }}
        className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors group cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Dashboard
      </button>

      {/* Header Profile Hero Card */}
      <Card className="overflow-hidden border border-border">
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
            <div className="w-20 h-20 bg-surface-raised rounded-2xl border border-border flex items-center justify-center shadow-xs">
              <User className="w-10 h-10 text-fg-subtle" />
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-fg">
                  {profile.full_name || "Guest Student"}
                </h1>
                {profile.level && (
                  <Badge variant="neutral" size="sm">
                    Level {profile.level}
                  </Badge>
                )}
                {profile.course && (
                  <Badge variant="secondary" size="sm">
                    {profile.course}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-fg-muted mt-1 font-medium">
                {userEmail || "Log in to save"}
              </p>
              {profile.bio && (
                <p className="text-sm text-fg-muted mt-2 max-w-xl">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {profile.id && (
              <Button variant="outline" size="sm" href={`/profile/${profile.id}`}>
                <Eye className="w-4 h-4 mr-1.5" />
                View Public
              </Button>
            )}
            {!isEditing ? (
              <Button
                variant="solid"
                colorType="primary"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-4 h-4 mr-1.5" />
                Edit Profile
              </Button>
            ) : (
              <Button
                variant="subtle"
                size="sm"
                onClick={() => {
                  setProfile(initialProfile || {});
                  setIsEditing(false);
                  setHasUnsavedChanges(false);
                  setStatus(null);
                }}
              >
                Done Editing
              </Button>
            )}
          </div>
        </div>

        {/* Strength Bar */}
        <div className="border-t border-border px-6 py-4 bg-surface-sunken">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand" />
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                Profile Completeness
              </span>
            </div>
            <span className="text-xs font-bold text-brand">
              {profileStrength}%
            </span>
          </div>
          <div className="w-full h-2 bg-surface-raised rounded-full overflow-hidden border border-border">
            <div
              className={cx(
                "h-full rounded-full transition-all duration-500",
                profileStrength >= 80
                  ? "bg-emerald-500"
                  : profileStrength >= 50
                    ? "bg-amber-500"
                    : "bg-rose-500",
              )}
              style={{ width: `${profileStrength}%` }}
            />
          </div>
          <p className="text-xs text-fg-subtle mt-1.5">
            {profileStrength < 50
              ? "Complete academic background, bio, and at least 3 skills to unlock matching."
              : profileStrength < 80
                ? "Good progress! Add work experience and projects to boost match scores."
                : "Profile complete! Your matching accuracy is maximized."}
          </p>
        </div>
      </Card>

      {/* Status Alert */}
      {status && (
        <div
          role="alert"
          aria-live="polite"
          className={cx(
            "p-4 rounded-xl flex items-center gap-3 text-sm font-medium border",
            status.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
              : status.type === "warning"
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
          )}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-2 overflow-x-auto pb-px" aria-label="Profile sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cx(
                  "flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer",
                  isActive
                    ? "border-brand text-brand"
                    : "border-transparent text-fg-muted hover:text-fg hover:border-border",
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* TAB 1: Academic & Personal */}
        {activeTab === "academic" && (
          <div className="space-y-6">
            <Card className="p-6 md:p-8 space-y-6 border border-border">
              <h2 className="text-base font-bold text-fg flex items-center gap-2">
                <User className="w-4 h-4 text-brand" /> Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    Full Name
                  </label>
                  <Input
                    placeholder="Your full name"
                    value={profile.full_name || ""}
                    onChange={(e) => {
                      setProfile({ ...profile, full_name: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!isEditing}
                    className="bg-surface border-border text-fg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    PAU Email
                  </label>
                  <Input
                    value={userEmail || ""}
                    disabled
                    className="bg-surface-sunken border-border text-fg-muted cursor-not-allowed opacity-75"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    Phone Number
                  </label>
                  <Input
                    placeholder="+234 xxx xxx xxxx"
                    value={profile.phone || ""}
                    onChange={(e) => {
                      setProfile({ ...profile, phone: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!isEditing}
                    className="bg-surface border-border text-fg"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 md:p-8 space-y-4 border border-border">
              <h2 className="text-base font-bold text-fg">
                Professional Summary & Bio
              </h2>
              <textarea
                placeholder="A short bio about yourself, your career aspirations, and technical focus..."
                value={profile.bio || ""}
                onChange={(e) => {
                  setProfile({ ...profile, bio: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                disabled={!isEditing}
                rows={3}
                maxLength={300}
                className={cx(
                  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-hidden focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none transition-colors",
                  !isEditing && "opacity-80 bg-surface-sunken cursor-default",
                )}
              />
              <p className="text-xs text-fg-muted text-right">
                {(profile.bio || "").length}/300 characters
              </p>
            </Card>

            <Card className="p-6 md:p-8 space-y-6 border border-border">
              <h2 className="text-base font-bold text-fg flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-brand" /> Academic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    Course of Study
                  </label>
                  {isEditing ? (
                    <select
                      value={profile.course || ""}
                      onChange={(e) => {
                        setProfile({ ...profile, course: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-fg focus:outline-hidden focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    >
                      <option value="">Select course</option>
                      {courseOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={profile.course || "Not set"}
                      disabled
                      className="bg-surface-sunken border-border text-fg-muted"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    Current Level
                  </label>
                  {isEditing ? (
                    <select
                      value={profile.level || ""}
                      onChange={(e) => {
                        setProfile({ ...profile, level: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-fg focus:outline-hidden focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    >
                      <option value="">Select level</option>
                      {levelOptions.map((l) => (
                        <option key={l} value={l}>
                          {l} Level
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={profile.level ? `${profile.level} Level` : "Not set"}
                      disabled
                      className="bg-surface-sunken border-border text-fg-muted"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    Expected Graduation
                  </label>
                  <Input
                    type={isEditing ? "month" : "text"}
                    placeholder="2028"
                    value={profile.expected_graduation || ""}
                    onChange={(e) => {
                      setProfile({
                        ...profile,
                        expected_graduation: e.target.value,
                      });
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!isEditing}
                    className="bg-surface border-border text-fg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    CGPA
                  </label>
                  <Input
                    placeholder="e.g. 4.2"
                    value={profile.cgpa || ""}
                    onChange={(e) => {
                      setProfile({ ...profile, cgpa: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!isEditing}
                    className="bg-surface border-border text-fg"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: Skills & Career Interests */}
        {activeTab === "skills" && (
          <div className="space-y-6">
            <Card className="p-6 md:p-8 space-y-5 border border-border">
              <h2 className="text-base font-bold text-fg flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand" /> Technical & Soft Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {skillsArray.map((skill, idx) => (
                  <span
                    key={`${skill}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/10 text-brand text-sm font-medium border border-brand/20"
                  >
                    {skill}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="hover:text-rose-500 transition-colors cursor-pointer"
                        aria-label={`Remove ${skill}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ))}
                {skillsArray.length === 0 && !isEditing && (
                  <p className="text-sm text-fg-muted">No skills added yet. Click &quot;Edit Profile&quot; to add some.</p>
                )}
              </div>

              {isEditing && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a custom skill..."
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill(newSkill);
                        }
                      }}
                      className="bg-surface border-border text-fg flex-1"
                    />
                    <Button
                      type="button"
                      variant="solid"
                      colorType="primary"
                      size="md"
                      onClick={() => addSkill(newSkill)}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
                      Suggested Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedSkills
                        .filter((s) => !skillsArray.includes(s))
                        .slice(0, 14)
                        .map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => addSkill(skill)}
                            className="px-2.5 py-1 rounded-full bg-surface-sunken text-fg-muted text-xs font-medium border border-border hover:bg-brand/10 hover:text-brand hover:border-brand/30 transition-colors cursor-pointer"
                          >
                            + {skill}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6 md:p-8 space-y-6 border border-border">
              <h2 className="text-base font-bold text-fg">
                Career Interests & Matching Preferences
              </h2>
              <div className="space-y-3">
                <p className="text-xs text-fg-muted">
                  Select the career paths you are targeting. This directly weights internship recommendations.
                </p>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((interest) => {
                    const selected = interestsArray.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        disabled={!isEditing}
                        className={cx(
                          "px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border cursor-pointer",
                          selected
                            ? "bg-brand/10 text-brand border-brand/30 font-semibold"
                            : "bg-surface text-fg-muted border-border hover:border-brand/40",
                          !isEditing && "opacity-75 cursor-default",
                        )}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    Preferred Work Type
                  </label>
                  {isEditing ? (
                    <select
                      value={profile.preferred_work_type || ""}
                      onChange={(e) => {
                        setProfile({
                          ...profile,
                          preferred_work_type: e.target.value,
                        });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-fg focus:outline-hidden focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    >
                      <option value="">Select</option>
                      {workTypeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={profile.preferred_work_type || "Not set"}
                      disabled
                      className="bg-surface-sunken border-border text-fg-muted"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    Employment Type
                  </label>
                  {isEditing ? (
                    <select
                      value={profile.employment_type || ""}
                      onChange={(e) => {
                        setProfile({
                          ...profile,
                          employment_type: e.target.value,
                        });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-fg focus:outline-hidden focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    >
                      <option value="">Select</option>
                      {employmentTypeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={profile.employment_type || "Not set"}
                      disabled
                      className="bg-surface-sunken border-border text-fg-muted"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    Availability
                  </label>
                  {isEditing ? (
                    <select
                      value={profile.availability || ""}
                      onChange={(e) => {
                        setProfile({ ...profile, availability: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-fg focus:outline-hidden focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    >
                      <option value="">Select</option>
                      {availabilityOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={profile.availability || "Not set"}
                      disabled
                      className="bg-surface-sunken border-border text-fg-muted"
                    />
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: Experience & Projects */}
        {activeTab === "experience" && (
          <div className="space-y-6">
            {/* Work Experience */}
            <Card className="p-6 md:p-8 space-y-4 border border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-fg flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-brand" /> Work Experience
                </h2>
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addExperience}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Role
                  </Button>
                )}
              </div>
              {experienceArray.length === 0 && !isEditing && (
                <p className="text-sm text-fg-muted py-2">No work experience listed yet.</p>
              )}
              {experienceArray.map((exp, i) => (
                <div
                  key={i}
                  className="border border-border rounded-xl p-4 md:p-5 space-y-3 bg-surface-sunken/40 relative group"
                >
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeExperience(i)}
                      className="absolute -top-2.5 -right-2.5 bg-surface w-7 h-7 rounded-full border border-border flex items-center justify-center text-fg-muted hover:text-rose-500 hover:border-rose-300 transition-colors shadow-xs z-10 cursor-pointer"
                      title="Remove experience"
                      aria-label="Remove experience"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) =>
                        updateExperience(i, "company", e.target.value)
                      }
                      disabled={!isEditing}
                      className="bg-surface border-border text-fg text-sm"
                    />
                    <Input
                      placeholder="Role / Title"
                      value={exp.role}
                      onChange={(e) =>
                        updateExperience(i, "role", e.target.value)
                      }
                      disabled={!isEditing}
                      className="bg-surface border-border text-fg text-sm"
                    />
                    <Input
                      placeholder="Start date (YYYY-MM)"
                      type={isEditing ? "month" : "text"}
                      value={exp.start_date}
                      onChange={(e) =>
                        updateExperience(i, "start_date", e.target.value)
                      }
                      disabled={!isEditing}
                      className="bg-surface border-border text-fg text-sm"
                    />
                    <Input
                      placeholder="End date (or Present)"
                      type={isEditing ? "month" : "text"}
                      value={exp.end_date}
                      onChange={(e) =>
                        updateExperience(i, "end_date", e.target.value)
                      }
                      disabled={!isEditing}
                      className="bg-surface border-border text-fg text-sm"
                    />
                  </div>
                  <textarea
                    placeholder="Brief description of key achievements and tech stack..."
                    value={exp.description}
                    onChange={(e) =>
                      updateExperience(i, "description", e.target.value)
                    }
                    disabled={!isEditing}
                    rows={2}
                    className={cx(
                      "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-hidden focus:ring-2 focus:ring-brand/20 resize-none",
                      !isEditing && "opacity-80 cursor-default",
                    )}
                  />
                </div>
              ))}
            </Card>

            {/* Projects */}
            <Card className="p-6 md:p-8 space-y-4 border border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-fg flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-brand" /> Technical Projects
                </h2>
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addProject}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Project
                  </Button>
                )}
              </div>
              {projectsArray.length === 0 && !isEditing && (
                <p className="text-sm text-fg-muted py-2">No projects added yet.</p>
              )}
              {projectsArray.map((proj, i) => (
                <div
                  key={i}
                  className="border border-border rounded-xl p-4 md:p-5 space-y-3 bg-surface-sunken/40 relative group"
                >
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeProject(i)}
                      className="absolute -top-2.5 -right-2.5 bg-surface w-7 h-7 rounded-full border border-border flex items-center justify-center text-fg-muted hover:text-rose-500 hover:border-rose-300 transition-colors shadow-xs z-10 cursor-pointer"
                      title="Remove project"
                      aria-label="Remove project"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Project title"
                      value={proj.title}
                      onChange={(e) => updateProject(i, "title", e.target.value)}
                      disabled={!isEditing}
                      className="bg-surface border-border text-fg text-sm"
                    />
                    <Input
                      placeholder="Technologies (comma-separated)"
                      value={
                        Array.isArray(proj.technologies)
                          ? proj.technologies.join(", ")
                          : ""
                      }
                      onChange={(e) =>
                        updateProject(
                          i,
                          "technologies",
                          e.target.value.split(",").map((s) => s.trim()),
                        )
                      }
                      disabled={!isEditing}
                      className="bg-surface border-border text-fg text-sm"
                    />
                    <Input
                      placeholder="GitHub repository URL"
                      value={proj.github_url}
                      onChange={(e) =>
                        updateProject(i, "github_url", e.target.value)
                      }
                      disabled={!isEditing}
                      className="bg-surface border-border text-fg text-sm"
                    />
                    <Input
                      placeholder="Live Demo URL"
                      value={proj.demo_url}
                      onChange={(e) =>
                        updateProject(i, "demo_url", e.target.value)
                      }
                      disabled={!isEditing}
                      className="bg-surface border-border text-fg text-sm"
                    />
                  </div>
                  <textarea
                    placeholder="What problem does this project solve? What did you build?"
                    value={proj.description}
                    onChange={(e) =>
                      updateProject(i, "description", e.target.value)
                    }
                    disabled={!isEditing}
                    rows={2}
                    className={cx(
                      "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-hidden focus:ring-2 focus:ring-brand/20 resize-none",
                      !isEditing && "opacity-80 cursor-default",
                    )}
                  />
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* TAB 4: Certifications & Links */}
        {activeTab === "credentials" && (
          <div className="space-y-6">
            {/* Certifications */}
            <Card className="p-6 md:p-8 space-y-4 border border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-fg flex items-center gap-2">
                  <Award className="w-4 h-4 text-brand" /> Certifications & Licenses
                </h2>
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCertification}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Certificate
                  </Button>
                )}
              </div>
              {certificationsArray.length === 0 && !isEditing && (
                <p className="text-sm text-fg-muted py-2">No certifications added yet.</p>
              )}
              {certificationsArray.map((cert, i) => (
                <div
                  key={i}
                  className="border border-border rounded-xl p-4 md:p-5 relative group bg-surface-sunken/40 space-y-3"
                >
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeCertification(i)}
                      className="absolute -top-2.5 -right-2.5 bg-surface w-7 h-7 rounded-full border border-border flex items-center justify-center text-fg-muted hover:text-rose-500 hover:border-rose-300 transition-colors shadow-xs z-10 cursor-pointer"
                      title="Remove certification"
                      aria-label="Remove certification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Certification name"
                      value={cert.name}
                      onChange={(e) =>
                        updateCertification(i, "name", e.target.value)
                      }
                      disabled={!isEditing}
                      className="bg-surface border-border text-fg text-sm"
                    />
                    <Input
                      placeholder="Issuing organization"
                      value={cert.issuer}
                      onChange={(e) =>
                        updateCertification(i, "issuer", e.target.value)
                      }
                      disabled={!isEditing}
                      className="bg-surface border-border text-fg text-sm"
                    />
                    <Input
                      placeholder="Date obtained (YYYY-MM)"
                      type={isEditing ? "month" : "text"}
                      value={cert.date}
                      onChange={(e) =>
                        updateCertification(i, "date", e.target.value)
                      }
                      disabled={!isEditing}
                      className="bg-surface border-border text-fg text-sm"
                    />
                    <Input
                      placeholder="Credential Verification URL"
                      value={cert.credential_url}
                      onChange={(e) =>
                        updateCertification(i, "credential_url", e.target.value)
                      }
                      disabled={!isEditing}
                      className="bg-surface border-border text-fg text-sm"
                    />
                  </div>
                </div>
              ))}
            </Card>

            {/* Languages */}
            <Card className="p-6 md:p-8 space-y-4 border border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-fg flex items-center gap-2">
                  <Languages className="w-4 h-4 text-brand" /> Languages
                </h2>
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLanguage}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Language
                  </Button>
                )}
              </div>
              {languagesArray.length === 0 && !isEditing && (
                <p className="text-sm text-fg-muted py-2">No languages added yet.</p>
              )}
              <div className="space-y-3">
                {languagesArray.map((lang, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Input
                      placeholder="Language (e.g. English, French, Yoruba)"
                      value={lang.name}
                      onChange={(e) => updateLanguage(i, "name", e.target.value)}
                      disabled={!isEditing}
                      className="bg-surface border-border text-fg text-sm flex-1"
                    />
                    {isEditing ? (
                      <select
                        value={lang.proficiency}
                        onChange={(e) =>
                          updateLanguage(i, "proficiency", e.target.value)
                        }
                        className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-hidden focus:ring-2 focus:ring-brand/20"
                      >
                        <option value="Native">Native</option>
                        <option value="Fluent">Fluent</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Basic">Basic</option>
                      </select>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        {lang.proficiency}
                      </Badge>
                    )}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removeLanguage(i)}
                        className="bg-surface w-8 h-8 rounded-full border border-border flex items-center justify-center text-fg-muted hover:text-rose-500 hover:border-rose-300 transition-colors cursor-pointer shrink-0"
                        title="Remove language"
                        aria-label="Remove language"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Portfolio Links */}
            <Card className="p-6 md:p-8 space-y-4 border border-border">
              <h2 className="text-base font-bold text-fg flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand" /> Portfolio & Web Links
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    GitHub Profile
                  </label>
                  <Input
                    placeholder="https://github.com/username"
                    value={portfolioLinks.github || ""}
                    onChange={(e) => {
                      setProfile({
                        ...profile,
                        portfolio_links: {
                          ...portfolioLinks,
                          github: e.target.value,
                        },
                      });
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!isEditing}
                    className="bg-surface border-border text-fg text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    LinkedIn Profile
                  </label>
                  <Input
                    placeholder="https://linkedin.com/in/username"
                    value={portfolioLinks.linkedin || ""}
                    onChange={(e) => {
                      setProfile({
                        ...profile,
                        portfolio_links: {
                          ...portfolioLinks,
                          linkedin: e.target.value,
                        },
                      });
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!isEditing}
                    className="bg-surface border-border text-fg text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    Personal Portfolio Website
                  </label>
                  <Input
                    placeholder="https://yoursite.com"
                    value={portfolioLinks.portfolio || ""}
                    onChange={(e) => {
                      setProfile({
                        ...profile,
                        portfolio_links: {
                          ...portfolioLinks,
                          portfolio: e.target.value,
                        },
                      });
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!isEditing}
                    className="bg-surface border-border text-fg text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-fg-muted uppercase tracking-widest px-1">
                    Other Portfolio / Blog
                  </label>
                  <Input
                    placeholder="https://linktr.ee/..."
                    value={portfolioLinks.other || ""}
                    onChange={(e) => {
                      setProfile({
                        ...profile,
                        portfolio_links: {
                          ...portfolioLinks,
                          other: e.target.value,
                        },
                      });
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!isEditing}
                    className="bg-surface border-border text-fg text-sm"
                  />
                </div>
              </div>
            </Card>

            {/* Resume / CV Card */}
            <Card className="p-6 md:p-8 border border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand/10 rounded-xl border border-brand/20 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-fg">
                      {hasCv ? "CV Uploaded & AI Analyzed" : "Resume / CV Status"}
                    </h3>
                    <p className="text-xs text-fg-muted mt-0.5">
                      {hasCv
                        ? "Your ATS score, parsed skills, and suggestions are active."
                        : "Upload your PDF CV to run AI skill extraction and ATS grading."}
                    </p>
                  </div>
                </div>
                <Button variant="solid" colorType="primary" size="sm" href="/dashboard/student/cv" className="shrink-0">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  {hasCv ? "View CV Dashboard" : "Upload Resume"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Sticky Save Bar */}
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border p-4 shadow-lg">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-4">
            <div className="flex items-center gap-2 text-sm">
              {hasUnsavedChanges ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-semibold text-fg">You have unsaved changes</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-fg-muted">All changes saved</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="subtle"
                size="sm"
                onClick={() => {
                  setProfile(initialProfile || {});
                  setIsEditing(false);
                  setHasUnsavedChanges(false);
                  setStatus(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                colorType="primary"
                size="sm"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
