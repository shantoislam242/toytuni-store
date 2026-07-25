"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createSupportThread, addSupportMessage } from "@/lib/data/support";

const MAX_SUBJECT = 200;
const MAX_BODY = 5000;

type StartResult = { ok: true; id: string } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

/** Confirm a thread belongs to this email before writing to it. */
async function ownsThread(
  db: ReturnType<typeof createAdminSupabase>,
  threadId: string,
  email: string,
): Promise<boolean> {
  const { data } = await db
    .from("support_threads" as never)
    .select("id")
    .eq("id", threadId)
    .eq("customer_email", email)
    .maybeSingle()
    .overrideTypes<{ id: string }, { merge: false }>();
  return Boolean(data);
}

/** Start a new support thread with a first message. */
export async function startSupportThread(subject: string, body: string): Promise<StartResult> {
  const user = await getSessionUser();
  if (!user?.email) return { ok: false, error: "Please sign in." };

  const s = subject.trim();
  const b = body.trim();
  if (!s || !b) return { ok: false, error: "Add a subject and a message." };
  if (s.length > MAX_SUBJECT || b.length > MAX_BODY) return { ok: false, error: "Message is too long." };

  const db = createAdminSupabase();
  const id = await createSupportThread(db, {
    email: user.email,
    name: (user.user_metadata?.full_name as string | undefined) ?? null,
    subject: s,
    body: b,
    sender: "customer",
  });
  if (!id) return { ok: false, error: "Could not send your message. Please try again." };
  revalidatePath("/account/inbox");
  return { ok: true, id };
}

/** Add a customer reply to one of their own threads. */
export async function replySupportThread(threadId: string, body: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user?.email) return { ok: false, error: "Please sign in." };
  const b = body.trim();
  if (!b) return { ok: false, error: "Type a message first." };
  if (b.length > MAX_BODY) return { ok: false, error: "Message is too long." };

  const db = createAdminSupabase();
  if (!(await ownsThread(db, threadId, user.email))) {
    return { ok: false, error: "Conversation not found." };
  }
  const ok = await addSupportMessage(db, threadId, "customer", b);
  if (!ok) return { ok: false, error: "Could not send your message. Please try again." };
  revalidatePath("/account/inbox");
  revalidatePath(`/account/inbox/${threadId}`);
  return { ok: true };
}

/** Clear the customer's unread flag on a thread (called when they open it). */
export async function markThreadRead(threadId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user?.email) return;
  const db = createAdminSupabase();
  const { error } = await db
    .from("support_threads" as never)
    .update({ customer_unread: false } as never)
    .eq("id", threadId)
    .eq("customer_email", user.email)
    .eq("customer_unread", true);
  if (error) console.error("markThreadRead failed:", error);
}
