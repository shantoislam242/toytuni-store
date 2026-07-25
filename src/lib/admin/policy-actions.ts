"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getIsAdmin } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getPolicy, type PolicyContent } from "@/lib/policy";
import { canonicalPolicySlug } from "@/lib/data/policy-content";

type Result = { ok: true } | { ok: false; error: string };

function bust(key: string) {
  revalidateTag(`policy-content:${key}`, "max");
  revalidatePath(`/policy/${key}`);
  if (key === "returns") revalidatePath("/policy/refund");
  revalidatePath(`/admin/content/policies/${key}`);
}

/** The policy's editable content: the DB override if present, else the hardcoded
 *  default. Admin-gated. Returns null for an unknown slug. */
export async function getAdminPolicy(slug: string): Promise<PolicyContent | null> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const key = canonicalPolicySlug(slug);
  const db = createAdminSupabase();
  const { data } = await db
    .from("policy_pages" as never)
    .select("content")
    .eq("slug", key)
    .maybeSingle()
    .overrideTypes<{ content: PolicyContent }, { merge: false }>();
  if (data?.content) return data.content;
  return getPolicy(key) ?? null;
}

/** Save a policy page's content (upsert). Admin-gated. */
export async function updatePolicy(slug: string, content: PolicyContent): Promise<Result> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const key = canonicalPolicySlug(slug);
  if (!getPolicy(key)) return { ok: false, error: "Unknown policy." };
  if (!content?.title?.trim() || !Array.isArray(content.sections)) {
    return { ok: false, error: "Policy needs a title and at least the sections structure." };
  }
  const db = createAdminSupabase();
  const { error } = await db
    .from("policy_pages" as never)
    .upsert(
      { slug: key, content: content as never, updated_at: new Date().toISOString() } as never,
      { onConflict: "slug" },
    );
  if (error) return { ok: false, error: error.message };
  bust(key);
  return { ok: true };
}

/** Discard the DB override → revert the page to its hardcoded default. */
export async function resetPolicy(slug: string): Promise<Result> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const key = canonicalPolicySlug(slug);
  const db = createAdminSupabase();
  const { error } = await db.from("policy_pages" as never).delete().eq("slug", key);
  if (error) return { ok: false, error: error.message };
  bust(key);
  return { ok: true };
}
