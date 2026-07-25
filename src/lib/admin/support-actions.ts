"use server";

import { revalidatePath } from "next/cache";
import { getIsAdmin } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { addSupportMessage, getAdminThread, type SupportMessage } from "@/lib/data/support";
import { createNotification } from "@/lib/data/notifications";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Load a thread's messages for the admin panel and clear the admin-unread
 *  flag (called when a thread is expanded). Admin-checked. */
export async function adminLoadThread(
  threadId: string,
): Promise<{ ok: true; messages: SupportMessage[] } | { ok: false; error: string }> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { error: upErr } = await db
    .from("support_threads" as never)
    .update({ admin_unread: false } as never)
    .eq("id", threadId)
    .eq("admin_unread", true);
  if (upErr) console.error("adminLoadThread mark-read failed:", upErr);

  const thread = await getAdminThread(db, threadId);
  if (!thread) return { ok: false, error: "Conversation not found." };
  return { ok: true, messages: thread.messages };
}

const MAX_BODY = 5000;

/** Admin reply to a support thread. Appends an admin message and notifies the
 *  customer (in-app notification, reusing the Phase 5 feed). Admin-checked. */
export async function adminReplyThread(threadId: string, body: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const b = body.trim();
  if (!b) return { ok: false, error: "Type a reply first." };
  if (b.length > MAX_BODY) return { ok: false, error: "Reply is too long." };

  const db = createAdminSupabase();
  const { data: thread } = await db
    .from("support_threads" as never)
    .select("customer_email, subject")
    .eq("id", threadId)
    .maybeSingle()
    .overrideTypes<{ customer_email: string; subject: string }, { merge: false }>();
  if (!thread) return { ok: false, error: "Conversation not found." };

  const ok = await addSupportMessage(db, threadId, "admin", b);
  if (!ok) return { ok: false, error: "Could not send the reply. Please try again." };

  await createNotification(db, thread.customer_email, {
    type: "support",
    title: "New reply from support",
    body: `Re: ${thread.subject}`,
  });
  revalidatePath("/admin/inbox");
  return { ok: true };
}

/** Open/close a support thread. Admin-checked. */
export async function adminSetThreadStatus(
  threadId: string,
  status: "open" | "closed",
): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { error } = await db
    .from("support_threads" as never)
    .update({ status } as never)
    .eq("id", threadId);
  if (error) {
    console.error("adminSetThreadStatus failed:", error);
    return { ok: false, error: "Could not update the conversation." };
  }
  revalidatePath("/admin/inbox");
  return { ok: true };
}

/** Clear the admin's unread flag on a thread (called when opened). */
export async function adminMarkThreadRead(threadId: string): Promise<void> {
  if (!(await getIsAdmin())) return;
  const db = createAdminSupabase();
  const { error } = await db
    .from("support_threads" as never)
    .update({ admin_unread: false } as never)
    .eq("id", threadId)
    .eq("admin_unread", true);
  if (error) console.error("adminMarkThreadRead failed:", error);
}
