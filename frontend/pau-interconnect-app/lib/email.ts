// Transactional email. Brevo is the primary provider (free tier, works with a
// single verified sender address, no domain needed). Resend is used instead
// if RESEND_API_KEY is set and BREVO_API_KEY is not.
//
// Env (Vercel):
//   BREVO_API_KEY       Brevo > SMTP & API > API keys
//   EMAIL_FROM_ADDRESS  a sender verified in Brevo > Senders
//   EMAIL_FROM_NAME     optional, defaults to "PAU InterConnect"

import { getSupabaseServer } from "@/lib/supabase-server";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const FROM_NAME = process.env.EMAIL_FROM_NAME || "PAU InterConnect";

/** What happened, so callers can report it (no secrets included). */
export type EmailResult =
  | { status: "sent"; provider: "brevo" | "resend" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; provider: "brevo" | "resend"; error: string };

async function sendWithBrevo(
  { to, subject, html, text }: SendEmailInput,
  apiKey: string,
): Promise<EmailResult> {
  const from = process.env.EMAIL_FROM_ADDRESS;
  if (!from) {
    console.warn("EMAIL_FROM_ADDRESS is not set; skipping Brevo email to", to);
    return { status: "skipped", reason: "EMAIL_FROM_ADDRESS is not set" };
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
  if (!res.ok) {
    const error = `${res.status} ${(await res.text()).slice(0, 300)}`;
    console.error("Brevo email failed:", error);
    return { status: "failed", provider: "brevo", error };
  }
  return { status: "sent", provider: "brevo" };
}

async function sendWithResend(
  { to, subject, html, text }: SendEmailInput,
  apiKey: string,
): Promise<EmailResult> {
  const from = process.env.EMAIL_FROM_ADDRESS || "notifications@interconnect.pau.edu.ng";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: `${FROM_NAME} <${from}>`, to, subject, html, text }),
  });
  if (!res.ok) {
    const error = `${res.status} ${(await res.text()).slice(0, 300)}`;
    console.error("Resend email failed:", error);
    return { status: "failed", provider: "resend", error };
  }
  return { status: "sent", provider: "resend" };
}

export async function sendEmail(input: SendEmailInput): Promise<EmailResult> {
  if (!input.to || !input.to.trim()) {
    return { status: "skipped", reason: "Recipient email address is missing" };
  }

  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  try {
    if (brevoKey) return await sendWithBrevo(input, brevoKey);
    if (resendKey) return await sendWithResend(input, resendKey);
    console.warn(
      "No email provider configured (BREVO_API_KEY). Skipping email to:",
      input.to,
      "Subject:",
      input.subject,
    );
    return {
      status: "skipped",
      reason: "BREVO_API_KEY is not set in this deployment",
    };
  } catch (err) {
    console.error("Email send request failed:", err);
    return {
      status: "failed",
      provider: brevoKey ? "brevo" : "resend",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface SendNotificationEmailInput extends SendEmailInput {
  userId?: string;
  preferenceKey?: string;
}

/**
 * Sends an email only if the user has not opted out in their profile notification settings.
 * Checks both modern profiles.settings.notifications and legacy profiles.notification_preferences.
 */
export async function sendNotificationEmailWithOptOut(
  input: SendNotificationEmailInput,
): Promise<EmailResult> {
  if (input.userId && input.preferenceKey) {
    try {
      const supabase = await getSupabaseServer();
      const { data: profile } = await supabase
        .from("profiles")
        .select("settings, notification_preferences")
        .eq("id", input.userId)
        .maybeSingle();

      if (profile) {
        const modernPrefs = (
          profile.settings as { notifications?: Record<string, unknown> } | null
        )?.notifications;
        const legacyPrefs = profile.notification_preferences as Record<string, unknown> | null;

        const key = input.preferenceKey;
        if (modernPrefs?.[key] === false || legacyPrefs?.[key] === false) {
          return {
            status: "skipped",
            reason: `User opted out of '${key}' notifications`,
          };
        }
      }
    } catch (err) {
      console.warn("Could not check notification preferences; proceeding with send:", err);
    }
  }

  return sendEmail(input);
}
