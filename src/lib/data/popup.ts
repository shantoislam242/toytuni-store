import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { rowToPopup, DEFAULT_POPUP, type PopupContent } from "@/lib/data/popup-shape";

async function readPopup(): Promise<PopupContent> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "popup")
      .maybeSingle()
      .overrideTypes<{ value: unknown }, { merge: false }>();
    if (error) throw error;
    if (!data) return DEFAULT_POPUP;
    return rowToPopup(data.value);
  } catch (err) {
    console.error("getPopupContent failed; using defaults:", err);
    return DEFAULT_POPUP;
  }
}

/** Cached, tag-invalidatable newsletter pop-up content (`site_settings` key
 *  `popup`). Admin `updatePopupContent` calls `revalidateTag("popup-content")`. */
export const getPopupContent = unstable_cache(readPopup, ["popup-content"], {
  tags: ["popup-content"],
  revalidate: 3600,
});
