/**
 * Frontend-only "recent searches" history, stored in the browser's localStorage
 * (no backend). Most-recent-first, de-duplicated (case-insensitive) and capped.
 * SSR-safe — reads return [] and writes no-op on the server.
 */

const STORAGE_KEY = "recent-searches";
const MAX_ITEMS = 6;

/** Read the stored search terms, most-recent-first. */
export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

/** Add a term to the front (de-duped, capped). Returns the updated list. */
export function addRecentSearch(term: string): string[] {
  const clean = term.trim();
  if (typeof window === "undefined" || !clean) return readRecentSearches();
  try {
    const next = [
      clean,
      ...readRecentSearches().filter((s) => s.toLowerCase() !== clean.toLowerCase()),
    ].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return readRecentSearches();
  }
}

/** Clear all stored recent searches. */
export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
