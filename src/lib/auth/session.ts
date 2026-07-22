import "server-only";
import type { User } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { getAdminRole } from "@/lib/auth/roles";

/** The authenticated user for this request, or null.
 *  Uses `auth.getUser()` (validates the token against Supabase), not
 *  `getSession()` (trusts the unverified cookie) — this is the authoritative
 *  server-side check. */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** True iff the current session's user is an admin (server-authoritative:
 *  checks `ADMIN_EMAILS` against a token-verified user). */
export async function getIsAdmin(): Promise<boolean> {
  return (await getAdminRole()) !== null;
}
