"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isFormRateLimited } from "@/lib/forms/throttle";
import { validateContact, validateBulk, validateNewsletterEmail } from "@/lib/forms/validation";

const BUSY = "Too many attempts. Please try again in a minute.";
const FAILED = "Could not send right now. Please try again.";

export async function submitContactForm(input: {
  name: string; email: string; subject?: string; message: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (await isFormRateLimited()) return { ok: false, error: BUSY };
  const v = validateContact(input);
  if (!v.ok) return v;
  const db = createAdminSupabase();
  const { error } = await db.from("form_submissions" as never).insert({
    kind: "contact", name: v.value.name, email: v.value.email,
    subject: v.value.subject, message: v.value.message,
  } as never);
  if (error) { console.error("submitContactForm failed:", error.message); return { ok: false, error: FAILED }; }
  revalidatePath("/admin/inbox");
  return { ok: true };
}

export async function submitBulkInquiry(input: {
  business: string; person: string; email: string; phone: string;
  program?: string; quantity?: string; message: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (await isFormRateLimited()) return { ok: false, error: BUSY };
  const v = validateBulk(input);
  if (!v.ok) return v;
  const db = createAdminSupabase();
  const { error } = await db.from("form_submissions" as never).insert({
    kind: "bulk", name: v.value.person, email: v.value.email, phone: v.value.phone,
    subject: v.value.business, message: v.value.message,
    meta: { business: v.value.business, program: v.value.program, quantity: v.value.quantity },
  } as never);
  if (error) { console.error("submitBulkInquiry failed:", error.message); return { ok: false, error: FAILED }; }
  revalidatePath("/admin/inbox");
  return { ok: true };
}

export async function subscribeNewsletter(
  email: string, source: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (await isFormRateLimited()) return { ok: false, error: BUSY };
  const v = validateNewsletterEmail(email);
  if (!v.ok) return v;
  const src = ["footer", "blog", "journal"].includes(source) ? source : "footer";
  const db = createAdminSupabase();
  const { error } = await db.from("newsletter_subscribers" as never).insert({
    email: v.value, source: src,
  } as never);
  // Already subscribed → success (no enumeration).
  if (error && error.code !== "23505") {
    console.error("subscribeNewsletter failed:", error.message);
    return { ok: false, error: FAILED };
  }
  revalidatePath("/admin/inbox");
  return { ok: true };
}
