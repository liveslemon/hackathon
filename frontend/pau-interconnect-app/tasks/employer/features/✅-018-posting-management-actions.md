# NEW FEATURE: Posting Management Actions (Edit, Close, Clone)

## Priority: 🟡 MEDIUM

## Effort: Medium (3-4 hours)

## Overview

Employers currently cannot edit, close, reopen, clone, or delete their postings after creation. This task adds full lifecycle management.

## Implementation

### 1. Edit Posting Page: `app/dashboard/employer/internships/[id]/edit/page.tsx`

```tsx
import { getSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import EditInternshipClient from "./EditClient";

export default async function EditInternshipPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/employer");

  const { data: internship } = await supabase
    .from("internships")
    .select("*")
    .eq("id", params.id)
    .eq("employer_id", user.id)
    .single();

  if (!internship) redirect("/dashboard/employer/internships");

  return <EditInternshipClient internship={internship} />;
}
```

### 2. Edit Client Component: `app/dashboard/employer/internships/[id]/edit/EditClient.tsx`

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Select,
  Textarea,
  Stack,
  Typography,
} from "@/components/ui";

export default function EditInternshipClient({ internship }) {
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
            .map((t) => t.trim())
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
      {/* Same form fields as post modal — reuse or extract a shared component */}
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
        {/* ... all other fields ... */}
      </Stack>
      <div className="flex gap-3">
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
```

### 3. API Route for PATCH/DELETE: `app/api/internships/[id]/route.ts`

```tsx
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: existing } = await supabase
    .from("internships")
    .select("employer_id")
    .eq("id", params.id)
    .single();

  if (!existing || existing.employer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  // Remove fields that shouldn't be directly updated
  const { id, employer_id, company, created_at, ...updateData } = body;

  const { error } = await supabase
    .from("internships")
    .update(updateData)
    .eq("id", params.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("internships")
    .select("employer_id")
    .eq("id", params.id)
    .single();

  if (!existing || existing.employer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft delete (set status to 'deleted') or hard delete
  const { error } = await supabase
    .from("internships")
    .update({ status: "deleted" })
    .eq("id", params.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

### 4. Status Toggle API: `app/api/internships/[id]/status/route.ts`

```tsx
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();
  if (!["active", "closed", "draft"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("internships")
    .select("employer_id")
    .eq("id", params.id)
    .single();

  if (!existing || existing.employer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("internships")
    .update({ status })
    .eq("id", params.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, status });
}
```

### 5. Clone Functionality (Client-Side)

In the postings list, clone pre-fills the create modal:

```tsx
const handleClone = (internship: EmployerInternship) => {
  // Open the post modal with data from the existing posting
  setCloneData({
    role: `${internship.role} (Copy)`,
    field: internship.field,
    category: internship.category,
    description: internship.description,
    requirements: internship.requirements,
    tags: internship.interests?.join(", ") || "",
    deadline: "", // Don't clone deadline
    link: internship.recruiter_link || "",
  });
  setShowPostModal(true);
};
```

## Integration with Other Roles

- **Student**: Closed postings disappear from search; students with pending applications on closed postings see "Position Closed" status
- **Admin**: Admin can see all statuses; can override and reopen closed postings
- **Notifications**: When a posting is closed, pending applicants could be notified

## Acceptance Criteria

- [ ] Edit page loads with current posting data pre-filled
- [ ] PATCH API validates ownership and updates posting
- [ ] DELETE API soft-deletes (sets status to 'deleted')
- [ ] Status toggle (active ↔ closed) works from listing page
- [ ] Clone opens create modal with pre-filled data (minus deadline)
- [ ] Closed postings don't appear in student search
- [ ] Confirmation dialog before delete
- [ ] Edit preserves existing applications (no cascade delete)
- [ ] All actions require employer ownership verification


STATUS: COMPLETE
