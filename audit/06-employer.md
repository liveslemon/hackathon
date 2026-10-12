# Agent 06 Employer Area Audit Report

**Branch:** `agent/06-employer`  
**Area Ownership:** Everything an employer does to recruit: dashboard, posting/editing/closing internships, templates and drafts, applicant review, pipeline stages, decisions and audit trail, messaging, and employer analytics.

---

## 1. Feature Checklist

| Feature / Route / Page | Status | Details |
| :--- | :---: | :--- |
| `app/dashboard/employer/page.tsx` | ✅ verified | Root employer dashboard layout and session role guards. |
| `app/dashboard/employer/EmployerParts.tsx` | 🔧 fixed | Added 4 metric cards (Active Roles, Total Applicants, Acceptance Rate, Pending Reviews), weekly activity summary, and first-time employer welcome card. |
| `app/dashboard/employer/EmployerActivityClient.tsx` | 🔧 fixed | Added relative timestamps (`formatDistanceToNow`) and search filtering. |
| `app/dashboard/employer/EmployerInternshipListClient.tsx` | 🔧 fixed | Added sorting (Newest, Deadline, Applicants), Clone Posting action, toast feedback, and fixed unused icons. |
| `app/dashboard/employer/EmployerQuickActionsClient.tsx` | ✅ verified | Fast navigation toolbar to create posts, manage templates, and review applicants. |
| `app/dashboard/post/page.tsx` & `PostInternshipView.tsx` | 🔧 fixed | Server Zod validation integration, draft support, and error boundary handling. |
| `app/api/internships/post/route.ts` | 🔧 fixed | Server Zod schema validation, employer role guard, and background match trigger. |
| `app/api/internships/[id]/route.ts` | 🔧 fixed | Strict ownership guard (`employer_id === user.id \|\| poster_id === user.id`), Zod partial validation, soft-delete. |
| `app/api/internships/[id]/status/route.ts` | 🔧 fixed | Cross-employer authorization guard and status transition enforcement. |
| `app/dashboard/employer/internships/[id]/edit/**` | ✅ verified | Pre-filled form with validation and redirect on save. |
| `app/api/internships/templates/route.ts` | 🔧 fixed | Fixed Supabase `{ count: "exact", head: true }` property resolution bug; enforced 20-template cap and Zod schema. |
| `app/api/internships/templates/[id]/route.ts` | 🔧 fixed | Added template ownership verification and deletion endpoint. |
| `app/dashboard/employer/internships/[id]/page.tsx` | ✅ verified | Strict employer verification and student privacy masking (`maskStudentForEmployer`). |
| `app/dashboard/employer/internships/[id]/ApplicantReviewClient.tsx` | 🔧 fixed | Added status filter pills with counts, sort dropdown, fresh signed CV viewer, and inline modal for `MessageThread`. |
| `app/dashboard/employer/internships/[id]/PipelineView.tsx` | ✅ verified | Kanban board stage transitions with server sync. |
| `app/api/applications/[id]/stage/route.ts` | 🔧 fixed | Enforced finite-state stage transitions, terminal state lock (`accepted`, `rejected`, `withdrawn`), audit log creation, and email result reporting. |
| `app/api/applications/[id]/status/route.ts` | 🔧 fixed | Ownership validation, stage/status synchronization, decision audit logging, and email notification. |
| `app/api/audit/[targetId]/route.ts` | 🔧 fixed | Server-side authorization check preventing decision note leaks to unauthorized parties. |
| `components/DecisionTimeline.tsx` | ✅ verified | Clean history logs rendering with sanitized typography quotes. |
| `app/api/messages/start/route.ts` | 🔧 fixed | Fixed student foreign key lookup bug (`user_id` instead of invalid `student_id`), participant authorization, idempotent conversation creation, and XSS sanitization. |
| `app/api/messages/[conversationId]/route.ts` | 🔧 fixed | Participant verification, message length/content validation, XSS sanitization, and auto-marking read status. |
| `app/api/messages/unread/route.ts` | 🔧 fixed | Created unread message count endpoint across user's conversations. |
| `components/MessageThread.tsx` | 🔧 fixed | Integrated Supabase Realtime with automatic 6-second polling fallback, typed messages, and responsive layout. |
| `app/dashboard/employer/analytics/**` | 🔧 fixed | Added empty state with CTA for new employers with 0 postings; replaced untyped arrays. |
| `app/dashboard/analytics/page.tsx` & `AnalyticsView.tsx` | 🔧 fixed | Replaced hardcoded 0 application counts with real counts from `applied_internships`. |
| `app/dashboard/employer/internships/debug.tsx` | 🔧 fixed | Deleted dead debug file. |

---

## 2. Bugs Fixed

1. **`applied_internships.user_id` schema bug**:
   - **File & Line**: `frontend/pau-interconnect-app/app/api/messages/start/route.ts:25`
   - **Commit**: `18374f3`
   - **Bug**: Queried `applied_internships.student_id` which does not exist in schema (`user_id` is foreign key). Resulted in `student_id` evaluating to `undefined` and throwing an error on conversation creation.
   - **Fix**: Changed query to `applied_internships.user_id` and verified participant mapping.

2. **Supabase `{ count: "exact", head: true }` count extraction**:
   - **File & Line**: `frontend/pau-interconnect-app/app/api/internships/templates/route.ts:50`
   - **Commit**: `15baa97`
   - **Bug**: With `head: true`, `data` is null and `count` is a root-level property on the response. The code was doing `const count = data || 0`, always resolving count to 0 and bypassing the 20-template cap.
   - **Fix**: Changed extraction to `const { count } = await supabase...` and default to `count ?? 0`.

3. **Missing authorization on decision audit log**:
   - **File & Line**: `frontend/pau-interconnect-app/app/api/audit/[targetId]/route.ts:18`
   - **Commit**: `18374f3`
   - **Bug**: Any authenticated user could query `/api/audit/[targetId]` and view confidential employer internal notes and candidate review history for any target.
   - **Fix**: Added server-side role and ownership verification: only platform admins, the employer who owns the target application/internship, or the applicant student can access the audit trail.

4. **Cross-employer modification on internship endpoints**:
   - **File & Line**: `frontend/pau-interconnect-app/app/api/internships/[id]/route.ts:28` & `[id]/status/route.ts:25`
   - **Commit**: `15baa97`
   - **Bug**: Missing validation checks allowing one employer to update or close postings belonging to another employer.
   - **Fix**: Implemented strict ownership check `internship.employer_id === user.id || internship.poster_id === user.id`, returning 403 Forbidden on mismatch.

5. **Direct Unvalidated Supabase Insertion on Post Page**:
   - **File & Line**: `frontend/pau-interconnect-app/app/dashboard/post/PostInternshipView.tsx:40`
   - **Commit**: `15baa97`
   - **Bug**: The posting view bypassed server-side validation and inserted directly to Supabase client, leaving fields unvalidated and relying on client-only checks.
   - **Fix**: Routed post creation through `/api/internships/post` with server Zod validation and draft support.

6. **Missing empty state on Employer Analytics**:
   - **File & Line**: `frontend/pau-interconnect-app/app/dashboard/employer/analytics/AnalyticsClient.tsx:30`
   - **Commit**: `3adc1fe`
   - **Bug**: New employers with 0 postings saw NaN rates and blank chart areas.
   - **Fix**: Added empty state banner encouraging posting with CTA.

7. **Dead debug file removal**:
   - **File**: `frontend/pau-interconnect-app/app/dashboard/employer/internships/debug.tsx`
   - **Commit**: `15baa97`
   - **Bug**: Unused development debug file remained in production tree.
   - **Fix**: Deleted via `git rm`.

---

## 3. Tests Added

### Frontend Tests (Vitest)
Ran:
```bash
cd frontend/pau-interconnect-app && npm run test
```
**Result:** 9 test files passed, 47 tests passed (0 failed).

1. `tests/lib/employer-validations.test.ts` (15 tests):
   - Validates `postInternshipSchema` with full payloads, defaults, string slot parsing, negative slot clamping, and rejects short fields or invalid enums.
   - Validates `updateInternshipSchema` partial updates and status enums.
   - Validates `internshipTemplateSchema` naming and length limits.
   - Validates `messageInputSchema` content constraints (non-empty, max 5000 chars).
   - Validates `applicationStageUpdateSchema` for valid finite-state machine transitions.
   - Validates `applicationStatusUpdateSchema` for valid decision states.

2. `tests/lib/internship-columns.test.ts` (6 tests):
   - Ensures `INTERNSHIP_LIST_COLUMNS` contains all required listing fields and excludes heavy 1024-float embeddings to save network payload.
   - Tests `isOpenInternship` for active status without deadline, future deadline, past deadline, and non-active statuses.

3. `tests/api/employer-routes.test.ts` (9 tests):
   - `POST /api/internships/post`: 401 when unauthenticated, 403 when non-employer.
   - `PATCH /api/internships/[id]`: 403 cross-employer access block.
   - `PATCH /api/internships/[id]/status`: 403 cross-employer access block.
   - `PATCH /api/applications/[id]/stage`: 404 when not found, 403 when non-owner employer, 400 when attempting illegal transition from terminal state.
   - `POST /api/messages/start`: 403 when non-owner employer.
   - `POST /api/messages/[conversationId]`: 403 when user is not a conversation participant.

### Backend Tests (pytest)
Ran:
```bash
cd backend && .venv/bin/pytest tests/employer
```
**Result:** 5 passed in 0.03s.

1. `backend/tests/employer/test_employer_api.py` (5 tests):
   - `test_get_applicants_unauthorized`: Verifies 401/403 without authentication.
   - `test_get_applicants_cross_employer_forbidden`: Verifies 403 when employer A accesses applicants of employer B.
   - `test_get_applicants_owner_success`: Verifies 200 with applicants and match scores when owner accesses.
   - `test_update_application_status_not_found`: Verifies 404 for nonexistent application.
   - `test_update_application_status_owner_success`: Verifies 200 status update for authorized owner.

### Quality Checks
- `npm run lint`: Passed with 0 errors.
- `npm run typecheck`: Passed with 0 errors (`tsc --noEmit`).

---

## 4. New Migrations

File created:  
`frontend/pau-interconnect-app/supabase/migrations/20261013060000_06_employer_rls_and_messaging_audit.sql`

**What it does:**
1. **Idempotent Column Additions**:
   - Adds `status`, `location`, `duration`, `stipend`, `required_skills`, `slots`, `view_count` to `internships` if not exists.
   - Adds `stage`, `status`, `decision_notes`, `internal_notes`, `decided_at`, `decided_by` to `applied_internships` if not exists.
2. **Tables Created**:
   - `conversations`: Links `application_id`, `employer_id`, `student_id` with unique constraint on `application_id`.
   - `messages`: Records messages between participants with `conversation_id`, `sender_id`, `content`, `is_read`.
   - `internship_templates`: Allows employers to save reusable posting blueprints.
   - `decision_audit_log`: Immutable audit log recording decision actions, actors, targets, and notes.
3. **Row-Level Security (RLS)**:
   - Enables RLS on all 4 tables.
   - Drops and recreates policies idempotently:
     - `conversations`: Only participants (employer or student) can select and insert.
     - `messages`: Only conversation participants can select, insert, or update (mark read).
     - `internship_templates`: Only the owning employer can CRUD their own templates.
     - `decision_audit_log`: Admins, actor, target student, or owning employer can view audit entries.

---

## 5. Handoffs

1. **`backend/routers/applications.py`**:
   - In `_assert_can_manage_internship` (line 248), the query currently checks `internship_res.data.get("poster_id") == user_id`. In several database tables and migrations, the employer reference column is named `employer_id` (or both are populated).
   - **Recommended change**: Check `poster_id == user_id || employer_id == user_id` to prevent false 403s when postings were created with `employer_id`.
   - **Reason**: Agent 06 does not own `backend/routers/applications.py`, so this should be addressed by the backend router owner.

2. **Sidebar Navigation for Messages**:
   - `components/DashboardSidebar.tsx` (owned by Agent 07 / Navigation):
   - **Recommended change**: Add `{ label: "Messages", icon: MessageSquare, href: "/messages", badge: unreadCount }` to employer and student navigation items.
   - **Reason**: Allows quick global access to conversations alongside the inline messaging modal in applicant review.

---

## 6. Manual Test Steps in the Browser

1. **Post Internship**:
   - Log in as an employer (`/login/employer`).
   - Navigate to `/dashboard/post`.
   - Fill in role, field, category, location, stipend, duration, and requirements.
   - Click "Save as Draft": verify it appears under the "Drafts" section on `/dashboard/employer/internships`.
   - Click "Publish" on a posting: verify it transitions to Active and shows in the list.

2. **Internship Management**:
   - Navigate to `/dashboard/employer/internships`.
   - Test sorting by "Newest First", "Deadline (Soonest)", and "Most Applicants".
   - Click the actions dropdown on a posting card:
     - Click "Clone Posting": verify a draft copy is created.
     - Click "Close Posting": verify badge switches to "Closed".
     - Click "Reopen Posting": verify badge switches back to "Active".

3. **Applicant Review & PII Privacy**:
   - From `/dashboard/employer/internships`, click "Review Applicants" on a posting with applicants.
   - Verify student name and match score are displayed, while unconsented sensitive contact information is masked.
   - Click "View CV / Resume": verify a new tab opens `/cv/view` with a fresh signed URL without expiring.
   - Switch between "List View" and "Pipeline View".
   - Test filtering by status pills: "All", "Pending", "Accepted", "Rejected" and check that counts update.

4. **Pipeline Stage Updates & Decisions**:
   - In candidate expanded dossier, select stage from dropdown (e.g. `Interview`, `Offered`, `Rejected`).
   - Verify the stage pill updates optimistically.
   - Verify the decision history appears in the `DecisionTimeline` component below the cover letter.
   - Confirm a toast indicates whether an email notification was sent to the student or skipped based on their preferences.

5. **Messaging**:
   - In the candidate expanded dossier, click the "Message" button.
   - Verify the messaging modal opens displaying the student's name.
   - Type a message and hit Enter or click "Send".
   - Verify message appears on the right side in brand color with timestamp.
   - Verify real-time or polling refresh loads new replies.

6. **Employer Analytics**:
   - Navigate to `/dashboard/employer/analytics`.
   - Verify metric cards (Application Volume, Acceptance Rate, Match Score Distribution) render numbers matching the database.
   - If account has no postings, verify friendly empty state banner displays.
