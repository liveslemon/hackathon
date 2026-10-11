# BUG FIX: Replace Hardcoded Backend URLs with Environment Variable

## Priority: 🔴 CRITICAL

## Effort: Low (30 min)

## Problem

Two employer files use hardcoded `http://localhost:8000` instead of the `getBackendUrl()` helper from `lib/env.ts`. This means these features **completely break** in production/staging.

## Files to Modify

### 1. `app/dashboard/employer/settings/SettingsClient.tsx`

**Current (broken):**

```tsx
const { authenticatedFetch } = await import("@/lib/api");
await authenticatedFetch<{ success?: boolean }>(
  "http://localhost:8000/api/employer/profile",
  {
    method: "PATCH",
    body: JSON.stringify(formData),
  },
);
```

**Fix:**

```tsx
const { authenticatedFetch } = await import("@/lib/api");
await authenticatedFetch<{ success?: boolean }>("/api/employer/profile", {
  method: "PATCH",
  body: JSON.stringify(formData),
});
```

> `authenticatedFetch` in `lib/api.ts` already prepends the backend URL via `getBackendUrl()`. The path should be relative.

### 2. `app/companies/[id]/CompanyClient.tsx`

**Current (broken):**

```tsx
const res = await fetch(`http://localhost:8000/api/companies/${employerId}`);
```

**Fix — Option A (use authenticatedFetch):**

```tsx
import { authenticatedFetch } from "@/lib/api";

// Inside the useEffect:
const json = await authenticatedFetch<CompanyResponse>(
  `/api/companies/${employerId}`,
);
setData(json);
```

**Fix — Option B (use getBackendUrl for unauthenticated):**

```tsx
import { getBackendUrl } from "@/lib/env";

// Inside the useEffect:
const res = await fetch(`${getBackendUrl()}/api/companies/${employerId}`);
```

> Use Option A if the endpoint requires auth. Use Option B if the company page is public.

## How `lib/env.ts` Already Works

The app already has `getBackendUrl()` which returns:

- `NEXT_PUBLIC_BACKEND_URL` env var if set
- `http://localhost:8000` in development
- `https://pau-interconnect-backend.onrender.com` in production

## Verification

1. Set `NEXT_PUBLIC_BACKEND_URL` in `.env.local` to a test value
2. Load the settings page — confirm it calls the correct URL (check Network tab)
3. Load a company page — confirm it calls the correct URL
4. Build for production (`npm run build`) — confirm no hardcoded localhost in output

## Acceptance Criteria

- [ ] No instance of `localhost:8000` in any employer file
- [ ] Settings page saves profile using `authenticatedFetch` with relative path
- [ ] Company page fetches using `getBackendUrl()` or `authenticatedFetch`
- [ ] Both pages work with `NEXT_PUBLIC_BACKEND_URL` env var set


STATUS: COMPLETE
