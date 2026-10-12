# PAU InterConnect Design System

Welcome to the **PAU InterConnect Design System**, the visual and component foundation for Pan-Atlantic University's internship and SIWES logbook platform.

This document serves as the single source of truth for **Agents 13–15** and future engineering work. All styling must be built on the semantic tokens and UI components detailed below.

---

## 1. Core Principles

1. **Evolve, Don't Replace**: Modernize the visual aesthetic using PAU's brand palette (Indigo `#4f46e5` / Violet `#7c3aed`), Slate neutrals, generous rounding (`rounded-2xl` / `rounded-3xl`), soft layered shadows, and subtle gradient accents.
2. **Token-First, Not Dark-Sprinkling**: Pages adopt dark mode through semantic tokens (e.g., `bg-surface text-fg border-border`), **never** by hard-coding `bg-white dark:bg-slate-900` or raw hex values across individual templates.
3. **WCAG AA Compliance**: High-contrast ratios guaranteed:
   - Body text: $\ge 4.5:1$
   - Large text and graphical elements: $\ge 3:1$
4. **Touch Target Accessibility**: Minimum interactive touch target size of **$40\times40\text{px}$** (with standard buttons at $\ge 42\text{px}$).
5. **Reduced Motion**: Respects `prefers-reduced-motion` across all transitions and animations.

---

## 2. Semantic Token Reference

All tokens are defined in `app/globals.css` with CSS custom properties and registered inline in Tailwind v4 (`@theme inline`).

### Surfaces & Elevation

| Token Utility | CSS Variable | Light Mode | Dark Mode | Usage |
|---|---|---|---|---|
| `bg-background` | `--background` | `#f8fafc` (Slate 50) | `#090d16` (Deep canvas) | Page body background |
| `bg-surface` | `--surface` | `#ffffff` (White) | `#111827` (Elevation 1) | Standard cards, cards in grid |
| `bg-surface-raised`| `--surface-raised` | `#ffffff` (White) | `#1f2937` (Elevation 2) | Modals, dropdown menus, popovers |
| `bg-surface-sunken`| `--surface-sunken` | `#f1f5f9` (Slate 100) | `#0b111e` (Elevation -1) | Wells, input backgrounds, search pills |
| `bg-overlay` | `--overlay` | `rgba(15, 23, 42, 0.45)` | `rgba(3, 7, 18, 0.75)` | Modal backdrop dimming |

### Text & Typography

| Token Utility | CSS Variable | Light Mode | Dark Mode | Contrast on Surface | Role |
|---|---|---|---|---|---|
| `text-fg` | `--fg` | `#0f172a` (Slate 900) | `#f8fafc` (Slate 50) | $\ge 14:1$ (AAA) | Primary headings and body copy |
| `text-fg-muted` | `--fg-muted` | `#475569` (Slate 600) | `#94a3b8` (Slate 400) | $\ge 5.6:1$ (AA) | Secondary labels, descriptions |
| `text-fg-subtle` | `--fg-subtle` | `#94a3b8` (Slate 400) | `#64748b` (Slate 500) | $\ge 3.2:1$ | Placeholders, inactive icons |
| `text-fg-inverse`| `--fg-inverse` | `#ffffff` | `#0f172a` | High | Contrast on solid brand buttons |

### Brand Colors

| Token Utility | CSS Variable | Light Mode | Dark Mode | Role |
|---|---|---|---|---|
| `bg-brand` / `text-brand` | `--brand` | `#4f46e5` (Indigo 600) | `#6366f1` (Indigo 500) | Primary brand actions & active states |
| `bg-brand-hover` | `--brand-hover` | `#4338ca` (Indigo 700) | `#818cf8` (Indigo 400) | Hover state for brand actions |
| `bg-brand-subtle` | `--brand-subtle` | `#eef2ff` (Indigo 50) | `rgba(99,102,241,0.15)` | Tinted pill backgrounds, active tabs |
| `bg-brand-secondary` | `--brand-secondary` | `#7c3aed` (Violet 600) | `#8b5cf6` (Violet 500) | Secondary brand accent, student milestones |

### Borders & Focus Rings

| Token Utility | CSS Variable | Light Mode | Dark Mode | Role |
|---|---|---|---|---|
| `border-border` | `--border` | `#e2e8f0` (Slate 200) | `#1e293b` (Slate 800) | Default card and divider borders |
| `border-border-strong`| `--border-strong` | `#cbd5e1` (Slate 300) | `#334155` (Slate 700) | Hover card borders, form focus borders |
| `focus-visible:ring-focus-ring`| `--focus-ring` | `#4f46e5` (Indigo 600) | `#818cf8` (Indigo 400) | Keyboard focus ring outlines |

### Semantic Status Colors

Desaturated in dark mode to prevent visual vibration:

| Semantic State | Base Token | Subtle BG Token | FG/Icon Token |
|---|---|---|---|
| **Success** | `bg-success` (`#16a34a` / `#34d399`) | `bg-success-subtle` | `text-success-fg` |
| **Warning** | `bg-warning` (`#d97706` / `#fbbf24`) | `bg-warning-subtle` | `text-warning-fg` |
| **Danger** | `bg-danger` (`#dc2626` / `#f87171`) | `bg-danger-subtle` | `text-danger-fg` |
| **Info** | `bg-info` (`#0284c7` / `#38bdf8`) | `bg-info-subtle` | `text-info-fg` |

---

## 3. Token Cheat Sheet (Migration Guide for Agents 13–15)

When migrating older templates, substitute old hardcoded classes with the new semantic tokens:

| Old Hard-coded Class | New Semantic Token | Note |
|---|---|---|
| `bg-white` | `bg-surface` | Default for cards, containers, panels |
| `bg-[#f9fafb]` / `bg-slate-50` | `bg-background` | Page canvas background |
| `bg-slate-100` | `bg-surface-sunken` | Wells, tags, input backgrounds |
| `text-slate-800` / `text-slate-900` | `text-fg` | Primary copy and titles |
| `text-slate-500` / `text-slate-600` | `text-fg-muted` | Subtitles, labels, timestamps |
| `text-slate-300` / `text-slate-400` | `text-fg-subtle` | Placeholder text, decorative icons |
| `border-slate-100` / `border-slate-200` | `border-border` | Component outlines and dividers |
| `border-slate-300` | `border-border-strong` | Active/hover borders |
| `text-indigo-600` / `text-indigo-500` | `text-brand` | Semantic brand link / icon |
| `bg-indigo-600` / `bg-indigo-500` | `bg-brand` | Semantic primary button / header |
| `bg-indigo-50` | `bg-brand-subtle` | Brand tag / badge background |
| `text-emerald-600` / `bg-emerald-50` | `text-success-fg bg-success-subtle` | Success state |
| `text-amber-600` / `bg-amber-50` | `text-warning-fg bg-warning-subtle` | Pending / alert state |
| `text-red-600` / `bg-red-50` | `text-danger-fg bg-danger-subtle` | Error / rejected state |

---

## 4. Component Usage Guide

All components live in `@/components/ui` and are exported from `@/components/ui/index.ts`.

### 1. Button
```tsx
import { Button } from "@/components/ui";

<Button variant="solid" colorType="primary" size="md">
  Apply Now
</Button>
<Button variant="outline" size="sm" isLoading={isSaving}>
  Save Changes
</Button>
```

### 2. StatusPill
Always use `StatusPill` for application stages, SIWES logbook statuses, and job statuses. Do **not** invent ad-hoc badge colors.
```tsx
import { StatusPill } from "@/components/ui";

<StatusPill status="offered" />
<StatusPill status="approved" />
<StatusPill status="needs_revision" />
```

### 3. StatCard & PageHeader
```tsx
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { Briefcase } from "lucide-react";

<PageHeader
  title="My Applications"
  description="Track your placement progress and company reviews."
  badge={<Badge variant="primary">Active</Badge>}
/>

<StatCard
  label="Total Applied"
  value={14}
  change={{ value: "+2 this week", trend: "up" }}
  icon={<Briefcase className="w-5 h-5" />}
/>
```

### 4. EmptyState
```tsx
import { EmptyState } from "@/components/ui";
import { BookOpen } from "lucide-react";

<EmptyState
  icon={<BookOpen className="w-8 h-8" />}
  title="No Logbook Entries"
  description="You have not submitted any weekly SIWES logs yet."
  action={{ label: "New Entry", href: "/dashboard/student/logbook/new" }}
/>
```

### 5. DataTable
Responsive by default. Supply `renderMobileCard` so mobile viewports render cards instead of cramped tables:
```tsx
import { DataTable } from "@/components/ui";

<DataTable
  data={applications}
  keyExtractor={(item) => item.id}
  columns={[
    { key: "role", header: "Role", sortable: true },
    { key: "company", header: "Company", sortable: true },
    { key: "status", header: "Status", render: (item) => <StatusPill status={item.status} /> }
  ]}
  renderMobileCard={(item) => (
    <div className="p-4 rounded-xl border border-border bg-surface">
      <p className="font-semibold">{item.role}</p>
      <StatusPill status={item.status} size="sm" />
    </div>
  )}
/>
```

---

## 5. Living Style Guide

Run `npm run dev` and navigate to:
```
http://localhost:3000/test-components
```
This is the interactive living style guide containing every component, variant, interactive state, and both themes side-by-side.
