"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { setSubmissionStatus, deleteSubmission, deleteSubscriber } from "@/lib/admin/actions";
import type { InboxSubmission, NewsletterSubscriber } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  if (status === "new") {
    return (
      <span className="inline-flex items-center rounded-full bg-neem/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neem-deep">
        New
      </span>
    );
  }
  if (status === "archived") {
    return (
      <span className="inline-flex items-center rounded-full bg-cream-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        Archived
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-cream-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
      Read
    </span>
  );
}

/**
 * Admin inbox (Task 6). Three tabs backed by the parent server page's
 * service-role reads (`getInboxSubmissions()` / `getNewsletterSubscribers()`,
 * Task 5): Messages (contact), Bulk orders, Subscribers. Mutations are Task
 * 5's Server Actions (`setSubmissionStatus`/`deleteSubmission`/
 * `deleteSubscriber`), each following the `useTransition` + toast +
 * `router.refresh()` idiom used by `ReviewsManager`.
 *
 * `overrides` is a small optimistic layer: a submission's `status` as it
 * appears in `submissions` only updates once `router.refresh()` re-pulls the
 * server data, but the tab counts and the New dot/bold styling need to react
 * the instant a row is expanded (which silently marks it read) — so every
 * status mutation records its result here first and reads through it.
 */
export function InboxManager({
  submissions,
  subscribers,
}: {
  submissions: InboxSubmission[];
  subscribers: NewsletterSubscriber[];
}) {
  const router = useRouter();
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const refresh = () => router.refresh();
  const applyOverride = (id: string, status: string) => setOverrides((o) => ({ ...o, [id]: status }));
  const statusOf = (s: InboxSubmission) => overrides[s.id] ?? s.status;

  const messages = useMemo(() => submissions.filter((s) => s.kind === "contact"), [submissions]);
  const bulk = useMemo(() => submissions.filter((s) => s.kind === "bulk"), [submissions]);
  const newMessagesCount = useMemo(
    () => messages.filter((s) => statusOf(s) === "new").length,
    [messages, overrides],
  );
  const newBulkCount = useMemo(() => bulk.filter((s) => statusOf(s) === "new").length, [bulk, overrides]);

  return (
    <Tabs defaultValue="messages">
      <TabsList>
        <TabsTrigger value="messages">
          Messages{newMessagesCount > 0 ? ` (${newMessagesCount})` : ""}
        </TabsTrigger>
        <TabsTrigger value="bulk">
          Bulk orders{newBulkCount > 0 ? ` (${newBulkCount})` : ""}
        </TabsTrigger>
        <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
      </TabsList>
      <TabsContent value="messages" className="mt-4">
        <SubmissionsList
          kind="contact"
          submissions={messages}
          overrides={overrides}
          onOverride={applyOverride}
          onRefresh={refresh}
        />
      </TabsContent>
      <TabsContent value="bulk" className="mt-4">
        <SubmissionsList
          kind="bulk"
          submissions={bulk}
          overrides={overrides}
          onOverride={applyOverride}
          onRefresh={refresh}
        />
      </TabsContent>
      <TabsContent value="subscribers" className="mt-4">
        <SubscribersList subscribers={subscribers} onRefresh={refresh} />
      </TabsContent>
    </Tabs>
  );
}

function SubmissionsList({
  kind,
  submissions,
  overrides,
  onOverride,
  onRefresh,
}: {
  kind: "contact" | "bulk";
  submissions: InboxSubmission[];
  overrides: Record<string, string>;
  onOverride: (id: string, status: string) => void;
  onRefresh: () => void;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const statusOf = (s: InboxSubmission) => overrides[s.id] ?? s.status;
  const visible = useMemo(
    () => submissions.filter((s) => showArchived || statusOf(s) !== "archived"),
    [submissions, showArchived, overrides],
  );

  const setStatus = (id: string, status: string, successMsg: string) => {
    setBusyId(id);
    startTransition(async () => {
      const r = await setSubmissionStatus(id, status);
      setBusyId(null);
      if (r.ok) {
        onOverride(id, status);
        toast.success(successMsg);
        onRefresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  const toggleExpand = (s: InboxSubmission) => {
    const opening = expandedId !== s.id;
    setExpandedId(opening ? s.id : null);
    if (opening && statusOf(s) === "new") {
      setBusyId(s.id);
      startTransition(async () => {
        const r = await setSubmissionStatus(s.id, "read");
        setBusyId(null);
        if (r.ok) {
          onOverride(s.id, "read");
          onRefresh();
        } else {
          toast.error(r.error);
        }
      });
    }
  };

  const remove = (s: InboxSubmission) => {
    const label = kind === "bulk" ? "bulk inquiry" : "message";
    if (!confirm(`Delete this ${label} from ${s.name}? This can't be undone.`)) return;
    setBusyId(s.id);
    startTransition(async () => {
      const r = await deleteSubmission(s.id);
      setBusyId(null);
      if (r.ok) {
        toast.success("Deleted.");
        if (expandedId === s.id) setExpandedId(null);
        onRefresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  if (submissions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-cream-300 px-6 py-14 text-center text-ink-muted">
        {kind === "bulk" ? "No bulk inquiries yet." : "No messages yet."}
      </div>
    );
  }

  return (
    <div>
      <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-ink-muted">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
          className="size-4 accent-neem"
        />
        Show archived
      </label>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-cream-300 px-6 py-14 text-center text-ink-muted">
          Nothing here.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((s) => {
            const status = statusOf(s);
            const isNew = status === "new";
            const busy = isPending && busyId === s.id;
            const expanded = expandedId === s.id;
            const businessOrSubject = kind === "bulk" ? (s.meta?.business ?? s.subject) : s.subject;

            return (
              <div key={s.id} className="rounded-xl border border-cream-300">
                <button
                  type="button"
                  onClick={() => toggleExpand(s)}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-cream-50"
                >
                  <span className={cn("flex min-w-32 items-center gap-1.5", isNew && "font-semibold text-ink")}>
                    {isNew && <span className="size-1.5 shrink-0 rounded-full bg-neem" aria-hidden />}
                    {s.name}
                  </span>
                  <a
                    href={`mailto:${s.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-neem-deep underline-offset-2 hover:underline"
                  >
                    {s.email}
                  </a>
                  {kind === "bulk" && s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-ink-muted hover:underline"
                    >
                      {s.phone}
                    </a>
                  )}
                  {businessOrSubject && (
                    <span className="max-w-56 truncate text-ink-muted">{businessOrSubject}</span>
                  )}
                  <span className="ml-auto text-xs text-ink-soft">{formatDate(s.createdAt.slice(0, 10))}</span>
                  <StatusBadge status={status} />
                  <ChevronDown
                    className={cn("size-4 shrink-0 text-ink-soft transition-transform", expanded && "rotate-180")}
                    aria-hidden
                  />
                </button>

                {expanded && (
                  <div className="border-t border-cream-200 px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm text-ink">{s.message}</p>
                    {kind === "bulk" && s.meta && (
                      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-ink-muted sm:grid-cols-3">
                        {s.meta.business && (
                          <div>
                            <dt className="inline font-medium text-ink-soft">Business: </dt>
                            <dd className="inline">{s.meta.business}</dd>
                          </div>
                        )}
                        {s.meta.program && (
                          <div>
                            <dt className="inline font-medium text-ink-soft">Program: </dt>
                            <dd className="inline">{s.meta.program}</dd>
                          </div>
                        )}
                        {s.meta.quantity && (
                          <div>
                            <dt className="inline font-medium text-ink-soft">Quantity: </dt>
                            <dd className="inline">{s.meta.quantity}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                    <div className="mt-3 flex justify-end gap-1.5">
                      {status === "read" && (
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => setStatus(s.id, "new", "Marked unread.")}>
                          Mark unread
                        </Button>
                      )}
                      {status === "archived" ? (
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => setStatus(s.id, "read", "Unarchived.")}>
                          Unarchive
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => setStatus(s.id, "archived", "Archived.")}>
                          Archive
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                        onClick={() => remove(s)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-cream-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
      {source}
    </span>
  );
}

function SubscribersList({
  subscribers,
  onRefresh,
}: {
  subscribers: NewsletterSubscriber[];
  onRefresh: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const copyEmails = () => {
    navigator.clipboard
      .writeText(subscribers.map((s) => s.email).join(", "))
      .then(() => toast.success("Emails copied."))
      .catch(() => toast.error("Could not copy emails."));
  };

  const remove = (s: NewsletterSubscriber) => {
    if (!confirm(`Remove ${s.email} from the newsletter list? This can't be undone.`)) return;
    setBusyId(s.id);
    startTransition(async () => {
      const r = await deleteSubscriber(s.id);
      setBusyId(null);
      if (r.ok) {
        toast.success("Subscriber removed.");
        onRefresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  if (subscribers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-cream-300 px-6 py-14 text-center text-ink-muted">
        No subscribers yet.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">
          {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"}
        </p>
        <Button variant="outline" size="sm" onClick={copyEmails}>
          Copy emails
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-cream-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-300 bg-cream-100 text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Source</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => {
              const busy = isPending && busyId === s.id;
              return (
                <tr key={s.id} className="border-b border-cream-200 last:border-b-0 hover:bg-cream-50">
                  <td className="px-4 py-3 font-medium text-ink">
                    <a href={`mailto:${s.email}`} className="hover:underline">
                      {s.email}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <SourceBadge source={s.source} />
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{formatDate(s.createdAt.slice(0, 10))}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Delete subscriber"
                        disabled={busy}
                        className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                        onClick={() => remove(s)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
