"use server";

import { getSessionUser } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { uploadImageToBucket } from "@/lib/storage/upload-image";

/**
 * Upload a customer's avatar to the public `product-images` bucket under
 * `avatars/{userId}/…` and return its https URL. The client then stores that
 * URL in `user_metadata.avatar_url` via `supabase.auth.updateUser` (the
 * metadata write stays client-side; only the storage write needs service-role).
 * Scoped to the session user — a signed-out caller is rejected.
 */
export async function uploadAvatar(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No image file provided." };

  const db = createAdminSupabase();
  return uploadImageToBucket(db, `avatars/${user.id}`, file);
}
