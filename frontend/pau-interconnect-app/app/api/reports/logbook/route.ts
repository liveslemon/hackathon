import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

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
    <body onload="window.print()">
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

export async function GET(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine user role to enforce strict authorization scoping
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;
  const isAdmin = profile?.is_admin === true;

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "csv";
  const studentId = url.searchParams.get("student");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = supabase
    .from("logbook_entries")
    .select("*, profiles!student_id(full_name, course, level)")
    .order("date", { ascending: true });

  if (role === "student") {
    // Students can only export their own entries
    query = query.eq("student_id", user.id);
  } else if (role === "employer") {
    // Employers can only export entries for interns assigned to them
    query = query.eq("employer_id", user.id);
    if (studentId && studentId !== "all") {
      query = query.eq("student_id", studentId);
    }
  } else if (isAdmin) {
    // Admins can filter by student or view all
    if (studentId && studentId !== "all") {
      query = query.eq("student_id", studentId);
    }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data: entries, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (format === "csv") {
    const headers = "Date,Student,Course,Level,Activities,Status,Supervisor Feedback\n";
    const escapeCsv = (val: string | null | undefined) =>
      `"${(val ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

    const rows = (entries || [])
      .map((e) =>
        [
          e.date,
          escapeCsv(e.profiles?.full_name),
          escapeCsv(e.profiles?.course),
          escapeCsv(e.profiles?.level),
          escapeCsv(e.activities_enhanced || e.activities_raw),
          escapeCsv(e.status),
          escapeCsv(e.feedback_notes),
        ].join(","),
      )
      .join("\n");

    return new Response(headers + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="siwes-logbook-report.csv"`,
      },
    });
  }

  const html = generatePDFHTML(entries || []);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="siwes-report.html"`,
    },
  });
}

