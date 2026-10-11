# IMPROVEMENT: My Postings List

## Priority: 🟡 MEDIUM

## Effort: Medium (2-3 hours)

## Current State

Lists all employer internships with role, field, category, deadline, and applicant count. Has search + filter by field/category and pagination (6 per page). No sort options, no posting actions (edit/close/delete/clone).

## File to Modify

`app/dashboard/employer/EmployerInternshipListClient.tsx`

## Improvements

### 1. Add Sort Options

```tsx
const [sortBy, setSortBy] = useState<"newest" | "deadline" | "applicants">(
  "newest",
);

// Sort logic:
const sortedJobs = [...filteredJobs].sort((a, b) => {
  switch (sortBy) {
    case "deadline":
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    case "applicants":
      const aCount = a.applied_internships?.[0]?.count || 0;
      const bCount = b.applied_internships?.[0]?.count || 0;
      return bCount - aCount; // Most applicants first
    case "newest":
    default:
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
});

// UI: Sort dropdown or pills
<div className="flex items-center gap-2">
  <Typography variant="body2" color="muted">
    Sort by:
  </Typography>
  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
    className="text-sm border rounded-lg px-3 py-1.5"
  >
    <option value="newest">Newest First</option>
    <option value="deadline">Deadline (Soonest)</option>
    <option value="applicants">Most Applicants</option>
  </select>
</div>;
```

### 2. Add Posting Action Buttons (Edit, Close, Clone, Delete)

Each posting card needs an actions menu:

```tsx
interface EmployerInternship {
  id: string;
  role: string;
  field: string;
  category: string;
  deadline?: string | null;
  status?: string; // "active" | "closed" | "draft" | "expired"
  created_at?: string;
  applied_internships?: Array<{ count?: number | null }>;
}

// Per-card actions dropdown:
<div className="relative">
  <button onClick={() => setOpenMenu(openMenu === job.id ? null : job.id)}>
    <MoreVertical className="w-4 h-4" />
  </button>
  {openMenu === job.id && (
    <div className="absolute right-0 mt-1 bg-white border rounded-xl shadow-lg py-1 z-10 w-40">
      <button
        onClick={() => handleEdit(job.id)}
        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
      >
        Edit Posting
      </button>
      <button
        onClick={() => handleClone(job.id)}
        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
      >
        Clone Posting
      </button>
      <button
        onClick={() => handleToggleStatus(job.id)}
        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
      >
        {job.status === "active" ? "Close Posting" : "Reopen"}
      </button>
      <button
        onClick={() => handleDelete(job.id)}
        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  )}
</div>;
```

### 3. Add Status Badges

Show whether a posting is active, closed, draft, or expired:

```tsx
const getStatusBadge = (job: EmployerInternship) => {
  if (job.status === "draft") return <Badge variant="default">Draft</Badge>;
  if (job.status === "closed") return <Badge variant="error">Closed</Badge>;
  if (job.deadline && new Date(job.deadline) < new Date())
    return <Badge variant="warning">Expired</Badge>;
  return <Badge variant="success">Active</Badge>;
};
```

### 4. Implement Action Handlers

```tsx
const handleEdit = (id: string) => {
  router.push(`/dashboard/employer/internships/${id}/edit`);
};

const handleClone = async (id: string) => {
  const original = initialInternships.find((j) => j.id === id);
  if (!original) return;
  // Open post modal with pre-filled data from the original
  // This requires lifting PostInternshipButton's state or using a context
};

const handleToggleStatus = async (id: string) => {
  const job = initialInternships.find((j) => j.id === id);
  const newStatus = job?.status === "active" ? "closed" : "active";

  await authenticatedFetch(`/api/internships/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: newStatus }),
  });
  router.refresh();
};

const handleDelete = async (id: string) => {
  if (
    !confirm(
      "Are you sure? This will remove the posting and all associated applications.",
    )
  )
    return;

  await authenticatedFetch(`/api/internships/${id}`, { method: "DELETE" });
  router.refresh();
};
```

### 5. Increase Items Per Page / Add Infinite Scroll

```tsx
const itemsPerPage = 12; // Increase from 6

// OR implement infinite scroll:
const [visibleCount, setVisibleCount] = useState(12);
const loadMore = () => setVisibleCount((prev) => prev + 12);
```

### 6. Add View Count per Posting

If tracking view counts (requires backend support):

```tsx
<div className="flex items-center gap-1 text-xs text-slate-400">
  <Eye className="w-3.5 h-3.5" />
  <span>{job.view_count || 0} views</span>
</div>
```

## New File Needed

`app/dashboard/employer/internships/[id]/edit/page.tsx` — Edit posting page (reuses the post form in edit mode)

## Database Migration

```sql
-- Add status column if not exists (may already exist from task 006)
ALTER TABLE internships ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE internships ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
```

## Integration with Other Roles

- **Student**: Closed/draft postings should NOT appear in student browse
- **Admin**: Admin should be able to see all postings including closed/draft
- **Search filters**: Student search should filter by `status = 'active'` only

## Acceptance Criteria

- [ ] Sort by newest, deadline, applicant count
- [ ] Each posting card has actions menu (edit, clone, close/reopen, delete)
- [ ] Status badges (Active, Closed, Draft, Expired) shown per posting
- [ ] Edit navigates to edit page with pre-filled form
- [ ] Clone creates a copy of the posting in the create modal
- [ ] Close/Reopen toggles posting visibility to students
- [ ] Delete requires confirmation and removes posting + applications
- [ ] Items per page increased or infinite scroll added
- [ ] Closed/draft postings hidden from student-facing pages
