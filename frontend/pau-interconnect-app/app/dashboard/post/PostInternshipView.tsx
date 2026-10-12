"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Typography,
  Stack,
  Button,
  Input,
  Textarea,
  Select,
} from "@/components/ui";
import {
  FiBriefcase,
  FiPlus,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
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
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const handlePost = async (publishStatus: "active" | "draft" = "active") => {
    setLoading(true);
    setStatus(null);
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

      setStatus({
        type: "success",
        message:
          publishStatus === "draft"
            ? "Internship saved as draft!"
            : "Internship posted successfully!",
      });

      // Clear form
      setFormData({
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
      setInterests([]);
      setDeadline("");

      router.refresh();
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to post internship",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="bg-white rounded-[32px] shadow-2xl shadow-indigo-50/50 border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-white px-10 py-8 border-b border-slate-100 flex items-center justify-between">
          <Stack direction="row" align="center" spacing={4}>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <FiBriefcase className="w-6 h-6" />
            </div>
            <div>
              <Typography variant="h3" weight="bold">
                Post New Internship
              </Typography>
              <Typography variant="body2" color="muted">
                Reach talented students across Pan-Atlantic University
              </Typography>
            </div>
          </Stack>
        </div>

        <div className="p-10 space-y-8">
          {status && (
            <div
              className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${
                status.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-rose-50 text-rose-700 border border-rose-100"
              }`}
            >
              {status.type === "success" ? (
                <FiCheckCircle className="w-5 h-5" />
              ) : (
                <FiAlertCircle className="w-5 h-5" />
              )}
              <Typography variant="body2" weight="bold">
                {status.message}
              </Typography>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Role Title"
                placeholder="e.g. Software Engineer Intern"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                required
              />
              {errors.role && (
                <p className="text-red-500 text-xs mt-1">{errors.role}</p>
              )}
            </div>

            <div>
              <Input
                label="Field of Study"
                placeholder="e.g. Computer Science"
                value={formData.field}
                onChange={(e) =>
                  setFormData({ ...formData, field: e.target.value })
                }
                required
              />
              {errors.field && (
                <p className="text-red-500 text-xs mt-1">{errors.field}</p>
              )}
            </div>

            <div>
              <Select
                label="Workplace Category"
                options={categories}
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                required
              />
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category}</p>
              )}
            </div>

            <div>
              <Input
                label="Location"
                placeholder="e.g. Ibeju-Lekki, Lagos / Remote"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>

            <div>
              <Input
                label="Duration"
                placeholder="e.g. 3 months, 6 months"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: e.target.value })
                }
              />
            </div>

            <div>
              <Input
                label="Stipend / Compensation"
                placeholder="e.g. ₦100,000/month or Competitive"
                value={formData.stipend}
                onChange={(e) =>
                  setFormData({ ...formData, stipend: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Textarea
              label="Job Description"
              placeholder="Describe the role, responsibilities, and department..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              required
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <Textarea
              label="Requirements"
              placeholder="List qualifications, skills, and tools required..."
              value={formData.requirements}
              onChange={(e) =>
                setFormData({ ...formData, requirements: e.target.value })
              }
              rows={4}
              required
            />
            {errors.requirements && (
              <p className="text-red-500 text-xs mt-1">{errors.requirements}</p>
            )}
          </div>

          <div className="space-y-4">
            <Typography
              variant="body2"
              weight="bold"
              className="text-slate-700 ml-1"
            >
              Related Interests & Tags
            </Typography>
            <div className="flex flex-wrap gap-2">
              {interestsOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => toggleInterest(option)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                    interests.includes(option)
                      ? "bg-brand text-white shadow-lg shadow-brand/20 ring-2 ring-brand ring-offset-2"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <Input
                label="Application Deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              {errors.deadline && (
                <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>
              )}
            </div>

            <div>
              <Input
                label="Recruiter Link (Optional)"
                placeholder="https://..."
                value={formData.link}
                onChange={(e) =>
                  setFormData({ ...formData, link: e.target.value })
                }
              />
              {errors.link && (
                <p className="text-red-500 text-xs mt-1">{errors.link}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              variant="outline"
              className="py-4 rounded-2xl text-base font-bold flex-1"
              isLoading={loading}
              onClick={() => handlePost("draft")}
            >
              Save as Draft
            </Button>
            <Button
              className="py-4 rounded-2xl text-base font-bold shadow-xl shadow-brand/20 flex-1"
              isLoading={loading}
              onClick={() => handlePost("active")}
              leftIcon={<FiPlus className="w-5 h-5" />}
            >
              Publish Internship
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
