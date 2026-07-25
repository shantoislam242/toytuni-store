import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { rowToAbout, DEFAULT_ABOUT, type AboutContent } from "@/lib/data/about-shape";

async function readAbout(): Promise<AboutContent> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "about")
      .maybeSingle()
      .overrideTypes<{ value: unknown }, { merge: false }>();
    if (error) throw error;
    if (!data) return DEFAULT_ABOUT;
    return rowToAbout(data.value);
  } catch (err) {
    console.error("getAboutContent failed; using defaults:", err);
    return DEFAULT_ABOUT;
  }
}

/** Cached, tag-invalidatable About-page content. Admin `updateAboutContent`
 *  calls `revalidateTag("about-content")`. Cookieless public read →
 *  prerender-safe. Stored in `site_settings` under the `about` key. */
export const getAboutContent = unstable_cache(readAbout, ["about-content"], {
  tags: ["about-content"],
  revalidate: 3600,
});
