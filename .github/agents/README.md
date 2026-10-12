# PAU Interconnect — Parallel Multi-Agent Coordination

This repository is developed by 9 AI agents working in parallel worktrees to achieve high engineering velocity without merge conflicts.

## Agent Ownership Matrix

| Agent | Branch | Ownership Area | Key Directories & Scope |
|---|---|---|---|
| 01 | `agent/01-auth` | Authentication & User Sessions | Auth flows, role assignment, password recovery, session cookies |
| 02 | `agent/02-ai-cv` | AI CV Parsing & ATS Analysis | OCR/PDF text extraction, ATS scoring, embedding generation |
| 03 | `agent/03-discovery-apply` | Internship Discovery & Applications | Search filters, matching cards, application modal, cover letter |
| 04 | `agent/04-profile-privacy` | Profiles & Data Privacy | Student profile settings, privacy controls, GDPR export |
| 05 | `agent/05-logbook` | SIWES Digital Logbook | Weekly entry submissions, approvals, placement linking, export |
| 06 | `agent/06-employer` | Employer Portal & Pipeline | Job postings, candidate Kanban pipeline, applicant review |
| 07 | `agent/07-admin-notify` | Admin Portal & Notifications | Admin metrics, Brevo emails, in-app notifications, edge functions |
| 08 | `agent/08-platform-db` | Database, Infrastructure & Core Tooling | Root configurations, database schemas, CI/CD, migration runner |
| 09 | `agent/09-ui-qa` | Shared UI Kit, Theming, A11y & E2E Testing | `@/components/ui`, globals.css, theme provider, error boundaries, Playwright E2E |

## Conflict Prevention Rules

1. **Strict File Ownership**: Agents edit only their assigned files.
2. **Shared Files**: `types/domain.ts`, `types/api.ts`, `lib/api.ts`, `components/ui/*` are append-only.
3. **Database Migrations**: Never modify existing migrations. Create new timestamped migrations prefixed with your agent number (`20261013<NN>MMSS_<agent>_<desc>.sql`).
4. **Handoffs Protocol**: Any change required in another agent's domain must be documented in the `audit/<branch>.md` handoff section.
