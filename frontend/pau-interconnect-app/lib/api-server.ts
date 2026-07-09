import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseFetch } from "./supabase-fetch";
import { getBackendUrl } from "./env";
import { logger } from "./logger";
import { ApiError, isApiErrorPayload, toApiErrorMessage } from "@/types/api";
import type { AuthSessionLike } from "@/types/domain";

const BACKEND_URL = getBackendUrl();

/**
 * Server-only version of auth header retrieval.
 * Uses next/headers to get cookies for supabase session.
 */
async function getAuthHeadersServer(
  existingSession?: AuthSessionLike,
): Promise<Record<string, string>> {
  if (existingSession) {
    return { Authorization: `Bearer ${existingSession.access_token}` };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {}, // Read-only for access tokens
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return {};
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Reusable fetch wrapper for Server Components.
 * Automatically attaches the Supabase JWT.
 */
export async function authenticatedFetchServer<TResponse = unknown>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 15000,
  session?: AuthSessionLike,
) {
  const authHeaders = await getAuthHeadersServer(session);

  const headers: Record<string, string> = {
    ...authHeaders,
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${BACKEND_URL}${endpoint}`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(id);
    const data: unknown = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(toApiErrorMessage(data, response.status), {
        status: response.status,
        payload: isApiErrorPayload(data) ? data : undefined,
      });
    }

    return data as TResponse;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(
        "Request timed out (Server Fetch). The backend may be busy.",
      );
    }
    logger.error("api-server", "Server fetch failed", error);
    throw error;
  } finally {
    clearTimeout(id);
  }
}
