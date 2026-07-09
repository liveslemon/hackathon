# Contributing

## Setup

1. Install dependencies:
   - `npm ci`
2. Validate environment:
   - `npm run check:env`
3. Start app:
   - `npm run dev`

## Quality workflow

Run this before opening a PR:

- `npm run verify`

`verify` runs lint, typecheck, tests, and production build.

## Scripts guide

- `npm run lint`: static lint checks
- `npm run typecheck`: TypeScript checks without emit
- `npm run test`: unit tests via Vitest
- `npm run build`: production build validation
- `npm run check:env`: validates required local env variables

## Task-driven improvements

Workstreams are tracked in the `tasks/` folder. When completing a task:

1. Update task status and checklist in its markdown file.
2. Link merged PR(s) or commit hash.
3. Capture verification output used to confirm completion.
