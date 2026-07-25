import type { ReactNode } from "react";
import { getSessionUser, getIsAdmin } from "@/lib/auth/session";
import { getCustomerDashboard } from "@/lib/data/account";
import { getSettings } from "@/lib/data/settings";
import { customerTier } from "@/lib/admin/customer-tier";
import { pointsFromSpend } from "@/lib/account/loyalty";
import { AccountGate } from "@/components/account/account-gate";
import { AccountSidebar } from "@/components/account/account-sidebar";

/**
 * Shell for the whole `/account` area: a persistent sidebar (profile card +
 * nav + loyalty tier/points) alongside the active page. Server component — it
 * gates on the authoritative session and derives the loyalty tier/points from
 * lifetime spend, so no page under it has to re-establish who the visitor is.
 *
 * Signed-out visitors get the `AccountGate` (which renders its own `<main>`),
 * never the shell. Route handlers under `/account` (e.g. the invoice route)
 * are unaffected — layouts only wrap page segments.
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user?.email) return <AccountGate />;

  const [dashboard, settings, showAdminLink] = await Promise.all([
    getCustomerDashboard(user.email),
    getSettings(),
    getIsAdmin(),
  ]);
  const tier = customerTier(dashboard.totalSpent, settings.customerTiers);
  const points = pointsFromSpend(dashboard.totalSpent);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:py-12">
      <div className="grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)]">
        <AccountSidebar
          user={{
            name: user.user_metadata?.full_name ?? user.email,
            email: user.email,
            avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
          }}
          tier={tier}
          points={points}
          orderCount={dashboard.totalOrders}
          showAdminLink={showAdminLink}
        />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
