import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { rowToNav, DEFAULT_NAV, type NavContent } from "@/lib/data/nav-shape";

async function readNav(): Promise<NavContent> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "nav")
      .maybeSingle()
      .overrideTypes<{ value: unknown }, { merge: false }>();
    if (error) throw error;
    if (!data) return DEFAULT_NAV;
    return rowToNav(data.value);
  } catch (err) {
    console.error("getNavContent failed; using defaults:", err);
    return DEFAULT_NAV;
  }
}

/** Cached, tag-invalidatable header/footer nav (`site_settings` key `nav`).
 *  Admin `updateNavContent` calls `revalidateTag("nav-content")`. */
export const getNavContent = unstable_cache(readNav, ["nav-content"], {
  tags: ["nav-content"],
  revalidate: 3600,
});
