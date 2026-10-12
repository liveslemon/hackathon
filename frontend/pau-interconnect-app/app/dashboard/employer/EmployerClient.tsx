"use client";
import React, { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  Stack,
  Typography,
} from "@/components/ui";
import { postInternshipSchema } from "@/lib/validations/employer";

interface EmployerProfile {
  id: string;
  company_name: string;
}

export function PostInternshipButton({
  employerProfile: _employerProfile,
  trigger,
}: {
  employerProfile: EmployerProfile;
  trigger?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const [formData, setFormData] = useState({
    role: "",
    field: "",
    category: "",
    description: "",
    requirements: "",
    tags: "",
    deadline: "",
    link: "",
  });

  const categories = [
    { value: "Remote", label: "Remote" },
    { value: "Hybrid", label: "Hybrid" },
    { value: "On-site", label: "On-site" },
  ];

  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  React.useEffect(() => {
    fetch("/api/internships/templates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(console.error);
  }, []);

  const handleCreate = async (status: "active" | "draft" = "active") => {
    setErrors({});
    // Allow empty validation if draft
    if (status === "active") {
      const clientValidation = postInternshipSchema.safeParse(formData);
      if (!clientValidation.success) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(
          clientValidation.error.flatten().fieldErrors,
        )) {
          fieldErrors[key] = (msgs as string[])[0];
        }
        setErrors(fieldErrors);
        return;
      }
    }

    setCreating(true);
    try {
      const res = await fetch("/api/internships/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, status }),
      });

      const result = await res.json();
      if (!res.ok) {
        if (result.details) {
          const errorMsg = Object.entries(result.details)
            .map(
              ([field, msgs]) => `${field}: ${(msgs as string[])?.join(", ")}`,
            )
            .join("\n");
          toast.error(errorMsg);
        } else {
          throw new Error(result.error || "Failed to create internship");
        }
        return;
      }

      toast.success(status === "draft" ? "Draft saved successfully" : "Internship published successfully");
      setIsOpen(false);
      setFormData({
        role: "",
        field: "",
        category: "",
        description: "",
        requirements: "",
        tags: "",
        deadline: "",
        link: "",
      });
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create internship");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          leftIcon={<FiPlus className="w-5 h-5" />}
        >
          Post Internship
        </Button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create New Internship"
        size="lg"
        footer={
          !showTemplatePicker && (
            <div className="flex gap-2 w-full justify-between items-center">
              <div>
                {templates.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowTemplatePicker(true)}
                  >
                    Use Template
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCreate("draft")}
                  isLoading={creating}
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleCreate("active")}
                  isLoading={creating}
                >
                  Publish
                </Button>
              </div>
            </div>
          )
        }
      >
        {showTemplatePicker ? (
          <div className="space-y-3">
            <Typography variant="h4">Choose a Template</Typography>
            <button
              onClick={() => {
                setShowTemplatePicker(false);
                setFormData({ ...formData });
              }}
              className="w-full p-4 border-2 border-dashed border-border rounded-xl text-center hover:border-brand hover:bg-brand-subtle transition-colors text-fg"
            >
              Start from scratch
            </button>
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  setFormData({
                    role: template.role || "",
                    field: template.field || "",
                    category: template.category || "",
                    description: template.description || "",
                    requirements: template.requirements || "",
                    tags: template.tags?.join(", ") || "",
                    deadline: "",
                    link: template.recruiter_link || "",
                  });
                  setShowTemplatePicker(false);
                }}
                className="w-full p-4 border border-border rounded-xl text-left hover:border-brand hover:bg-brand-subtle transition-colors"
              >
                <Typography variant="body2" weight="bold">
                  {template.name}
                </Typography>
                <Typography variant="caption" color="muted">
                  {template.role} · {template.category}
                </Typography>
              </button>
            ))}
          </div>
        ) : (
          <Stack spacing={6}>
            <div>
              <Input
                label="Job Role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                placeholder="e.g. UX Intern"
              />
              {errors.role && (
                <p className="text-danger-fg text-xs mt-1">{errors.role}</p>
              )}
            </div>

            <div>
              <Input
                label="Field"
                value={formData.field}
                onChange={(e) =>
                  setFormData({ ...formData, field: e.target.value })
                }
                placeholder="e.g. Engineering, Design"
              />
              {errors.field && (
                <p className="text-danger-fg text-xs mt-1">{errors.field}</p>
              )}
            </div>

            <div>
              <Select
                label="Category"
                options={categories}
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
              {errors.category && (
                <p className="text-danger-fg text-xs mt-1">{errors.category}</p>
              )}
            </div>

            <div>
              <Textarea
                label="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
              />
              {errors.description && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.description}
                </p>
              )}
            </div>

            <div>
              <Textarea
                label="Requirements"
                value={formData.requirements}
                onChange={(e) =>
                  setFormData({ ...formData, requirements: e.target.value })
                }
                rows={4}
              />
              {errors.requirements && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.requirements}
                </p>
              )}
            </div>

            <div>
              <Input
                label="Tags (comma separated)"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="React, Figma"
              />
              {errors.tags && (
                <p className="text-danger-fg text-xs mt-1">{errors.tags}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) =>
                    setFormData({ ...formData, deadline: e.target.value })
                  }
                />
                {errors.deadline && (
                  <p className="text-danger-fg text-xs mt-1">{errors.deadline}</p>
                )}
              </div>
              <div>
                <Input
                  label="Application Link (optional)"
                  type="url"
                  value={formData.link}
                  onChange={(e) =>
                    setFormData({ ...formData, link: e.target.value })
                  }
                  placeholder="https://..."
                />
                {errors.link && (
                  <p className="text-danger-fg text-xs mt-1">{errors.link}</p>
                )}
              </div>
            </div>
          </Stack>
        )}
      </Modal>
    </>
  );
}
