import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { backendUrl } from "@/lib/api";

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  try {
    const body = await req.json();
    const raw_text = body?.raw_text;

    if (!raw_text || typeof raw_text !== "string" || !raw_text.trim()) {
      return NextResponse.json(
        { error: "raw_text is required." },
        { status: 400 },
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    // Forward to FastAPI backend which implements LLM fallback, semaphores, and rate-limiting
    const res = await fetch(backendUrl("/api/logbook/enhance"), {
      method: "POST",
      headers,
      body: JSON.stringify({ raw_text }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let message = "AI enhancement service is temporarily unavailable.";
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.detail) message = parsed.detail;
      } catch {
        // use default message
      }
      return NextResponse.json(
        { error: message },
        { status: res.status === 429 ? 429 : 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json({
      enhanced_text: data.enhanced_text || "",
    });
  } catch (err: unknown) {
    console.error("AI enhance proxy error:", err);
    return NextResponse.json(
      { error: "Failed to connect to AI enhancement service. Please try again." },
      { status: 502 },
    );
  }
}
