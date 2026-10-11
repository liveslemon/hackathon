"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Select,
  Textarea,
  Stack,
  Typography,
} from "@/components/ui";

export default function EditInternshipClient({
  internship,
}: {
  internship: any;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    role: internship.role || "",
    field: internship.field || "",
    category: internship.category || "",
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/internships/${internship.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          interests: formData.tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean),
          deadline: formData.deadline
            ? new Date(formData.deadline).toISOString()
            : null,
          recruiter_link: formData.link || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      router.push("/dashboard/employer/internships");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Typography variant="h3">Edit: {internship.role}</Typography>
      <Stack spacing={4}>
        <Input
          label="Role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
        />
        <Input
          label="Field"
          value={formData.field}
          onChange={(e) => setFormData({ ...formData, field: e.target.value })}
        />
        <Select
          label="Category"
          options={categories}
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
        />
        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={4}
        />
        <Textarea
          label="Requirements"
          value={formData.requirements}
          onChange={(e) =>
            setFormData({ ...formData, requirements: e.target.value })
          }
          rows={4}
        />
        <Input
          label="Tags (comma separated)"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="React, Figma"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Deadline"
            type="date"
            value={formData.deadline}
            onChange={(e) =>
              setFormData({ ...formData, deadline: e.target.value })
            }
          />
          <Input
            label="Application Link (optional)"
            type="url"
            value={formData.link}
            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </Stack>
      <div className="flex gap-3 pt-4">
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} isLoading={saving}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
