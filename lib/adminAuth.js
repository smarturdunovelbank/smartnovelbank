import { createClient } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Extracts and verifies the Supabase Auth session token from the incoming Request.
 * Uses `supabase.auth.getUser(token)` to validate against Supabase Auth.
 * 
 * @param {Request} request Next.js Route Request
 * @returns {Promise<{ user: import('@supabase/supabase-js').User | null, token: string | null, error: string | null }>}
 */
export async function verifySupabaseAdmin(request) {
  const authHeader =
    request?.headers?.get("authorization") ||
    request?.headers?.get("Authorization") ||
    "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return { user: null, token: null, error: "Missing authorization token" };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { user: null, token: null, error: "Invalid or expired session" };
    }
    return { user, token, error: null };
  } catch (err) {
    return { user: null, token: null, error: err?.message || "Authentication error" };
  }
}

/**
 * Returns a Supabase client configured with the user's Auth Bearer token and
 * cache-busting fetch headers, allowing queries to run under the user's identity.
 * Falls back to the default anon client if no token is provided.
 * 
 * @param {string | null} [token] JWT access token from Supabase Auth
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getAdminSupabase(token) {
  if (token && supabaseUrl && supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
      },
    });
  }
  return supabase;
}
