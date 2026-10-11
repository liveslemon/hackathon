"use client";
import { useState } from "react";
import { Typography, Button, Card, CardContent } from "@/components/ui";
import { Download, FileText, Calendar } from "lucide-react";

export default function ReportsClient({ interns }: { interns: any[] }) {
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
                className="w-full border rounded-xl px-4 py-2 text-sm focus:outline-brand focus:border-brand bg-white"
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
                className="w-full border rounded-xl px-4 py-2 text-sm focus:outline-brand focus:border-brand"
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
                className="w-full border rounded-xl px-4 py-2 text-sm focus:outline-brand focus:border-brand"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => handleGenerateReport("pdf")}
              isLoading={generating}
            >
              <Download className="w-4 h-4 mr-2" /> Download Document
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

      <Card>
        <CardContent className="p-6">
          <Typography variant="h4" weight="bold" className="mb-4">
            Intern Summary Preview
          </Typography>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-3 font-medium">Student</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {interns.map((intern) => (
                  <tr key={intern.student_id}>
                    <td className="py-3 font-medium text-slate-800">
                      {intern.profiles?.full_name}
                    </td>
                    <td className="py-3 text-slate-600">
                      {(intern.internships as any)?.role}
                    </td>
                    <td className="py-3">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `70%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {interns.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-slate-500">
                      No active interns found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
