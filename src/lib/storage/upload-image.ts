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
 * Detect the real image type from the file's magic bytes, ignoring the
 * client-declared `File.type` (which is trivially spoofable). Returns the
 * canonical MIME, or null when the bytes are not one of our accepted formats —
 * so a `.php`/`.svg`/`.html` payload renamed with an image MIME can't slip
 * into the public bucket. `head` should be the file's first ~16+ bytes.
 */
function sniffImageType(head: Uint8Array): string | null {
  const b = head;
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  // GIF: "GIF87a" / "GIF89a"
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  const ascii = (i: number, s: string) => [...s].every((c, k) => b[i + k] === c.charCodeAt(0));
  // WEBP: "RIFF"????"WEBP"
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  // AVIF (ISO-BMFF): bytes 4-7 "ftyp", brand at 8-11 is an AVIF brand.
  if (ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis") || ascii(8, "mif1") || ascii(8, "miaf"))) {
    return "image/avif";
  }
  return null;
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
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Image must be 5 MB or smaller." };
  // Authoritative type comes from the file's magic bytes, NOT the client's
  // declared MIME/extension — a spoofed `image/png` header on a script payload
  // is rejected here. The sniffed type also drives the stored contentType, so
  // the bucket never serves a mislabelled object.
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const realType = sniffImageType(head);
  if (!realType) {
    return { ok: false, error: "File is not a supported image (JPEG, PNG, WebP, GIF, or AVIF)." };
  }
  const ext = extFromType(realType)!; // realType is always one of the mapped types
  const objectPath = `${prefix}/${Date.now()}-${Math.round(file.size)}.${ext}`;
  const { error: uploadErr } = await db.storage
    .from("product-images")
    .upload(objectPath, file, { contentType: realType, upsert: false });
  if (uploadErr) return { ok: false, error: uploadErr.message };
  const { data: pub } = db.storage.from("product-images").getPublicUrl(objectPath);
  if (!pub.publicUrl?.startsWith("https")) return { ok: false, error: "Storage returned a non-https URL." };
  return { ok: true, url: pub.publicUrl };
}
