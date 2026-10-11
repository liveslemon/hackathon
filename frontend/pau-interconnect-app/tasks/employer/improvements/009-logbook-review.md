# IMPROVEMENT: Logbook Review

## Priority: 🟡 MEDIUM

## Effort: Medium (2-3 hours)

## Current State

Shows pending and history sections. Employer can approve or flag (with feedback prompt via `window.prompt()`). No filtering by student/date, no bulk actions, no feedback on approvals, no export.

## File to Modify

`app/dashboard/employer/logbook/LogbookReviewClient.tsx`

## Improvements

### 1. Add Feedback Notes When Approving (Not Just Flagging)

Replace the simple approve button with an optional feedback field:

```tsx
const handleUpdateStatus = async (entryId: string, newStatus: string) => {
  let feedback_notes: string | undefined;

  if (newStatus === "flagged") {
    // Keep existing modal/prompt for flagging
    const reason = await showFeedbackModal({
      title: "Flag Entry — Provide Feedback",
      placeholder: "Explain what needs revision...",
      required: true,
    });
    if (reason === null) return;
    feedback_notes = reason;
  } else if (newStatus === "approved") {
    // Optional feedback for approved entries
    const note = await showFeedbackModal({
      title: "Approve Entry",
      subtitle: "Optional: Add a note or encouragement",
      placeholder: "e.g. Great detail on the database work!",
      required: false,
    });
    feedback_notes = note || undefined;
  }

  setUpdatingId(entryId);
  try {
    await authenticatedFetch(`/api/logbook/entry/${entryId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus, feedback_notes }),
    });

    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, status: newStatus, feedback_notes } : e,
      ),
    );
  } catch (err: unknown) {
    alert("Error: " + (err instanceof Error ? err.message : "Unknown"));
  } finally {
    setUpdatingId(null);
  }
};
```

### 2. Replace `window.prompt()` with Proper Modal

Create a `FeedbackModal` component:

```tsx
interface FeedbackModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  placeholder: string;
  required?: boolean;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

function FeedbackModal({
  isOpen,
  title,
  subtitle,
  placeholder,
  required,
  onSubmit,
  onCancel,
}: FeedbackModalProps) {
  const [text, setText] = useState("");

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      {subtitle && (
        <Typography variant="body2" color="muted">
          {subtitle}
        </Typography>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-3 p-3 border rounded-xl text-sm resize-none"
        rows={3}
        autoFocus
      />
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => onSubmit(text)}
          disabled={required && !text.trim()}
        >
          Submit
        </Button>
      </div>
    </Modal>
  );
}
```

### 3. Add Filters (by Student, by Date Range)

```tsx
const [studentFilter, setStudentFilter] = useState("all");
const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
  from: "",
  to: "",
});

// Extract unique students:
const students = [
  ...new Set(entries.map((e) => e.profiles?.full_name).filter(Boolean)),
];

// Filter logic:
const filteredPending = pendingEntries.filter((e) => {
  const matchesStudent =
    studentFilter === "all" || e.profiles?.full_name === studentFilter;
  const matchesDate =
    (!dateRange.from || new Date(e.date) >= new Date(dateRange.from)) &&
    (!dateRange.to || new Date(e.date) <= new Date(dateRange.to));
  return matchesStudent && matchesDate;
});

// Filter UI:
<div className="flex flex-wrap gap-3 mb-6">
  <select
    value={studentFilter}
    onChange={(e) => setStudentFilter(e.target.value)}
    className="text-sm border rounded-lg px-3 py-2"
  >
    <option value="all">All Students</option>
    {students.map((name) => (
      <option key={name} value={name}>
        {name}
      </option>
    ))}
  </select>
  <input
    type="date"
    value={dateRange.from}
    onChange={(e) =>
      setDateRange((prev) => ({ ...prev, from: e.target.value }))
    }
    className="text-sm border rounded-lg px-3 py-2"
    placeholder="From"
  />
  <input
    type="date"
    value={dateRange.to}
    onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
    className="text-sm border rounded-lg px-3 py-2"
    placeholder="To"
  />
</div>;
```

### 4. Add Bulk Approve

For routine entries, allow selecting multiple and approving at once:

```tsx
const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

const handleBulkApprove = async () => {
  const ids = Array.from(selectedEntries);
  setUpdatingId("bulk");

  try {
    await Promise.all(
      ids.map((id) =>
        authenticatedFetch(`/api/logbook/entry/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "approved" }),
        }),
      ),
    );

    setEntries((prev) =>
      prev.map((e) =>
        selectedEntries.has(e.id) ? { ...e, status: "approved" } : e,
      ),
    );
    setSelectedEntries(new Set());
  } catch (err) {
    alert("Bulk approve failed");
  } finally {
    setUpdatingId(null);
  }
};

// Bulk action bar:
{
  selectedEntries.size > 0 && (
    <div className="sticky top-0 z-10 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-4 mb-4">
      <span className="text-sm font-medium text-emerald-800">
        {selectedEntries.size} entries selected
      </span>
      <Button size="sm" onClick={handleBulkApprove}>
        Approve All Selected
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setSelectedEntries(new Set())}
      >
        Clear
      </Button>
    </div>
  );
}
```

### 5. Add Weekly/Monthly Summary View

Add a toggle between individual entries and summary view:

```tsx
const [viewMode, setViewMode] = useState<"individual" | "summary">(
  "individual",
);

// Summary view groups entries by student and week:
{
  viewMode === "summary" && (
    <div className="space-y-6">
      {Object.entries(groupByStudentAndWeek(entries)).map(([key, group]) => (
        <Card key={key}>
          <CardContent>
            <Typography variant="h5">{group.studentName}</Typography>
            <Typography variant="body2" color="muted">
              Week of {group.weekStart}
            </Typography>
            <div className="mt-2 text-sm">
              <p>Entries: {group.entries.length}</p>
              <p>
                Approved:{" "}
                {group.entries.filter((e) => e.status === "approved").length}
              </p>
              <p>
                Pending:{" "}
                {group.entries.filter((e) => e.status === "pending").length}
              </p>
              <p>
                Flagged:{" "}
                {group.entries.filter((e) => e.status === "flagged").length}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### 6. Add Review Timestamp Tracking

Show who reviewed and when:

```tsx
// In the history section, show reviewer info:
{
  entry.reviewed_at && (
    <Typography variant="caption" color="muted">
      Reviewed{" "}
      {formatDistanceToNow(new Date(entry.reviewed_at), { addSuffix: true })}
    </Typography>
  );
}
```

## Database Changes

```sql
ALTER TABLE logbook_entries ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE logbook_entries ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id);
```

## Integration with Other Roles

- **Student**: Students see employer feedback on their logbook entries (both approved notes and flagged reasons)
- **Admin**: Admin can export all logbook data for SIWES compliance reporting
- **Notifications**: When employer flags an entry, student gets notified to revise

## Acceptance Criteria

- [ ] Proper feedback modal replaces `window.prompt()`
- [ ] Optional feedback when approving (not just flagging)
- [ ] Filter by student name and date range
- [ ] Bulk approve multiple pending entries
- [ ] Weekly summary view option
- [ ] Review timestamp recorded and displayed
- [ ] Students see feedback notes on their logbook entries
