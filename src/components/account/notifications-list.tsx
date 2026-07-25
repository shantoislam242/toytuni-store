"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Bell, CheckCheck, X, Package } from "lucide-react";
import { toast } from "sonner";
import {
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
} from "@/lib/account/notifications";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccountNotification } from "@/lib/data/notifications";

/**
 * `/account/notifications` — the customer's in-app feed. Renders from the
 * server-fetched list and re-reads via `router.refresh()` after each mutation.
 * Clicking an order notification marks it read and opens the order; the ✕
 * dismisses (archives) it.
 */
export function NotificationsList({ initial }: { initial: AccountNotification[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasUnread = initial.some((n) => !n.readAt);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, errFallback: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else toast.error(res.error ?? errFallback);
    });

  const open = (n: AccountNotification) => {
    if (!n.readAt) void markNotificationRead(n.id);
    if (n.orderNumber) router.push(`/account/orders/${n.orderNumber}`);
    else router.refresh();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Activity</p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-ink sm:text-3xl">Notifications</h1>
        </div>
        {hasUnread ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(markAllNotificationsRead, "Could not update notifications.")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-neem-deep hover:text-neem disabled:opacity-50"
          >
            <CheckCheck className="size-4" /> Mark all read
          </button>
        ) : null}
      </div>

      {initial.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-cream-300 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-neem-deep">
            <Bell className="size-6" />
          </span>
          <p className="mt-4 font-medium text-ink">You&apos;re all caught up</p>
          <p className="mt-1 text-sm text-ink-muted">Order updates will show up here.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {initial.map((n) => {
            const unread = !n.readAt;
            return (
              <li
                key={n.id}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-4 transition-colors",
                  unread ? "border-neem/30 bg-neem/5" : "border-cream-300 bg-card",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-9 flex-none items-center justify-center rounded-full",
                    unread ? "bg-neem/15 text-neem-deep" : "bg-cream-200 text-ink-soft",
                  )}
                >
                  <Package className="size-4.5" strokeWidth={1.9} />
                </span>

                <button
                  type="button"
                  onClick={() => open(n)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{n.title}</p>
                    {unread ? <span className="size-2 flex-none rounded-full bg-neem" aria-label="Unread" /> : null}
                  </div>
                  {n.body ? <p className="mt-0.5 text-sm text-ink-muted">{n.body}</p> : null}
                  <p className="mt-1 text-xs text-ink-soft">
                    {n.orderNumber ? `${n.orderNumber} · ` : ""}
                    {formatDate(n.createdAt.slice(0, 10))}
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => archiveNotification(n.id), "Could not dismiss.")}
                  className="-mr-1 -mt-1 flex size-8 flex-none items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-200 hover:text-ink disabled:opacity-50"
                  aria-label="Dismiss"
                >
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
