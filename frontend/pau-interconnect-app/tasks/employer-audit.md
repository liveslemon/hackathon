# Employer Feature Audit — PAU InterConnect

## CURRENT FEATURES (with improvements needed per feature)

---

### 1. Employer Login

**Files:** `app/login/employer/page.tsx`  
**Status:** ✅ Working

**Improvements needed:**

- No "forgot password" flow specific to employers
- No multi-factor authentication option
- No "remember me" / session persistence toggle
- No rate limiting on login attempts (client-side)

---

### 2. Employer Onboarding

**Files:** `app/onboarding/employer/page.tsx`, `app/api/onboarding/complete/route.ts`  
**Status:** ✅ Working

**Improvements needed:**

- No logo/banner upload during onboarding (must go to settings after)
- No team member invite during onboarding
- No verification step (any email can register as employer)
- Missing company size / headcount field
- Missing location/address field
- No progress indicator showing steps remaining

---

### 3. Dashboard Overview

**Files:** `app/dashboard/employer/page.tsx`, `app/dashboard/employer/EmployerClient.tsx`, `app/dashboard/employer/EmployerParts.tsx`, `app/dashboard/employer/EmployerActivityClient.tsx`  
**Status:** ✅ Working

**Improvements needed:**

- 🔴 **"Add Posting" quick action button points to `#`** — completely broken
- Only shows 2 metrics (Active Postings, Total Applicants) — should show acceptance rate, avg time-to-fill, pending reviews
- Recent applicants section doesn't show application date
- No "time since" indicators (e.g., "applied 2 hours ago")
- No notification bell or unread count for new applications
- No welcome message for first-time employers (empty state)

---

### 4. Post Internship (Create)

**Files:** `app/dashboard/employer/EmployerClient.tsx` (PostInternshipButton component)  
**Status:** ✅ Working

**Improvements needed:**

- Uses `window.location.reload()` after posting instead of optimistic UI / `router.refresh()`
- No field length validation (can submit single-character descriptions)
- No rich text editor for description/requirements
- No salary/stipend field
- No duration field (how many weeks/months)
- No location field (city/campus)
- No required skills field (only free-text tags)
- No preview before publishing
- No draft save capability
- No posting templates for recurring roles

---

### 5. My Postings List

**Files:** `app/dashboard/employer/internships/page.tsx`, `app/dashboard/employer/EmployerInternshipListClient.tsx`  
**Status:** ✅ Working

**Improvements needed:**

- No sort options (can't sort by deadline, applicant count, date created)
- No status management (can't close/pause/reopen a posting)
- No duplicate/clone posting action
- No edit existing posting action
- No delete/archive posting
- No view count shown per posting
- Pagination at 6 items is low — should be configurable or use infinite scroll

---

### 6. Applicant Review

**Files:** `app/dashboard/employer/internships/[id]/page.tsx`, `app/dashboard/employer/internships/[id]/ApplicantReviewClient.tsx`  
**Status:** ✅ Working

**Improvements needed:**

- 🔴 **No decision audit trail** — no record of who rejected, when, or why
- No rejection reason / feedback to student
- No custom notes per applicant (internal recruiter notes)
- No bulk accept/reject
- No applicant tagging system (e.g., "shortlisted", "interview", "maybe")
- No sorting by match score, date, or name
- No filter by status (show only pending, only accepted, etc.)
- CV signed URL can expire mid-viewing session — no refresh mechanism
- No side-by-side candidate comparison
- No way to export applicant list (CSV/PDF)
- No email notification to student on decision

---

### 7. Logbook Review

**Files:** `app/dashboard/employer/logbook/page.tsx`, `app/dashboard/employer/logbook/LogbookReviewClient.tsx`  
**Status:** ✅ Working

**Improvements needed:**

- No feedback notes when approving (only when flagging)
- No revision tracking (who reviewed, when)
- No bulk approve for routine entries
- No weekly/monthly summary view (only individual entries)
- No filter by student or date range
- No performance score tracking over time
- No export functionality for SIWES compliance reports

---

### 8. Company Settings / Profile Management

**Files:** `app/dashboard/employer/settings/page.tsx`, `app/dashboard/employer/settings/SettingsClient.tsx`  
**Status:** ⚠️ Partially Broken

**Improvements needed:**

- 🔴 **CRITICAL: Hardcoded `http://localhost:8000/api/employer/profile`** — will not work in production
- 🔴 **Upload and metadata save are decoupled** — can upload logo but fail to save profile, leaving orphaned assets
- No server-side validation
- No image dimension/aspect ratio constraints (logo could be 5000x1px)
- No file size limit enforcement on client
- No change history / revision tracking
- No "revert to previous" capability
- No team members management
- No notification preferences section
- Missing social media links fields

---

### 9. Company Public Profile Page

**Files:** `app/companies/[id]/page.tsx`, `app/companies/[id]/CompanyClient.tsx`  
**Status:** ✅ Working

**Improvements needed:**

- 🔴 **Hardcoded backend URL** (`http://localhost:8000/api/companies/{id}`)
- No fallback images if logo/banner missing
- No employee testimonials section
- No "Follow Company" button for students
- No contact information display
- No social media links
- No reviews/ratings from past interns

---

### 10. Sidebar Navigation

**Files:** `components/Sidebar.tsx`  
**Status:** ✅ Working

**Improvements needed:**

- Only 3 navigation items for employers (Company Home, My Postings, Review Logbooks) vs 4 for students
- No analytics/reports nav item
- No notifications indicator
- No quick-post shortcut in sidebar
- "Company Public Page" link disabled if no `userProfile.id` — confusing to user

---

## EXTRA FEATURES TO ADD (integrated across all user types)

### Priority 1 — Critical Gaps

| Feature                  | Employer                                          | Student                                  | Admin                            |
| ------------------------ | ------------------------------------------------- | ---------------------------------------- | -------------------------------- |
| **In-app Notifications** | New applications, logbook submissions             | Application status changes, new postings | Platform alerts, flagged content |
| **Messaging System**     | Message applicants, send offers                   | Message employers, ask questions         | Broadcast announcements          |
| **Analytics Dashboard**  | Posting performance, funnel metrics, time-to-fill | Application success rate, profile views  | Platform-wide KPIs, user growth  |
| **Email Notifications**  | New applicants, deadline reminders                | Status updates, new matches              | Weekly digest, system alerts     |

### Priority 2 — Recruitment Pipeline

| Feature                  | Employer                                                                                   | Student                               | Admin                           |
| ------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------- | ------------------------------- |
| **Application Stages**   | Move applicants through: Applied → Reviewed → Shortlisted → Interview → Offered → Accepted | See current stage of each application | See pipeline health metrics     |
| **Interview Scheduling** | Set available slots, send invites                                                          | Book interview time, get reminders    | Monitor scheduling activity     |
| **Offer Management**     | Create/send formal offers with terms                                                       | Accept/decline offers                 | Track offer-to-acceptance ratio |
| **Rejection Feedback**   | Select reason template + optional custom note                                              | Receive constructive feedback         | Monitor feedback quality        |

### Priority 3 — Content & Discoverability

| Feature                    | Employer                                           | Student                      | Admin                       |
| -------------------------- | -------------------------------------------------- | ---------------------------- | --------------------------- |
| **Posting Templates**      | Save/reuse common posting structures               | N/A                          | Provide default templates   |
| **Company Followers**      | See follower count, notify on new posts            | Follow companies, get alerts | See most-followed companies |
| **Rich Text Descriptions** | Formatted job descriptions with lists, bold, links | Formatted cover letters      | N/A                         |
| **Posting Draft/Schedule** | Save drafts, schedule future publish date          | Save application drafts      | Review scheduled posts      |

### Priority 4 — Compliance & Reporting

| Feature                       | Employer                                  | Student                  | Admin                             |
| ----------------------------- | ----------------------------------------- | ------------------------ | --------------------------------- |
| **SIWES Compliance Reports**  | Export logbook summaries per student      | Download own logbook PDF | Generate institution-wide reports |
| **Audit Trail**               | Decision history with timestamps          | Activity log             | Full system audit log             |
| **Posting Expiry Management** | Auto-close expired posts, renewal prompts | See only active postings | Dashboard of expiring posts       |
| **Data Export**               | Export applicant data (CSV)               | Export CV, applications  | Platform analytics export         |

### Priority 5 — UX Enhancements

| Feature               | Employer                                   | Student                                      | Admin                  |
| --------------------- | ------------------------------------------ | -------------------------------------------- | ---------------------- |
| **Onboarding Wizard** | Multi-step with logo upload, first posting | Multi-step with CV upload, first application | Platform setup wizard  |
| **Empty States**      | Guided "post your first internship" CTA    | Guided "complete profile to apply" CTA       | Guided setup prompts   |
| **Search & Filters**  | Search students by skill/course/GPA        | Search by location, salary, duration         | Search users, postings |
| **Dark Mode**         | ✅ Already supported via ThemeProvider     | ✅ Already supported                         | ✅ Already supported   |

---

## INTEGRATION MAP (How all roles connect)

```
Employer Posts Internship
    ↓ visible to
Student Browses & Applies
    ↓ notifies
Employer Reviews Applicants
    ↓ accepts/rejects → notifies student
Student Starts Internship
    ↓ submits logbook
Employer Reviews Logbook
    ↓ compliance data
Admin Generates Reports & Monitors Platform
```

**Key integration points:**

- Employer posts → appear in student browse/search
- Student applies → employer gets notification, sees in applicant review
- Employer accepts/rejects → student sees status update
- Student submits logbook → employer reviews
- All activity → admin monitors and reports

---

## BUGS & CRITICAL ISSUES

| #   | Issue                                      | Severity    | File                                                                |
| --- | ------------------------------------------ | ----------- | ------------------------------------------------------------------- |
| 1   | Hardcoded `localhost:8000` in settings     | 🔴 Critical | `app/dashboard/employer/settings/SettingsClient.tsx`                |
| 2   | Hardcoded `localhost:8000` in company page | 🔴 Critical | `app/companies/[id]/CompanyClient.tsx`                              |
| 3   | "Add Posting" button points to `#`         | 🔴 Broken   | `app/dashboard/employer/EmployerParts.tsx`                          |
| 4   | Upload + metadata save decoupled           | 🟠 High     | `app/dashboard/employer/settings/SettingsClient.tsx`                |
| 5   | No server-side validation on forms         | 🟠 High     | Multiple files                                                      |
| 6   | `select("*")` pattern (schema coupling)    | 🟠 High     | Multiple employer queries                                           |
| 7   | CV URL can expire mid-session              | 🟡 Medium   | `app/dashboard/employer/internships/[id]/ApplicantReviewClient.tsx` |
| 8   | `window.location.reload()` after posting   | 🟡 Medium   | `app/dashboard/employer/EmployerClient.tsx`                         |

---

## TOP 10 ACTIONS (ordered by impact)

| #   | Action                                                 | Effort | Impact                                   |
| --- | ------------------------------------------------------ | ------ | ---------------------------------------- |
| 1   | Fix hardcoded backend URLs (use env vars)              | Low    | 🔴 Critical — app broken in prod         |
| 2   | Fix "Add Posting" button on dashboard                  | Low    | 🔴 Core flow broken                      |
| 3   | Add decision audit trail + rejection reasons           | Medium | High — accountability & student feedback |
| 4   | Make settings save atomic (upload + metadata together) | Medium | High — data integrity                    |
| 5   | Add server-side validation to all employer forms       | Medium | High — security                          |
| 6   | Add application pipeline stages (beyond accept/reject) | Medium | High — recruitment quality               |
| 7   | Add in-app notifications across all roles              | High   | High — engagement                        |
| 8   | Add posting edit/close/clone actions                   | Medium | Medium — employer QoL                    |
| 9   | Add employer analytics dashboard                       | Medium | Medium — retention                       |
| 10  | Add messaging between employer ↔ student               | High   | Medium — communication                   |
