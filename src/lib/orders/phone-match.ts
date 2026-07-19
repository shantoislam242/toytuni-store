/** Reduce a BD phone to canonical local form: digits only, `880…`→`0…`. */
export function normalizePhone(raw: string): string {
  let d = (raw ?? "").replace(/\D+/g, "");
  if (d.startsWith("880")) d = "0" + d.slice(3);
  return d;
}
/** True iff two phones are the same number; tolerant to the last 10 digits. */
export function phoneMatches(a: string, b: string): boolean {
  const na = normalizePhone(a), nb = normalizePhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = na.slice(-10), tb = nb.slice(-10);
  return ta.length === 10 && ta === tb;
}
