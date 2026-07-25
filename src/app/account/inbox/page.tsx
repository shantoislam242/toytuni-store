import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getThreadsForEmail } from "@/lib/data/support";
import { formatDate } from "@/lib/format";
import { NewThreadButton } from "@/components/account/new-thread-button";
import { cn } from "@/lib/utils";

export function generateMetadata(): Metadata {
  return { title: "Inbox", robots: { index: false, follow: false } };
}

/**
 * `/account/inbox` — the customer's support conversations. The layout gates the
 * session; this lists their threads (service-role, scoped to the session email)
 * and offers a composer to start a new one. Each row links to the thread view.
 */
export default async function Page() {
  const user = await getSessionUser();
  if (!user?.email) return null; // gated by the layout — defensive.

  const threads = await getThreadsForEmail(createAdminSupabase(), user.email);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Support</p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-ink sm:text-3xl">Inbox</h1>
        </div>
        <NewThreadButton />
      </div>

      {threads.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-cream-300 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-neem-deep">
            <MessageSquare className="size-6" />
          </span>
          <p className="mt-4 font-medium text-ink">No conversations yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Start a message and we&apos;ll reply right here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/account/inbox/${t.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 transition-colors",
                  t.customerUnread
                    ? "border-neem/30 bg-neem/5"
                    : "border-cream-300 bg-card hover:border-neem/40 hover:bg-cream-50/60",
                )}
              >
                <span className="flex size-10 flex-none items-center justify-center rounded-full bg-neem/10 text-neem-deep">
                  <MessageSquare className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("truncate", t.customerUnread ? "font-bold text-ink" : "font-medium text-ink")}>
                      {t.subject}
                    </p>
                    {t.customerUnread ? (
                      <span className="size-2 flex-none rounded-full bg-neem" aria-label="Unread" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {t.status === "closed" ? "Closed · " : ""}
                    Updated {formatDate(t.lastMessageAt.slice(0, 10))}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
