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
      const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Reminder: ${safeRole} closes in 3 days</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body {
      margin: 0; padding: 0; width: 100% !important;
      -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc; color: #0f172a;
    }
    @media (prefers-color-scheme: dark) {
      body, .email-bg { background-color: #090d16 !important; color: #f8fafc !important; }
      .email-card { background-color: #111827 !important; border-color: #1e293b !important; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5) !important; }
      .email-title { color: #f8fafc !important; }
      .email-text { color: #cbd5e1 !important; }
      .email-muted { color: #94a3b8 !important; }
      .email-footer-border { border-color: #1e293b !important; }
      .email-btn { background-color: #6366f1 !important; color: #ffffff !important; }
      .email-badge { background-color: rgba(99, 102, 241, 0.15) !important; color: #818cf8 !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin: 0; padding: 32px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" class="email-bg" style="background-color: #f8fafc;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; text-align: left;">
          <tr>
            <td style="padding: 0 0 24px 0; text-align: center;">
              <span style="display: inline-block; font-weight: 800; font-size: 18px; letter-spacing: -0.025em; color: #4f46e5;">
                PAU InterConnect
              </span>
              <div style="font-size: 12px; font-weight: 500; color: #64748b; margin-top: 2px;">
                Pan-Atlantic University Career Portal
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-card" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.05); overflow: hidden;">
                <tr>
                  <td height="5" style="background: linear-gradient(90deg, #4f46e5, #7c3aed); font-size: 1px; line-height: 1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding: 36px 32px 32px 32px;">
                    <div style="margin-bottom: 16px;">
                      <span class="email-badge" style="display: inline-block; padding: 4px 12px; background-color: #eef2ff; color: #4f46e5; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                        Deadline Notice
                      </span>
                    </div>
                    <h1 class="email-title" style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                      Posting Deadline Reminder
                    </h1>
                    <div class="email-text" style="font-size: 15px; line-height: 1.6; color: #334155;">
                      <p style="margin-top: 0; margin-bottom: 12px;">Hi ${safeEmployerName},</p>
                      <p style="margin-top: 0; margin-bottom: 12px;">
                        Your posting &ldquo;<strong>${safeRole}</strong>&rdquo; has a deadline in <strong>3 days</strong> with <strong>${applicantCount} applicants</strong> so far.
                      </p>
                      <p style="margin-top: 0; margin-bottom: 0;">
                        Visit your employer portal to review candidates and take action before the listing closes.
                      </p>
                    </div>
                    <div style="margin-top: 28px; margin-bottom: 8px;">
                      <a href="${reviewLink}" class="email-btn" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 12px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                        Review Applications
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="email-footer-border" style="padding: 20px 32px 28px 32px; border-top: 1px solid #f1f5f9; background-color: transparent;">
                    <p class="email-muted" style="margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                      You&rsquo;re receiving this because deadline reminder emails are enabled on your account.
                    </p>
                    <p class="email-muted" style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                      <a href="${settingsLink}" style="color: #4f46e5; text-decoration: underline;">
                        Manage email preferences or unsubscribe
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 0 0 0; text-align: center;">
              <p class="email-muted" style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} Pan-Atlantic University &bull; KM 52 Lekki-Epe Expressway, Ibeju-Lekki, Lagos
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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