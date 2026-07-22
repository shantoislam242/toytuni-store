import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getIsSuperAdmin } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { getAdminTeam } from "@/lib/admin/queries";
import { TeamManager } from "@/components/admin/team-manager";

export function generateMetadata(): Metadata {
  return {
    title: "Team",
    robots: { index: false, follow: false },
  };
}

/**
 * Admin Team page (Task 5). Super-admin only — a plain `admin` is redirected
 * back to the dashboard (mirrors `/admin/settings`'s gate). Lists every
 * dashboard-managed admin (`getAdminTeam`, Task 4 — env-bootstrap supers are
 * folded in and flagged `permanent`) and lets a super add/promote/demote/
 * remove peers via the client `TeamManager`. `selfEmail` drives the
 * can't-touch-yourself guard in the UI (the actions re-check it server-side
 * too — this is just so the controls don't even render as usable).
 */
export default async function Page() {
  if (!(await getIsSuperAdmin())) redirect("/admin");

  const [team, user] = await Promise.all([getAdminTeam(), getSessionUser()]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Team</h1>
      <p className="mt-1 text-sm text-ink-muted">Who can access this dashboard.</p>

      <div className="mt-6">
        <TeamManager members={team} selfEmail={user?.email?.toLowerCase() ?? ""} />
      </div>
    </div>
  );
}
