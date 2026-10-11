// Transactional email. Brevo is the primary provider (free tier, works with a
// single verified sender address, no domain needed). Resend is used instead
// if RESEND_API_KEY is set and BREVO_API_KEY is not.
//
// Env (Vercel):
//   BREVO_API_KEY       Brevo > SMTP & API > API keys
//   EMAIL_FROM_ADDRESS  a sender verified in Brevo > Senders
//   EMAIL_FROM_NAME     optional, defaults to "PAU InterConnect"

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const FROM_NAME = process.env.EMAIL_FROM_NAME || "PAU InterConnect";

async function sendWithBrevo({ to, subject, html, text }: SendEmailInput, apiKey: string) {
  const from = process.env.EMAIL_FROM_ADDRESS;
  if (!from) {
    console.warn("EMAIL_FROM_ADDRESS is not set; skipping Brevo email to", to);
    return;
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: from },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(text ? { textContent: text } : {}),
    }),
  });
  if (!res.ok) console.error("Brevo email failed:", res.status, await res.text());
}

async function sendWithResend({ to, subject, html, text }: SendEmailInput, apiKey: string) {
  const from = process.env.EMAIL_FROM_ADDRESS || "notifications@interconnect.pau.edu.ng";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: `${FROM_NAME} <${from}>`, to, subject, html, text }),
  });
  if (!res.ok) console.error("Resend email failed:", res.status, await res.text());
}

export async function sendEmail(input: SendEmailInput) {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  try {
    if (brevoKey) return await sendWithBrevo(input, brevoKey);
    if (resendKey) return await sendWithResend(input, resendKey);
    console.warn("No email provider configured (BREVO_API_KEY). Skipping email to:", input.to, "Subject:", input.subject);
  } catch (err) {
    console.error("Email send request failed:", err);
  }
}
