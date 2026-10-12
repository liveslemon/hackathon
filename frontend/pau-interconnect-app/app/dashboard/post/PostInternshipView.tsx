"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Textarea,
  Select,
  Card,
  CardContent,
  CardHeader,
  PageHeader,
  Badge,
  Modal,
} from "@/components/ui";

import {
  Briefcase,
  Plus,
  Bookmark,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Sparkles,
  CheckCircle2,
  FolderOpen,
  Eye,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { postInternshipSchema } from "@/lib/validations/employer";

const categories = [
  { value: "Remote", label: "Remote" },
  { value: "Hybrid", label: "Hybrid" },
  { value: "On-site", label: "On-site" },
];

const interestsOptions = [
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
  "UX/UI",
  "Product Management",
  "Analytics",
  "Machine Learning",
];

interface TemplateItem {
  id: string;
  name: string;
  role?: string;
  field?: string;
  category?: string;
  description?: string;
  requirements?: string;
  tags?: string[];
  location?: string;
  duration?: string;
  stipend?: string;
}

export default function PostInternshipView() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    role: "",
    field: "",
    category: "Hybrid",
    description: "",
    requirements: "",
    location: "",
    duration: "",
    stipend: "",
    slots: "1",
    link: "",
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Templates
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/internships/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
      }
    } catch {
      // Ignore background template load errors
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const applyTemplate = (t: TemplateItem) => {
    setFormData((prev) => ({
      ...prev,
      role: t.role || prev.role,
      field: t.field || prev.field,
      category: t.category || prev.category,
      description: t.description || prev.description,
      requirements: t.requirements || prev.requirements,
      location: t.location || prev.location,
      duration: t.duration || prev.duration,
      stipend: t.stipend || prev.stipend,
    }));
    if (t.tags && t.tags.length > 0) {
      setInterests(t.tags);
    }
    setTemplateModalOpen(false);
    toast.success(`Template "${t.name}" applied`);
  };

  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      toast.error("Template name is required");
      return;
    }
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/internships/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          role: formData.role.trim() || undefined,
          field: formData.field.trim() || undefined,
          category: formData.category,
          description: formData.description.trim() || undefined,
          requirements: formData.requirements.trim() || undefined,
          tags: interests,
          location: formData.location.trim() || undefined,
          duration: formData.duration.trim() || undefined,
          stipend: formData.stipend.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save template");
      }

      toast.success(`Template "${newTemplateName}" saved!`);
      setSaveTemplateModalOpen(false);
      setNewTemplateName("");
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handlePost = async (publishStatus: "active" | "draft" = "active") => {
    setLoading(true);
    setErrors({});

    const payload = {
      ...formData,
      tags: interests.join(", "),
      deadline: deadline || null,
      status: publishStatus,
    };

    if (publishStatus === "active") {
      const clientValidation = postInternshipSchema.safeParse(payload);
      if (!clientValidation.success) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(
          clientValidation.error.flatten().fieldErrors,
        )) {
          fieldErrors[key] = (msgs as string[])[0];
        }
        setErrors(fieldErrors);
        setLoading(false);
        toast.error("Please resolve highlighted validation errors before publishing");
        return;
      }
    }

    try {
      const res = await fetch("/api/internships/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        if (result.details) {
          const fieldErrors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(result.details)) {
            fieldErrors[key] = (msgs as string[])[0];
          }
          setErrors(fieldErrors);
          throw new Error("Validation failed. Please check form fields.");
        }
        throw new Error(result.error || "Failed to post internship");
      }

      toast.success(
        publishStatus === "draft"
          ? "Internship draft saved successfully!"
          : "Internship posted and published live!",
      );

      router.push("/dashboard/employer/internships");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post internship");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Post New Internship"
        description="Reach talented students across Pan-Atlantic University for SIWES and direct placements."
        actions={
          <div className="flex items-center gap-2">
            {templates.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTemplateModalOpen(true)}
                className="gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Load Template ({templates.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveTemplateModalOpen(true)}
              className="gap-2"
            >
              <Bookmark className="w-4 h-4" />
              Save as Template
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Posting Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Role Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-medium text-xs">
                <Briefcase className="w-4 h-4" />
                <span>SECTION 1</span>
              </div>
              <h3 className="text-base font-semibold text-fg">Role Identity & Track</h3>
              <p className="text-xs text-muted-fg">
                Define the primary position title and disciplinary discipline.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  label="Role Title"
                  placeholder="e.g. Software Engineer Intern"
                  value={formData.role}
                  onChange={(e) => {
                    setFormData({ ...formData, role: e.target.value });
                    if (errors.role) setErrors((prev) => ({ ...prev, role: "" }));
                  }}
                  required
                />
                {errors.role && (
                  <p className="text-danger-fg text-xs mt-1 font-medium">{errors.role}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Academic Field / Industry Track"
                    placeholder="e.g. Computer Science, Media"
                    value={formData.field}
                    onChange={(e) => {
                      setFormData({ ...formData, field: e.target.value });
                      if (errors.field) setErrors((prev) => ({ ...prev, field: "" }));
                    }}
                    required
                  />
                  {errors.field && (
                    <p className="text-danger-fg text-xs mt-1 font-medium">{errors.field}</p>
                  )}
                </div>

                <div>
                  <Select
                    label="Workplace Arrangement"
                    options={categories}
                    value={formData.category}
                    onChange={(e) => {
                      setFormData({ ...formData, category: e.target.value });
                      if (errors.category) setErrors((prev) => ({ ...prev, category: "" }));
                    }}
                    required
                  />
                  {errors.category && (
                    <p className="text-danger-fg text-xs mt-1 font-medium">{errors.category}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Logistics & Compensation */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-medium text-xs">
                <MapPin className="w-4 h-4" />
                <span>SECTION 2</span>
              </div>
              <h3 className="text-base font-semibold text-fg">Location & Compensation</h3>
              <p className="text-xs text-muted-fg">
                Specify physical premises, duration, and monthly remuneration.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Location (City / Campus Area)"
                    placeholder="e.g. Victoria Island, Lagos or Remote"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                  {errors.location && (
                    <p className="text-danger-fg text-xs mt-1 font-medium">{errors.location}</p>
                  )}
                </div>

                <div>
                  <Input
                    label="Placement Duration"
                    placeholder="e.g. 3 Months / 6 Months (SIWES)"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                  />
                  {errors.duration && (
                    <p className="text-danger-fg text-xs mt-1 font-medium">{errors.duration}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Stipend / Compensation"
                    placeholder="e.g. ₦100,000/month or Competitive"
                    value={formData.stipend}
                    onChange={(e) =>
                      setFormData({ ...formData, stipend: e.target.value })
                    }
                  />
                  {errors.stipend && (
                    <p className="text-danger-fg text-xs mt-1 font-medium">{errors.stipend}</p>
                  )}
                </div>

                <div>
                  <Input
                    label="Open Positions / Slots"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.slots}
                    onChange={(e) =>
                      setFormData({ ...formData, slots: e.target.value })
                    }
                  />
                  {errors.slots && (
                    <p className="text-danger-fg text-xs mt-1 font-medium">{errors.slots}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Narrative & Requirements */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-medium text-xs">
                <FileText className="w-4 h-4" />
                <span>SECTION 3</span>
              </div>
              <h3 className="text-base font-semibold text-fg">Role Description & Requirements</h3>
              <p className="text-xs text-muted-fg">
                Detailed overview of expectations and student qualifications.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Textarea
                  label="Role Description"
                  placeholder="Describe the department, day-to-day project assignments, and mentorship provided (min 20 characters)..."
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
                  }}
                  rows={4}
                  required
                />
                {errors.description && (
                  <p className="text-danger-fg text-xs mt-1 font-medium">{errors.description}</p>
                )}
              </div>

              <div>
                <Textarea
                  label="Candidate Requirements"
                  placeholder="Key competencies, coursework, tools, and eligibility standards (min 10 characters)..."
                  value={formData.requirements}
                  onChange={(e) => {
                    setFormData({ ...formData, requirements: e.target.value });
                    if (errors.requirements) setErrors((prev) => ({ ...prev, requirements: "" }));
                  }}
                  rows={4}
                  required
                />
                {errors.requirements && (
                  <p className="text-danger-fg text-xs mt-1 font-medium">{errors.requirements}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Skills & Matching Keywords */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-medium text-xs">
                <Sparkles className="w-4 h-4" />
                <span>SECTION 4</span>
              </div>
              <h3 className="text-base font-semibold text-fg">Matching Keywords & Interests</h3>
              <p className="text-xs text-muted-fg">
                Tags power PAU InterConnect AI matching algorithms to surface relevant student profiles.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {interestsOptions.map((option) => {
                  const isSelected = interests.includes(option);
                  return (
                    <button
                      type="button"
                      key={option}
                      onClick={() => toggleInterest(option)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        isSelected
                          ? "bg-primary text-primary-fg border-primary shadow-xs"
                          : "bg-surface-raised text-muted-fg border-border hover:bg-canvas hover:text-fg"
                      }`}
                    >
                      {isSelected ? `✓ ${option}` : `+ ${option}`}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Timeline & Recruiter Link */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-medium text-xs">
                <Calendar className="w-4 h-4" />
                <span>SECTION 5</span>
              </div>
              <h3 className="text-base font-semibold text-fg">Application Timeline & Routing</h3>
              <p className="text-xs text-muted-fg">
                Application closure deadline and direct or external application routing.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Application Deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => {
                      setDeadline(e.target.value);
                      if (errors.deadline) setErrors((prev) => ({ ...prev, deadline: "" }));
                    }}
                  />
                  {errors.deadline && (
                    <p className="text-danger-fg text-xs mt-1 font-medium">{errors.deadline}</p>
                  )}
                </div>

                <div>
                  <Input
                    label="External Link (Optional)"
                    placeholder="https://company.com/apply"
                    value={formData.link}
                    onChange={(e) => {
                      setFormData({ ...formData, link: e.target.value });
                      if (errors.link) setErrors((prev) => ({ ...prev, link: "" }));
                    }}
                    helperText="Leave empty for direct applications via PAU InterConnect."
                  />
                  {errors.link && (
                    <p className="text-danger-fg text-xs mt-1 font-medium">{errors.link}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="py-3 text-sm font-medium flex-1"
              isLoading={loading}
              onClick={() => handlePost("draft")}
            >
              Save as Draft
            </Button>
            <Button
              className="py-3 text-sm font-medium flex-1 gap-2"
              isLoading={loading}
              onClick={() => handlePost("active")}
            >
              <Plus className="w-4 h-4" />
              Publish Internship
            </Button>
          </div>
        </div>

        {/* Right column: Live Student Card Preview */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Eye className="w-4 h-4 text-primary" />
              <span>Live Student Preview</span>
            </div>
            <span className="text-xs text-muted-fg font-medium">Card View</span>
          </div>

          <div className="border border-border bg-surface rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {formData.field || "Academic Track"}
                </span>
                <h3 className="font-semibold text-base text-fg leading-snug">
                  {formData.role || "Role Title Preview"}
                </h3>
                <p className="text-xs text-muted-fg font-medium">Your Company</p>
              </div>
              <Badge variant="neutral" className="shrink-0 text-xs">
                {formData.category}
              </Badge>
            </div>

            <p className="text-xs text-muted-fg line-clamp-3">
              {formData.description ||
                "Role description preview will appear here as you type. Provide clear expectations and responsibilities for student applicants."}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-fg pt-1">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-fg" />
                <span className="truncate">{formData.location || "Location pending"}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Clock className="w-3.5 h-3.5 shrink-0 text-muted-fg" />
                <span className="truncate">{formData.duration || "Duration TBD"}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <DollarSign className="w-3.5 h-3.5 shrink-0 text-muted-fg" />
                <span className="truncate">{formData.stipend || "Stipend competitive"}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-fg" />
                <span className="truncate">
                  {deadline ? `Deadline: ${deadline}` : "Open rolling"}
                </span>
              </div>
            </div>

            {interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {interests.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-raised border border-border text-fg"
                  >
                    {tag}
                  </span>
                ))}
                {interests.length > 4 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-muted-fg">
                    +{interests.length - 4} more
                  </span>
                )}
              </div>
            )}

            <div className="border-t border-border pt-4 flex items-center justify-between">
              <span className="text-xs text-muted-fg">
                {formData.slots || "1"} slot{formData.slots === "1" ? "" : "s"} open
              </span>
              <Button size="sm" variant="outline" className="pointer-events-none text-xs">
                View & Apply
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-raised/40 text-xs text-muted-fg space-y-2">
            <div className="font-semibold text-fg flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success-fg" />
              <span>Posting Checklist</span>
            </div>
            <ul className="space-y-1 list-disc list-inside">
              <li>Role title matches official student SIWES designations.</li>
              <li>Provide transparent compensation expectations.</li>
              <li>Add relevant skills for automated AI matching.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Template Chooser Modal */}
      <Modal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title="Saved Templates"
      >
        <p className="text-xs text-muted-fg mb-4">Select a template to quickly prefill role details.</p>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {templates.map((t) => (
            <div
              key={t.id}
              className="p-3.5 rounded-lg border border-border bg-surface hover:bg-canvas transition-colors flex items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="font-medium text-sm text-fg">{t.name}</div>
                <div className="text-xs text-muted-fg">
                  {t.role || "Untitled"} &bull; {t.category || "Any"} &bull; {t.field || "Any field"}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyTemplate(t)}
              >
                Use
              </Button>
            </div>
          ))}
        </div>
      </Modal>

      {/* Save Template Modal */}
      <Modal
        isOpen={saveTemplateModalOpen}
        onClose={() => setSaveTemplateModalOpen(false)}
        title="Save Current Form as Template"
      >
        <p className="text-xs text-muted-fg mb-4">Templates allow you to rapidly reuse role titles, requirements, and keywords for recurring recruiting cycles.</p>
        <form onSubmit={handleSaveAsTemplate} className="space-y-4">
          <Input
            label="Template Name"
            placeholder="e.g. Summer Software Intern Template"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSaveTemplateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={savingTemplate}>
              Save Template
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

