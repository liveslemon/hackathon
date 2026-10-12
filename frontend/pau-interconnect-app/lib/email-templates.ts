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

function ensureAbsoluteUrl(link: string | null | undefined, fallbackPath: string): string {
  const appUrl = getAppUrl().replace(/\/$/, "");
  if (!link) return `${appUrl}${fallbackPath}`;
  if (link.startsWith("http://") || link.startsWith("https://")) return link;
  const path = link.startsWith("/") ? link : `/${link}`;
  return `${appUrl}${path}`;
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

  return {
    subject: `New Application: ${data.studentName} applied for ${data.role}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #1e293b;">New Application Received</h2>
        <p>Hi ${employerName},</p>
        <p><strong>${studentName}</strong> has applied for your <strong>${role}</strong> internship.</p>
        <a href="${reviewLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: 600;">
          Review Application
        </a>
        <p style="color: #64748b; margin-top: 24px; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          You're receiving this because you have email notifications enabled.
          <br />
          <a href="${settingsLink}" style="color: #4f46e5; text-decoration: none;">Manage email preferences or unsubscribe</a>
        </p>
      </div>
    `,
  };
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
  const baseTitle = isAccepted
    ? `Congratulations! You've been accepted for ${data.role} at ${data.company}`
    : `Update on your application for ${data.role}`;

  const myInternshipsLink = `${getAppUrl().replace(/\/$/, "")}/my-internships`;
  const settingsLink = `${getAppUrl().replace(/\/$/, "")}/dashboard/student/settings`;

  return {
    subject: baseTitle,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #1e293b;">${title}</h2>
        <p>Hi ${studentName},</p>
        ${
          isAccepted
            ? `<p>Great news! Your application for <strong>${role}</strong> at <strong>${company}</strong> has been accepted.</p>`
            : `<p>We have an update on your application for <strong>${role}</strong> at <strong>${company}</strong>.</p>
               <p>Your application status is now: <strong>${status}</strong></p>`
        }
        ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ""}
        <a href="${myInternshipsLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: 600;">
          View My Applications
        </a>
        <p style="color: #64748b; margin-top: 24px; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          You're receiving this because you have email notifications enabled.
          <br />
          <a href="${settingsLink}" style="color: #4f46e5; text-decoration: none;">Manage email preferences or unsubscribe</a>
        </p>
      </div>
    `,
  };
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

  return {
    subject: `Your logbook entry for ${data.date} needs revision`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #1e293b;">Logbook Entry Flagged</h2>
        <p>Hi ${studentName},</p>
        <p>Your logbook entry for <strong>${date}</strong> has been flagged for revision.</p>
        <p><strong>Feedback:</strong> ${feedback}</p>
        <a href="${logbookLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: 600;">
          Update Entry
        </a>
        <p style="color: #64748b; margin-top: 24px; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          You're receiving this because you have email notifications enabled.
          <br />
          <a href="${settingsLink}" style="color: #4f46e5; text-decoration: none;">Manage email preferences or unsubscribe</a>
        </p>
      </div>
    `,
  };
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

  return {
    subject: `Reminder: ${data.role} closes in ${days} days`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #1e293b;">Posting Deadline Reminder</h2>
        <p>Hi ${employerName},</p>
        <p>Your posting <strong>${role}</strong> has a deadline in ${days} days with ${count} applicants so far.</p>
        <a href="${reviewLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: 600;">
          Review Applications
        </a>
        <p style="color: #64748b; margin-top: 24px; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          You're receiving this because you have deadline reminder emails enabled.
          <br />
          <a href="${settingsLink}" style="color: #4f46e5; text-decoration: none;">Manage email preferences or unsubscribe</a>
        </p>
      </div>
    `,
  };
}
