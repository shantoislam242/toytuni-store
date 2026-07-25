import "server-only";
import type { createAdminSupabase } from "@/lib/supabase/admin";

type AdminDb = ReturnType<typeof createAdminSupabase>;

/** ~5 MB cap on uploaded images. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Map an image MIME subtype to a file extension for the storage object key. */
function extFromType(type: string): string | null {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    default:
      return null;
  }
}

/**
 * Upload a validated image to the public `product-images` bucket under
 * `prefix/…` and return its https URL. Does NOT write any DB column — callers
 * decide what to point at the URL (product image_url, taxonomy image_url,
 * customer avatar, …). Service-role `db` required (bucket writes bypass RLS).
 */
export async function uploadImageToBucket(
  db: AdminDb,
  prefix: string,
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (file.size === 0) return { ok: false, error: "No image file provided." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "File must be an image." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Image must be 5 MB or smaller." };
  const ext = extFromType(file.type);
  if (!ext) return { ok: false, error: `Unsupported image type: ${file.type}` };
  const objectPath = `${prefix}/${Date.now()}-${Math.round(file.size)}.${ext}`;
  const { error: uploadErr } = await db.storage
    .from("product-images")
    .upload(objectPath, file, { contentType: file.type, upsert: false });
  if (uploadErr) return { ok: false, error: uploadErr.message };
  const { data: pub } = db.storage.from("product-images").getPublicUrl(objectPath);
  if (!pub.publicUrl?.startsWith("https")) return { ok: false, error: "Storage returned a non-https URL." };
  return { ok: true, url: pub.publicUrl };
}
