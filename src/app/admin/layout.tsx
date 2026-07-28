import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getAdminRole } from "@/lib/auth/roles";
import { isAdminSessionExpired } from "@/lib/auth/admin-session";
import { getInboxUnreadCount } from "@/lib/admin/queries";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * The authoritative, DB-aware admin gate: `src/proxy.ts` only checks that a
 * user is signed in (a DB-managed admin isn't in env, so the proxy can't
 * judge role) — this Server Component re-check is what actually decides
 * admin access, and resolves the role that gets threaded down to the
 * sidebar for role-gated nav items. Uses `getSessionUser()` / `getAdminRole()`
 * (token-verified via Supabase `auth.getUser()`), not a trusted cookie read.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  // Admin absolute-session cap: an over-age admin session is signed out and
  // sent to re-login (consumer sessions are unaffected — this gate only runs
  // under /admin). Checked before the role lookup so the redirect is a clean
  // sign-out rather than a bare "not an admin" bounce.
  if (user && isAdminSessionExpired(user.last_sign_in_at)) {
    redirect("/auth/admin-timeout");
  }
  const role = await getAdminRole();
  if (!user || !role) {
    redirect("/");
  }

  const inboxUnread = await getInboxUnreadCount();

  return (
    <AdminShell
      user={{
        name: user.user_metadata?.full_name ?? user.email ?? "Admin",
        email: user.email ?? "",
      }}
      inboxUnread={inboxUnread}
      role={role}
    >
      {children}
    </AdminShell>
  );
}
