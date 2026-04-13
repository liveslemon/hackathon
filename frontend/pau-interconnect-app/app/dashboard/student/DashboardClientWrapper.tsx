"use client";
import React, { useState } from "react";
import { Modal, Button, Stack, Typography, Badge } from "@/components/ui";

export default function DashboardClientWrapper({ 
  children,
  internships = []
}: { 
  children: (onOpen: () => void) => React.ReactNode;
  internships?: any[];
}) {
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const getMatchColor = (percentage?: number) => {
    if (percentage === undefined || percentage === null) return "primary";
    if (percentage >= 70) return "success";
    if (percentage >= 40) return "warning";
    return "error";
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
          <Stack spacing={8}>
            {internships.map((internship) => (
              <div key={internship.id} className="group">
                <Stack direction="row" justify="between" align="center" className="mb-4">
                  <div>
                    <Typography variant="h5" weight="bold" className="group-hover:text-brand transition-colors">
                      {internship.role}
                    </Typography>
                    <Typography variant="body2" color="muted">
                      {internship.company}
                    </Typography>
                  </div>

                  {internship.matchPercentage !== undefined ? (
                    <Badge 
                      variant={getMatchColor(internship.matchPercentage)}
                      className="px-4 py-1.5 rounded-xl font-bold"
                    >
                      {internship.matchPercentage}% Match
                    </Badge>
                  ) : (
                    <Badge variant="slate" className="px-4 py-1.5 rounded-xl">Not analyzed</Badge>
                  )}
                </Stack>

                {internship.matchPercentage !== undefined && (
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out ${
                        internship.matchPercentage >= 70 ? 'bg-emerald-500' : 
                        internship.matchPercentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${internship.matchPercentage}%` }}
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
