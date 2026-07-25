import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { rowToFaq, type FaqItem, type FaqRow } from "@/lib/faq/faqs-shape";
import { faqs as MOCK_FAQS } from "@/lib/mock/faqs";

const FAQ_SELECT = "id, category, question, answer, link_label, link_href, active, sort";

async function readFaqs(): Promise<FaqItem[]> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("faqs" as never)
      .select(FAQ_SELECT)
      .eq("active", true)
      .order("sort", { ascending: true })
      .overrideTypes<FaqRow[], { merge: false }>();
    if (error) throw error;
    // Empty table (pre-seed / pre-migration) → fall back to the bundled mock so
    // the support page is never blank (same pattern as taxonomy/blog).
    if (!data || data.length === 0) return MOCK_FAQS;
    return data.map(rowToFaq);
  } catch (err) {
    console.error("getFaqs failed; using mock:", err);
    return MOCK_FAQS;
  }
}

/** Cached, tag-invalidatable active FAQs (storefront). Admin writes call
 *  `revalidateTag("faqs")`. Cookieless public read → prerender-safe. */
export const getFaqs = unstable_cache(readFaqs, ["faqs"], {
  tags: ["faqs"],
  revalidate: 3600,
});
