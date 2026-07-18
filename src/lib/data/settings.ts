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
export const getSettings = unstable_cache(readSettings, ["site-settings"], {
  tags: ["settings"],
  revalidate: 3600,
});
