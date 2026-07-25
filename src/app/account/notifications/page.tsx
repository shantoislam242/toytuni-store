import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getNotifications } from "@/lib/data/notifications";
import { NotificationsList } from "@/components/account/notifications-list";

export function generateMetadata(): Metadata {
  return { title: "Notifications", robots: { index: false, follow: false } };
}

/**
 * `/account/notifications` — order-status feed. The layout gates the session;
 * this reads the signed-in customer's notifications (service-role, scoped to
 * their session email) and hands them to the client list, which mutates via
 * server actions and re-reads through `router.refresh()`.
 */
export default async function Page() {
  const user = await getSessionUser();
  if (!user?.email) return null; // gated by the layout — defensive.

  const db = createAdminSupabase();
  const notifications = await getNotifications(db, user.email);
  return <NotificationsList initial={notifications} />;
}
