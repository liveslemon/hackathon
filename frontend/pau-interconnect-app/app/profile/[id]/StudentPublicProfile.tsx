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
import { Card, Badge, Button, EmptyState } from "@/components/ui";

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
      {/* Hero / Header Card */}
      <Card className="overflow-hidden border border-border">
        <div className="h-28 bg-gradient-to-r from-brand/15 via-brand/10 to-transparent border-b border-border" />
        <div className="px-6 md:px-10 pb-8 -mt-12">
          <div className="flex flex-col md:flex-row items-start gap-5">
            <div className="w-24 h-24 bg-surface rounded-2xl border-4 border-surface shadow-md flex items-center justify-center shrink-0 overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Student"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-fg-subtle" />
              )}
            </div>
            <div className="flex-1 pt-2 md:pt-14 min-w-0">
              <h1 className="text-2xl font-bold text-fg">
                {profile.full_name || "Student Candidate"}
              </h1>
              {profile.course && (
                <p className="text-sm text-fg-muted mt-1 flex items-center gap-1.5 font-medium">
                  <GraduationCap className="w-4 h-4 text-brand shrink-0" />
                  {profile.course}
                  {profile.level && ` · ${profile.level} Level`}
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-fg mt-3 max-w-2xl leading-relaxed">
                  {profile.bio}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 md:pt-14 shrink-0">
              {profile.availability && (
                <Badge variant="success" size="sm">
                  <Calendar className="w-3 h-3 mr-1" />
                  {profile.availability}
                </Badge>
              )}
              {profile.preferred_work_type && (
                <Badge variant="neutral" size="sm">
                  <MapPin className="w-3 h-3 mr-1" />
                  {profile.preferred_work_type}
                </Badge>
              )}
              {profile.employment_type && (
                <Badge variant="secondary" size="sm">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {profile.employment_type}
                </Badge>
              )}
            </div>
          </div>

          {/* Contact & Portfolio Links */}
          <div className="flex flex-wrap items-center gap-4 mt-6 pt-5 border-t border-border">
            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="flex items-center gap-1.5 text-sm text-fg-muted hover:text-brand transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                {profile.email}
              </a>
            )}
            {profile.phone && (
              <span className="flex items-center gap-1.5 text-sm text-fg-muted">
                <Phone className="w-3.5 h-3.5" />
                {profile.phone}
              </span>
            )}
            {portfolioLinks.github && (
              <a
                href={portfolioLinks.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
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
                className="flex items-center gap-1.5 text-sm text-fg-muted hover:text-brand transition-colors"
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
                className="flex items-center gap-1.5 text-sm text-fg-muted hover:text-brand transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                Portfolio
              </a>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Sidebar Details */}
        <div className="space-y-6">
          {/* Academic Info */}
          <Card className="p-6 space-y-4 border border-border">
            <h2 className="text-sm font-bold text-fg flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-brand" /> Academic Info
            </h2>
            <div className="space-y-3 text-sm">
              {profile.course && (
                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">Course</span>
                  <span className="font-medium text-fg text-right">{profile.course}</span>
                </div>
              )}
              {profile.level && (
                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">Level</span>
                  <span className="font-medium text-fg">{profile.level} Level</span>
                </div>
              )}
              {profile.cgpa && (
                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">CGPA</span>
                  <span className="font-medium text-fg">{profile.cgpa}</span>
                </div>
              )}
              {profile.expected_graduation && (
                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">Graduation</span>
                  <span className="font-medium text-fg">{profile.expected_graduation}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Skills */}
          {skills.length > 0 && (
            <Card className="p-6 space-y-4 border border-border">
              <h2 className="text-sm font-bold text-fg">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, idx) => (
                  <Badge key={`${skill}-${idx}`} variant="neutral" size="sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <Card className="p-6 space-y-4 border border-border">
              <h2 className="text-sm font-bold text-fg">Target Fields</h2>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge key={interest} variant="secondary" size="sm">
                    {interest}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Languages */}
          {languages.length > 0 && (
            <Card className="p-6 space-y-4 border border-border">
              <h2 className="text-sm font-bold text-fg flex items-center gap-2">
                <Languages className="w-4 h-4 text-brand" /> Languages
              </h2>
              <div className="space-y-2">
                {languages.map((lang, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-fg font-medium">{lang.name}</span>
                    <Badge variant="neutral" size="sm">
                      {lang.proficiency}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* CV / Resume */}
          {hasCv && (
            <Card className="p-6 space-y-4 border border-border">
              <h2 className="text-sm font-bold text-fg flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand" /> Resume / CV
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center border border-brand/20 shrink-0">
                  <FileText className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-fg">CV Available</p>
                  <p className="text-xs text-fg-muted">AI parsed and ready</p>
                </div>
              </div>
              {profile.cv_url && (
                <ViewCvButton
                  userId={profile.id}
                  cvUrl={profile.cv_url}
                  fullName={profile.full_name || "Student"}
                />
              )}
            </Card>
          )}
        </div>

        {/* Right Column — Main Experience & Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Experience */}
          {experience.length > 0 && (
            <Card className="p-6 md:p-8 space-y-5 border border-border">
              <h2 className="text-sm font-bold text-fg flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-brand" /> Work Experience
              </h2>
              <div className="space-y-6">
                {experience.map((exp, i) => (
                  <div
                    key={i}
                    className="relative pl-5 border-l-2 border-brand/30"
                  >
                    <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-brand border-2 border-surface" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-fg">
                        {exp.role || "Role"}
                      </p>
                      <p className="text-sm text-fg-muted font-medium">{exp.company}</p>
                      {(exp.start_date || exp.end_date) && (
                        <p className="text-xs text-fg-subtle">
                          {exp.start_date}
                          {exp.end_date && ` — ${exp.end_date}`}
                        </p>
                      )}
                      {exp.description && (
                        <p className="text-sm text-fg mt-2 leading-relaxed">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <Card className="p-6 md:p-8 space-y-5 border border-border">
              <h2 className="text-sm font-bold text-fg flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-brand" /> Projects
              </h2>
              <div className="space-y-4">
                {projects.map((proj, i) => (
                  <div
                    key={i}
                    className="border border-border rounded-xl p-4 bg-surface-sunken/40 hover:border-brand/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-fg">
                          {proj.title || "Project"}
                        </p>
                        {proj.description && (
                          <p className="text-sm text-fg-muted leading-relaxed">
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
                            className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center hover:bg-surface-raised transition-colors"
                            aria-label="View Github Repository"
                          >
                            <Code2 className="w-4 h-4 text-fg-muted hover:text-fg" />
                          </a>
                        )}
                        {proj.demo_url && (
                          <a
                            href={proj.demo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center hover:bg-surface-raised transition-colors"
                            aria-label="View Project Demo"
                          >
                            <ExternalLink className="w-4 h-4 text-fg-muted hover:text-fg" />
                          </a>
                        )}
                      </div>
                    </div>
                    {Array.isArray(proj.technologies) && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {proj.technologies.map((tech) => (
                          <span
                            key={tech}
                            className="px-2 py-0.5 rounded-md bg-surface text-fg-muted text-xs font-medium border border-border"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <Card className="p-6 md:p-8 space-y-4 border border-border">
              <h2 className="text-sm font-bold text-fg flex items-center gap-2">
                <Award className="w-4 h-4 text-brand" /> Certifications
              </h2>
              <div className="space-y-3">
                {certifications.map((cert, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3.5 border border-border rounded-xl bg-surface-sunken/40"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-fg">
                        {cert.name}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {cert.issuer}
                        {cert.date && ` · ${cert.date}`}
                      </p>
                    </div>
                    {cert.credential_url && (
                      <a
                        href={cert.credential_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand font-medium hover:underline inline-flex items-center gap-1"
                      >
                        Verify <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Empty state when no experience, projects, or certs */}
          {experience.length === 0 &&
            projects.length === 0 &&
            certifications.length === 0 && (
              <EmptyState
                icon={<User className="w-10 h-10 text-fg-subtle" />}
                title="Profile Details Pending"
                description="This candidate has not yet added work experience, project demos, or certifications."
              />
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
      const safeName = fullName.trim().replace(/\s+/g, "_") + "_CV";
      const viewerUrl = `/cv/view?name=${encodeURIComponent(safeName)}&url=${encodeURIComponent(cvUrl)}`;
      window.open(viewerUrl, "_blank");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="solid"
      colorType="primary"
      size="md"
      className="w-full"
      onClick={handleViewCv}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Opening CV...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4 mr-2" />
          View Full CV
        </>
      )}
    </Button>
  );
}
