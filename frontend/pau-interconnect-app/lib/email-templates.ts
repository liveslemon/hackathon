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
          <br />
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/employer/settings" style="color: #4f46e5; text-decoration: none;">Manage preferences</a> |
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe" style="color: #4f46e5; text-decoration: none;">Unsubscribe</a>
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
  const isAccepted = data.status === "accepted";
  const title = isAccepted ? "🎉 Congratulations!" : "Application Update";
  const baseTitle = isAccepted
    ? `Congratulations! You've been accepted for ${data.role} at ${data.company}`
    : `Update on your application for ${data.role}`;

  return {
    subject: baseTitle,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">${title}</h2>
        <p>Hi ${data.studentName},</p>
        ${
          isAccepted
            ? `<p>Great news! Your application for <strong>${data.role}</strong> at <strong>${data.company}</strong> has been accepted.</p>`
            : `<p>We have an update on your application for <strong>${data.role}</strong> at <strong>${data.company}</strong>.</p>
               <p>Your application status is now: <strong>${data.status}</strong></p>`
        }
        ${data.feedback ? `<p><strong>Feedback:</strong> ${data.feedback}</p>` : ""}
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-internships" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          View My Applications
        </a>
        <p style="color: #64748b; margin-top: 24px; font-size: 12px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/student/settings" style="color: #4f46e5; text-decoration: none;">Manage preferences</a> |
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe" style="color: #4f46e5; text-decoration: none;">Unsubscribe</a>
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
        <p style="color: #64748b; margin-top: 24px; font-size: 12px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/student/settings" style="color: #4f46e5; text-decoration: none;">Manage preferences</a> |
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe" style="color: #4f46e5; text-decoration: none;">Unsubscribe</a>
        </p>
      </div>
    `,
  };
}
