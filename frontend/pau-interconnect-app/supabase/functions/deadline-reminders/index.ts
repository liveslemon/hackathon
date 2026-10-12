// @ts-expect-error Deno URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

interface NotificationSettings {
  notifications?: {
    deadline_reminders?: boolean;
    [key: string]: unknown;
  };
}

interface LegacyNotificationPrefs {
  email_deadline_reminder?: boolean;
  [key: string]: unknown;
}

interface EmployerProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  settings?: NotificationSettings | null;
  notification_preferences?: LegacyNotificationPrefs | null;
}

interface InternshipPosting {
  id: string;
  role: string;
  employer_id: string | null;
  poster_id: string | null;
  deadline: string;
  last_reminder_sent_at: string | null;
}

function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req: Request) => {
  // 1. Auth Guard: verify service role key or CRON_SECRET
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const isAuthorized =
    Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    Boolean(serviceKey && authHeader === `Bearer ${serviceKey}`) ||
    Boolean(authHeader && serviceKey && authHeader.includes(serviceKey));

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM_ADDRESS") || "notifications@interconnect.pau.edu.ng";
  const emailFromName = Deno.env.get("EMAIL_FROM_NAME") || "PAU InterConnect";
  const appUrl = (
    Deno.env.get("NEXT_PUBLIC_APP_URL") ||
    Deno.env.get("APP_URL") ||
    "https://interconnect-ten.vercel.app"
  ).replace(/\/$/, "");

  // 2. Timezone handling: Pan-Atlantic University is in Lagos, Nigeria (WAT = UTC+1)
  const now = new Date();
  const watOffsetMs = 60 * 60 * 1000; // UTC+1
  const watNow = new Date(now.getTime() + watOffsetMs);
  const targetDate = new Date(watNow);
  targetDate.setDate(targetDate.getDate() + 3);
  const dateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

  // Today's cutoff in UTC to prevent sending more than once per calendar day
  const todayStartUtc = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // 3. Find active postings with deadline in 3 days
  const { data: postings, error } = await supabase
    .from("internships")
    .select("id, role, employer_id, poster_id, deadline, last_reminder_sent_at")
    .eq("status", "active")
    .gte("deadline", `${dateStr}T00:00:00`)
    .lte("deadline", `${dateStr}T23:59:59`);

  if (error) {
    console.error("Error fetching postings:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sentCount = 0;
  let skippedCount = 0;

  for (const rawPosting of (postings || []) as InternshipPosting[]) {
    // 4. Idempotency check: has a reminder already been recorded today?
    if (
      rawPosting.last_reminder_sent_at &&
      rawPosting.last_reminder_sent_at >= todayStartUtc
    ) {
      skippedCount++;
      continue;
    }

    const employerId = rawPosting.employer_id || rawPosting.poster_id;
    if (!employerId) {
      skippedCount++;
      continue;
    }

    // Double-check notifications table to prevent duplicates across retries
    const { data: existingNotifs } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", employerId)
      .eq("type", "deadline_reminder")
      .gte("created_at", todayStartUtc)
      .limit(1);

    if (existingNotifs && existingNotifs.length > 0) {
      skippedCount++;
      continue;
    }

    // Fetch employer profile and check preferences
    const { data: employer } = await supabase
      .from("profiles")
      .select("id, email, full_name, settings, notification_preferences")
      .eq("id", employerId)
      .maybeSingle<EmployerProfile>();

    if (!employer) {
      skippedCount++;
      continue;
    }

    // Respect opt-out settings
    const modernPref = employer.settings?.notifications?.deadline_reminders;
    const legacyPref = employer.notification_preferences?.email_deadline_reminder;
    if (modernPref === false || legacyPref === false) {
      skippedCount++;
      continue;
    }

    // Fetch applicant count
    const { count } = await supabase
      .from("applied_internships")
      .select("id", { count: "exact", head: true })
      .eq("internship_id", rawPosting.id);

    const safeRole = escapeHtml(rawPosting.role);
    const safeEmployerName = escapeHtml(employer.full_name || "Employer");
    const reviewLink = `${appUrl}/dashboard/employer/internships/${rawPosting.id}`;
    const settingsLink = `${appUrl}/dashboard/employer/settings`;
    const applicantCount = count || 0;

    // 5. Deliver In-App Notification
    await supabase.from("notifications").insert({
      user_id: employerId,
      type: "deadline_reminder",
      title: "Posting Deadline Reminder",
      body: `Your posting "${rawPosting.role}" closes in 3 days (${applicantCount} applicants so far).`,
      link: `/dashboard/employer/internships/${rawPosting.id}`,
      metadata: { internship_id: rawPosting.id, days_remaining: 3 },
    });

    // 6. Deliver Email (Brevo primary, Resend fallback)
    if (employer.email) {
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h2 style="color: #1e293b;">Posting Deadline Reminder</h2>
          <p>Hi ${safeEmployerName},</p>
          <p>Your posting "<strong>${safeRole}</strong>" has a deadline in 3 days with ${applicantCount} applicants so far.</p>
          <a href="${reviewLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: 600;">
            Review Applications
          </a>
          <p style="color: #64748b; margin-top: 24px; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            You're receiving this because deadline reminders are enabled on your account.
            <br />
            <a href="${settingsLink}" style="color: #4f46e5; text-decoration: none;">Manage email preferences or unsubscribe</a>
          </p>
        </div>
      `;

      try {
        if (brevoApiKey) {
          await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              accept: "application/json",
              "api-key": brevoApiKey,
            },
            body: JSON.stringify({
              sender: { name: emailFromName, email: emailFrom },
              to: [{ email: employer.email }],
              subject: `Reminder: ${rawPosting.role} closes in 3 days`,
              htmlContent: emailHtml,
            }),
          });
        } else if (resendApiKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: `${emailFromName} <${emailFrom}>`,
              to: employer.email,
              subject: `Reminder: ${rawPosting.role} closes in 3 days`,
              html: emailHtml,
            }),
          });
        }
      } catch (sendErr) {
        console.error("Email send error for reminder:", sendErr);
      }
    }

    // 7. Update last_reminder_sent_at for idempotency
    await supabase
      .from("internships")
      .update({ last_reminder_sent_at: new Date().toISOString() })
      .eq("id", rawPosting.id);

    sentCount++;
  }

  return new Response(
    JSON.stringify({
      status: "ok",
      target_date: dateStr,
      total_checked: (postings || []).length,
      sent: sentCount,
      skipped: skippedCount,
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    },
  );
});