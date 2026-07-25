import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getThreadForEmail } from "@/lib/data/support";
import { markThreadRead } from "@/lib/account/support";
import { formatDate } from "@/lib/format";
import { ThreadReply } from "@/components/account/thread-reply";
import { cn } from "@/lib/utils";

export function generateMetadata(): Metadata {
  return { title: "Conversation", robots: { index: false, follow: false } };
}

/**
 * `/account/inbox/[threadId]` — one support conversation. Ownership is enforced
 * by `getThreadForEmail` (session email + thread id must both match) — a wrong
 * owner gets a 404, never another customer's thread. Opening it clears the
 * customer's unread flag.
 */
export default async function Page({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const user = await getSessionUser();
  if (!user?.email) return null; // gated by the layout — defensive.

  const thread = await getThreadForEmail(createAdminSupabase(), user.email, threadId);
  if (!thread) notFound();

  // Opening the thread marks it read (idempotent, ownership-scoped).
  if (thread.customerUnread) await markThreadRead(threadId);

  return (
    <div>
      <Link
        href="/account/inbox"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Back to inbox
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">{thread.subject}</h1>
        {thread.status === "closed" ? (
          <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            Closed
          </span>
        ) : (
          <span className="rounded-full bg-neem/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neem-deep">
            Open
          </span>
        )}
      </div>

      <ul className="mt-6 space-y-3">
        {thread.messages.map((m) => {
          const mine = m.sender === "customer";
          return (
            <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  mine
                    ? "rounded-br-md bg-neem text-paper"
                    : "rounded-bl-md border border-cream-300 bg-card text-ink",
                )}
              >
                <p className={cn("mb-1 text-[11px] font-semibold", mine ? "text-paper/70" : "text-neem-deep")}>
                  {mine ? "You" : "Support"}
                </p>
                <p className="whitespace-pre-wrap leading-6">{m.body}</p>
                <p className={cn("mt-1 text-[10px]", mine ? "text-paper/60" : "text-ink-soft")}>
                  {formatDate(m.createdAt.slice(0, 10))}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <ThreadReply threadId={thread.id} closed={thread.status === "closed"} />
    </div>
  );
}
