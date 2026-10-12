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
  role: z.string().min(3, "Role must be at least 3 characters").max(100),
  field: z.string().min(2, "Field is required").max(100),
  category: z.enum(["Remote", "Hybrid", "On-site"]),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000),
  requirements: z
    .string()
    .min(10, "Requirements must be at least 10 characters")
    .max(3000),
  tags: z.string().max(500).optional(),
  deadline: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid date",
    })
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
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
export type EmployerNotificationPrefs = z.infer<typeof employerNotificationPrefsSchema>;

