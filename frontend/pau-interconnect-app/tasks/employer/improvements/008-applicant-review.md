# IMPROVEMENT: Applicant Review

## Priority: 🟠 HIGH

## Effort: High (4-5 hours)

## Current State

Shows all applicants for a specific internship in an expandable accordion. Each applicant shows name, course, level, match score, cover letter, CV link, and accept/reject buttons. Search by name. Optimistic status updates. No audit trail, no notes, no bulk actions, no filtering by status.

## File to Modify

`app/dashboard/employer/internships/[id]/ApplicantReviewClient.tsx`

## Improvements

### 1. Add Status Filters

```tsx
const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");

const filteredApplicants = applicants.filter((app) => {
  const matchesSearch = /* existing search logic */;
  const matchesStatus = statusFilter === "all" || app.status === statusFilter;
  return matchesSearch && matchesStatus;
});

// Filter pills UI:
<div className="flex gap-2">
  {(["all", "pending", "accepted", "rejected"] as const).map((status) => (
    <button
      key={status}
      onClick={() => setStatusFilter(status)}
      className={cx(
        "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
        statusFilter === status
          ? "bg-brand text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
      {/* Show count: */}
      <span className="ml-1 opacity-70">
        ({applicants.filter(a => status === "all" || a.status === status).length})
      </span>
    </button>
  ))}
</div>
```

### 2. Add Sort Options

```tsx
const [sortBy, setSortBy] = useState<"newest" | "match" | "name">("newest");

const sortedApplicants = [...filteredApplicants].sort((a, b) => {
  switch (sortBy) {
    case "match":
      return (b.match_score || 0) - (a.match_score || 0);
    case "name":
      return (a.profiles?.full_name || "").localeCompare(
        b.profiles?.full_name || "",
      );
    case "newest":
    default:
      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
  }
});
```

### 3. Add Rejection Reason / Decision Notes

When accepting or rejecting, prompt for a reason:

```tsx
const handleStatusChange = async (applicationId: string, newStatus: string) => {
  let decision_notes = "";

  if (newStatus === "rejected") {
    // Show a modal with reason templates + custom input
    const reason = await showDecisionModal({
      title: "Rejection Reason",
      templates: [
        "Position filled",
        "Insufficient experience for this role",
        "Skills don't match requirements",
        "Incomplete application",
        "Other",
      ],
      allowCustom: true,
      placeholder: "Optional: Add a note for your records...",
    });
    if (reason === null) return; // Cancelled
    decision_notes = reason;
  }

  if (newStatus === "accepted") {
    decision_notes =
      (await showDecisionModal({
        title: "Acceptance Note (optional)",
        templates: [
          "Strong skills match",
          "Great cover letter",
          "Relevant experience",
        ],
        allowCustom: true,
        required: false,
      })) || "";
  }

  await authenticatedFetch(`/applications/${applicationId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: newStatus, decision_notes }),
  });

  setApplicants((prev) =>
    prev.map((app) =>
      app.id === applicationId
        ? { ...app, status: newStatus, decision_notes }
        : app,
    ),
  );
};
```

### 4. Add Internal Recruiter Notes per Applicant

A notes field visible only to the employer (not shared with student):

```tsx
const [notes, setNotes] = useState<Record<string, string>>({});

// In the expanded applicant view:
<div className="mt-4 border-t pt-4">
  <label className="text-sm font-medium text-slate-700">Internal Notes</label>
  <textarea
    value={notes[applicant.id] || applicant.internal_notes || ""}
    onChange={(e) => setNotes({ ...notes, [applicant.id]: e.target.value })}
    onBlur={() => saveNote(applicant.id, notes[applicant.id])}
    placeholder="Add private notes about this candidate..."
    className="w-full mt-1 p-3 border rounded-xl text-sm resize-none"
    rows={2}
  />
</div>;

const saveNote = async (applicationId: string, note: string) => {
  await authenticatedFetch(`/applications/${applicationId}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ internal_notes: note }),
  });
};
```

### 5. Add Bulk Actions

```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [bulkMode, setBulkMode] = useState(false);

// Toggle selection:
const toggleSelect = (id: string) => {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
};

// Bulk action bar (shown when items selected):
{
  selectedIds.size > 0 && (
    <div className="sticky top-0 z-10 bg-white border-b p-4 flex items-center gap-4 shadow-sm">
      <Typography variant="body2" weight="bold">
        {selectedIds.size} selected
      </Typography>
      <Button size="sm" onClick={() => handleBulkAction("accepted")}>
        Accept All
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => handleBulkAction("rejected")}
      >
        Reject All
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setSelectedIds(new Set())}
      >
        Clear
      </Button>
    </div>
  );
}

const handleBulkAction = async (status: string) => {
  const ids = Array.from(selectedIds);
  await Promise.all(
    ids.map((id) =>
      authenticatedFetch(`/applications/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    ),
  );
  setApplicants((prev) =>
    prev.map((app) => (selectedIds.has(app.id) ? { ...app, status } : app)),
  );
  setSelectedIds(new Set());
};
```

### 6. Fix CV URL Expiration

Add a refresh mechanism when viewing CV:

```tsx
const handleViewCV = async (applicant: Applicant) => {
  try {
    const freshUrl = await ensureFreshCvUrl(applicant.profiles?.cv_url || "");
    window.open(freshUrl, "_blank");
  } catch {
    alert("Could not load CV. The file may have been deleted.");
  }
};
```

### 7. Add Applicant Tags

```tsx
const tags = ["Shortlisted", "Interview", "Maybe", "Top Pick"];

// Per applicant:
<div className="flex gap-1 flex-wrap mt-2">
  {applicant.tags?.map((tag) => (
    <Badge key={tag} variant="default" className="text-xs">
      {tag}
    </Badge>
  ))}
  <button
    onClick={() => showTagPicker(applicant.id)}
    className="text-xs text-brand hover:underline"
  >
    + Add Tag
  </button>
</div>;
```

## Database Changes

```sql
-- Add columns to applied_internships table
ALTER TABLE applied_internships ADD COLUMN IF NOT EXISTS decision_notes TEXT;
ALTER TABLE applied_internships ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE applied_internships ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE applied_internships ADD COLUMN IF NOT EXISTS decided_by UUID REFERENCES profiles(id);
ALTER TABLE applied_internships ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
```

## Integration with Other Roles

- **Student**: When rejected, student should see the rejection reason (if employer chose to share it). Decision notes marked "internal" stay private.
- **Admin**: Admin can view all decisions and audit trail for compliance.
- **Notifications**: When status changes, student gets notified (see task #015).

## Acceptance Criteria

- [ ] Filter applicants by status (All, Pending, Accepted, Rejected) with counts
- [ ] Sort by match score, newest, or name
- [ ] Rejection prompts for reason (template or custom)
- [ ] Internal notes field per applicant (auto-saves on blur)
- [ ] Bulk select + accept/reject multiple applicants at once
- [ ] CV URL refreshed on each view click (no stale signed URLs)
- [ ] Optional tagging system per applicant
- [ ] Decision timestamp recorded (`decided_at`)
- [ ] All changes use optimistic UI with error rollback
