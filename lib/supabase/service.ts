/**
 * Supabase Service Client
 * For server-side operations that don't require user authentication
 * Used in background jobs, API routes, and server actions
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with service role key
 * Use this for background jobs and admin operations
 * WARNING: This bypasses RLS - use carefully
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
