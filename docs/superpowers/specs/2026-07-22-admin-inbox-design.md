# toytuni-store — Admin Inbox (storefront form submissions)

**Date:** 2026-07-22
**Status:** Design approved, pending spec review
**Scope:** Make every storefront form REAL and land it in an admin **Inbox**: the **Contact** form (`/contact`), the **Bulk order** form (`/bulk`, `/bulk-order`), and the **Newsletter** signups (footer + blog + journal — three components). A new `/admin/inbox` page (sidebar "Inbox" with an **unread badge**) shows three tabs — Messages, Bulk orders, Subscribers — with read/archive/delete moderation and a copyable subscriber email list.

## Background

All five storefront form components are **fake**: `contact-form.tsx` (name, email, subject, message), `bulk-form.tsx` (business, person, email, phone, program, quantity, message), and the three newsletter variants (`footer-newsletter.tsx`, `blog-newsletter.tsx`, `journal/newsletter-cta.tsx` — email only) validate client-side and flip a local "sent" state — **nothing is persisted anywhere**. There is no admin surface for any of it. Established patterns to reuse: public server actions with server-side validation + a best-effort per-IP throttle (`src/lib/orders/track-throttle.ts` — a module-scoped Map; forms get their own sibling so buckets don't mix), service-role writes with NO public RLS policies, `"use server"` async-only exports, admin pages + tabbed managers (`reviews-manager.tsx`), and the admin layout (`src/app/admin/layout.tsx`, a Server Component) → `AdminShell` → `AdminSidebar` chain — the unread count threads through it as a prop.

## Goals

- **Persist every form:** contact + bulk submissions into one `form_submissions` table (`kind` discriminates; bulk extras in a `meta` jsonb); newsletter emails into `newsletter_subscribers` (unique email — resubmitting is a silent success).
- **Public, throttled server actions:** `submitContactForm`, `submitBulkInquiry`, `subscribeNewsletter(source)` — no login required, validated server-side, best-effort per-IP throttled, service-role inserts.
- **Wire the five components** to the real actions (keep their existing look/success states; add error toasts/messages).
- **Admin Inbox** (`/admin/inbox`): three tabs — **Messages** (contact), **Bulk orders**, **Subscribers**. Messages/Bulk: newest first, `new` rows visually bold, open/expand marks read; actions per row: read/unread toggle, archive/unarchive, delete; `mailto:`/`tel:` links on email/phone. Subscribers: list + total + a **Copy emails** button (comma-separated, for marketing) + per-row delete.
- **Sidebar "Inbox"** entry with a badge showing the count of `status = 'new'` submissions (fetched in the admin layout, threaded `AdminShell → AdminSidebar`; fail-soft 0).

## Non-goals (later)

- No admin email notification on new submissions (Resend is still test-mode; one-line add after a domain is verified). No reply-from-admin UI (the `mailto:` link opens the admin's own mail client).
- No newsletter double-opt-in / confirmation emails, no unsubscribe page (subscribers are an internal list for now; deleting a row is the unsubscribe).
- No CSV export (Copy-emails covers the immediate need), no spam-scoring/CAPTCHA (throttle + validation only), no pagination (lists are small; revisit if they grow).
- Coupon, search, track-order, auth forms are NOT inbox material (they already have real backends or are not submissions).

## Locked decisions

- **One `form_submissions` table** for contact + bulk (shared inbox semantics: status new/read/archived) + a **separate `newsletter_subscribers`** (it's a list, not a conversation; unique email).
- **Status lifecycle:** `new` → `read` → (optionally) `archived`; delete is hard.
- **Public actions, no login**; abuse control = server validation + per-IP best-effort throttle + no public RLS write path.
- **Unread badge** counts `status='new'` across both kinds (not subscribers).
- Newsletter `source` recorded (`footer` | `blog` | `journal`).

## Schema (migration 0015 — `0015_admin_inbox.sql`)

```sql
create table if not exists form_submissions (
  id uuid primary key default uuid_generate_v4(),
  kind text not null check (kind in ('contact','bulk')),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  meta jsonb,                          -- bulk: { business, program, quantity }
  status text not null default 'new' check (status in ('new','read','archived')),
  created_at timestamptz not null default now()
);
create index if not exists form_submissions_inbox_idx on form_submissions(kind, status, created_at desc);

create table if not exists newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  source text not null default 'footer' check (source in ('footer','blog','journal')),
  created_at timestamptz not null default now()
);

-- RLS on, NO policies: the public can neither read nor write directly —
-- all access goes through server actions (service-role).
alter table form_submissions enable row level security;
alter table newsletter_subscribers enable row level security;
```

Manual step: **apply 0015 in the Supabase SQL editor before merge** (release gate). Until applied, the submit actions fail with a friendly error (the storefront forms show "could not send, try again") and the admin inbox reads fail-soft to empty — no 500s.

## Architecture

- **Pure validation (TDD)** `src/lib/forms/validation.ts`: `validateContact({name,email,subject?,message})` (name/message required, email format, bounds: name ≤ 120, subject ≤ 200, message ≤ 3000) and `validateBulk({business,person,email,phone,program?,quantity?,message})` (business/person/email/phone required — phone via the existing `isValidBdMobile`, program/quantity ≤ 200, message required ≤ 3000) — both return `{ok:true,value}|{ok:false,error}` with trimmed values; `validateNewsletterEmail(email)` (format, ≤ 200, lowercased).
- **Throttle** `src/lib/forms/throttle.ts`: a sibling of `track-throttle` with its OWN Map (`isFormRateLimited()`, 5/min per IP) so form spam and order-tracking don't share buckets.
- **Public actions** `src/lib/forms/actions.ts` (`"use server"`, async-only exports): `submitContactForm(input)`, `submitBulkInquiry(input)`, `subscribeNewsletter(email, source)` — each: throttle → validate → service-role insert (`as never`) → `{ok:true}|{ok:false,error}`. Newsletter unique-violation (23505) → `{ok:true}` (already subscribed = success; no enumeration). No revalidation of public pages needed; `revalidatePath('/admin/inbox')` so the inbox is fresh.
- **Wire the forms:** `contact-form.tsx` + `bulk-form.tsx` swap the fake `setSubmitted(true)` for `startTransition(async () => { const r = await submitX(...); r.ok ? setSubmitted(true) : toast.error(r.error) })` (keep the existing success panels + client validation as a first pass). The three newsletter components call `subscribeNewsletter(email, '<source>')` the same way (keep their "sent" states; error → toast or inline message — match each component's idiom, they're tiny).
- **Admin reads** (`src/lib/admin/queries.ts`): `getInboxSubmissions(): Promise<InboxSubmission[]>` (all, newest first; `InboxSubmission = { id, kind, name, email, phone, subject, message, meta: Record<string,string> | null, status, createdAt }`), `getNewsletterSubscribers(): Promise<Subscriber[]>` (`{ id, email, source, createdAt }`, newest first), `getInboxUnreadCount(): Promise<number>` (count `status='new'`; **fail-soft 0** — it runs in the admin layout on every admin page). All service-role.
- **Admin actions** (`src/lib/admin/actions.ts`): `setSubmissionStatus(id, status)` (validated against the 3 statuses), `deleteSubmission(id)`, `deleteSubscriber(id)` — admin-gated + service-role + `revalidatePath('/admin/inbox')` (+ `/admin` layout picks the badge up on next navigation).
- **Admin UI:** `src/app/admin/inbox/page.tsx` (server: `Promise.all` both reads) + `src/components/admin/inbox-manager.tsx` (client): tabs **Messages | Bulk orders | Subscribers** (tab labels carry counts; Messages/Bulk show their `new` counts). Rows: name + email (`mailto:`) + phone (`tel:`, bulk) + subject/business line + date + a status badge; `new` rows bold with a dot; clicking a row expands the full message (+ bulk meta: business/program/quantity) and calls `setSubmissionStatus(id,'read')` if it was new; row actions: mark unread, archive/unarchive, delete (confirm). An "Archived" filter toggle (default hides archived). Subscribers tab: total count, source badges, **Copy emails** (writes `subscribers.map(s=>s.email).join(", ")` to the clipboard + toast), per-row delete.
- **Sidebar badge:** `AdminLayout` fetches `getInboxUnreadCount()` → `<AdminShell inboxUnread={n}>` → `<AdminSidebar inboxUnread={n}>`; the Inbox NAV item (`{ label: "Inbox", href: "/admin/inbox", icon: Inbox }`, placed after Orders) renders a small count pill when `> 0`.

## Data flow

1. Visitor submits the contact form → throttle + validation → `form_submissions` row (`kind='contact'`, `status='new'`) → form shows its success panel.
2. Admin sees the sidebar **Inbox (1)** badge → opens `/admin/inbox` → the Messages tab shows the bold new row → expands it (auto-marks read; badge drops on next navigation) → clicks the `mailto:` link to reply from their mail client → archives it.
3. A footer newsletter signup upserts into `newsletter_subscribers` (duplicate → still "Thanks!") → the Subscribers tab count grows → admin hits **Copy emails** for a campaign.

## Security / correctness

- **RLS with zero policies** on both tables: the anon key can neither read nor write them — the ONLY path is the server actions (validated + throttled) and the admin surface (gated). Public actions never reveal whether an email is already subscribed (dup → success).
- All inputs validated + bounded server-side regardless of client validation; rendered as plain text (React-escaped) in the inbox.
- The throttle is best-effort (documented, own bucket); the real protections are validation, bounds, and no-direct-DB-access.
- `getInboxUnreadCount` is fail-soft 0 and cheap (`head:true` count) — it must never break the admin layout (pre-migration included).
- `"use server"` files export only async functions. Admin actions re-check `getIsAdmin()`.
- Submission emails/phones appear ONLY in the admin UI (gated), never on the storefront.

## Testing

- **Pure (TDD):** `validateContact` / `validateBulk` / `validateNewsletterEmail` — required fields, trims, bounds, email/phone formats, lowercasing.
- **Integration (after 0015):** each of the five forms submits → lands in the right tab (bulk meta intact); duplicate newsletter email → success + single row; unread badge counts new items and drops after reading; read/unread/archive/delete flows; Copy emails; throttle kicks in after rapid submits; anon REST access to both tables denied (RLS); pre-migration → forms fail friendly + inbox renders empty (no 500).

## Resolved decisions

- One shared submissions table (+jsonb meta) + a separate unique-email subscriber list; status new/read/archived; badge counts `new` only; email-notify + reply-UI + double-opt-in deferred.
