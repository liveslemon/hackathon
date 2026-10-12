import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  DEV_AUTH_MODE_COOKIE_NAME,
  DEV_ROLE_COOKIE_NAME,
} from "@/lib/role-guard";

export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();

  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.startsWith("sb-")) {
      cookieStore.delete(cookie.name);
    }
  }

  cookieStore.delete(DEV_ROLE_COOKIE_NAME);
  cookieStore.delete(DEV_AUTH_MODE_COOKIE_NAME);

  return NextResponse.json({ status: "ok" });
}
