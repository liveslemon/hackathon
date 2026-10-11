# BUG FIX: Fix "Add Posting" Quick Action Button

## Priority: 🔴 CRITICAL

## Effort: Low (15 min)

## Problem

The "Add Posting" button on the employer dashboard points to `href: "#"` with `isModalTrigger: true`, but the component renders it as a plain `<Link>` — so clicking it navigates to `#` (does nothing). The modal trigger logic was never implemented.

## File to Modify

`app/dashboard/employer/EmployerParts.tsx`

## Current Code (lines 29-56)

```tsx
export function EmployerQuickActionsSection({
  profile: _profile,
}: {
  profile: unknown;
}) {
  void _profile;
  const actions = [
    {
      label: "Add Posting",
      icon: Plus,
      href: "#",
      isModalTrigger: true,   // ← This flag is never used
      color: "text-brand",
      bg: "bg-brand/5",
    },
    // ...
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 mb-10">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}    // ← Always renders as Link, even for "#"
          className="group flex-1 min-w-[140px]"
        >
```

## Fix Options

### Option A: Link to Internships page with post modal (Recommended)

Change the href to navigate to the postings page where `PostInternshipButton` already exists:

```tsx
{
  label: "Add Posting",
  icon: Plus,
  href: "/dashboard/employer/internships?action=post",
  color: "text-brand",
  bg: "bg-brand/5",
},
```

Then in `app/dashboard/employer/internships/page.tsx`, read the `?action=post` query param and auto-open the modal on mount.

### Option B: Convert to client component with inline modal

Make `EmployerQuickActionsSection` a client component (`"use client"`) and render `PostInternshipButton` inline when "Add Posting" is clicked.

```tsx
"use client";
import { PostInternshipButton } from "./EmployerClient";

export function EmployerQuickActionsSection({
  profile,
}: {
  profile: { id: string; company_name: string };
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-10">
      {/* Add Posting — renders the modal button */}
      <div className="group flex-1 min-w-[140px]">
        <PostInternshipButton employerProfile={profile} />
      </div>

      {/* My Hub */}
      <Link
        href="/dashboard/employer/internships"
        className="group flex-1 min-w-[140px]"
      >
        {/* ... existing styling ... */}
      </Link>

      {/* Logbooks */}
      <Link
        href="/dashboard/employer/logbook"
        className="group flex-1 min-w-[140px]"
      >
        {/* ... existing styling ... */}
      </Link>
    </div>
  );
}
```

### Option C: Simplest fix — just change href

```tsx
href: "/dashboard/employer/internships",
```

This sends the user to the postings page where they can click "Post Internship". Not ideal UX but unblocks the flow.

## Recommended Approach

**Option B** is best because:

- Keeps the user on the dashboard (no navigation)
- Reuses existing `PostInternshipButton` component
- Matches user expectation ("clicking Add Posting should let me add a posting immediately")

## Acceptance Criteria

- [ ] Clicking "Add Posting" on employer dashboard opens the post internship modal
- [ ] Successfully creating a posting from dashboard works end-to-end
- [ ] No dead `#` links remain in employer quick actions
- [ ] Other quick action buttons (My Hub, Logbooks) still navigate correctly


STATUS: COMPLETE
