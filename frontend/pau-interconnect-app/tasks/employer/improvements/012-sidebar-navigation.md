# IMPROVEMENT: Sidebar Navigation

## Priority: 🟢 LOW

## Effort: Low (1 hour)

## Current State

Employer sidebar has 3 items: Company Home, My Postings, Review Logbooks. Plus account section: Company Public Page, Settings. Students have 4 nav items. No analytics link, no notifications badge.

## File to Modify

`components/Sidebar.tsx`

## Improvements

### 1. Add Analytics Nav Item

```tsx
const employerItems = [
  { label: "Company Home", icon: Home, href: "/dashboard/employer" },
  {
    label: "My Postings",
    icon: Briefcase,
    href: "/dashboard/employer/internships",
  },
  {
    label: "Review Logbooks",
    icon: BookOpen,
    href: "/dashboard/employer/logbook",
  },
  // NEW:
  {
    label: "Analytics",
    icon: BarChart3,
    href: "/dashboard/employer/analytics",
  },
];
```

### 2. Add Notification Badge

Show unread count on sidebar items:

```tsx
interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number; // Unread/pending count
}

// Pass badge counts from parent or fetch in sidebar:
const employerItems: NavItem[] = [
  { label: "Company Home", icon: Home, href: "/dashboard/employer" },
  {
    label: "My Postings",
    icon: Briefcase,
    href: "/dashboard/employer/internships",
    badge: newApplicationsCount,
  },
  {
    label: "Review Logbooks",
    icon: BookOpen,
    href: "/dashboard/employer/logbook",
    badge: pendingLogbooksCount,
  },
  {
    label: "Analytics",
    icon: BarChart3,
    href: "/dashboard/employer/analytics",
  },
];

// Render badge:
{
  item.badge && item.badge > 0 && (
    <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
      {item.badge > 9 ? "9+" : item.badge}
    </span>
  );
}
```

### 3. Fix Company Public Page Link When No ID

Currently disabled when `!userProfile?.id`. Show helpful tooltip instead:

```tsx
{
  label: isEmployer ? "Company Public Page" : "Profile",
  icon: User,
  href: isEmployer ? `/companies/${userProfile?.id}` : "/profile",
  disabled: false, // Never disable — always show
  tooltip: isEmployer && !userProfile?.id ? "Complete onboarding to enable" : undefined,
},
```

### 4. Add Quick Post Action in Sidebar (Employer Only)

A small "+" button or CTA at the bottom of the nav section:

```tsx
{
  isEmployer && isExpanded && (
    <div className="px-4 mt-4">
      <Link href="/dashboard/employer/internships?action=post">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-brand/5 text-brand rounded-xl text-sm font-medium hover:bg-brand/10 transition-colors">
          <Plus className="w-4 h-4" />
          Post Internship
        </div>
      </Link>
    </div>
  );
}
```

## Integration with Other Roles

- **Student**: Student sidebar already has 4 items, so this brings employer to parity
- **Admin**: Admin already has Analytics nav item — employer version shows employer-specific analytics
- **Badge counts**: All roles should show relevant badge counts (students: application status changes, admin: flagged content)

## Acceptance Criteria

- [ ] Employer sidebar has 4 navigation items (+ Analytics)
- [ ] Badge counts shown for items with pending actions
- [ ] Company Public Page link always enabled with tooltip if setup incomplete
- [ ] Quick "Post Internship" action visible in expanded sidebar
- [ ] No layout shift when badges appear/disappear
