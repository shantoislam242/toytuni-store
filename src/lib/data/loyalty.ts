import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { rowToLoyalty, DEFAULT_LOYALTY, type LoyaltyContent } from "@/lib/data/loyalty-shape";

async function readLoyalty(): Promise<LoyaltyContent> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "loyalty")
      .maybeSingle()
      .overrideTypes<{ value: unknown }, { merge: false }>();
    if (error) throw error;
    if (!data) return DEFAULT_LOYALTY;
    return rowToLoyalty(data.value);
  } catch (err) {
    console.error("getLoyaltyContent failed; using defaults:", err);
    return DEFAULT_LOYALTY;
  }
}

/** Cached, tag-invalidatable Loyalty-page content (`site_settings` key
 *  `loyalty`). Admin `updateLoyaltyContent` calls `revalidateTag("loyalty-content")`. */
export const getLoyaltyContent = unstable_cache(readLoyalty, ["loyalty-content"], {
  tags: ["loyalty-content"],
  revalidate: 3600,
});
