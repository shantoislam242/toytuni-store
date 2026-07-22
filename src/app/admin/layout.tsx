import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getAdminRole } from "@/lib/auth/roles";
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
