import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/env";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api/analysis/metrics`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Metrics proxy error:", error);
    return NextResponse.json(
      { error: "Failed to load metrics from backend" },
      { status: 500 },
    );
  }
}
