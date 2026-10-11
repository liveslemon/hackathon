# NEW FEATURE: Data Export (Applicants)

## Priority: 🟢 LOW

## Effort: Low (2 hours)

## Overview

Allow employers to export their applicant data as CSV for use in external tools, HR systems, or record-keeping.

## Implementation

### 1. Export Button in Applicant Review Page

Add an "Export" button in `ApplicantReviewClient.tsx`:

```tsx
<Button variant="outline" size="sm" onClick={handleExport}>
  <Download className="w-4 h-4 mr-1" /> Export CSV
</Button>
```

### 2. Client-Side CSV Generation

For small datasets, generate CSV directly in the browser:

```tsx
const handleExport = () => {
  const headers = [
    "Name",
    "Email",
    "Course",
    "Level",
    "Match Score",
    "Status",
    "Stage",
    "Applied Date",
    "Cover Letter",
  ];
  const rows = filteredApplicants.map((app) => [
    app.profiles?.full_name || "",
    app.profiles?.email || "",
    app.profiles?.course || "",
    app.profiles?.level || "",
    String(app.match_score || 0),
    app.status || "pending",
    app.stage || "applied",
    app.created_at || "",
    (app.cover_letter || "").replace(/,/g, ";").replace(/\n/g, " "),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `applicants-${internship?.role || "export"}-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
```

### 3. Server-Side Export for Large Datasets (Optional)

API route `app/api/internships/[id]/export/route.ts`:

```tsx
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(
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
  const { data: internship } = await supabase
    .from("internships")
    .select("employer_id, role")
    .eq("id", params.id)
    .single();

  if (!internship || internship.employer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all applicants
  const { data: applicants } = await supabase
    .from("applied_internships")
    .select("*, profiles!student_id(full_name, email, course, level)")
    .eq("internship_id", params.id)
    .order("created_at", { ascending: false });

  // Generate CSV
  const headers =
    "Name,Email,Course,Level,Match Score,Status,Stage,Applied Date\n";
  const rows = (applicants || [])
    .map(
      (app) =>
        `"${app.profiles?.full_name || ""}","${app.profiles?.email || ""}","${app.profiles?.course || ""}","${app.profiles?.level || ""}",${app.match_score || 0},"${app.status || "pending"}","${app.stage || "applied"}","${app.created_at}"`,
    )
    .join("\n");

  return new Response(headers + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="applicants-${internship.role.replace(/\s/g, "-")}.csv"`,
    },
  });
}
```

### 4. Export All Postings Data

On the My Postings page, add a "Download All" option:

```tsx
const handleExportAllPostings = () => {
  const headers = [
    "Role",
    "Field",
    "Category",
    "Status",
    "Applicants",
    "Deadline",
    "Created",
  ];
  const rows = initialInternships.map((job) => [
    job.role,
    job.field,
    job.category,
    job.status || "active",
    String(job.applied_internships?.[0]?.count || 0),
    job.deadline || "",
    job.created_at || "",
  ]);

  // Same CSV generation logic as above
  downloadCSV(headers, rows, "my-postings-export");
};
```

### 5. Utility Function: `lib/csv.ts`

```tsx
export function generateCSV(headers: string[], rows: string[][]): string {
  const escapedHeaders = headers.join(",");
  const escapedRows = rows.map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
  );
  return [escapedHeaders, ...escapedRows].join("\n");
}

export function downloadCSV(
  headers: string[],
  rows: string[][],
  filename: string,
) {
  const csv = generateCSV(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

## Integration with Other Roles

- **Student**: Can export their own application history from "My Internships"
- **Employer**: Can export applicant data per posting or all postings
- **Admin**: Can export platform-wide data (users, postings, applications) for reporting

## Acceptance Criteria

- [ ] "Export CSV" button on applicant review page
- [ ] CSV includes: name, email, course, level, match score, status, stage, date
- [ ] CSV properly escapes commas and quotes in content
- [ ] File downloads with meaningful filename (includes role and date)
- [ ] "Export All Postings" option on My Postings page
- [ ] Shared CSV utility in `lib/csv.ts`
- [ ] Large exports handled server-side (optional)
- [ ] Export only includes data the employer owns (authorization check)


STATUS: COMPLETE
