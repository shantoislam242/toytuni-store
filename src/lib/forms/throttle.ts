import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort per-IP request throttle for the PUBLIC form submission surface —
 * shared by contact, bulk inquiry, and newsletter subscription so all
 * count against the same window.
 *
 * BEST-EFFORT ONLY: this Map lives in module memory, so it is scoped to a single
 * serverless instance and resets on cold start — it is NOT a global rate limit.
 * It's just a cheap speed-bump against casual spam. The REAL protections are
 * validation, bounds, and the RLS zero-policy tables.
 */
const WINDOW_MS = 60_000; // 1 minute
const MAX_HITS = 5; // per IP per window
const hits = new Map<string, number[]>();

/** Records this request and returns true once the caller has exceeded the
 *  window's budget (i.e. the request should be rejected). */
export async function isFormRateLimited(): Promise<boolean> {
  const store = await headers();
  const ip =
    (store.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_HITS;
}
