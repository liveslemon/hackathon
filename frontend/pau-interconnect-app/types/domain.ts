export type UserRole = "student" | "employer" | "admin";

export type ApplicationStatus =
  | "pending"
  | "applied"
  | "accepted"
  | "rejected"
  | "submitted"
  | "approved"
  | "denied";

export interface Profile {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: UserRole | null;
  interests?: string[] | string | null;
  course_of_study?: string | null;
  is_admin?: boolean | null;
  company_name?: string | null;
  avatar_url?: string | null;
}

export interface Internship {
  id: string;
  company: string;
  role: string;
  location: string;
  field?: string | null;
  category?: string | null;
  description?: string | null;
  deadline?: string | null;
  interests?: string[] | string | null;
  matchPercentage?: number;
  applicationStatus?: ApplicationStatus | string | null;
  imageUrl?: string | null;
  poster_id?: string | null;
}

export interface LogbookEntry {
  id?: string;
  student_id: string;
  internship_id?: string | null;
  date: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthSessionLike {
  access_token?: string;
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === "string",
        );
      }
    } catch {
      return [];
    }
  }

  return [];
}
