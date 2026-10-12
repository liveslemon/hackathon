// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const dateStr = threeDaysFromNow.toISOString().split("T")[0];

  // Find postings with deadline in 3 days
  const { data: postings, error } = await supabase
    .from("internships")
    .select(
      "id, role, employer_id, deadline, profiles!employer_id(email, full_name, notification_preferences)"
    )
    .eq("status", "active")
    .gte("deadline", `${dateStr}T00:00:00`)
    .lte("deadline", `${dateStr}T23:59:59`);

  if (error) {
    console.error("Error fetching postings:", error);
    return new Response("Error", { status: 500 });
  }

  for (const posting of postings || []) {
    const profilesResult = posting.profiles as any;
    if (!profilesResult) continue;

    const prefs = profilesResult.notification_preferences || {};
    if (prefs.email_deadline_reminder === false) continue;

    const { count } = await supabase
      .from("applied_internships")
      .select("*", { count: "exact", head: true })
      .eq("internship_id", posting.id);

    if (profilesResult.email && RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "PAU InterConnect <notifications@interconnect.pau.edu.ng>",
          to: profilesResult.email,
          subject: `Reminder: ${posting.role} closes in 3 days`,
          html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Hi ${profilesResult.full_name},</p>
            <p>Your posting "<strong>${posting.role}</strong>" has a deadline in 3 days with ${count || 0} applicants so far.</p>
            <a href="${Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://interconnect-ten.vercel.app"}/dashboard/employer/internships/${posting.id}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
              Review Applications
            </a>
          </div>`,
        }),
      });
    }
  }

  return new Response(JSON.stringify({ status: "ok", checked: postings.length }), { headers: { "Content-Type": "application/json" } });
});