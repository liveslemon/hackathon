# Contributing to PAU Interconnect

## Development Setup

1. **Install dependencies:**
   ```bash
   npm ci
   ```
2. **Validate environment:**
   ```bash
   npm run check:env
   ```
3. **Start local development server:**
   ```bash
   npm run dev
   ```

---

## UI Component Architecture & Decision Guide

The codebase currently contains a mix of custom Tailwind UI components, React Aria, and Material-UI (MUI). Follow these guidelines when building or updating user interfaces:

### 1. Primary Choice: Shared UI Kit (`@/components/ui`)
For all common primitives, **always prefer `@/components/ui`**:
- **Buttons & Actions**: `Button` (supports `variant="solid"|"outline"|"ghost"|"link"`, `colorType="primary"|"secondary"|"danger"`, `isLoading`, `leftIcon`, `rightIcon`, accessible focus rings).
- **Form Controls**: `Input`, `Select`, `Textarea` (built-in label and error linking via `aria-describedby`, `aria-invalid`, `forwardRef` for React Hook Form integration).
- **Overlays & Dialogs**: `Modal` (built-in focus trap, Escape key handling, focus restoration, `role="dialog"`, `aria-modal="true"`, `aria-labelledby`).
- **Layout & Structure**: `Card` (`CardHeader`, `CardContent`, `CardFooter`), `Container`, `Stack`, `Divider`, `Badge`, `Skeleton`, `Typography`.

All `@/components/ui` components support both light and dark mode automatically, include `focus-visible` rings, and forward React refs.

### 2. Complex Interaction Primitives: `react-aria-components`
Use `react-aria-components` when building advanced accessible behaviors that require stateful WAI-ARIA patterns not covered by the primitive kit (e.g., multi-select listboxes, accessible tree views, date pickers, range sliders). Style them using Tailwind utility classes.

### 3. Material UI (`@mui/material`, `@mui/icons-material`) Policy
- **Existing pages**: Several existing pages (such as parts of analytics or student profiles) use MUI components. **Do not mass-migrate these existing pages** to prevent merge conflicts and regression risks across parallel branches.
- **New pages & features**: Avoid introducing new `@mui/material` dependencies. Stick to `@/components/ui` + Tailwind CSS to ensure bundle performance, avoid Emotion SSR style extraction overhead, and keep design tokens unified.

---

## Accessibility (a11y) Standards

Every UI view must meet WCAG 2.1 AA standards:
1. **Semantic HTML & Headings**: Ensure a logical heading hierarchy (`h1` -> `h2` -> `h3`). Never skip heading levels purely for styling (use `Typography` with `variant` and custom `className` instead).
2. **Form Accessibility**: Every input field must have an explicit label linked via `htmlFor` and `id`. Validation error messages must be linked via `aria-describedby` and flagged with `aria-invalid="true"`.
3. **Keyboard Navigation & Focus Management**:
   - All interactive controls must be reachable via `Tab` and activatable via `Enter` / `Space`.
   - Modals and drawers must trap focus while open, close on `Escape`, and restore focus to the trigger upon dismissal.
   - Visible focus indicators (`focus-visible:ring-2 focus-visible:ring-brand`) must never be suppressed without an accessible alternative.
4. **Color Contrast & Dark Mode**:
   - Contrast ratios must be at least 4.5:1 for body copy and 3:1 for large text across both light and dark themes.
   - Text classes must never use hardcoded low-contrast dark grays on dark backgrounds. Use the semantic CSS variables (`var(--foreground)`, `var(--foreground-muted)`) or `dark:` modifiers.
5. **Mobile Responsiveness**:
   - All layouts must adapt down to **360px** (small mobile viewport) without horizontal overflow or clipped text.
   - Touch targets must be at least 44x44px.

---

## Theming & Hydration Best Practices

- PAU Interconnect uses class-based dark mode (`.dark`) powered by `next-themes` and CSS variables registered in `app/globals.css`.
- Use `useTheme()` from `@/components/ThemeProvider` for toggling themes or inspecting active theme state.
- **Preventing Hydration Mismatch**: When rendering theme-dependent UI (e.g., Sun vs Moon icons), always guard with `mounted`:
  ```tsx
  const { resolvedTheme, mounted } = useTheme();
  if (!mounted) return <FallbackPlaceholder />;
  const isDark = resolvedTheme === "dark";
  ```
- In `app/layout.tsx`, ensure `suppressHydrationWarning` is present on the root `<html>` element to allow theme class hydration without warnings.

---

## Quality & Testing Workflow

Run the full verification suite before committing or submitting code:

```bash
npm run verify
```

### Script Reference

- `npm run lint`: ESLint check with Next.js core web vitals and TypeScript rules.
- `npm run typecheck`: TypeScript compilation check (`tsc --noEmit`).
- `npm run test`: Fast unit and integration tests via Vitest (`tests/lib/*.test.ts`).
- `npm run test:e2e`: End-to-end tests via Playwright (`tests/e2e/*.spec.ts`).
- `npm run build`: Next.js production build validation.
- `npm run check:env`: Validates required environment variables.

### Task-Driven Workflow

Task documents live in the `tasks/` directory. When completing a workstream:
1. Update status and checklist in the corresponding task markdown file.
2. Link relevant commit hashes.
3. Record command verification logs confirming zero errors.
