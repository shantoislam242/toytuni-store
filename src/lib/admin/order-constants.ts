// Plain constants shared by the order admin — deliberately NOT in the
// `"use server"` `actions.ts`: a `"use server"` module may export only async
// functions, so a value export there corrupts every server-action reference in
// the file (which broke client→action calls, e.g. inventory stock updates).

/** Courier options offered when marking an order shipped. */
export const ORDER_CARRIERS = [
  "Pathao",
  "Steadfast",
  "RedX",
  "Sundarban",
  "Paperfly",
  "eCourier",
  "Other",
] as const;

export type OrderCarrier = (typeof ORDER_CARRIERS)[number];
