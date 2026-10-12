import { z } from "zod";

function isValidWebUrl(val: string): boolean {
  if (!val || !val.trim()) return true;
  const trimmed = val.trim();
  if (/\s/.test(trimmed)) return false;
  try {
    const candidate =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return Boolean(url.hostname && (url.hostname.includes(".") || url.hostname === "localhost"));
  } catch {
    return false;
  }
}

export const postInternshipSchema = z.object({
  role: z.string().trim().min(3, "Role must be at least 3 characters").max(100),
  field: z.string().trim().min(2, "Field is required").max(100),
  category: z.enum(["Remote", "Hybrid", "On-site"]),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(5000),
  requirements: z
    .string()
    .trim()
    .min(10, "Requirements must be at least 10 characters")
    .max(3000),
  tags: z.string().max(500).optional().default(""),
  location: z.string().max(200).optional().default(""),
  duration: z.string().max(100).optional().default(""),
  stipend: z.string().max(100).optional().default(""),
  required_skills: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .default(""),
  slots: z
    .union([z.number(), z.string()])
    .optional()
    .default(1)
    .transform((val) => {
      const parsed = typeof val === "string" ? parseInt(val, 10) : val;
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  deadline: z
    .string()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        const time = Date.parse(val);
        return !isNaN(time);
      },
      { message: "Invalid deadline date format" },
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  link: z
    .string()
    .refine((val) => !val || isValidWebUrl(val), {
      message: "Must be a valid URL",
    })
    .optional()
    .or(z.literal("")),
  status: z.enum(["active", "draft"]).optional().default("active"),
});

export const updateInternshipSchema = z.object({
  role: z.string().trim().min(3).max(100).optional(),
  field: z.string().trim().min(2).max(100).optional(),
  category: z.enum(["Remote", "Hybrid", "On-site"]).optional(),
  description: z.string().trim().min(20).max(5000).optional(),
  requirements: z.string().trim().min(10).max(3000).optional(),
  tags: z.string().max(500).optional(),
  interests: z.array(z.string()).optional(),
  location: z.string().max(200).optional().nullable(),
  duration: z.string().max(100).optional().nullable(),
  stipend: z.string().max(100).optional().nullable(),
  required_skills: z.union([z.string(), z.array(z.string())]).optional(),
  slots: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      const parsed = typeof val === "string" ? parseInt(val, 10) : val;
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  deadline: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid deadline date format",
    })
    .optional()
    .nullable()
    .or(z.literal("")),
  recruiter_link: z.string().url().optional().nullable().or(z.literal("")),
  link: z.string().url().optional().nullable().or(z.literal("")),
  status: z.enum(["active", "draft", "closed", "expired"]).optional(),
});

export const internshipTemplateSchema = z.object({
  name: z.string().trim().min(2, "Template name must be at least 2 characters").max(100),
  role: z.string().max(100).optional().default(""),
  field: z.string().max(100).optional().default(""),
  category: z.string().max(50).optional().default(""),
  description: z.string().max(5000).optional().default(""),
  requirements: z.string().max(3000).optional().default(""),
  tags: z.union([z.string(), z.array(z.string())]).optional().default([]),
  location: z.string().max(200).optional().default(""),
  duration: z.string().max(100).optional().default(""),
  stipend: z.string().max(100).optional().default(""),
  recruiter_link: z.string().max(500).optional().nullable().or(z.literal("")),
});

export const messageInputSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(5000, "Message cannot exceed 5000 characters"),
});

export const applicationStageUpdateSchema = z.object({
  stage: z.enum([
    "applied",
    "reviewed",
    "shortlisted",
    "interview",
    "offered",
    "accepted",
    "rejected",
    "withdrawn",
  ]),
  notes: z.string().max(2000).optional().nullable(),
});

export const applicationStatusUpdateSchema = z.object({
  status: z.enum(["pending", "accepted", "rejected"]),
  decision_notes: z.string().max(2000).optional().nullable(),
});

export const employerNotificationPrefsSchema = z.object({
  email_new_applicant: z.boolean().default(true),
  email_logbook_submitted: z.boolean().default(true),
  email_deadline_reminder: z.boolean().default(true),
});

export const companySettingsSchema = z.object({
  company_name: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must not exceed 100 characters")
    .optional()
    .or(z.literal("")),
  company_website: z
    .string()
    .refine((val) => !val || isValidWebUrl(val), {
      message: "Must be a valid website URL",
    })
    .optional()
    .or(z.literal("")),
  company_logo_url: z
    .string()
    .refine((val) => !val || isValidWebUrl(val), {
      message: "Must be a valid image URL",
    })
    .optional()
    .or(z.literal("")),
  company_banner_url: z
    .string()
    .refine((val) => !val || isValidWebUrl(val), {
      message: "Must be a valid banner image URL",
    })
    .optional()
    .or(z.literal("")),
  industry: z
    .string()
    .min(2, "Industry must be at least 2 characters")
    .max(100, "Industry must not exceed 100 characters")
    .optional()
    .or(z.literal("")),
  company_description: z
    .string()
    .min(15, "Description must be at least 15 characters")
    .max(5000, "Description must not exceed 5000 characters")
    .optional()
    .or(z.literal("")),
  culture: z
    .string()
    .min(10, "Culture section must be at least 10 characters")
    .max(3000, "Culture section must not exceed 3000 characters")
    .optional()
    .or(z.literal("")),
  notification_preferences: employerNotificationPrefsSchema.optional(),
});

export type PostInternshipInput = z.infer<typeof postInternshipSchema>;
export type UpdateInternshipInput = z.infer<typeof updateInternshipSchema>;
export type InternshipTemplateInput = z.infer<typeof internshipTemplateSchema>;
export type MessageInput = z.infer<typeof messageInputSchema>;
export type ApplicationStageUpdateInput = z.infer<typeof applicationStageUpdateSchema>;
export type ApplicationStatusUpdateInput = z.infer<typeof applicationStatusUpdateSchema>;
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
export type EmployerNotificationPrefs = z.infer<typeof employerNotificationPrefsSchema>;
