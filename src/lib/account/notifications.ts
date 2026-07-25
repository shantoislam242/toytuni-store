"use server";

import { getSessionUser } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Mark one of the signed-in customer's notifications read. Scoped by session
 *  email — a mismatched id/owner simply affects no rows. */
export async function markNotificationRead(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user?.email) return { ok: false, error: "Please sign in." };

  const db = createAdminSupabase();
  const { error } = await db
    .from("notifications" as never)
    .update({ read_at: new Date().toISOString() } as never)
    .eq("id", id)
    .eq("customer_email", user.email)
    .is("read_at", null);
  if (error) {
    console.error("markNotificationRead failed:", error);
    return { ok: false, error: "Could not update the notification." };
  }
  return { ok: true };
}

/** Mark all of the signed-in customer's unread notifications read. */
export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user?.email) return { ok: false, error: "Please sign in." };

  const db = createAdminSupabase();
  const { error } = await db
    .from("notifications" as never)
    .update({ read_at: new Date().toISOString() } as never)
    .eq("customer_email", user.email)
    .is("read_at", null)
    .is("archived_at", null);
  if (error) {
    console.error("markAllNotificationsRead failed:", error);
    return { ok: false, error: "Could not update notifications." };
  }
  return { ok: true };
}

/** Archive (dismiss) one of the signed-in customer's notifications. */
export async function archiveNotification(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user?.email) return { ok: false, error: "Please sign in." };

  const db = createAdminSupabase();
  const { error } = await db
    .from("notifications" as never)
    .update({ archived_at: new Date().toISOString() } as never)
    .eq("id", id)
    .eq("customer_email", user.email);
  if (error) {
    console.error("archiveNotification failed:", error);
    return { ok: false, error: "Could not dismiss the notification." };
  }
  return { ok: true };
}
