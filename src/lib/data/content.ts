import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { rowToContent, DEFAULT_CONTENT, type SiteContent } from "@/lib/data/content-shape";

async function readContent(): Promise<SiteContent> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "homepage")
      .maybeSingle()
      .overrideTypes<{ value: unknown }, { merge: false }>();
    if (error) throw error;
    if (!data) return DEFAULT_CONTENT;
    return rowToContent(data.value);
  } catch (err) {
    console.error("getSiteContent failed; using defaults:", err);
    return DEFAULT_CONTENT;
  }
}

/** Cached, tag-invalidatable editable homepage content (hero + about teaser).
 *  An admin `updateHomepageContent` calls `revalidateTag("site-content")`.
 *  1-hour revalidate bounds staleness. Stored in `site_settings` under the
 *  `homepage` key (same table/public-read policy as `getSettings`). */
export const getSiteContent = unstable_cache(readContent, ["site-content"], {
  tags: ["site-content"],
  revalidate: 3600,
});
