"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getIsAdmin } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { uploadImageToBucket } from "@/lib/storage/upload-image";
import { rowToContent, type SiteContent } from "@/lib/data/content-shape";
import { rowToAbout, type AboutContent } from "@/lib/data/about-shape";
import { rowToBulk, type BulkContent } from "@/lib/data/bulk-shape";
import { rowToLoyalty, type LoyaltyContent } from "@/lib/data/loyalty-shape";
import type { Database } from "@/lib/supabase/database.types";

type ActionResult = { ok: true } | { ok: false; error: string };
type SettingsValue = Database["public"]["Tables"]["site_settings"]["Insert"]["value"];

/**
 * Save the editable homepage content (hero + about teaser). Admin-gated (any
 * admin, not super-only — content is an editorial task). The input is passed
 * through `rowToContent` so blanks fall back to defaults and image URLs are
 * validated before storage. Stored in `site_settings` under the `homepage` key;
 * busts the `site-content` cache + the homepage.
 */
export async function updateHomepageContent(next: SiteContent): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");

  const value = rowToContent(next);
  const db = createAdminSupabase();
  const { error } = await db.from("site_settings").upsert(
    { key: "homepage", value: value as unknown as SettingsValue },
    { onConflict: "key" },
  );
  if (error) return { ok: false, error: error.message };

  revalidateTag("site-content", "max");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Save the editable About-page content. Admin-gated (any admin). Normalized via
 * `rowToAbout` so every section is well-formed. Stored in `site_settings` under
 * the `about` key; busts the `about-content` cache + the /about page.
 */
export async function updateAboutContent(next: AboutContent): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");

  const value = rowToAbout(next);
  const db = createAdminSupabase();
  const { error } = await db.from("site_settings").upsert(
    { key: "about", value: value as unknown as SettingsValue },
    { onConflict: "key" },
  );
  if (error) return { ok: false, error: error.message };

  revalidateTag("about-content", "max");
  revalidatePath("/about");
  return { ok: true };
}

/**
 * Save the editable Bulk/Wholesale-page content. Admin-gated (any admin).
 * Normalized via `rowToBulk`. Stored in `site_settings` under the `bulk` key;
 * busts the `bulk-content` cache + the /bulk page.
 */
export async function updateBulkContent(next: BulkContent): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");

  const value = rowToBulk(next);
  const db = createAdminSupabase();
  const { error } = await db.from("site_settings").upsert(
    { key: "bulk", value: value as unknown as SettingsValue },
    { onConflict: "key" },
  );
  if (error) return { ok: false, error: error.message };

  revalidateTag("bulk-content", "max");
  revalidatePath("/bulk");
  return { ok: true };
}

/**
 * Save the editable Loyalty-page content. Admin-gated (any admin). Normalized
 * via `rowToLoyalty`. Stored in `site_settings` under the `loyalty` key; busts
 * the `loyalty-content` cache + the /loyalty page.
 */
export async function updateLoyaltyContent(next: LoyaltyContent): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");

  const value = rowToLoyalty(next);
  const db = createAdminSupabase();
  const { error } = await db.from("site_settings").upsert(
    { key: "loyalty", value: value as unknown as SettingsValue },
    { onConflict: "key" },
  );
  if (error) return { ok: false, error: error.message };

  revalidateTag("loyalty-content", "max");
  revalidatePath("/loyalty");
  return { ok: true };
}

/**
 * Upload a homepage image (hero desktop/mobile) to the public `product-images`
 * bucket and return its https URL. Admin-gated; reuses the shared image
 * uploader (5 MB cap, type/ext validation). The client stores the URL in the
 * content blob via `updateHomepageContent`.
 */
export async function uploadContentImage(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No image file provided." };
  const db = createAdminSupabase();
  return uploadImageToBucket(db, "content/hero", file);
}
