import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_BACKEND_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_AUTH_SIGNUP_REDIRECT_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  BREVO_API_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
});

const parsed = EnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_AUTH_SIGNUP_REDIRECT_URL:
    process.env.NEXT_PUBLIC_AUTH_SIGNUP_REDIRECT_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
});

export type AppEnv = z.infer<typeof EnvSchema>;

export const env: AppEnv = parsed.success
  ? parsed.data
  : {
      NODE_ENV: (process.env.NODE_ENV as AppEnv["NODE_ENV"]) || "development",
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_AUTH_SIGNUP_REDIRECT_URL:
        process.env.NEXT_PUBLIC_AUTH_SIGNUP_REDIRECT_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      BREVO_API_KEY: process.env.BREVO_API_KEY,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
      EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
    };

export function getSignupRedirectUrl(): string | undefined {
  return env.NEXT_PUBLIC_AUTH_SIGNUP_REDIRECT_URL;
}

/**
 * Public URL of the site, for links in emails. NEXT_PUBLIC_APP_URL wins;
 * otherwise Vercel's own production domain (set automatically on Vercel).
 */
export function getAppUrl(): string {
  const explicit = env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://interconnect-ten.vercel.app";
}

export function getBackendUrl(): string {
  // Strip trailing slashes so `${url}${path}` never yields "//path".
  const rawUrl = env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (rawUrl) return rawUrl.replace(/\/+$/, "");
  return env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://pau-interconnect-backend.onrender.com";
}

export function validateCriticalEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return {
    valid: missing.length === 0,
    missing,
  };
}
