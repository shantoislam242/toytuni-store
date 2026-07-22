import type { Metadata } from "next";
import { getInboxSubmissions, getNewsletterSubscribers } from "@/lib/admin/queries";
import type { InboxSubmission, NewsletterSubscriber } from "@/lib/admin/queries";
import { InboxManager } from "@/components/admin/inbox-manager";

export function generateMetadata(): Metadata {
  return {
    title: "Inbox",
    robots: { index: false, follow: false },
  };
}

/**
 * Admin inbox (Task 6): contact/bulk-order form submissions + newsletter
 * subscribers, both via Task 5's service-role reads (`getInboxSubmissions` /
 * `getNewsletterSubscribers`). Pre-migration 0015 (before `form_submissions`
 * / `newsletter_subscribers` exist) those reads throw — caught here so the
 * page still renders (empty tabs) instead of a 500. The tab UI and per-row
 * moderation actions live in the client `InboxManager`.
 */
export default async function Page() {
  let submissions: InboxSubmission[] = [];
  let subscribers: NewsletterSubscriber[] = [];
  try {
    [submissions, subscribers] = await Promise.all([getInboxSubmissions(), getNewsletterSubscribers()]);
  } catch (err) {
    console.error("Inbox page: failed to load submissions/subscribers:", err);
  }

  return (
    <div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          Messages
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">Inbox</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Contact messages, bulk inquiries, and newsletter subscribers.
        </p>
      </div>

      <div className="mt-6">
        <InboxManager submissions={submissions} subscribers={subscribers} />
      </div>
    </div>
  );
}
