import "server-only";
import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { resolveAdminRole, type AdminRole } from "@/lib/auth/resolve-role";

export type { AdminRole };

/** The env-bootstrap admin allowlist (lockout-proof supers), lowercased/trimmed.
 *  Exported so callers outside this module (team queries/actions) share this
 *  ONE parse instead of re-deriving it — this file is not "use server", so a
 *  non-async export is fine here. */
export function adminEnvEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "";
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/** The signed-in user's admin role (or null). Per-request memoized. Env
 *  bootstrap wins as super_admin BEFORE any DB read, and a DB failure only
 *  degrades DB-managed admins — never the env owners. */
export const getAdminRole = cache(async (): Promise<AdminRole | null> => {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email?.trim().toLowerCase();
  if (!email) return null;
  const env = adminEnvEmails();
  if (env.includes(email)) return "super_admin";
  try {
    const db = createAdminSupabase();
    const { data } = await db
      .from("admin_users" as never)
      .select("role")
      .eq("email", email)
      .maybeSingle()
      .overrideTypes<{ role: string }, { merge: false }>();
    return resolveAdminRole(email, env, data?.role ?? null);
  } catch (err) {
    console.error("getAdminRole db lookup failed:", err);
    return resolveAdminRole(email, env, null);
  }
});

export async function getIsSuperAdmin(): Promise<boolean> {
  return (await getAdminRole()) === "super_admin";
}
