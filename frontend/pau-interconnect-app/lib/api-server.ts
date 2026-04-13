import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crossFetch from "cross-fetch";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Server-only version of auth header retrieval.
 * Uses next/headers to get cookies for supabase session.
 */
async function getAuthHeadersServer(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: crossFetch },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {} // Read-only for access tokens
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return {};
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Reusable fetch wrapper for Server Components.
 * Automatically attaches the Supabase JWT.
 */
export async function authenticatedFetchServer(endpoint: string, options: RequestInit = {}, timeoutMs: number = 15000) {
  const authHeaders = await getAuthHeadersServer();
  
  const headers: Record<string, string> = {
    ...authHeaders,
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const url = endpoint.startsWith("http") ? endpoint : `${BACKEND_URL}${endpoint}`;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(id);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || data.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error("Request timed out (Server Fetch). The backend may be busy.");
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}
