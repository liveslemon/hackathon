# IMPROVEMENT: Employer Dashboard Overview

## Priority: 🟡 MEDIUM

## Effort: Medium (2-3 hours)

## Current State

The dashboard shows:

- 2 metric cards (Active Postings, Total Applicants)
- Recent Applicants list (5 items)
- Pending Logbook Reviews (5 items)
- Quick actions toolbar (with broken "Add Posting" — see bug #002)

## Improvements

### 1. Add More Metric Cards

Currently only 2 stats. Add:

**File:** `app/dashboard/employer/EmployerParts.tsx` → `EmployerStatsSection`

```tsx
// Additional metrics to compute:
const acceptedCount = /* count from applied_internships where status = 'accepted' */;
const pendingReviewCount = /* count from logbook_entries where status = 'pending' and student's employer_id = user.id */;
const acceptanceRate = applicationCount > 0 ? Math.round((acceptedCount / applicationCount) * 100) : 0;

// Render 4 cards instead of 2:
// 1. Active Postings (existing)
// 2. Total Applicants (existing)
// 3. Acceptance Rate (new) — percentage badge
// 4. Pending Reviews (new) — logbook entries awaiting review
```

### 2. Add "Time Since" Indicators to Recent Applicants

**File:** `app/dashboard/employer/EmployerActivityClient.tsx`

Add relative timestamps:

```tsx
import { formatDistanceToNow } from "date-fns"; // or manual implementation

// In the applicant item:
<span className="text-xs text-slate-400">
  {formatDistanceToNow(new Date(applicant.created_at), { addSuffix: true })}
</span>;
```

### 3. Add Empty State for First-Time Employers

When there are 0 postings:

```tsx
{
  internshipCount === 0 && (
    <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
      <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
      <Typography variant="h4" className="text-slate-600 mb-2">
        Welcome! Post your first internship
      </Typography>
      <Typography variant="body2" color="muted" className="mb-6">
        Start attracting talented students to your company.
      </Typography>
      <PostInternshipButton employerProfile={profile} />
    </div>
  );
}
```

### 4. Add Notification Badge for Unread Applications

Show a red dot or count badge on "Recent Applicants" header when there are applications the employer hasn't viewed:

```tsx
// Track "last_viewed_applications_at" in profiles table or local storage
// Count applications created after that timestamp
const unreadCount = applicants.filter(
  (a) => new Date(a.created_at) > lastViewed,
).length;
```

### 5. Add Quick Stats Summary Line

Below the header, add a one-line summary:

```
"You have 3 new applications this week and 5 logbook entries pending review"
```

## Files to Modify

- `app/dashboard/employer/EmployerParts.tsx` — stats section, empty state
- `app/dashboard/employer/EmployerActivityClient.tsx` — timestamps, unread badges
- `app/dashboard/employer/page.tsx` — pass additional data

## Integration with Other Roles

- **Student**: When students apply, the employer dashboard reflects immediately (via Supabase realtime or revalidation)
- **Admin**: Admin analytics should show the same metrics aggregated across all employers

## Acceptance Criteria

- [ ] 4 metric cards shown (Active Postings, Total Applicants, Acceptance Rate, Pending Reviews)
- [ ] Relative timestamps ("2 hours ago") on recent applicants
- [ ] Empty state with CTA when employer has 0 postings
- [ ] Summary line showing this week's activity
- [ ] Dashboard loads fast (streaming/suspense maintained)
