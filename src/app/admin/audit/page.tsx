import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import { getIsSuperAdmin } from "@/lib/auth/roles";
import { getAuditLog } from "@/lib/admin/audit";

export function generateMetadata(): Metadata {
  return { title: "Audit log", robots: { index: false, follow: false } };
}

/** Format an ISO timestamp as "YYYY-MM-DD HH:MM" (UTC — matches the DB). */
function when(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

/** Colour the action label by its domain prefix. */
function actionClass(action: string): string {
  const p = action.split(".")[0];
  if (p === "team" || p === "settings") return "bg-danger/10 text-danger";
  if (p === "order") return "bg-neem/10 text-neem-deep";
  if (p === "product") return "bg-dusty-blue/15 text-dusty-blue";
  return "bg-cream-200 text-ink-soft";
}

/**
 * `/admin/audit` — who changed what (super-admin only, gated in the sidebar +
 * the audit read is service-role). Read-only; the latest 200 entries.
 */
export default async function Page() {
  if (!(await getIsSuperAdmin())) redirect("/admin");
  const entries = await getAuditLog();

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Security</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">Audit log</h1>
      <p className="mt-1 text-sm text-ink-muted">Recent admin actions — orders, settings, team, products, coupons.</p>

      {entries.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-cream-300 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-neem-deep">
            <ScrollText className="size-6" />
          </span>
          <p className="mt-4 font-medium text-ink">No activity yet</p>
          <p className="mt-1 text-sm text-ink-muted">Admin changes will be recorded here.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-cream-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-300 bg-cream-100 text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5 font-medium">When (UTC)</th>
                <th className="px-4 py-2.5 font-medium">Who</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-cream-200 last:border-b-0 hover:bg-cream-50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-soft">{when(e.createdAt)}</td>
                  <td className="px-4 py-3 text-ink-muted">{e.actorEmail}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold ${actionClass(e.action)}`}>
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
