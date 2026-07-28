"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui";
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
import Link from "next/link";

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

export default function ProfileClient({
  initialProfile,
  userEmail,
}: {
  initialProfile: ProfileState | null;
  userEmail: string | null;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileState>(initialProfile || {});
  const [status, setStatus] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [newSkill, setNewSkill] = useState("");

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
  };

  const addSkill = (skill: string) => {
    if (!skill.trim() || skillsArray.includes(skill.trim())) return;
    setProfile({ ...profile, skills: [...skillsArray, skill.trim()] });
    setNewSkill("");
  };

  const removeSkill = (skill: string) => {
    setProfile({ ...profile, skills: skillsArray.filter((s) => s !== skill) });
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
  };

  const updateExperience = (
    index: number,
    field: keyof Experience,
    value: string,
  ) => {
    const updated = [...experienceArray];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, experience: updated });
  };

  const removeExperience = (index: number) => {
    setProfile({
      ...profile,
      experience: experienceArray.filter((_, i) => i !== index),
    });
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
  };

  const updateProject = (
    index: number,
    field: keyof Project,
    value: string | string[],
  ) => {
    const updated = [...projectsArray];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, projects: updated });
  };

  const removeProject = (index: number) => {
    setProfile({
      ...profile,
      projects: projectsArray.filter((_, i) => i !== index),
    });
  };

  const addCertification = () => {
    setProfile({
      ...profile,
      certifications: [
        ...certificationsArray,
        { name: "", issuer: "", date: "", credential_url: "" },
      ],
    });
  };

  const updateCertification = (
    index: number,
    field: keyof Certification,
    value: string,
  ) => {
    const updated = [...certificationsArray];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, certifications: updated });
  };

  const removeCertification = (index: number) => {
    setProfile({
      ...profile,
      certifications: certificationsArray.filter((_, i) => i !== index),
    });
  };

  const addLanguage = () => {
    setProfile({
      ...profile,
      languages: [...languagesArray, { name: "", proficiency: "Intermediate" }],
    });
  };

  const updateLanguage = (
    index: number,
    field: keyof Language,
    value: string,
  ) => {
    const updated = [...languagesArray];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, languages: updated });
  };

  const removeLanguage = (index: number) => {
    setProfile({
      ...profile,
      languages: languagesArray.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("Not logged in");

      // Filter out empty entries before saving
      const cleanExperience = experienceArray.filter(
        (e) => e.company.trim() || e.role.trim(),
      );
      const cleanProjects = projectsArray.filter((p) => p.title.trim());
      const cleanCerts = certificationsArray.filter((c) => c.name.trim());
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

      setStatus({ type: "success", message: "Profile saved successfully!" });
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

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/dashboard/student")}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Dashboard
      </button>

      {/* Profile Strength Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800">
              Profile Strength
            </h3>
          </div>
          <span className="text-sm font-bold text-indigo-600">
            {profileStrength}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
        <p className="text-xs text-slate-400 mt-2">
          {profileStrength < 50
            ? "Add more details to improve your visibility to employers"
            : profileStrength < 80
              ? "Good progress! Add projects or experience to stand out"
              : "Great profile! Employers can easily discover you"}
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50/50 px-6 py-8 md:px-10 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-5">
            <div className="w-20 h-20 bg-white rounded-2xl border border-slate-200 flex items-center justify-center shadow-sm">
              <User className="w-10 h-10 text-slate-300" />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-xl font-bold text-slate-800">
                {profile.full_name || "Guest User"}
              </h1>
              <p className="text-sm text-slate-400 font-medium">
                {userEmail || "Log in to save"}
              </p>
              {profile.bio && !isEditing && (
                <p className="text-sm text-slate-500 mt-1 max-w-md">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 flex gap-2">
            {!isEditing ? (
              <>
                <Link
                  href={`/profile/${profile.id || ""}`}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Profile
                </Link>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setProfile(initialProfile || {});
                    setIsEditing(false);
                    setStatus(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={isSaving}
                  onClick={handleSave}
                  className={cx(
                    "flex items-center gap-2 px-5 py-2 bg-slate-800 rounded-lg text-sm font-semibold text-white hover:bg-slate-700 transition-all shadow-sm",
                    isSaving && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 md:p-10 space-y-10">
          {status && (
            <div
              className={cx(
                "p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
                status.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : status.type === "warning"
                    ? "bg-amber-50 text-amber-700 border border-amber-100"
                    : "bg-rose-50 text-rose-700 border border-rose-100",
              )}
            >
              {status.type === "success" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          {/* 1. Personal Information */}
          <section className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Full Name
                </label>
                <Input
                  placeholder="Your full name"
                  value={profile.full_name || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                  disabled={!isEditing}
                  className="bg-transparent border-slate-150 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  PAU Email
                </label>
                <Input
                  value={userEmail || ""}
                  disabled
                  className="bg-slate-50/50 border-slate-150 rounded-xl opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Phone Number
                </label>
                <Input
                  placeholder="+234 xxx xxx xxxx"
                  value={profile.phone || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  disabled={!isEditing}
                  className="bg-transparent border-slate-150 rounded-xl"
                />
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* 2. Professional Summary */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              Professional Summary
            </h3>
            <textarea
              placeholder="A short bio about yourself, your interests, and career goals..."
              value={profile.bio || ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              disabled={!isEditing}
              rows={3}
              maxLength={300}
              className={cx(
                "w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none",
                !isEditing && "opacity-70 cursor-default",
              )}
            />
            <p className="text-xs text-slate-400 text-right">
              {(profile.bio || "").length}/300
            </p>
          </section>

          <hr className="border-slate-100" />

          {/* 3. Academic Information */}
          <section className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-slate-400" /> Academic
              Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Course of Study
                </label>
                {isEditing ? (
                  <select
                    value={profile.course || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, course: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
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
                    className="bg-transparent border-slate-150 rounded-xl"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Current Level
                </label>
                {isEditing ? (
                  <select
                    value={profile.level || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, level: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
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
                    className="bg-transparent border-slate-150 rounded-xl"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Expected Graduation
                </label>
                <Input
                  type={isEditing ? "month" : "text"}
                  placeholder="2028"
                  value={profile.expected_graduation || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      expected_graduation: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                  className="bg-transparent border-slate-150 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  CGPA
                </label>
                <Input
                  placeholder="e.g. 4.2"
                  value={profile.cgpa || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, cgpa: e.target.value })
                  }
                  disabled={!isEditing}
                  className="bg-transparent border-slate-150 rounded-xl"
                />
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* 4. Skills */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {skillsArray.map((skill, idx) => (
                <span
                  key={`${skill}-${idx}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100"
                >
                  {skill}
                  {isEditing && (
                    <button
                      onClick={() => removeSkill(skill)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {skillsArray.length === 0 && !isEditing && (
                <p className="text-sm text-slate-400">No skills added yet</p>
              )}
            </div>
            {isEditing && (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill(newSkill);
                      }
                    }}
                    className="bg-transparent border-slate-150 rounded-xl flex-1"
                  />
                  <button
                    onClick={() => addSkill(newSkill)}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedSkills
                    .filter((s) => !skillsArray.includes(s))
                    .slice(0, 12)
                    .map((skill) => (
                      <button
                        key={skill}
                        onClick={() => addSkill(skill)}
                        className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 text-xs font-medium border border-slate-150 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                      >
                        + {skill}
                      </button>
                    ))}
                </div>
              </>
            )}
          </section>

          <hr className="border-slate-100" />

          {/* 5. Career Interests & Preferences */}
          <section className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800">
              Career Interests & Preferences
            </h3>
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Select fields you&apos;re interested in for better matching
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
                        "px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border",
                        selected
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300",
                        !isEditing && "opacity-70 cursor-default",
                      )}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Preferred Work Type
                </label>
                {isEditing ? (
                  <select
                    value={profile.preferred_work_type || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        preferred_work_type: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
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
                    className="bg-transparent border-slate-150 rounded-xl"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Employment Type
                </label>
                {isEditing ? (
                  <select
                    value={profile.employment_type || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        employment_type: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
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
                    className="bg-transparent border-slate-150 rounded-xl"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Availability
                </label>
                {isEditing ? (
                  <select
                    value={profile.availability || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, availability: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
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
                    className="bg-transparent border-slate-150 rounded-xl"
                  />
                )}
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* 6. Experience */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" /> Experience
              </h3>
              {isEditing && (
                <button
                  onClick={addExperience}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>
            {experienceArray.length === 0 && !isEditing && (
              <p className="text-sm text-slate-400">No experience added yet</p>
            )}
            {experienceArray.map((exp, i) => (
              <div
                key={i}
                className="border border-slate-150 rounded-xl p-4 space-y-3 relative group"
              >
                {isEditing && (
                  <button
                    onClick={() => removeExperience(i)}
                    className="absolute -top-3 -right-3 bg-white w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm z-10 opacity-0 group-hover:opacity-100"
                    title="Remove experience"
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
                    className="bg-transparent border-slate-150 rounded-lg text-sm"
                  />
                  <Input
                    placeholder="Role / Title"
                    value={exp.role}
                    onChange={(e) =>
                      updateExperience(i, "role", e.target.value)
                    }
                    disabled={!isEditing}
                    className="bg-transparent border-slate-150 rounded-lg text-sm"
                  />
                  <Input
                    placeholder="Start date"
                    type={isEditing ? "month" : "text"}
                    value={exp.start_date}
                    onChange={(e) =>
                      updateExperience(i, "start_date", e.target.value)
                    }
                    disabled={!isEditing}
                    className="bg-transparent border-slate-150 rounded-lg text-sm"
                  />
                  <Input
                    placeholder="End date (or Present)"
                    type={isEditing ? "month" : "text"}
                    value={exp.end_date}
                    onChange={(e) =>
                      updateExperience(i, "end_date", e.target.value)
                    }
                    disabled={!isEditing}
                    className="bg-transparent border-slate-150 rounded-lg text-sm"
                  />
                </div>
                <textarea
                  placeholder="Brief description of your role..."
                  value={exp.description}
                  onChange={(e) =>
                    updateExperience(i, "description", e.target.value)
                  }
                  disabled={!isEditing}
                  rows={2}
                  className={cx(
                    "w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none",
                    !isEditing && "opacity-70 cursor-default",
                  )}
                />
              </div>
            ))}
          </section>

          <hr className="border-slate-100" />

          {/* 7. Projects */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-slate-400" /> Projects
              </h3>
              {isEditing && (
                <button
                  onClick={addProject}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>
            {projectsArray.length === 0 && !isEditing && (
              <p className="text-sm text-slate-400">No projects added yet</p>
            )}
            {projectsArray.map((proj, i) => (
              <div
                key={i}
                className="border border-slate-150 rounded-xl p-4 space-y-3 relative group"
              >
                {isEditing && (
                  <button
                    onClick={() => removeProject(i)}
                    className="absolute -top-3 -right-3 bg-white w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm z-10 opacity-0 group-hover:opacity-100"
                    title="Remove project"
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
                    className="bg-transparent border-slate-150 rounded-lg text-sm"
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
                    className="bg-transparent border-slate-150 rounded-lg text-sm"
                  />
                  <Input
                    placeholder="GitHub URL"
                    value={proj.github_url}
                    onChange={(e) =>
                      updateProject(i, "github_url", e.target.value)
                    }
                    disabled={!isEditing}
                    className="bg-transparent border-slate-150 rounded-lg text-sm"
                  />
                  <Input
                    placeholder="Demo URL"
                    value={proj.demo_url}
                    onChange={(e) =>
                      updateProject(i, "demo_url", e.target.value)
                    }
                    disabled={!isEditing}
                    className="bg-transparent border-slate-150 rounded-lg text-sm"
                  />
                </div>
                <textarea
                  placeholder="What does this project do?"
                  value={proj.description}
                  onChange={(e) =>
                    updateProject(i, "description", e.target.value)
                  }
                  disabled={!isEditing}
                  rows={2}
                  className={cx(
                    "w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none",
                    !isEditing && "opacity-70 cursor-default",
                  )}
                />
              </div>
            ))}
          </section>

          <hr className="border-slate-100" />

          {/* 8. Certifications */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-400" /> Certifications
              </h3>
              {isEditing && (
                <button
                  onClick={addCertification}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>
            {certificationsArray.length === 0 && !isEditing && (
              <p className="text-sm text-slate-400">
                No certifications added yet
              </p>
            )}
            {certificationsArray.map((cert, i) => (
              <div
                key={i}
                className="border border-slate-150 rounded-xl p-4 relative group"
              >
                {isEditing && (
                  <button
                    onClick={() => removeCertification(i)}
                    className="absolute -top-3 -right-3 bg-white w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm z-10 opacity-0 group-hover:opacity-100"
                    title="Remove certification"
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
                    className="bg-transparent border-slate-150 rounded-lg text-sm"
                  />
                  <Input
                    placeholder="Issuing organization"
                    value={cert.issuer}
                    onChange={(e) =>
                      updateCertification(i, "issuer", e.target.value)
                    }
                    disabled={!isEditing}
                    className="bg-transparent border-slate-150 rounded-lg text-sm"
                  />
                  <Input
                    placeholder="Date obtained"
                    type={isEditing ? "month" : "text"}
                    value={cert.date}
                    onChange={(e) =>
                      updateCertification(i, "date", e.target.value)
                    }
                    disabled={!isEditing}
                    className="bg-transparent border-slate-150 rounded-lg text-sm"
                  />
                  <Input
                    placeholder="Credential URL"
                    value={cert.credential_url}
                    onChange={(e) =>
                      updateCertification(i, "credential_url", e.target.value)
                    }
                    disabled={!isEditing}
                    className="bg-transparent border-slate-150 rounded-lg text-sm"
                  />
                </div>
              </div>
            ))}
          </section>

          <hr className="border-slate-100" />

          {/* 9. Languages */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Languages className="w-4 h-4 text-slate-400" /> Languages
              </h3>
              {isEditing && (
                <button
                  onClick={addLanguage}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>
            {languagesArray.length === 0 && !isEditing && (
              <p className="text-sm text-slate-400">No languages added yet</p>
            )}
            <div className="space-y-2">
              {languagesArray.map((lang, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Input
                    placeholder="Language"
                    value={lang.name}
                    onChange={(e) => updateLanguage(i, "name", e.target.value)}
                    disabled={!isEditing}
                    className="bg-transparent border-slate-150 rounded-lg text-sm flex-1"
                  />
                  {isEditing ? (
                    <select
                      value={lang.proficiency}
                      onChange={(e) =>
                        updateLanguage(i, "proficiency", e.target.value)
                      }
                      className="rounded-lg border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Native">Native</option>
                      <option value="Fluent">Fluent</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Basic">Basic</option>
                    </select>
                  ) : (
                    <span className="text-sm text-slate-500 font-medium px-3 py-1 bg-slate-50 rounded-lg">
                      {lang.proficiency}
                    </span>
                  )}
                  {isEditing && (
                    <button
                      onClick={() => removeLanguage(i)}
                      className="bg-white w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                      title="Remove language"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* 10. Portfolio Links */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400" /> Portfolio & Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  GitHub
                </label>
                <Input
                  placeholder="https://github.com/username"
                  value={portfolioLinks.github || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      portfolio_links: {
                        ...portfolioLinks,
                        github: e.target.value,
                      },
                    })
                  }
                  disabled={!isEditing}
                  className="bg-transparent border-slate-150 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  LinkedIn
                </label>
                <Input
                  placeholder="https://linkedin.com/in/username"
                  value={portfolioLinks.linkedin || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      portfolio_links: {
                        ...portfolioLinks,
                        linkedin: e.target.value,
                      },
                    })
                  }
                  disabled={!isEditing}
                  className="bg-transparent border-slate-150 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Portfolio Website
                </label>
                <Input
                  placeholder="https://yoursite.com"
                  value={portfolioLinks.portfolio || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      portfolio_links: {
                        ...portfolioLinks,
                        portfolio: e.target.value,
                      },
                    })
                  }
                  disabled={!isEditing}
                  className="bg-transparent border-slate-150 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Other
                </label>
                <Input
                  placeholder="Any other link"
                  value={portfolioLinks.other || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      portfolio_links: {
                        ...portfolioLinks,
                        other: e.target.value,
                      },
                    })
                  }
                  disabled={!isEditing}
                  className="bg-transparent border-slate-150 rounded-xl text-sm"
                />
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* 11. CV */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" /> Resume / CV
            </h3>
            <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-6 flex items-center gap-5">
              <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-sm shrink-0">
                <FileText className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-700">
                  {hasCv ? "CV uploaded and analyzed" : "No CV uploaded yet"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {hasCv
                    ? "View your ATS score, skill extraction, and match results"
                    : "Upload your CV for AI-powered analysis and internship matching"}
                </p>
              </div>
              <Link
                href="/dashboard/student/cv"
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-sm font-semibold text-white hover:bg-slate-700 transition-all shadow-sm shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {hasCv ? "View Analysis" : "Upload CV"}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
