import { getAppUrl } from "@/lib/env";

/**
 * Escapes characters with special meaning in HTML to prevent XSS / markup injection.
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function ensureAbsoluteUrl(link: string | null | undefined, fallbackPath: string): string {
  const appUrl = getAppUrl().replace(/\/$/, "");
  if (!link) return `${appUrl}${fallbackPath}`;
  if (link.startsWith("http://") || link.startsWith("https://")) return link;
  const path = link.startsWith("/") ? link : `/${link}`;
  return `${appUrl}${path}`;
}

export interface BrandedEmailTemplateOptions {
  title: string;
  badge?: string;
  headline: string;
  contentHtml: string;
  actionText: string;
  actionUrl: string;
  settingsUrl: string;
  footerReason: string;
}

/**
 * Renders a unified email template compatible with Gmail, Apple Mail, and Outlook.
 * Uses inline styles and client-safe CSS variables with light and dark mode support.
 */
export function renderBrandedEmailHtml(options: BrandedEmailTemplateOptions): string {
  const {
    title,
    badge,
    headline,
    contentHtml,
    actionText,
    actionUrl,
    settingsUrl,
    footerReason,
  } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
    }
    @media (prefers-color-scheme: dark) {
      body, .email-bg {
        background-color: #090d16 !important;
        color: #f8fafc !important;
      }
      .email-card {
        background-color: #111827 !important;
        border-color: #1e293b !important;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5) !important;
      }
      .email-title {
        color: #f8fafc !important;
      }
      .email-text {
        color: #cbd5e1 !important;
      }
      .email-muted {
        color: #94a3b8 !important;
      }
      .email-footer-border {
        border-color: #1e293b !important;
      }
      .email-btn {
        background-color: #6366f1 !important;
        color: #ffffff !important;
      }
      .email-badge {
        background-color: rgba(99, 102, 241, 0.15) !important;
        color: #818cf8 !important;
      }
    }
  </style>
</head>
<body class="email-bg" style="margin: 0; padding: 32px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" class="email-bg" style="background-color: #f8fafc;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; text-align: left;">
          <!-- Header Branding -->
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

          <!-- Card Box -->
          <tr>
            <td>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-card" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.05); overflow: hidden;">
                <!-- Decorative Top Gradient Line -->
                <tr>
                  <td height="5" style="background: linear-gradient(90deg, #4f46e5, #7c3aed); font-size: 1px; line-height: 1px;">&nbsp;</td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="padding: 36px 32px 32px 32px;">
                    ${
                      badge
                        ? `<div style="margin-bottom: 16px;">
                            <span class="email-badge" style="display: inline-block; padding: 4px 12px; background-color: #eef2ff; color: #4f46e5; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                              ${escapeHtml(badge)}
                            </span>
                          </div>`
                        : ""
                    }
                    <h1 class="email-title" style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                      ${headline}
                    </h1>

                    <div class="email-text" style="font-size: 15px; line-height: 1.6; color: #334155;">
                      ${contentHtml}
                    </div>

                    <!-- Call To Action Button -->
                    <div style="margin-top: 28px; margin-bottom: 8px;">
                      <a href="${actionUrl}" class="email-btn" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 12px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                        ${escapeHtml(actionText)}
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- Footer Section -->
                <tr>
                  <td class="email-footer-border" style="padding: 20px 32px 28px 32px; border-top: 1px solid #f1f5f9; background-color: transparent;">
                    <p class="email-muted" style="margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                      ${escapeHtml(footerReason)}
                    </p>
                    <p class="email-muted" style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                      <a href="${settingsUrl}" style="color: #4f46e5; text-decoration: underline;">
                        Manage email preferences or unsubscribe
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Outer Footer -->
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
}

export function applicationReceivedEmail(data: {
  employerName: string;
  studentName: string;
  role: string;
  reviewLink: string;
}) {
  const employerName = escapeHtml(data.employerName);
  const studentName = escapeHtml(data.studentName);
  const role = escapeHtml(data.role);
  const reviewLink = ensureAbsoluteUrl(data.reviewLink, "/dashboard/employer");
  const settingsLink = `${getAppUrl().replace(/\/$/, "")}/dashboard/employer/settings`;
  const subject = `New Application: ${data.studentName} applied for ${data.role}`;

  const html = renderBrandedEmailHtml({
    title: subject,
    badge: "Applicant Alert",
    headline: "New Application Received",
    contentHtml: `
      <p style="margin-top: 0; margin-bottom: 12px;">Hi ${employerName},</p>
      <p style="margin-top: 0; margin-bottom: 12px;">
        <strong>${studentName}</strong> has submitted an application for the <strong>${role}</strong> internship.
      </p>
      <p style="margin-top: 0; margin-bottom: 0;">
        Log in to your employer portal to review their profile, tailored CV, and AI match analysis.
      </p>
    `,
    actionText: "Review Application",
    actionUrl: reviewLink,
    settingsUrl: settingsLink,
    footerReason: "You're receiving this because you have email notifications enabled for new applications.",
  });

  const text = `Hi ${data.employerName},\n\n${data.studentName} has applied for your ${data.role} internship.\n\nReview the application: ${reviewLink}\n\nManage preferences: ${settingsLink}`;

  return { subject, html, text };
}

export function applicationStatusEmail(data: {
  studentName: string;
  role: string;
  company: string;
  status: "accepted" | "rejected" | string;
  feedback?: string;
}) {
  const studentName = escapeHtml(data.studentName);
  const role = escapeHtml(data.role);
  const company = escapeHtml(data.company);
  const status = escapeHtml(data.status);
  const feedback = data.feedback ? escapeHtml(data.feedback) : null;

  const isAccepted = data.status === "accepted";
  const title = isAccepted ? "🎉 Congratulations!" : "Application Update";
  const subject = isAccepted
    ? `Congratulations! You've been accepted for ${data.role} at ${data.company}`
    : `Update on your application for ${data.role}`;

  const myInternshipsLink = `${getAppUrl().replace(/\/$/, "")}/my-internships`;
  const settingsLink = `${getAppUrl().replace(/\/$/, "")}/dashboard/student/settings`;

  const contentHtml = `
    <p style="margin-top: 0; margin-bottom: 12px;">Hi ${studentName},</p>
    ${
      isAccepted
        ? `<p style="margin-top: 0; margin-bottom: 12px;">Great news! Your application for <strong>${role}</strong> at <strong>${company}</strong> has been accepted.</p>`
        : `<p style="margin-top: 0; margin-bottom: 12px;">We have an update on your application for <strong>${role}</strong> at <strong>${company}</strong>.</p>
           <p style="margin-top: 0; margin-bottom: 12px;">Your application status is now: <strong>${status}</strong></p>`
    }
    ${feedback ? `<p style="margin-top: 0; margin-bottom: 12px; padding: 12px 16px; background-color: #f1f5f9; border-radius: 8px;"><strong>Feedback:</strong> ${feedback}</p>` : ""}
    <p style="margin-top: 0; margin-bottom: 0;">Click below to view the latest details and next steps in your applications portal.</p>
  `;

  const html = renderBrandedEmailHtml({
    title: subject,
    badge: isAccepted ? "Offer" : "Status",
    headline: title,
    contentHtml,
    actionText: "View My Applications",
    actionUrl: myInternshipsLink,
    settingsUrl: settingsLink,
    footerReason: "You're receiving this because you have email notifications enabled for application updates.",
  });

  const text = `Hi ${data.studentName},\n\n${
    isAccepted
      ? `Congratulations! Your application for ${data.role} at ${data.company} has been accepted.`
      : `Update on your application for ${data.role} at ${data.company}. Status: ${data.status}`
  }\n\n${data.feedback ? `Feedback: ${data.feedback}\n\n` : ""}View applications: ${myInternshipsLink}\n\nManage preferences: ${settingsLink}`;

  return { subject, html, text };
}

export function logbookFlaggedEmail(data: {
  studentName: string;
  date: string;
  feedback: string;
}) {
  const studentName = escapeHtml(data.studentName);
  const date = escapeHtml(data.date);
  const feedback = escapeHtml(data.feedback);
  const logbookLink = `${getAppUrl().replace(/\/$/, "")}/dashboard/student/logbook`;
  const settingsLink = `${getAppUrl().replace(/\/$/, "")}/dashboard/student/settings`;
  const subject = `Your logbook entry for ${data.date} needs revision`;

  const html = renderBrandedEmailHtml({
    title: subject,
    badge: "Logbook Revision",
    headline: "Logbook Entry Flagged",
    contentHtml: `
      <p style="margin-top: 0; margin-bottom: 12px;">Hi ${studentName},</p>
      <p style="margin-top: 0; margin-bottom: 12px;">
        Your logbook entry for <strong>${date}</strong> has been flagged for revision by your supervisor.
      </p>
      <div style="margin-top: 0; margin-bottom: 12px; padding: 12px 16px; background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; color: #92400e;">
        <strong>Supervisor Feedback:</strong> ${feedback}
      </div>
      <p style="margin-top: 0; margin-bottom: 0;">
        Please make the necessary adjustments in your logbook and resubmit for approval.
      </p>
    `,
    actionText: "Update Entry",
    actionUrl: logbookLink,
    settingsUrl: settingsLink,
    footerReason: "You're receiving this because you have logbook notifications enabled.",
  });

  const text = `Hi ${data.studentName},\n\nYour logbook entry for ${data.date} has been flagged for revision.\nFeedback: ${data.feedback}\n\nUpdate entry: ${logbookLink}\n\nManage preferences: ${settingsLink}`;

  return { subject, html, text };
}

export function deadlineReminderEmail(data: {
  employerName: string;
  role: string;
  daysRemaining?: number;
  applicantCount?: number;
  reviewLink?: string;
}) {
  const employerName = escapeHtml(data.employerName);
  const role = escapeHtml(data.role);
  const days = data.daysRemaining ?? 3;
  const count = data.applicantCount ?? 0;
  const reviewLink = ensureAbsoluteUrl(data.reviewLink, "/dashboard/employer");
  const settingsLink = `${getAppUrl().replace(/\/$/, "")}/dashboard/employer/settings`;
  const subject = `Reminder: ${data.role} closes in ${days} days`;

  const html = renderBrandedEmailHtml({
    title: subject,
    badge: "Deadline Notice",
    headline: "Posting Deadline Reminder",
    contentHtml: `
      <p style="margin-top: 0; margin-bottom: 12px;">Hi ${employerName},</p>
      <p style="margin-top: 0; margin-bottom: 12px;">
        Your internship posting for <strong>${role}</strong> is closing in <strong>${days} days</strong>.
      </p>
      <p style="margin-top: 0; margin-bottom: 0;">
        You currently have <strong>${count} applicants</strong> waiting for review. Visit your dashboard to shortlist or complete applicant reviews before the listing expires.
      </p>
    `,
    actionText: "Review Applications",
    actionUrl: reviewLink,
    settingsUrl: settingsLink,
    footerReason: "You're receiving this because you have deadline reminder emails enabled.",
  });

  const text = `Hi ${data.employerName},\n\nYour posting ${data.role} has a deadline in ${days} days with ${count} applicants so far.\n\nReview applications: ${reviewLink}\n\nManage preferences: ${settingsLink}`;

  return { subject, html, text };
}
