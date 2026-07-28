"use client";

import { useState } from "react";
import {
  User,
  GraduationCap,
  Briefcase,
  FolderOpen,
  Award,
  Globe,
  Languages,
  FileText,
  MapPin,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  Code2,
  Link2,
  Loader2,
} from "lucide-react";
import { cx } from "@/utils/cx";
import Link from "next/link";

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

type ProfileData = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  course?: string | null;
  level?: string | null;
  expected_graduation?: string | null;
  cgpa?: string | null;
  interests?: string[] | null;
  skills?: string[] | null;
  languages?: Language[] | null;
  experience?: Experience[] | null;
  projects?: Project[] | null;
  certifications?: Certification[] | null;
  preferred_work_type?: string | null;
  employment_type?: string | null;
  availability?: string | null;
  preferred_locations?: string[] | null;
  portfolio_links?: {
    github?: string;
    linkedin?: string;
    portfolio?: string;
    other?: string;
  } | null;
  cv_url?: string | null;
  cv_structured?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export default function StudentPublicProfile({
  profile,
}: {
  profile: ProfileData;
}) {
  const skills: string[] = Array.isArray(profile.skills) ? profile.skills : [];
  const interests: string[] = Array.isArray(profile.interests)
    ? profile.interests
    : [];
  const experience: Experience[] = Array.isArray(profile.experience)
    ? profile.experience
    : [];
  const projects: Project[] = Array.isArray(profile.projects)
    ? profile.projects
    : [];
  const certifications: Certification[] = Array.isArray(profile.certifications)
    ? profile.certifications
    : [];
  const languages: Language[] = Array.isArray(profile.languages)
    ? profile.languages
    : [];
  const portfolioLinks = profile.portfolio_links || {};
  const hasCv = Boolean(profile.cv_url || profile.cv_structured);

  return (
    <div className="space-y-6">
      {/* Hero / Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-purple-500/10 h-28" />
        <div className="px-6 md:px-10 pb-8 -mt-12">
          <div className="flex flex-col md:flex-row items-start gap-5">
            <div className="w-24 h-24 bg-white rounded-2xl border-4 border-white shadow-lg flex items-center justify-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Student"}
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-slate-300" />
              )}
            </div>
            <div className="flex-1 pt-2 md:pt-14">
              <h1 className="text-2xl font-bold text-slate-800">
                {profile.full_name || "Student"}
              </h1>
              {profile.course && (
                <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  {profile.course}
                  {profile.level && ` · ${profile.level} Level`}
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-slate-600 mt-3 max-w-2xl leading-relaxed">
                  {profile.bio}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 md:pt-14">
              {profile.availability && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                  <Calendar className="w-3 h-3" />
                  {profile.availability}
                </span>
              )}
              {profile.preferred_work_type && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                  <MapPin className="w-3 h-3" />
                  {profile.preferred_work_type}
                </span>
              )}
              {profile.employment_type && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold border border-violet-100">
                  <Briefcase className="w-3 h-3" />
                  {profile.employment_type}
                </span>
              )}
            </div>
          </div>

          {/* Quick contact & links */}
          <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-slate-100">
            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                {profile.email}
              </a>
            )}
            {profile.phone && (
              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                <Phone className="w-3.5 h-3.5" />
                {profile.phone}
              </span>
            )}
            {portfolioLinks.github && (
              <a
                href={portfolioLinks.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" />
                GitHub
              </a>
            )}
            {portfolioLinks.linkedin && (
              <a
                href={portfolioLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                LinkedIn
              </a>
            )}
            {portfolioLinks.portfolio && (
              <a
                href={portfolioLinks.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                Portfolio
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Sidebar info */}
        <div className="space-y-6">
          {/* Academic Info Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
              Academic Info
            </h3>
            <div className="space-y-3 text-sm">
              {profile.course && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Course</span>
                  <span className="font-medium text-slate-700">
                    {profile.course}
                  </span>
                </div>
              )}
              {profile.level && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Level</span>
                  <span className="font-medium text-slate-700">
                    {profile.level}L
                  </span>
                </div>
              )}
              {profile.cgpa && (
                <div className="flex justify-between">
                  <span className="text-slate-400">CGPA</span>
                  <span className="font-medium text-slate-700">
                    {profile.cgpa}
                  </span>
                </div>
              )}
              {profile.expected_graduation && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Graduation</span>
                  <span className="font-medium text-slate-700">
                    {profile.expected_graduation}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Skills Card */}
          {skills.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, idx) => (
                  <span
                    key={`${skill}-${idx}`}
                    className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interests Card */}
          {interests.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-xs font-medium border border-violet-100"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages Card */}
          {languages.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Languages className="w-4 h-4 text-slate-400" />
                Languages
              </h3>
              <div className="space-y-2">
                {languages.map((lang, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-700">{lang.name}</span>
                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                      {lang.proficiency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CV Status */}
          {hasCv && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Resume
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    CV Available
                  </p>
                  <p className="text-xs text-slate-400">
                    AI-analyzed and verified
                  </p>
                </div>
              </div>
              {profile.cv_url && (
                <ViewCvButton
                  userId={profile.id}
                  cvUrl={profile.cv_url}
                  fullName={profile.full_name || "Student"}
                />
              )}
            </div>
          )}
        </div>

        {/* Right Column — Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Experience */}
          {experience.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                Experience
              </h3>
              <div className="space-y-5">
                {experience.map((exp, i) => (
                  <div
                    key={i}
                    className="relative pl-5 border-l-2 border-indigo-100"
                  >
                    <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">
                        {exp.role || "Untitled Role"}
                      </p>
                      <p className="text-sm text-slate-500">{exp.company}</p>
                      {(exp.start_date || exp.end_date) && (
                        <p className="text-xs text-slate-400">
                          {exp.start_date}
                          {exp.end_date && ` — ${exp.end_date}`}
                        </p>
                      )}
                      {exp.description && (
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-500" />
                Projects
              </h3>
              <div className="space-y-4">
                {projects.map((proj, i) => (
                  <div
                    key={i}
                    className="border border-slate-100 rounded-xl p-4 hover:border-indigo-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">
                          {proj.title || "Untitled Project"}
                        </p>
                        {proj.description && (
                          <p className="text-sm text-slate-500 leading-relaxed">
                            {proj.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {proj.github_url && (
                          <a
                            href={proj.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors"
                          >
                            <Code2 className="w-4 h-4 text-slate-500" />
                          </a>
                        )}
                        {proj.demo_url && (
                          <a
                            href={proj.demo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-slate-500" />
                          </a>
                        )}
                      </div>
                    </div>
                    {Array.isArray(proj.technologies) &&
                      proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {proj.technologies.map((tech) => (
                            <span
                              key={tech}
                              className="px-2 py-0.5 rounded bg-slate-50 text-slate-600 text-xs font-medium"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-500" />
                Certifications
              </h3>
              <div className="space-y-3">
                {certifications.map((cert, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 border border-slate-100 rounded-xl"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-slate-700">
                        {cert.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {cert.issuer}
                        {cert.date && ` · ${cert.date}`}
                      </p>
                    </div>
                    {cert.credential_url && (
                      <a
                        href={cert.credential_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
                      >
                        Verify →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {experience.length === 0 &&
            projects.length === 0 &&
            certifications.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <User className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">
                  This student hasn&apos;t added experience, projects, or
                  certifications yet.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function ViewCvButton({
  userId,
  cvUrl,
  fullName,
}: {
  userId: string;
  cvUrl: string;
  fullName: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleViewCv = async () => {
    setIsLoading(true);
    try {
      const { ensureFreshCvUrl } = await import("@/lib/api");
      const freshUrl = await ensureFreshCvUrl(userId, cvUrl);
      const safeName = fullName.trim().replace(/\s+/g, "_") + "_CV";
      const viewerUrl = `/cv/view?name=${encodeURIComponent(safeName)}&url=${encodeURIComponent(freshUrl)}`;
      window.open(viewerUrl, "_blank");
    } catch {
      // If refresh fails, try opening with the original URL directly
      const safeName = fullName.trim().replace(/\s+/g, "_") + "_CV";
      const viewerUrl = `/cv/view?name=${encodeURIComponent(safeName)}&url=${encodeURIComponent(cvUrl)}`;
      window.open(viewerUrl, "_blank");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleViewCv}
      disabled={isLoading}
      className={cx(
        "w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors",
        isLoading && "opacity-50 cursor-not-allowed",
      )}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileText className="w-4 h-4" />
      )}
      {isLoading ? "Loading..." : "View CV"}
    </button>
  );
}
