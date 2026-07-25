"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import {
  adminLoadThread,
  adminReplyThread,
  adminSetThreadStatus,
} from "@/lib/admin/support-actions";
import type { SupportThread, SupportMessage } from "@/lib/data/support";
import { cn } from "@/lib/utils";

/**
 * Admin "Support" tab — the customer-facing inbox from the shop side. Lists
 * threads; expanding one loads its messages (and clears the admin-unread flag),
 * shows the conversation, and offers a reply box + open/close toggle. Replies
 * notify the customer via the Phase 5 notification feed (server-side).
 */
export function AdminSupportThreads({ threads }: { threads: SupportThread[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [isPending, startTransition] = useTransition();

  const openThread = async (t: SupportThread) => {
    if (expandedId === t.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(t.id);
    setMessages([]);
    setReply("");
    setLoading(true);
    const res = await adminLoadThread(t.id);
    setLoading(false);
    if (res.ok) {
      setMessages(res.messages);
      if (t.adminUnread) router.refresh(); // update the tab's unread count
    } else {
      toast.error(res.error);
    }
  };

  const sendReply = (threadId: string) => {
    startTransition(async () => {
      const res = await adminReplyThread(threadId, reply);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // Optimistically append so the admin sees it without a full reload.
      setMessages((m) => [
        ...m,
        { id: `tmp-${m.length}`, sender: "admin", body: reply.trim(), createdAt: new Date().toISOString() },
      ]);
      setReply("");
      toast.success("Reply sent.");
      router.refresh();
    });
  };

  const setStatus = (threadId: string, status: "open" | "closed") => {
    startTransition(async () => {
      const res = await adminSetThreadStatus(threadId, status);
      if (res.ok) {
        toast.success(status === "closed" ? "Conversation closed." : "Conversation reopened.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  if (threads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-cream-300 px-6 py-14 text-center text-ink-muted">
        No conversations yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {threads.map((t) => {
        const expanded = expandedId === t.id;
        return (
          <div key={t.id} className="rounded-xl border border-cream-300">
            <button
              type="button"
              onClick={() => openThread(t)}
              className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-cream-50"
            >
              <span className={cn("flex min-w-40 items-center gap-1.5", t.adminUnread && "font-semibold text-ink")}>
                {t.adminUnread && <span className="size-1.5 shrink-0 rounded-full bg-neem" aria-hidden />}
                {t.customerName || t.customerEmail}
              </span>
              <span className="max-w-64 truncate text-ink-muted">{t.subject}</span>
              {t.status === "closed" ? (
                <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                  Closed
                </span>
              ) : null}
              <span className="ml-auto text-xs text-ink-soft">{formatDate(t.lastMessageAt.slice(0, 10))}</span>
              <ChevronDown
                className={cn("size-4 shrink-0 text-ink-soft transition-transform", expanded && "rotate-180")}
                aria-hidden
              />
            </button>

            {expanded && (
              <div className="border-t border-cream-200 px-4 py-3">
                <a
                  href={`mailto:${t.customerEmail}`}
                  className="text-xs text-neem-deep underline-offset-2 hover:underline"
                >
                  {t.customerEmail}
                </a>

                {loading ? (
                  <div className="flex justify-center py-6 text-ink-soft">
                    <Loader2 className="size-5 animate-spin" />
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {messages.map((m) => {
                      const fromAdmin = m.sender === "admin";
                      return (
                        <li key={m.id} className={cn("flex", fromAdmin ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                              fromAdmin
                                ? "rounded-br-md bg-neem text-paper"
                                : "rounded-bl-md border border-cream-300 bg-paper text-ink",
                            )}
                          >
                            <p className={cn("mb-0.5 text-[11px] font-semibold", fromAdmin ? "text-paper/70" : "text-neem-deep")}>
                              {fromAdmin ? "You (admin)" : t.customerName || "Customer"}
                            </p>
                            <p className="whitespace-pre-wrap leading-6">{m.body}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="mt-3 flex items-end gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write a reply…"
                    rows={2}
                    maxLength={5000}
                    className="min-h-11 flex-1 resize-y rounded-lg border border-cream-300 bg-paper px-3 py-2 text-sm text-ink outline-none focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25"
                  />
                  <button
                    type="button"
                    onClick={() => sendReply(t.id)}
                    disabled={isPending || !reply.trim()}
                    className="flex size-10 flex-none items-center justify-center rounded-full bg-neem text-paper transition-colors hover:bg-neem-deep disabled:opacity-50"
                    aria-label="Send reply"
                  >
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </button>
                </div>

                <div className="mt-3 flex justify-end">
                  {t.status === "closed" ? (
                    <Button variant="outline" size="sm" disabled={isPending} onClick={() => setStatus(t.id, "open")}>
                      Reopen
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled={isPending} onClick={() => setStatus(t.id, "closed")}>
                      Close conversation
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
