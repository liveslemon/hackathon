# NEW FEATURE: SIWES Compliance Reports

## Priority: 🟢 LOW

## Effort: Medium (3-4 hours)

## Overview

Generate and export SIWES (Students Industrial Work Experience Scheme) compliance reports. Employers need to verify intern logbooks for ITF (Industrial Training Fund) compliance. Admins need institution-wide reports. Students need their own logbook PDFs.

## Implementation

### 1. Employer Report Page: `app/dashboard/employer/reports/page.tsx`

```tsx
import { getSupabaseServer } from "@/lib/supabase-server";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/employer");

  // Get all interns (students with accepted applications to this employer's postings)
  const { data: interns } = await supabase
    .from("applied_internships")
    .select(
      `
      student_id,
      status,
      internships!inner(employer_id, role),
      profiles!student_id(full_name, email, course, level)
    `,
    )
    .eq("internships.employer_id", user.id)
    .eq("status", "accepted");

  return <ReportsClient interns={interns || []} />;
}
```

### 2. Reports Client: `app/dashboard/employer/reports/ReportsClient.tsx`

```tsx
"use client";
import { useState } from "react";
import { Typography, Button, Card, CardContent, Select } from "@/components/ui";
import { Download, FileText, Calendar } from "lucide-react";

export default function ReportsClient({ interns }) {
  const [selectedStudent, setSelectedStudent] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [generating, setGenerating] = useState(false);

  const handleGenerateReport = async (format: "pdf" | "csv") => {
    setGenerating(true);
    try {
      const params = new URLSearchParams({
        format,
        student: selectedStudent,
        from: dateRange.from,
        to: dateRange.to,
      });

      const res = await fetch(`/api/reports/logbook?${params}`);
      if (!res.ok) throw new Error("Failed to generate report");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `siwes-report-${selectedStudent === "all" ? "all-interns" : selectedStudent}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Typography variant="h2" weight="bold">
          SIWES Compliance Reports
        </Typography>
        <Typography variant="body1" color="muted">
          Generate logbook summaries and compliance reports for ITF submission.
        </Typography>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Student
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full border rounded-xl px-4 py-2 text-sm"
              >
                <option value="all">All Interns</option>
                {interns.map((intern) => (
                  <option key={intern.student_id} value={intern.student_id}>
                    {intern.profiles?.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                From
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
                className="w-full border rounded-xl px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                To
              </label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
                className="w-full border rounded-xl px-4 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => handleGenerateReport("pdf")}
              isLoading={generating}
            >
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => handleGenerateReport("csv")}
              isLoading={generating}
            >
              <FileText className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Preview */}
      <Card>
        <CardContent className="p-6">
          <Typography variant="h4" weight="bold" className="mb-4">
            Intern Summary
          </Typography>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3">Student</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Entries</th>
                <th className="pb-3">Approved</th>
                <th className="pb-3">Pending</th>
                <th className="pb-3">Flagged</th>
                <th className="pb-3">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {interns.map((intern) => (
                <tr key={intern.student_id}>
                  <td className="py-3">{intern.profiles?.full_name}</td>
                  <td className="py-3">{intern.internships?.role}</td>
                  <td className="py-3">{intern.totalEntries || 0}</td>
                  <td className="py-3 text-green-600">
                    {intern.approved || 0}
                  </td>
                  <td className="py-3 text-amber-600">{intern.pending || 0}</td>
                  <td className="py-3 text-red-600">{intern.flagged || 0}</td>
                  <td className="py-3">
                    <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${intern.completionRate || 0}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3. Report Generation API: `app/api/reports/logbook/route.ts`

```tsx
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "csv";
  const studentId = url.searchParams.get("student");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  // Fetch logbook entries for employer's interns
  let query = supabase
    .from("logbook_entries")
    .select("*, profiles!student_id(full_name, course, level)")
    .order("date", { ascending: true });

  if (studentId && studentId !== "all") {
    query = query.eq("student_id", studentId);
  }
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data: entries } = await query;

  if (format === "csv") {
    // Generate CSV
    const headers = "Date,Student,Activities,Status,Feedback\n";
    const rows = (entries || [])
      .map(
        (e) =>
          `"${e.date}","${e.profiles?.full_name}","${(e.activities_raw || "").replace(/"/g, '""')}","${e.status}","${(e.feedback_notes || "").replace(/"/g, '""')}"`,
      )
      .join("\n");

    return new Response(headers + rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="siwes-report.csv"`,
      },
    });
  }

  // For PDF: use a library like @react-pdf/renderer or return HTML for client-side print
  const html = generatePDFHTML(entries || []);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `attachment; filename="siwes-report.html"`,
    },
  });
}

function generatePDFHTML(entries: any[]) {
  return `
    <!DOCTYPE html>
    <html>
    <head><title>SIWES Logbook Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
      th { background: #f0f0f0; }
      h1 { font-size: 18px; }
      .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
    </style>
    </head>
    <body>
      <div class="header">
        <h1>SIWES Industrial Training Logbook Report</h1>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
        <p>Total Entries: ${entries.length}</p>
      </div>
      <table>
        <tr><th>Date</th><th>Student</th><th>Activities</th><th>Status</th><th>Supervisor Feedback</th></tr>
        ${entries
          .map(
            (e) => `
          <tr>
            <td>${e.date}</td>
            <td>${e.profiles?.full_name || "—"}</td>
            <td>${e.activities_raw || "—"}</td>
            <td>${e.status}</td>
            <td>${e.feedback_notes || "—"}</td>
          </tr>
        `,
          )
          .join("")}
      </table>
    </body>
    </html>
  `;
}
```

### 4. Add to Sidebar Navigation

```tsx
// In employerItems (after Analytics):
{ label: "Reports", icon: FileText, href: "/dashboard/employer/reports" },
```

## Integration with Other Roles

- **Student**: Can download their own logbook as PDF from their logbook page
- **Employer**: Can generate reports per intern or for all interns
- **Admin**: Can generate institution-wide SIWES compliance reports for ITF submission

## Acceptance Criteria

- [ ] Reports page at `/dashboard/employer/reports`
- [ ] Filter by student, date range
- [ ] CSV export with all logbook entry data
- [ ] HTML/PDF export formatted for SIWES compliance
- [ ] Summary table showing per-intern stats (entries, approved, pending, flagged)
- [ ] Completion rate indicator per intern
- [ ] Download triggers file download in browser
- [ ] Only shows interns with accepted applications to this employer
- [ ] Sidebar link to reports page


STATUS: COMPLETE
