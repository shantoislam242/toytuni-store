import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort per-IP request throttle for the PUBLIC order-tracking surface —
 * shared by the `trackOrder` server action and the track-invoice route so both
 * count against the same window.
 *
 * BEST-EFFORT ONLY: this Map lives in module memory, so it is scoped to a single
 * serverless instance and resets on cold start — it is NOT a global rate limit.
 * It's just a cheap speed-bump against casual scraping. The REAL credential is
 * the order#+phone pair: an attacker has to know BOTH, and every miss (wrong
 * phone or unknown order) returns the same generic "not found", so there is
 * nothing to enumerate even without the throttle.
 */
const WINDOW_MS = 60_000; // 1 minute
const MAX_HITS = 10; // per IP per window
const hits = new Map<string, number[]>();

/** Records this request and returns true once the caller has exceeded the
 *  window's budget (i.e. the request should be rejected). */
export async function isRateLimited(): Promise<boolean> {
  const store = await headers();
  const ip =
    (store.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_HITS;
}
