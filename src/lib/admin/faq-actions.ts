"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getIsAdmin } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { rowToFaq, type AdminFaq, type FaqInput, type FaqRow } from "@/lib/faq/faqs-shape";

type Result = { ok: true } | { ok: false; error: string };
const SELECT = "id, category, question, answer, link_label, link_href, active, sort";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** All FAQs (active + inactive), sort order. Admin-gated + service-role. */
export async function getAdminFaqs(): Promise<AdminFaq[]> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("faqs" as never)
    .select(SELECT)
    .order("sort", { ascending: true })
    .overrideTypes<FaqRow[], { merge: false }>();
  if (error) throw new Error(`getAdminFaqs failed: ${error.message}`);
  return (data ?? []).map(rowToFaq);
}

function normalize(input: FaqInput):
  | { ok: true; row: { category: string; question: string; answer: string; link_label: string | null; link_href: string | null; active: boolean } }
  | { ok: false; error: string } {
  const category = input.category.trim();
  const question = input.question.trim();
  const answer = input.answer.trim();
  if (!category) return { ok: false, error: "Pick a category." };
  if (!question) return { ok: false, error: "Question is required." };
  if (!answer) return { ok: false, error: "Answer is required." };
  const link_href = input.linkHref.trim() || null;
  const link_label = input.linkLabel.trim() || null;
  return { ok: true, row: { category, question, answer, link_label, link_href, active: input.active } };
}

function bust() {
  revalidateTag("faqs", "max");
  revalidatePath("/faqs");
  revalidatePath("/admin/faqs");
}

export async function createFaq(input: FaqInput): Promise<Result> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const v = normalize(input);
  if (!v.ok) return v;
  const db = createAdminSupabase();
  // Append to the end (max sort + 1).
  const { data: last } = await db
    .from("faqs" as never).select("sort").order("sort", { ascending: false }).limit(1).maybeSingle()
    .overrideTypes<{ sort: number }, { merge: false }>();
  const sort = (last?.sort ?? -1) + 1;
  const { error } = await db.from("faqs" as never).insert({ ...v.row, sort } as never);
  if (error) return { ok: false, error: error.message };
  bust();
  return { ok: true };
}

export async function updateFaq(id: string, input: FaqInput): Promise<Result> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  if (!UUID_RE.test(id)) return { ok: false, error: "FAQ not found." };
  const v = normalize(input);
  if (!v.ok) return v;
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("faqs" as never).update(v.row as never).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "FAQ not found." };
  bust();
  return { ok: true };
}

export async function deleteFaq(id: string): Promise<Result> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  if (!UUID_RE.test(id)) return { ok: false, error: "FAQ not found." };
  const db = createAdminSupabase();
  const { error } = await db.from("faqs" as never).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  bust();
  return { ok: true };
}

/** Persist a new order: `orderedIds` is the full id list in the desired order;
 *  each row's `sort` is set to its index. */
export async function reorderFaqs(orderedIds: string[]): Promise<Result> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  if (!orderedIds.every((id) => UUID_RE.test(id))) return { ok: false, error: "Invalid order." };
  const db = createAdminSupabase();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await db.from("faqs" as never).update({ sort: i } as never).eq("id", orderedIds[i]);
    if (error) return { ok: false, error: error.message };
  }
  bust();
  return { ok: true };
}
