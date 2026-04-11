import { supabase } from "./supabaseClient";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Retrieves the current Supabase session token and returns it in Bearer format.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return {};
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Reusable fetch wrapper that automatically attaches the Supabase JWT.
 * @param endpoint - The API endpoint (e.g., '/api/upload-and-analyze') or full URL.
 * @param options - Standard RequestInit options.
 */
export async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
  const authHeaders = await getAuthHeaders();
  
  const headers: Record<string, string> = {
    ...authHeaders,
    ...(options.headers as Record<string, string>),
  };

  // Automatically set Content-Type if not FormData and not already set
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const url = endpoint.startsWith("http") ? endpoint : `${BACKEND_URL}${endpoint}`;
  
  // Implement 30-second timeout
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(id);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error("Request timed out after 30 seconds. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}
