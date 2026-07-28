# Project Agents

This folder contains custom VS Code Copilot agents for this repository.

## How to add a new agent

1. Create a file ending in `.agent.md` in this folder.
2. Add YAML frontmatter (`name`, `description`, optional tools/model settings).
3. Add clear behavior instructions in the body.

## Minimal template

```md
---
name: your-agent-name
description: "Use when: short trigger phrases for this agent"
---

You are a specialized agent for this project.

Goals:

- Goal 1
- Goal 2

Constraints:

- Constraint 1
- Constraint 2

Workflow:

1. Step 1
2. Step 2
```

## Notes

- Keep descriptions explicit: include the words users are likely to type.
- Prefer one purpose per agent.
- Store shared, always-on project rules in `.github/copilot-instructions.md` (optional), not inside every agent.

## Frontend Agent Catalog

- `frontend-ui-system`: component architecture, styling consistency, and visual polish.
- `frontend-routing-navigation`: App Router structure, layouts, auth guards, and navigation flows.
- `frontend-data-state`: server/client data boundaries, caching, and state correctness.
- `frontend-forms-validation`: form UX, validation, submissions, and optimistic/error states.
- `frontend-accessibility`: semantic HTML, keyboard support, ARIA usage, and a11y regressions.
- `frontend-performance`: rendering performance, bundle pressure, and loading strategies.
- `frontend-testing`: unit, component, integration, and regression-safe frontend tests.
- `frontend-orchestrator`: routes a user prompt to the best specialist agent(s), then synthesizes output.

## Frontend Agent Usage Cheat Sheet

Use these prompts as templates when selecting an agent in chat.

- `frontend-ui-system`
  Example prompt: "Refactor the internship cards into reusable UI primitives and improve visual hierarchy without changing behavior."
- `frontend-routing-navigation`
  Example prompt: "Fix student-to-dashboard redirects and clean up nested layout navigation for admin and employer routes."
- `frontend-data-state`
  Example prompt: "Improve dashboard data fetching to avoid duplicate requests and stale state between server and client components."
- `frontend-forms-validation`
  Example prompt: "Harden onboarding form validation, prevent double submit, and show clear field-level errors from API responses."
- `frontend-accessibility`
  Example prompt: "Audit the login and onboarding flows for keyboard traps, missing labels, and incorrect ARIA usage, then fix issues."
- `frontend-performance`
  Example prompt: "Optimize initial dashboard render time by reducing unnecessary re-renders and lazy-loading non-critical UI blocks."
- `frontend-testing`
  Example prompt: "Add regression tests for internship search/filter interactions and stabilize flaky component tests."
- `frontend-orchestrator`
  Example prompt: "This task touches UI polish, form validation, and performance on onboarding. Select the right frontend agents, propose a unified plan, then implement and verify."

Orchestrator-first pattern:

1. Start with `frontend-orchestrator` for cross-cutting prompts.
2. Let it pick specialist agents based on scope.
3. Use `verification` at the end for quality-gate confirmation.
