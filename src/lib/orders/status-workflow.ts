export const ORDER_STATUSES = [
  "pending", "confirmed", "shipped", "delivered", "cancelled", "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// `cancelled` and `returned` are reached via their own atomic RPCs
// (cancel_order / return_order), never a generic transition — so neither is a
// listed target here (and `updateOrderStatus` rejects them explicitly).
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  returned: [],
};

const TIMESTAMP_FIELD: Record<OrderStatus, string | null> = {
  pending: null,
  confirmed: "confirmed_at",
  shipped: "shipped_at",
  delivered: "delivered_at",
  cancelled: "cancelled_at",
  // returned_at is set by the return_order RPC, not updateOrderStatus.
  returned: null,
};

export function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(v);
}
export function allowedTransitions(status: OrderStatus): OrderStatus[] {
  return TRANSITIONS[status];
}
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
export function timestampFieldFor(
  status: OrderStatus,
): "confirmed_at" | "shipped_at" | "delivered_at" | "cancelled_at" | null {
  return TIMESTAMP_FIELD[status] as
    | "confirmed_at" | "shipped_at" | "delivered_at" | "cancelled_at" | null;
}
