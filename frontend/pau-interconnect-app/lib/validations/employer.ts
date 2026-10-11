import { z } from "zod";

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
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  status: z.enum(["active", "draft"]).optional().default("active"),
});

export const companySettingsSchema = z.object({
  company_website: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  company_logo_url: z.string().url().optional().or(z.literal("")),
  company_banner_url: z.string().url().optional().or(z.literal("")),
  industry: z.string().min(2).max(100).optional().or(z.literal("")),
  company_description: z
    .string()
    .min(15, "Description must be at least 15 characters")
    .max(2000)
    .optional()
    .or(z.literal("")),
  culture: z
    .string()
    .min(10, "Culture section must be at least 10 characters")
    .max(2000)
    .optional()
    .or(z.literal("")),
});

export type PostInternshipInput = z.infer<typeof postInternshipSchema>;
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
