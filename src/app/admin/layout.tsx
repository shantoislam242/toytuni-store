import { redirect } from "next/navigation";
import { getSessionUser, getIsAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Defense-in-depth admin gate: `src/proxy.ts` already redirects non-admins
 * before this ever renders, but a Server Component re-check here means the
 * gate holds even if the proxy's matcher config ever drifts. Uses
 * `getSessionUser()` / `getIsAdmin()` (token-verified via Supabase
 * `auth.getUser()`), not a trusted cookie read.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin())) {
    redirect("/");
  }

  return (
    <AdminShell
      user={{
        name: user.user_metadata?.full_name ?? user.email ?? "Admin",
        email: user.email ?? "",
      }}
    >
      {children}
    </AdminShell>
  );
}
