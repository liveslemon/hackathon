import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_BACKEND_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_AUTH_SIGNUP_REDIRECT_URL: z.string().url().optional(),
});

const parsed = EnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_AUTH_SIGNUP_REDIRECT_URL:
    process.env.NEXT_PUBLIC_AUTH_SIGNUP_REDIRECT_URL,
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
    };

export function getSignupRedirectUrl(): string | undefined {
  return env.NEXT_PUBLIC_AUTH_SIGNUP_REDIRECT_URL;
}

export function getBackendUrl(): string {
  if (env.NEXT_PUBLIC_BACKEND_URL) return env.NEXT_PUBLIC_BACKEND_URL;
  return env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://pau-interconnect-backend.onrender.com";
}

export function validateCriticalEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return {
    valid: missing.length === 0,
    missing,
  };
}
