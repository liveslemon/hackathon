import { supabase } from "./supabaseClient";

const isDev = process.env.NODE_ENV === "development";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (isDev ? "http://localhost:8000" : "https://pau-interconnect-backend.onrender.com");

/**
 * Retrieves the current Supabase session token and returns it in Bearer format.
 * Browser-safe version using the singleton supabase client.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  // Use getSession() which is faster, but if it returns an expired session,
  // we should be aware. For the most reliable fresh token, getUser() 
  // is often better as it forces a check, but getSession is standard.
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) return {};

  // Check if token is expired or close to expiring (within 10 seconds)
  const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
  const now = Date.now();
  
  if (expiresAt < now + 10000) {
    // Force a refresh if it's expired or about to be
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session) return {};
    return {
      Authorization: `Bearer ${refreshData.session.access_token}`,
    };
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Reusable fetch wrapper that automatically attaches the Supabase JWT.
 * Client-safe version.
 */
export async function authenticatedFetch(endpoint: string, options: RequestInit = {}, timeoutMs: number = 15000, existingSession?: any) {
  let authHeaders = {};
  
  if (existingSession?.access_token) {
    console.log("[api] Using provided session token (bypassing getSession)");
    authHeaders = { Authorization: `Bearer ${existingSession.access_token}` };
  } else {
    console.log("[api] No session provided, retrieving fresh headers...");
    authHeaders = await getAuthHeaders();
    console.log("[api] Auth headers retrieved");
  }
  
  const headers: Record<string, string> = {
    ...authHeaders,
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const url = endpoint.startsWith("http") ? endpoint : `${BACKEND_URL}${endpoint}`;
  
  let attempts = 0;
  while (attempts < 2) {
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
      clearTimeout(id);
      attempts++;
      
      // Only retry on network failures or timeouts, and only once
      if (attempts < 2 && (error.name === 'AbortError' || error.message === 'Failed to fetch' || error.message.includes('fetch failed'))) {
        console.warn(`[api] Request failed, retrying... (Attempt ${attempts + 1})`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      
      if (error.name === 'AbortError') {
        throw new Error("Request timed out. The server may be busy — please try again.");
      }
      throw error;
    } finally {
      clearTimeout(id);
    }
  }
}
/**
 * Checks if a Supabase signed URL is expired and refreshes it if necessary.
 * Returns the fresh URL.
 */
export async function ensureFreshCvUrl(userId: string, currentUrl: string): Promise<string> {
  if (!currentUrl) return currentUrl;

  try {
    // 1. Try to extract the token from the URL
    // Use window.location.origin as base in case currentUrl is relative
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const urlObj = new URL(currentUrl, baseUrl);
    const token = urlObj.searchParams.get("token");
    
    if (!token) return currentUrl; // Not a signed URL as we expect

    // 2. Decode the JWT (signed Supabase URLs use JWT tokens)
    // The middle part (index 1) contains the payload
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return currentUrl;

    const payload = JSON.parse(atob(payloadPart));
    const exp = payload.exp;
    
    if (exp) {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      // If it has expired or is about to expire (within 5 minutes buffer)
      if (exp < nowInSeconds + 300) {
        console.debug("[api] CV URL expired or near expiry, refreshing for user:", userId);
        const data = await authenticatedFetch("/refresh-cv-url", {
          method: "POST",
          body: JSON.stringify({ user_id: userId })
        });
        return data.cv_url || currentUrl;
      }
    }
  } catch (e) {
    console.error("[api] Failed to check CV URL expiry:", e);
  }

  return currentUrl;
}
