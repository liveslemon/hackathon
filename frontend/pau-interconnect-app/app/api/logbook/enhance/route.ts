import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const [supabase, body] = await Promise.all([getSupabaseServer(), req.json()]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { raw_text } = body;

  if (!raw_text || !raw_text.trim()) {
    return NextResponse.json(
      { error: "raw_text is required" },
      { status: 400 },
    );
  }

  // Simple enhancement: clean up formatting and structure the text
  // In production, this could call an AI API (OpenAI, etc.)
  const enhanced_text = enhanceLogbookText(raw_text.trim());

  return NextResponse.json({ enhanced_text });
}

function enhanceLogbookText(raw: string): string {
  // Basic enhancement: capitalize sentences, add bullet points for line breaks
  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return raw;

  const enhanced = lines.map((line) => {
    // Capitalize first letter
    const capitalized = line.charAt(0).toUpperCase() + line.slice(1);
    // Ensure it ends with a period
    if (!/[.!?]$/.test(capitalized)) {
      return `• ${capitalized}.`;
    }
    return `• ${capitalized}`;
  });

  return enhanced.join("\n");
}
