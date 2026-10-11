# BUG FIX: Add Server-Side Validation to Employer Forms

## Priority: 🟠 HIGH

## Effort: Medium (2-3 hours)

## Problem

All employer forms (post internship, settings, onboarding) only validate on the client. A malicious user can bypass the frontend and submit invalid/dangerous data directly to the API or Supabase.

## Files to Modify/Create

### 1. Create validation schema: `lib/validations/employer.ts`

```tsx
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
  deadline: z.string().datetime().optional().nullable(),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
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
```

### 2. Add API route for posting internships: `app/api/internships/post/route.ts`

Instead of inserting directly from the client to Supabase, create a server-side API route:

```tsx
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { postInternshipSchema } from "@/lib/validations/employer";

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify employer role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "employer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate input
  const body = await req.json();
  const parsed = postInternshipSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const {
    role,
    field,
    category,
    description,
    requirements,
    tags,
    deadline,
    link,
  } = parsed.data;

  const { data, error } = await supabase
    .from("internships")
    .insert([
      {
        employer_id: user.id,
        company: profile.company_name,
        role,
        field,
        category,
        description,
        requirements,
        interests: tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        deadline: deadline ? new Date(deadline).toISOString() : null,
        recruiter_link: link || null,
      },
    ])
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}
```

### 3. Update client to use API route: `app/dashboard/employer/EmployerClient.tsx`

Replace direct Supabase insert with fetch to the API route:

```tsx
const handleCreate = async () => {
  setCreating(true);
  try {
    const res = await fetch("/api/internships/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const result = await res.json();
    if (!res.ok) {
      if (result.details) {
        // Show field-level errors
        const errorMsg = Object.entries(result.details)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
          .join("\n");
        alert(errorMsg);
      } else {
        throw new Error(result.error || "Failed to create internship");
      }
      return;
    }

    setIsOpen(false);
    router.refresh(); // Use Next.js refresh instead of window.location.reload()
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : "Failed to create internship");
  } finally {
    setCreating(false);
  }
};
```

### 4. Add client-side validation feedback (optional but recommended)

Add inline error messages under each field in the modal form:

```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

// Before submitting, validate client-side for instant feedback:
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
```

## Acceptance Criteria

- [ ] `lib/validations/employer.ts` created with Zod schemas for all employer forms
- [ ] New API route `app/api/internships/post/route.ts` validates input server-side
- [ ] API route verifies user is authenticated AND has employer role
- [ ] Client no longer inserts directly to Supabase `internships` table
- [ ] Field-level validation errors shown to user
- [ ] `window.location.reload()` replaced with `router.refresh()`
- [ ] Malformed input (empty strings, XSS payloads, oversized text) rejected by server
- [ ] Same validation schema shared between client and server


STATUS: COMPLETE
