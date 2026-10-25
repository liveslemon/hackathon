"use client";

import React, { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  PageHeader,
  Select,
  Input,
  EmptyState,
  StatusPill,
} from "@/components/ui";
import { Download, FileText, Users, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface InternRecord {
  student_id: string;
  status: string;
  internships?: any;
  profiles?: any;
}

export default function ReportsClient({ interns }: { interns: InternRecord[] }) {
  const [selectedStudent, setSelectedStudent] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [generating, setGenerating] = useState(false);

  const studentOptions = [
    { value: "all", label: "All Active Interns" },
    ...interns.map((intern) => ({
      value: intern.student_id,
      label: intern.profiles?.full_name || "Unknown Student",
    })),
  ];

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
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to generate report");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `siwes-report-${selectedStudent === "all" ? "all-interns" : selectedStudent}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`SIWES ${format.toUpperCase()} report generated and downloaded.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate compliance report");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      <PageHeader
        title="SIWES Compliance Reports"
        description="Generate official Industrial Training Fund (ITF) logbook summaries and student attendance certificates."
      />

      {/* Export Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-brand font-medium text-xs">
            <FileSpreadsheet className="w-4 h-4" />
            <span>EXPORT CONTROLS</span>
          </div>
          <h3 className="text-base font-semibold text-fg">Report Scope & Date Filter</h3>
          <p className="text-xs text-fg-muted">
            Filter by individual student intern or export combined compliance archives.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Student Filter"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              options={studentOptions}
            />
            <Input
              label="From Date"
              type="date"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange({ ...dateRange, from: e.target.value })
              }
            />
            <Input
              label="To Date"
              type="date"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange({ ...dateRange, to: e.target.value })
              }
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={() => handleGenerateReport("pdf")}
              isLoading={generating}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download Document (PDF)
            </Button>
            <Button
              variant="outline"
              onClick={() => handleGenerateReport("csv")}
              isLoading={generating}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Export Spreadsheet (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Intern Summary Preview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-fg">Active Intern Summary</h3>
              <p className="text-xs text-fg-muted">
                Overview of current student placements enrolled under your organization.
              </p>
            </div>
            <span className="text-xs text-fg-muted font-medium">
              {interns.length} Active Placement{interns.length === 1 ? "" : "s"}
            </span>
          </div>
        </CardHeader>
        <CardContent>

          {interns.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title="No active interns"
              description="Accepted candidates who begin their SIWES placement will appear here for compliance reporting."
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-fg-muted font-medium">
                      <th className="pb-3 text-xs font-semibold uppercase tracking-wider">Student Name</th>
                      <th className="pb-3 text-xs font-semibold uppercase tracking-wider">Discipline / Level</th>
                      <th className="pb-3 text-xs font-semibold uppercase tracking-wider">Role Title</th>
                      <th className="pb-3 text-xs font-semibold uppercase tracking-wider">Status</th>
                      <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-right">SIWES Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {interns.map((intern) => (
                      <tr key={intern.student_id} className="hover:bg-background/50 transition-colors">
                        <td className="py-3.5 font-medium text-fg">
                          {intern.profiles?.full_name || "Student"}
                        </td>
                        <td className="py-3.5 text-fg-muted text-xs">
                          {intern.profiles?.course || "General Track"}{" "}
                          {intern.profiles?.level ? `(${intern.profiles.level}L)` : ""}
                        </td>
                        <td className="py-3.5 text-fg text-xs">
                          {intern.internships?.role || "Intern"}
                        </td>
                        <td className="py-3.5">
                          <StatusPill status="accepted" />
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-24 h-2 bg-surface-sunken rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand rounded-full"
                                style={{ width: "75%" }}
                              />
                            </div>
                            <span className="text-xs text-fg-muted font-mono">75%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="sm:hidden space-y-3">
                {interns.map((intern) => (
                  <div
                    key={intern.student_id}
                    className="p-4 rounded-xl border border-border bg-surface-raised/40 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-fg">
                          {intern.profiles?.full_name || "Student"}
                        </div>
                        <div className="text-xs text-fg-muted">
                          {intern.profiles?.course || "General Track"}
                        </div>
                      </div>
                      <StatusPill status="accepted" />
                    </div>
                    <div className="text-xs text-fg">
                      <span className="text-fg-muted">Role:</span> {intern.internships?.role || "Intern"}
                    </div>
                    <div className="pt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-surface-sunken rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{ width: "75%" }}
                        />
                      </div>
                      <span className="text-xs text-fg-muted font-mono">75%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

