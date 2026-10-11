# NEW FEATURE: Application Pipeline Stages

## Priority: 🟠 HIGH

## Effort: High (5-6 hours)

## Overview

Replace the current binary "accept/reject" system with a multi-stage pipeline that tracks applicants through the recruitment process. This gives employers a clear view of where each candidate is, and students visibility into their application progress.

## Stages

```
Applied → Reviewed → Shortlisted → Interview → Offered → Accepted/Rejected
```

## Implementation

### 1. Database Schema

```sql
-- Add stage column to applied_internships
ALTER TABLE applied_internships ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'applied'
  CHECK (stage IN ('applied', 'reviewed', 'shortlisted', 'interview', 'offered', 'accepted', 'rejected', 'withdrawn'));

-- Stage history for audit trail
CREATE TABLE IF NOT EXISTS application_stage_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applied_internships(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stage_history_app ON application_stage_history(application_id);
```

### 2. Backend API Endpoint

Create `app/api/applications/[id]/stage/route.ts`:

```tsx
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

const VALID_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewed", "rejected"],
  reviewed: ["shortlisted", "rejected"],
  shortlisted: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["accepted", "rejected"],
  // Terminal states - no transitions out
  accepted: [],
  rejected: [],
  withdrawn: [],
};

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

  const { stage, notes } = await req.json();

  // Get current application
  const { data: application } = await supabase
    .from("applied_internships")
    .select("stage, internship_id, internships(employer_id)")
    .eq("id", params.id)
    .single();

  if (!application)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify employer owns this internship
  if (application.internships?.employer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate transition
  const currentStage = application.stage || "applied";
  if (!VALID_TRANSITIONS[currentStage]?.includes(stage)) {
    return NextResponse.json(
      { error: `Cannot move from '${currentStage}' to '${stage}'` },
      { status: 400 },
    );
  }

  // Update stage
  const { error } = await supabase
    .from("applied_internships")
    .update({
      stage,
      status:
        stage === "accepted"
          ? "accepted"
          : stage === "rejected"
            ? "rejected"
            : "pending",
    })
    .eq("id", params.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Record history
  await supabase.from("application_stage_history").insert({
    application_id: params.id,
    from_stage: currentStage,
    to_stage: stage,
    changed_by: user.id,
    notes: notes || null,
  });

  return NextResponse.json({ success: true, stage });
}
```

### 3. Pipeline Board UI (Kanban View)

Create `app/dashboard/employer/internships/[id]/PipelineView.tsx`:

```tsx
"use client";
import React, { useState } from "react";

const STAGES = [
  { key: "applied", label: "Applied", color: "bg-slate-100" },
  { key: "reviewed", label: "Reviewed", color: "bg-blue-50" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-purple-50" },
  { key: "interview", label: "Interview", color: "bg-amber-50" },
  { key: "offered", label: "Offered", color: "bg-green-50" },
  { key: "accepted", label: "Accepted", color: "bg-emerald-50" },
];

export function PipelineView({ applicants, onStageChange }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageApplicants = applicants.filter(
          (a) => (a.stage || "applied") === stage.key,
        );
        return (
          <div
            key={stage.key}
            className={`min-w-[250px] ${stage.color} rounded-xl p-4`}
          >
            <div className="flex items-center justify-between mb-3">
              <Typography variant="body2" weight="bold">
                {stage.label}
              </Typography>
              <Badge variant="default">{stageApplicants.length}</Badge>
            </div>
            <div className="space-y-2">
              {stageApplicants.map((applicant) => (
                <ApplicantStageCard
                  key={applicant.id}
                  applicant={applicant}
                  onAdvance={() =>
                    onStageChange(applicant.id, getNextStage(stage.key))
                  }
                  onReject={() => onStageChange(applicant.id, "rejected")}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApplicantStageCard({ applicant, onAdvance, onReject }) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
      <Typography variant="body2" weight="bold">
        {applicant.profiles?.full_name}
      </Typography>
      <Typography variant="caption" color="muted">
        {applicant.profiles?.course}
      </Typography>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-brand font-medium">
          {applicant.match_score || 0}% match
        </span>
      </div>
      <div className="flex gap-1 mt-2">
        <button
          onClick={onAdvance}
          className="text-xs text-green-600 hover:underline"
        >
          Advance →
        </button>
        <button
          onClick={onReject}
          className="text-xs text-red-500 hover:underline"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
```

### 4. Toggle Between List and Pipeline View

In the applicant review page, add a view toggle:

```tsx
const [viewMode, setViewMode] = useState<"list" | "pipeline">("list");

<div className="flex gap-2 mb-6">
  <button
    onClick={() => setViewMode("list")}
    className={cx("px-3 py-1.5 rounded-lg text-sm", viewMode === "list" ? "bg-slate-900 text-white" : "bg-slate-100")}
  >
    List View
  </button>
  <button
    onClick={() => setViewMode("pipeline")}
    className={cx("px-3 py-1.5 rounded-lg text-sm", viewMode === "pipeline" ? "bg-slate-900 text-white" : "bg-slate-100")}
  >
    Pipeline View
  </button>
</div>

{viewMode === "list" ? (
  <ApplicantReviewClient ... />
) : (
  <PipelineView applicants={applicants} onStageChange={handleStageChange} />
)}
```

### 5. Student-Side: Show Current Stage

In the student's "My Internships" page, show which stage their application is in:

```tsx
// Progress tracker component for students:
function ApplicationProgress({ stage }: { stage: string }) {
  const stages = [
    "applied",
    "reviewed",
    "shortlisted",
    "interview",
    "offered",
    "accepted",
  ];
  const currentIndex = stages.indexOf(stage);

  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={cx(
              "w-2.5 h-2.5 rounded-full",
              i <= currentIndex ? "bg-brand" : "bg-slate-200",
            )}
          />
          {i < stages.length - 1 && (
            <div
              className={cx(
                "w-4 h-0.5",
                i < currentIndex ? "bg-brand" : "bg-slate-200",
              )}
            />
          )}
        </React.Fragment>
      ))}
      <Typography variant="caption" className="ml-2 capitalize">
        {stage}
      </Typography>
    </div>
  );
}
```

## Integration with Other Roles

- **Student**: Sees current pipeline stage on "My Internships" page with progress dots
- **Employer**: Manages pipeline via list or kanban view
- **Admin**: Can see pipeline distribution metrics (how many at each stage platform-wide)
- **Notifications**: Stage transitions trigger notifications to the student

## Acceptance Criteria

- [ ] `stage` column added to `applied_internships` with valid values
- [ ] Stage history table records all transitions with timestamp and actor
- [ ] API validates transitions (can't skip stages, can't undo terminal states)
- [ ] Employer sees pipeline/kanban view with drag or click-to-advance
- [ ] Employer can toggle between list view and pipeline view
- [ ] Student sees current stage as progress indicator
- [ ] Rejecting from any stage moves to rejected (terminal)
- [ ] Each transition can include optional notes
- [ ] Backward compatibility: existing "accepted"/"rejected" status still works


STATUS: COMPLETE
