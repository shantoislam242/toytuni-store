import "server-only";
import type { createAdminSupabase } from "@/lib/supabase/admin";

type AdminDb = ReturnType<typeof createAdminSupabase>;

export type SupportSender = "customer" | "admin";

export type SupportMessage = {
  id: string;
  sender: SupportSender;
  body: string;
  createdAt: string;
};

export type SupportThread = {
  id: string;
  customerEmail: string;
  customerName: string | null;
  subject: string;
  status: "open" | "closed";
  customerUnread: boolean;
  adminUnread: boolean;
  lastMessageAt: string;
  createdAt: string;
};

export type SupportThreadWithMessages = SupportThread & { messages: SupportMessage[] };

/** `support_threads` / `support_messages` postpend the generated types
 *  (migration 0022) → `as never` escape hatch, same as coupons / notifications.
 *  All access is scoped to a customer email (customer) or admin re-check. */
type ThreadRow = {
  id: string;
  customer_email: string;
  customer_name: string | null;
  subject: string;
  status: "open" | "closed";
  customer_unread: boolean;
  admin_unread: boolean;
  last_message_at: string;
  created_at: string;
};
type MessageRow = { id: string; sender: SupportSender; body: string; created_at: string };

const THREAD_SELECT =
  "id, customer_email, customer_name, subject, status, customer_unread, admin_unread, last_message_at, created_at";

function rowToThread(r: ThreadRow): SupportThread {
  return {
    id: r.id,
    customerEmail: r.customer_email,
    customerName: r.customer_name,
    subject: r.subject,
    status: r.status,
    customerUnread: r.customer_unread,
    adminUnread: r.admin_unread,
    lastMessageAt: r.last_message_at,
    createdAt: r.created_at,
  };
}

function rowToMessage(r: MessageRow): SupportMessage {
  return { id: r.id, sender: r.sender, body: r.body, createdAt: r.created_at };
}

async function readMessages(db: AdminDb, threadId: string): Promise<SupportMessage[]> {
  const { data, error } = await db
    .from("support_messages" as never)
    .select("id, sender, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .overrideTypes<MessageRow[], { merge: false }>();
  if (error) {
    console.error("readMessages failed:", error);
    return [];
  }
  return (data ?? []).map(rowToMessage);
}

/** A customer's threads (newest activity first). `[]` on error. */
export async function getThreadsForEmail(db: AdminDb, email: string): Promise<SupportThread[]> {
  const { data, error } = await db
    .from("support_threads" as never)
    .select(THREAD_SELECT)
    .eq("customer_email", email)
    .order("last_message_at", { ascending: false })
    .overrideTypes<ThreadRow[], { merge: false }>();
  if (error) {
    console.error("getThreadsForEmail failed:", error);
    return [];
  }
  return (data ?? []).map(rowToThread);
}

/** One thread + its messages, scoped to the owner email (null if not theirs). */
export async function getThreadForEmail(
  db: AdminDb,
  email: string,
  threadId: string,
): Promise<SupportThreadWithMessages | null> {
  const { data, error } = await db
    .from("support_threads" as never)
    .select(THREAD_SELECT)
    .eq("id", threadId)
    .eq("customer_email", email)
    .maybeSingle()
    .overrideTypes<ThreadRow, { merge: false }>();
  if (error || !data) {
    if (error) console.error("getThreadForEmail failed:", error);
    return null;
  }
  return { ...rowToThread(data), messages: await readMessages(db, threadId) };
}

/** Count of a customer's threads with an unread admin reply (sidebar badge). */
export async function getUnreadThreadCount(db: AdminDb, email: string): Promise<number> {
  const { count, error } = await db
    .from("support_threads" as never)
    .select("id", { count: "exact", head: true })
    .eq("customer_email", email)
    .eq("customer_unread", true);
  if (error) {
    console.error("getUnreadThreadCount failed:", error);
    return 0;
  }
  return count ?? 0;
}

/** All threads for the admin queue (newest activity first). `[]` on error. */
export async function getAdminThreads(db: AdminDb): Promise<SupportThread[]> {
  const { data, error } = await db
    .from("support_threads" as never)
    .select(THREAD_SELECT)
    .order("last_message_at", { ascending: false })
    .overrideTypes<ThreadRow[], { merge: false }>();
  if (error) {
    console.error("getAdminThreads failed:", error);
    return [];
  }
  return (data ?? []).map(rowToThread);
}

/** One thread + messages for the admin (no email scoping). */
export async function getAdminThread(
  db: AdminDb,
  threadId: string,
): Promise<SupportThreadWithMessages | null> {
  const { data, error } = await db
    .from("support_threads" as never)
    .select(THREAD_SELECT)
    .eq("id", threadId)
    .maybeSingle()
    .overrideTypes<ThreadRow, { merge: false }>();
  if (error || !data) {
    if (error) console.error("getAdminThread failed:", error);
    return null;
  }
  return { ...rowToThread(data), messages: await readMessages(db, threadId) };
}

/**
 * Create a thread with its first message. Returns the new thread id, or null on
 * failure (fail-soft — callers decide how loudly to surface it). Sender is
 * usually "customer" (new thread from the customer or the contact form).
 */
export async function createSupportThread(
  db: AdminDb,
  input: { email: string; name: string | null; subject: string; body: string; sender: SupportSender },
): Promise<string | null> {
  const { data, error } = await db
    .from("support_threads" as never)
    .insert({
      customer_email: input.email,
      customer_name: input.name,
      subject: input.subject,
      status: "open",
      customer_unread: input.sender === "admin",
      admin_unread: input.sender === "customer",
      last_message_at: new Date().toISOString(),
    } as never)
    .select("id")
    .maybeSingle()
    .overrideTypes<{ id: string }, { merge: false }>();
  if (error || !data) {
    console.error("createSupportThread failed:", error);
    return null;
  }
  await addSupportMessage(db, data.id, input.sender, input.body);
  return data.id;
}

/**
 * Append a message to a thread and bump `last_message_at` + the OTHER side's
 * unread flag (and re-open a closed thread on a new message). Fail-soft.
 */
export async function addSupportMessage(
  db: AdminDb,
  threadId: string,
  sender: SupportSender,
  body: string,
): Promise<boolean> {
  const { error: msgErr } = await db
    .from("support_messages" as never)
    .insert({ thread_id: threadId, sender, body } as never);
  if (msgErr) {
    console.error("addSupportMessage insert failed:", msgErr);
    return false;
  }
  const { error: upErr } = await db
    .from("support_threads" as never)
    .update({
      last_message_at: new Date().toISOString(),
      status: "open",
      // The recipient now has something unread; the sender's side is caught up.
      admin_unread: sender === "customer",
      customer_unread: sender === "admin",
    } as never)
    .eq("id", threadId);
  if (upErr) console.error("addSupportMessage thread update failed:", upErr);
  return true;
}
