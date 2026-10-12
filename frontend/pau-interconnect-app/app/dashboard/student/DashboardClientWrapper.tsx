"use client";
import React, { useState } from "react";
import { Modal, Button, Stack, Typography, Badge } from "@/components/ui";

export default function DashboardClientWrapper({
  children,
  internships = [],
}: {
  children: (onOpen: () => void) => React.ReactNode;
  internships?: Array<{
    id: string;
    role?: string;
    company?: string;
    matchPercentage?: number;
  }>;
}) {
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const getMatchBadgeVariant = (percentage?: number) => {
    if (percentage === undefined || percentage === null) return "primary" as const;
    if (percentage >= 70) return "success" as const;
    if (percentage >= 40) return "warning" as const;
    return "error" as const;
  };

  return (
    <>
      {children(() => setAnalysisOpen(true))}

      <Modal
        isOpen={analysisOpen}
        onClose={() => setAnalysisOpen(false)}
        title="CV Analysis & Match Results"
        size="lg"
        footer={<Button onClick={() => setAnalysisOpen(false)}>Close</Button>}
      >
        {internships.length === 0 ? (
          <Typography color="muted" className="text-center py-10">
            No internships available for analysis.
          </Typography>
        ) : (
          <Stack spacing={6}>
            {internships.map((internship) => (
              <div key={internship.id} className="group p-3 rounded-xl hover:bg-surface-sunken transition-colors">
                <Stack
                  direction="row"
                  justify="between"
                  align="center"
                  className="mb-3"
                >
                  <div>
                    <Typography
                      variant="h6"
                      weight="bold"
                      className="group-hover:text-brand transition-colors text-fg"
                    >
                      {internship.role}
                    </Typography>
                    <Typography variant="body2" color="muted">
                      {internship.company}
                    </Typography>
                  </div>

                  {internship.matchPercentage !== undefined ? (
                    <Badge
                      variant={getMatchBadgeVariant(internship.matchPercentage)}
                      className="px-3 py-1 rounded-full font-bold text-xs"
                    >
                      {internship.matchPercentage}% Match
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="px-3 py-1 rounded-full text-xs">
                      Not analyzed
                    </Badge>
                  )}
                </Stack>

                {internship.matchPercentage !== undefined && (
                  <div className="w-full h-2 bg-surface-sunken rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ease-out ${
                        internship.matchPercentage >= 70
                          ? "bg-success"
                          : internship.matchPercentage >= 40
                            ? "bg-warning"
                            : "bg-danger"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, internship.matchPercentage))}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </Stack>
        )}
      </Modal>
    </>
  );
}
