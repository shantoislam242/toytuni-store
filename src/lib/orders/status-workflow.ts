export const ORDER_STATUSES = [
  "pending", "confirmed", "shipped", "delivered", "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const TIMESTAMP_FIELD: Record<OrderStatus, string | null> = {
  pending: null,
  confirmed: "confirmed_at",
  shipped: "shipped_at",
  delivered: "delivered_at",
  cancelled: "cancelled_at",
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
