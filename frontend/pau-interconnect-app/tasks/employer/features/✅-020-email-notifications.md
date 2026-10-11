# NEW FEATURE: Email Notifications

## Priority: 🟡 MEDIUM

## Effort: Medium (3-4 hours)

## Overview

Send email notifications to employers and students for important events. Uses Supabase Edge Functions or a service like Resend/SendGrid. Respects user notification preferences (see task #010).

## Trigger Events

| Event                      | Recipient | Email Content                                                  |
| -------------------------- | --------- | -------------------------------------------------------------- |
| New application            | Employer  | "{Student} applied for {Role}" with link to review             |
| Application accepted       | Student   | "Your application for {Role} at {Company} was accepted!"       |
| Application rejected       | Student   | "Update on your application for {Role}" with feedback          |
| Logbook flagged            | Student   | "Your logbook entry for {Date} needs revision"                 |
| Posting deadline in 3 days | Employer  | "Your posting {Role} closes in 3 days — {X} applicants so far" |
| New message received       | Both      | "You have a new message about {Role}"                          |

## Implementation

### 1. Email Service: `lib/email.ts`

```tsx
interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  // Option A: Resend
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "PAU InterConnect <notifications@interconnect.pau.edu.ng>",
      to,
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    console.error("Email send failed:", await res.text());
  }
}
```

### 2. Email Templates: `lib/email-templates.ts`

```tsx
export function applicationReceivedEmail(data: {
  employerName: string;
  studentName: string;
  role: string;
  reviewLink: string;
}) {
  return {
    subject: `New Application: ${data.studentName} applied for ${data.role}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">New Application Received</h2>
        <p>Hi ${data.employerName},</p>
        <p><strong>${data.studentName}</strong> has applied for your <strong>${data.role}</strong> internship.</p>
        <a href="${data.reviewLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Review Application
        </a>
        <p style="color: #64748b; margin-top: 24px; font-size: 12px;">
          You're receiving this because you have email notifications enabled.
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/employer/settings">Manage preferences</a>
        </p>
      </div>
    `,
  };
}

export function applicationStatusEmail(data: {
  studentName: string;
  role: string;
  company: string;
  status: "accepted" | "rejected";
  feedback?: string;
}) {
  const isAccepted = data.status === "accepted";
  return {
    subject: isAccepted
      ? `Congratulations! You've been accepted for ${data.role} at ${data.company}`
      : `Update on your application for ${data.role}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">${isAccepted ? "🎉 Congratulations!" : "Application Update"}</h2>
        <p>Hi ${data.studentName},</p>
        ${
          isAccepted
            ? `<p>Great news! Your application for <strong>${data.role}</strong> at <strong>${data.company}</strong> has been accepted.</p>`
            : `<p>We have an update on your application for <strong>${data.role}</strong> at <strong>${data.company}</strong>.</p>
             <p>Unfortunately, the employer has decided not to proceed with your application at this time.</p>`
        }
        ${data.feedback ? `<p><strong>Feedback:</strong> ${data.feedback}</p>` : ""}
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-internships" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          View My Applications
        </a>
      </div>
    `,
  };
}

export function logbookFlaggedEmail(data: {
  studentName: string;
  date: string;
  feedback: string;
}) {
  return {
    subject: `Your logbook entry for ${data.date} needs revision`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">Logbook Entry Flagged</h2>
        <p>Hi ${data.studentName},</p>
        <p>Your logbook entry for <strong>${data.date}</strong> has been flagged for revision.</p>
        <p><strong>Feedback:</strong> ${data.feedback}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/student/logbook" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Update Entry
        </a>
      </div>
    `,
  };
}
```

### 3. Trigger Emails from API Routes

In the application status change handler:

```tsx
import { sendEmail } from "@/lib/email";
import { applicationStatusEmail } from "@/lib/email-templates";

// After status update:
const { data: student } = await supabase
  .from("profiles")
  .select("email, full_name, notification_preferences")
  .eq("id", application.student_id)
  .single();

// Check preferences
const prefs = student?.notification_preferences || {
  email_status_updates: true,
};
if (prefs.email_status_updates && student?.email) {
  const emailData = applicationStatusEmail({
    studentName: student.full_name || "Student",
    role: internship.role,
    company: internship.company,
    status: newStatus,
    feedback: decision_notes,
  });
  await sendEmail({ to: student.email, ...emailData });
}
```

### 4. Deadline Reminder (Cron Job via Supabase Edge Function)

```tsx
// supabase/functions/deadline-reminders/index.ts
import { createClient } from "@supabase/supabase-js";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const dateStr = threeDaysFromNow.toISOString().split("T")[0];

  // Find postings with deadline in 3 days
  const { data: postings } = await supabase
    .from("internships")
    .select(
      "id, role, employer_id, deadline, profiles!employer_id(email, full_name, notification_preferences)",
    )
    .eq("status", "active")
    .gte("deadline", `${dateStr}T00:00:00`)
    .lte("deadline", `${dateStr}T23:59:59`);

  for (const posting of postings || []) {
    const prefs = posting.profiles?.notification_preferences || {};
    if (prefs.email_deadline_reminder === false) continue;

    // Count applicants
    const { count } = await supabase
      .from("applied_internships")
      .select("*", { count: "exact", head: true })
      .eq("internship_id", posting.id);

    // Send reminder email
    await sendEmail({
      to: posting.profiles.email,
      subject: `Reminder: ${posting.role} closes in 3 days`,
      html: `<p>Your posting "${posting.role}" has a deadline in 3 days with ${count || 0} applicants.</p>`,
    });
  }

  return new Response("OK");
});
```

Schedule via `supabase/config.toml`:

```toml
[functions.deadline-reminders]
schedule = "0 9 * * *"  # Daily at 9 AM
```

### 5. Environment Variables Needed

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://interconnect.pau.edu.ng
```

## Integration with Other Roles

- **Student**: Receives emails on application status changes and logbook flags
- **Employer**: Receives emails on new applications and deadline reminders
- **Admin**: Could receive weekly digest of platform activity
- **Preferences**: Tied to notification preferences in settings (task #010)

## Acceptance Criteria

- [ ] Email service module created (`lib/email.ts`)
- [ ] Email templates for: new application, status change, logbook flagged, deadline reminder
- [ ] Emails sent on application status change (respecting preferences)
- [ ] Emails sent on logbook flag
- [ ] Deadline reminder cron job (3 days before)
- [ ] Unsubscribe link in every email
- [ ] Emails respect `notification_preferences` from user profile
- [ ] Email sending failures don't block the primary action
- [ ] Template includes proper styling and CTA buttons


STATUS: COMPLETE
