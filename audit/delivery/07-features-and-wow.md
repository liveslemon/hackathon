# 07 · Features and the "wow" layer

Ordered by value to PAU's launch. **F** = foundation features a production internship and SIWES system is expected to
have. **W** = wow features that make people talk about it.

## Foundation features

| ID | Feature | Why | Scope | Effort |
|---|---|---|---|---|
| F-1 | **Companies and teams** | One login per company doesn't work for real employers (HR, a line manager, an IT supervisor) | `companies` table (name, CAC no., domain, verified_at, logo); `company_members` (user, company, role: owner/recruiter/supervisor); internships belong to the company; migrate the existing employer profiles into companies | L |
| F-2 | **Academic supervisors and SIWES coordinator** | This is what makes it PAU's SIWES system, and the landing page already promises it | Roles `academic_supervisor` and `coordinator`; `siwes_sessions`; `supervisor_assignments`; a weekly review queue; a grade at the end | L |
| F-3 | **Interview scheduling** | Today "interview" is just a label | The employer sets slots (or a Calendly-style availability); the student picks one; `.ics` invites; reminders 24 h and 1 h before; reschedule/cancel; an optional meeting link field | M |
| F-4 | **Offers** | There's no document, deadline or decline | An offer with start/end dates, stipend and a deadline; a PDF offer letter (generated from a template); accept/decline; auto-expiry by cron | M |
| F-5 | **Messages inbox** | P1-9 | `/messages` for both roles, unread badge, realtime (Supabase Realtime is already used for the bell), templates for employers | M |
| F-6 | **Saved searches and alerts** | Retention: students come back when you tell them | Save filters; daily or weekly email "5 new roles match you"; reuses the matching scores | M |
| F-7 | **Screening questions** | Employers want to filter before reading CVs | Per-posting questions (text, yes/no, multiple choice); answers shown in applicant review; optional knock-out rules | M |
| F-8 | **Weekly logbook sign-off** | SIWES is assessed weekly in practice | A week view; the industry supervisor signs a week (one action, not 5 approvals); the academic supervisor countersigns; the PDF shows signatures and dates | M |
| F-9 | **Evaluation and completion** | Closes the loop and gives the grade | An employer evaluation form (rubric) and the student's final report upload; academic grade; a completion certificate PDF with a QR verification link | M |
| F-10 | **Announcements** | Coordinators need to reach cohorts | Admin or coordinator posts to a role, programme or session; in-app banner plus email | S |
| F-11 | **Employer verification queue** | P1-4 | Evidence (CAC no., website, email domain), approve/reject with a reason, a badge | S |
| F-12 | **Admin support tools** | Support without database access | View-as (read-only, audited), resend verification, force password reset, unlock a stuck job, re-run matching for a user | M |
| F-13 | **Privacy and terms pages and consent** | NDPA (06) | `/privacy`, `/terms`, consent stored on the profile | S |
| F-14 | **Health panel** | Run the platform without logs | Queue depth, failed jobs (with retry), LLM provider status (`/api/admin/llm-health` exists, with no UI), last backfill, email failures | S |
| F-15 | **Accessibility statement and keyboard pass** | A university requirement in many places | Formal WCAG 2.2 AA pass on the 10 most-used pages; a statement page | M |

## Wow layer

These are cheap to build *because* the matching and AI pieces already exist.

| ID | Wow | What the user sees | How (reusing what's there) | Effort |
|---|---|---|---|---|
| W-1 | **"Your next step" coach card** | The student dashboard's top card says the single most useful thing to do now: "Add 2 projects to lift your match on 6 roles", "3 roles you'd fit close Friday", "Log today's work (streak: 9 days)". | Rules over profile completeness, `match_results.score_breakdown`, deadlines and the logbook streak. No LLM needed; an optional LLM paragraph for scores ≥ 80 (already built). | M |
| W-2 | **CV → profile in 10 seconds** | Upload a CV during onboarding, and the profile fills itself (skills, experience, projects) with "confirm" chips | The CV parser and `cv_structured` exist; map them into profile fields with a review step | M |
| W-3 | **Live impact counters on the landing page** | "128 students placed this session · 42 partner companies · 1,904 logbook days signed", updating live | A public `platform_stats` materialized view refreshed hourly by pg_cron. This replaces the made-up numbers (P0-6). | S |
| W-4 | **Match explainer** | Hover or tap a match % to see a radar of skills / experience / projects / semantic fit, the matched and missing skills, and "how to close the gap" | `score_breakdown`, `matching_skills` and `missing_skills` are already stored per pair | S |
| W-5 | **One-tap apply with a tailored CV summary** | Apply in one tap; the employer sees a 3-line AI summary of why this student fits *this* role | Reuse the cover-letter generator to make a short pitch at apply time; cache it with the application | S |
| W-6 | **Employer "top 5" digest** | Every Monday, employers get "Top 5 new candidates for Frontend Intern" with one-click shortlist links | Ranked from `match_results`; signed magic links for the actions | M |
| W-7 | **Logbook voice notes → entry** | The student records 30 s on their phone; it becomes a clean logbook entry | Browser recording → Whisper-class transcription (Groq offers it) → the existing enhance prompt | M |
| W-8 | **Verified certificate with QR** | The completion certificate has a QR code that opens `/verify/<code>` showing it's genuine | A signed code stored on the placement; a public verify page | S |
| W-9 | **Command palette everywhere (⌘K)** | Jump to any page, internship, student or action by typing | `SearchOverlay` exists for admin; generalise it per role | S |
| W-10 | **Installable PWA and offline logbook** | Add to home screen; write logbook entries offline, synced later | Next PWA manifest + service worker; queue entries in IndexedDB | M |
| W-11 | **Coordinator heatmap** | A map or grid of where PAU students are placed, by programme and company, with unplaced students highlighted | Aggregates over placements; recharts heatmap | S |
| W-12 | **Interview prep pack** | After an interview is booked: 5 likely questions for this role, based on the posting and the student's gaps | An LLM call per booked interview (cheap, cached) | S |

## Not recommended (yet)

- **A native mobile app.** The PWA (W-10) covers the need at a fraction of the cost.
- **Payments for employers.** Not needed for a university platform at this stage.
- **More LLM providers.** Fewer, better ones (05 RL-6).
