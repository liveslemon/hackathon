interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "RESEND_API_KEY is not set. Skipping email send to:",
      to,
      "Subject:",
      subject,
    );
    return;
  }

  try {
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
  } catch (err) {
    console.error("Email send request failed:", err);
  }
}
