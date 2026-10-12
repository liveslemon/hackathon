"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Input,
  Select,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  PageHeader,
} from "@/components/ui";
import { toast } from "sonner";
import { ArrowLeft, Save, Briefcase } from "lucide-react";



interface InternshipRecord {
  id: string;
  role?: string;
  field?: string;
  category?: string;
  description?: string;
  requirements?: string;
  interests?: string[];
  deadline?: string | null;
  recruiter_link?: string | null;
  location?: string | null;
  duration?: string | null;
  stipend?: string | null;
  status?: string;
}

export default function EditInternshipClient({
  internship,
}: {
  internship: InternshipRecord;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    role: internship.role || "",
    field: internship.field || "",
    category: internship.category || "Remote",
    description: internship.description || "",
    requirements: internship.requirements || "",
    tags: (internship.interests || []).join(", "),
    deadline: internship.deadline ? internship.deadline.split("T")[0] : "",
    link: internship.recruiter_link || "",
    location: internship.location || "",
    duration: internship.duration || "",
    stipend: internship.stipend || "",
  });

  const categories = [
    { value: "Remote", label: "Remote" },
    { value: "Hybrid", label: "Hybrid" },
    { value: "On-site", label: "On-site" },
  ];

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.role.trim()) {
      toast.error("Role title is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/internships/${internship.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: formData.role.trim(),
          field: formData.field.trim(),
          category: formData.category,
          description: formData.description.trim(),
          requirements: formData.requirements.trim(),
          location: formData.location.trim() || null,
          duration: formData.duration.trim() || null,
          stipend: formData.stipend.trim() || null,
          interests: formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          deadline: formData.deadline
            ? new Date(formData.deadline).toISOString()
            : null,
          recruiter_link: formData.link.trim() || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to update internship");
      }

      toast.success("Internship updated successfully");
      router.push(`/dashboard/employer/internships/${internship.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update internship");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageHeader
        title={`Edit ${internship.role || "Internship"}`}
        description="Update role requirements, location type, deadline, and application details."
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/employer/internships/${internship.id}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Role
              </Button>
            </Link>
            <Button
              onClick={handleSave}
              isLoading={saving}
              size="sm"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary font-medium text-sm">
              <Briefcase className="w-4 h-4" />
              <span>Core Role Details</span>
            </div>
            <h3 className="text-base font-semibold text-fg">Role Identity & Track</h3>
            <p className="text-xs text-muted-fg">
              Define the role title, primary academic/professional track, and work arrangement.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Role Title"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
                placeholder="e.g. Software Engineering Intern"
              />
              <Input
                label="Track / Industry Field"
                value={formData.field}
                onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                placeholder="e.g. Software Engineering, FinTech"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Workplace Arrangement"
                options={categories}
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
              <Input
                label="Location (City / Campus Area)"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="e.g. Victoria Island, Lagos or Remote"
              />
            </div>
          </CardContent>
        </Card>

        {/* Narrative & Requirements */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-fg">Description & Expectations</h3>
            <p className="text-xs text-muted-fg">
              Detail key responsibilities, daily work, and prerequisites for student candidates.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              label="Role Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={5}
              placeholder="Provide a comprehensive summary of project responsibilities..."
            />
            <Textarea
              label="Candidate Requirements"
              value={formData.requirements}
              onChange={(e) =>
                setFormData({ ...formData, requirements: e.target.value })
              }
              rows={4}
              placeholder="Key skills, coursework, or technical stacks required..."
            />
            <Input
              label="Skills & Tags (comma separated)"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="React, TypeScript, Figma, SQL"
              helperText="These keywords are used directly by the PAU matching engine."
            />
          </CardContent>
        </Card>

        {/* Logistics & Compensation */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-fg">Logistics & Compensation</h3>
            <p className="text-xs text-muted-fg">
              Timeline, duration, stipend arrangement, and external application routing.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Duration"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: e.target.value })
                }
                placeholder="e.g. 3 Months / 6 Months (SIWES)"
              />
              <Input
                label="Stipend / Compensation"
                value={formData.stipend}
                onChange={(e) =>
                  setFormData({ ...formData, stipend: e.target.value })
                }
                placeholder="e.g. ₦100,000 / month or Competitive"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Application Deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
              />
              <Input
                label="External Recruiter Link (optional)"
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://company.careers/job/123"
                helperText="Leave blank if applicants apply directly through PAU InterConnect."
              />
            </div>
          </CardContent>
        </Card>

        {/* Action bar */}
        <div className="flex items-center justify-between pt-2">
          <Link href={`/dashboard/employer/internships/${internship.id}`}>
            <Button variant="ghost" type="button">
              Discard Changes
            </Button>
          </Link>
          <Button type="submit" isLoading={saving} className="gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

