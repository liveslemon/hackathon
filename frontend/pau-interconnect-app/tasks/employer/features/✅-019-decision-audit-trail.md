# NEW FEATURE: Decision Audit Trail

## Priority: 🟠 HIGH

## Effort: Medium (2-3 hours)

## Overview

Every employer decision (accept, reject, stage change, logbook review) should be logged with who made it, when, and why. This provides accountability, enables compliance reporting, and allows reversal tracking.

## Implementation

### 1. Database Schema

```sql
CREATE TABLE IF NOT EXISTS decision_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL, -- 'application_accepted', 'application_rejected', 'stage_changed', 'logbook_approved', 'logbook_flagged'
  target_type TEXT NOT NULL, -- 'application', 'logbook_entry', 'internship'
  target_id UUID NOT NULL, -- ID of the affected record
  details JSONB DEFAULT '{}', -- Additional context (reason, notes, from_status, to_status)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_actor ON decision_audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_target ON decision_audit_log(target_type, target_id);
```

### 2. Audit Service: `lib/audit.ts`

```tsx
import { getSupabaseServer } from "@/lib/supabase-server";

interface AuditEntry {
  actorId: string;
  action: string;
  targetType: "application" | "logbook_entry" | "internship";
  targetId: string;
  details?: Record<string, unknown>;
}

export async function logDecision(entry: AuditEntry) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("decision_audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId,
    details: entry.details || {},
  });
  if (error) {
    console.error("Audit log failed:", error);
    // Don't throw — audit failure shouldn't block the action
  }
}
```

### 3. Integrate with Applicant Status Change

In the application status API (or wherever status is updated):

```tsx
import { logDecision } from "@/lib/audit";

// After successfully updating application status:
await logDecision({
  actorId: user.id,
  action:
    newStatus === "accepted" ? "application_accepted" : "application_rejected",
  targetType: "application",
  targetId: applicationId,
  details: {
    from_status: previousStatus,
    to_status: newStatus,
    reason: decision_notes || null,
    internship_id: application.internship_id,
    student_id: application.student_id,
  },
});
```

### 4. Integrate with Logbook Review

In the logbook status update handler:

```tsx
await logDecision({
  actorId: user.id,
  action: newStatus === "approved" ? "logbook_approved" : "logbook_flagged",
  targetType: "logbook_entry",
  targetId: entryId,
  details: {
    feedback_notes: feedback_notes || null,
    student_id: entry.student_id,
    date: entry.date,
  },
});
```

### 5. Integrate with Stage Changes (Pipeline)

```tsx
await logDecision({
  actorId: user.id,
  action: "stage_changed",
  targetType: "application",
  targetId: applicationId,
  details: {
    from_stage: currentStage,
    to_stage: newStage,
    notes: notes || null,
  },
});
```

### 6. View Audit History in Applicant Review

Show decision timeline per applicant:

```tsx
// In ApplicantReviewClient, in the expanded view:
function DecisionTimeline({ applicationId }: { applicationId: string }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const res = await fetch(`/api/audit/${applicationId}`);
      const data = await res.json();
      setHistory(data);
    };
    fetchHistory();
  }, [applicationId]);

  return (
    <div className="mt-4 border-t pt-4">
      <Typography
        variant="caption"
        weight="bold"
        className="text-slate-500 uppercase tracking-wider mb-2"
      >
        Decision History
      </Typography>
      <div className="space-y-2">
        {history.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 text-xs">
            <div className="w-2 h-2 bg-slate-300 rounded-full mt-1.5 shrink-0" />
            <div>
              <span className="font-medium">
                {entry.action.replace(/_/g, " ")}
              </span>
              {entry.details?.reason && (
                <span className="text-slate-500 ml-1">
                  — "{entry.details.reason}"
                </span>
              )}
              <p className="text-slate-400">
                {new Date(entry.created_at).toLocaleDateString()} at{" "}
                {new Date(entry.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <Typography variant="caption" color="muted">
            No decisions recorded yet
          </Typography>
        )}
      </div>
    </div>
  );
}
```

### 7. API to Fetch Audit History: `app/api/audit/[targetId]/route.ts`

```tsx
export async function GET(
  req: Request,
  { params }: { params: { targetId: string } },
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("decision_audit_log")
    .select("*")
    .eq("target_id", params.targetId)
    .order("created_at", { ascending: true });

  return NextResponse.json(data || []);
}
```

## Integration with Other Roles

- **Student**: Students don't see the full audit log, but they see the outcome (rejection reason, feedback)
- **Employer**: Sees decision timeline per applicant; can review past decisions
- **Admin**: Can access full audit log for compliance; can export for reporting; can see which employers are responsive vs. unresponsive

## Acceptance Criteria

- [ ] `decision_audit_log` table created with proper indexes
- [ ] `logDecision()` utility function created in `lib/audit.ts`
- [ ] Every application accept/reject logs an audit entry
- [ ] Every logbook approve/flag logs an audit entry
- [ ] Every stage change logs an audit entry
- [ ] Decision timeline visible in applicant expanded view
- [ ] API endpoint returns audit history for a given target
- [ ] Audit log includes actor, timestamp, action, and details (reason/notes)
- [ ] Audit failures don't block the primary action (fire-and-forget)
- [ ] Admin can query audit logs for reporting


STATUS: COMPLETE
