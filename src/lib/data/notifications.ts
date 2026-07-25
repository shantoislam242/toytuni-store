import "server-only";
import type { createAdminSupabase } from "@/lib/supabase/admin";

type AdminDb = ReturnType<typeof createAdminSupabase>;

export type AccountNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  /** Deep-link target order, or null for a non-order notification. */
  orderNumber: string | null;
  /** ISO timestamp when read, or null if unread. */
  readAt: string | null;
  createdAt: string;
};

/** `notifications` postpends the generated types (migration 0021), so
 *  reads/writes use the `as never` escape hatch — same as coupons / wishlist /
 *  addresses. All access is scoped to a customer email. */
type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  order_number: string | null;
  read_at: string | null;
  created_at: string;
};

const SELECT = "id, type, title, body, order_number, read_at, created_at";

function rowToNotification(r: NotificationRow): AccountNotification {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    orderNumber: r.order_number,
    readAt: r.read_at,
    createdAt: r.created_at,
  };
}

/** A customer's non-archived notifications, newest first. `[]` on read error
 *  (fail-soft). SERVER-ONLY — the caller's session email is the authorization. */
export async function getNotifications(
  db: AdminDb,
  email: string,
): Promise<AccountNotification[]> {
  const { data, error } = await db
    .from("notifications" as never)
    .select(SELECT)
    .eq("customer_email", email)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .overrideTypes<NotificationRow[], { merge: false }>();

  if (error) {
    console.error("getNotifications failed:", error);
    return [];
  }
  return (data ?? []).map(rowToNotification);
}

/** Count of a customer's unread, non-archived notifications (sidebar badge).
 *  `0` on error. */
export async function getUnreadNotificationCount(
  db: AdminDb,
  email: string,
): Promise<number> {
  const { count, error } = await db
    .from("notifications" as never)
    .select("id", { count: "exact", head: true })
    .eq("customer_email", email)
    .is("read_at", null)
    .is("archived_at", null);

  if (error) {
    console.error("getUnreadNotificationCount failed:", error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Insert a notification for a customer email directly (no order lookup). Used
 * for non-order events — e.g. a support reply. Fail-soft. `orderNumber` is an
 * optional deep-link target.
 */
export async function createNotification(
  db: AdminDb,
  email: string,
  n: { type?: string; title: string; body?: string | null; orderNumber?: string | null },
): Promise<void> {
  const { error } = await db.from("notifications" as never).insert({
    customer_email: email,
    type: n.type ?? "system",
    title: n.title,
    body: n.body ?? null,
    order_number: n.orderNumber ?? null,
  } as never);
  if (error) console.error("createNotification insert failed:", error);
}

/** Friendly title for an order-status notification. */
function statusTitle(status: string): string {
  switch (status) {
    case "confirmed":
      return "Order confirmed";
    case "processing":
      return "Order is being prepared";
    case "shipped":
      return "Your order has shipped";
    case "delivered":
      return "Order delivered";
    case "cancelled":
      return "Order cancelled";
    case "returned":
      return "Order returned";
    default:
      return `Order updated: ${status}`;
  }
}

/**
 * Insert one order notification for the order's customer. Re-reads the order to
 * resolve its `customer_email` + `order_number` (so callers only pass the id).
 * Fail-soft: a missing email or an insert error is logged, never thrown — an
 * order mutation must never fail because its notification didn't land. Used by
 * the admin order actions (service-role).
 */
export async function createOrderNotification(
  db: AdminDb,
  orderId: string,
  title: string,
  body: string | null,
): Promise<void> {
  const { data: order, error: readErr } = await db
    .from("orders")
    .select("customer_email, order_number")
    .eq("id", orderId)
    .maybeSingle()
    .overrideTypes<{ customer_email: string | null; order_number: string }, { merge: false }>();
  if (readErr || !order?.customer_email) {
    if (readErr) console.error("createOrderNotification read failed:", readErr);
    return;
  }
  const { error } = await db.from("notifications" as never).insert({
    customer_email: order.customer_email,
    type: "order",
    title,
    body,
    order_number: order.order_number,
  } as never);
  if (error) console.error("createOrderNotification insert failed:", error);
}

/** Notify a customer that their order moved to `status` (order-status change). */
export async function notifyOrderStatus(
  db: AdminDb,
  orderId: string,
  status: string,
  body?: string,
): Promise<void> {
  await createOrderNotification(
    db,
    orderId,
    statusTitle(status),
    body ?? null,
  );
}
