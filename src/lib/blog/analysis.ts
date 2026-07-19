export type CheckStatus = "good" | "ok" | "bad";
export type Check = { id: string; status: CheckStatus; text: string };
export type AnalysisResult = { score: number; rating: CheckStatus; checks: Check[] };

const WEIGHT: Record<CheckStatus, number> = { good: 1, ok: 0.5, bad: 0 };

/** Weighted average of check statuses → a 0–100 score + a rating bucket
 *  (good ≥ 70, ok ≥ 40, else bad). Empty → 0/bad. Pure. */
export function scoreChecks(checks: Check[]): { score: number; rating: CheckStatus } {
  if (checks.length === 0) return { score: 0, rating: "bad" };
  const avg = checks.reduce((s, ch) => s + WEIGHT[ch.status], 0) / checks.length;
  const score = Math.round(avg * 100);
  const rating: CheckStatus = score >= 70 ? "good" : score >= 40 ? "ok" : "bad";
  return { score, rating };
}
