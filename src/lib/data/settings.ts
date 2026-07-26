import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { rowToSettings, DEFAULT_SETTINGS, type Settings } from "@/lib/data/settings-shape";

async function readSettings(): Promise<Settings> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "general")
      .maybeSingle()
      .overrideTypes<{ value: unknown }, { merge: false }>();
    if (error) throw error;
    if (!data) return DEFAULT_SETTINGS;
    return rowToSettings(data.value);
  } catch (err) {
    console.error("getSettings failed; using defaults:", err);
    return DEFAULT_SETTINGS;
  }
}

/** Cached, tag-invalidatable store settings. An admin `updateSettings` calls
 *  `revalidateTag("settings")`. 1-hour revalidate bounds staleness. */
// Cache-key suffix bumped on Settings SHAPE changes (the persisted Data Cache
// stores the post-normalize value → an old entry can miss new fields and crash
// new code). "2" = added shipping.insideDistricts + brand.logoUrl.
export const getSettings = unstable_cache(readSettings, ["site-settings", "2"], {
  tags: ["settings"],
  revalidate: 3600,
});
