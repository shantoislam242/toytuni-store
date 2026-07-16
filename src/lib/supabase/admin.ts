import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. SERVER-ONLY — bypasses RLS. Never import from a client
 * component or expose the key. Used only inside server actions for writes.
 */
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
