import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { getPolicy, type PolicyContent } from "@/lib/policy";

/** Canonical editable policy slugs (`refund` is an alias for `returns`). */
export const EDITABLE_POLICY_SLUGS = [
  "returns", "privacy", "terms", "warranty", "cookies", "bulk-orders",
] as const;

/** Fold the `refund` alias onto `returns` so both routes share one stored row. */
export function canonicalPolicySlug(slug: string): string {
  return slug === "refund" ? "returns" : slug;
}

/** Shallow guard: a stored jsonb must at least look like a `PolicyContent`. */
function isPolicyContent(v: unknown): v is PolicyContent {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.title === "string" && Array.isArray(o.sections) && typeof o.cta === "object";
}

async function readPolicy(key: string): Promise<PolicyContent | undefined> {
  const fallback = getPolicy(key);
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("policy_pages" as never)
      .select("content")
      .eq("slug", key)
      .maybeSingle()
      .overrideTypes<{ content: unknown }, { merge: false }>();
    if (error) throw error;
    if (data && isPolicyContent(data.content)) return data.content;
    return fallback;
  } catch (err) {
    console.error("getPolicyContent failed; using default:", err);
    return fallback;
  }
}

/**
 * A policy page's content: the admin's DB override if present + valid, else the
 * hardcoded module (`src/lib/policy`). Cached per slug, tag-invalidatable
 * (`policy-content:<slug>`); cookieless public read → prerender-safe.
 */
export function getPolicyContent(slug: string): Promise<PolicyContent | undefined> {
  const key = canonicalPolicySlug(slug);
  return unstable_cache(() => readPolicy(key), ["policy-content", key], {
    tags: ["policy-content", `policy-content:${key}`],
    revalidate: 3600,
  })();
}
