import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { rowToBulk, DEFAULT_BULK, type BulkContent } from "@/lib/data/bulk-shape";

async function readBulk(): Promise<BulkContent> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "bulk")
      .maybeSingle()
      .overrideTypes<{ value: unknown }, { merge: false }>();
    if (error) throw error;
    if (!data) return DEFAULT_BULK;
    return rowToBulk(data.value);
  } catch (err) {
    console.error("getBulkContent failed; using defaults:", err);
    return DEFAULT_BULK;
  }
}

/** Cached, tag-invalidatable Bulk-page content (`site_settings` key `bulk`).
 *  Admin `updateBulkContent` calls `revalidateTag("bulk-content")`. */
export const getBulkContent = unstable_cache(readBulk, ["bulk-content"], {
  tags: ["bulk-content"],
  revalidate: 3600,
});
