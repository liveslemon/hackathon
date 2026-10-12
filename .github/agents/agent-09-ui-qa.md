# Agent 09: UI Kit, Theming, Accessibility & Quality Assurance

**Branch**: `agent/09-ui-qa`  
**Role**: Shared UI Kit Owner, Design System Guardian, Accessibility/Responsiveness Auditor, and End-to-End Test Suite Architect.

## Domain Responsibilities

1. **Shared Design System Primitives (`components/ui/**`)**:
   - `Button`, `Input`, `Select`, `Textarea`, `Modal`, `Card`, `Badge`, `Skeleton`, `Divider`, `Container`, `Stack`, `Typography`.
   - Full support for `forwardRef`, accessible focus rings, and proper ARIA relationships (`aria-describedby`, `aria-invalid`, `aria-busy`, `aria-modal`, `aria-labelledby`).
2. **Theming & Color Systems**:
   - Class-based Tailwind v4 `@variant dark (&:where(.dark, .dark *))` support.
   - Central CSS variable definitions for light and dark palettes in `app/globals.css`.
   - Hydration-safe `ThemeProvider` and `ThemeToggle` integrated with `next-themes`.
3. **Resilience & Error Handling**:
   - Route-level `loading.tsx` skeletons and `error.tsx` error boundaries across all app routes.
   - Comprehensive `GlobalErrorBoundary` with user recovery actions.
4. **Data Utilities & Security**:
   - `lib/csv.ts` compliant with RFC 4180 and protected against CSV/formula injection attacks (`=`, `+`, `-`, `@`, `\t`, `\r`) with UTF-8 BOM.
5. **Quality Assurance & End-to-End Testing**:
   - Playwright test framework (`playwright.config.ts`).
   - Mocked Supabase network layer for deterministic, network-independent test runs.
   - Core journey test suites (`tests/e2e/**`):
     - Protected routes authentication guards.
     - Student signup, onboarding, browse, apply, and status tracking.
     - Employer onboarding, job posting, and applicant pipeline.
     - SIWES logbook submission, supervisor review, and print layout.
     - Admin login, stats overview, and system analytics.
