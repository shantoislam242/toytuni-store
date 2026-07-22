# toytuni-store — Product Reviews + Q&A (Daraz-style)

**Date:** 2026-07-22
**Status:** Design approved, pending spec review
**Scope:** Real, verified-purchase **product reviews** (unlocked when the buyer's order is **delivered**) and a per-product **Q&A** (any signed-in user asks; the question appears publicly once the **admin answers**) — Daraz-style. Includes: migration 0014 (two tables + a rating-aggregation trigger + an honest reset of the seeded mock ratings), server-side eligibility, PDP review/Q&A sections replacing the mock reviews, account-order "Review" entry points, and an admin **Reviews** page (two tabs: Reviews moderation + Questions inbox).

## Background

The PDP renders **mock reviews** (`ProductDetail.reviews`, hand-written Bengali mock — NOT admin-editable, outside `DetailContent`) via `<ProductReviews reviews={detail.reviews ?? []} />` in `product-details-view.tsx`. `products.rating`/`review_count` (migration 0001) hold **seeded mock numbers** shown on cards/PDP meta. There is no real review system and no Q&A. Key architectural facts: the PDP is **static/ISR** (`generateStaticParams`, `unstable_cache` tag `catalog`, 1h) — so per-user state (eligibility, "you already reviewed") cannot be computed at page render; it must come from a client component calling a server action. Account order history is matched by the signed-in user's email (`getOrdersForEmail`); `AccountOrderDetail` items carry `title` but **no product slug** (needs a `products(slug)` join for the "Review" link). The admin sidebar/nav pattern, admin-gated server actions (`getIsAdmin` + service-role), `.overrideTypes`/`as never`, and the `"use server"`-no-value-exports rule are all established.

## Goals

- **Verified-purchase reviews:** a signed-in customer whose email has a **delivered** order containing the product can leave ONE review (1–5 stars + optional title + body). Auto-published; every review is implicitly verified (non-buyers can't write at all).
- **Live aggregate rating:** `products.rating` + `review_count` recomputed from **non-hidden** reviews by a DB trigger (insert/update/delete/hide all covered). Seeded mock numbers **reset to 0** in the migration (honest start); card/PDP rating UI hides stars when `reviewCount === 0` ("No reviews yet").
- **Q&A:** any signed-in user can ask a product question; it appears on the PDP **only after the admin answers** (and isn't hidden). Asker sees "we'll show it once answered".
- **Admin moderation:** a new `/admin/reviews` page (sidebar "Reviews") with two tabs — **Reviews** (all reviews: hide/unhide, delete) and **Questions** (unanswered first: answer inline, hide, delete).
- **Entry points:** PDP "Write a review" (client, eligibility-checked via server action) + account delivered-order items get a "Review" link to the PDP reviews section.

## Non-goals (later)

- No review images/photo upload, no helpful-votes, no admin replies to reviews, no review editing after submit (delete+rewrite via admin only).
- No email notification to the asker when answered, none to the admin on new questions (they see the inbox tab).
- No guest reviews (order#+phone flow) — sign-in required (decision).
- No per-question customer follow-ups (single Q → single A).
- No review incentives/reminder emails.

## Locked decisions

- Unlock = order **status delivered**. Reviewer = **signed-in** user whose email matches the order. **One review per (product, email)**.
- **Auto-publish** + admin hide/delete (Daraz-style). Q&A: signed-in ask → **public once answered**.
- Seeded ratings **reset to 0**; aggregation trigger is the single source of `products.rating`/`review_count` from then on.
- Mock `ProductDetail.reviews` no longer rendered (PDP uses real data; mock field left in the type but unused).

## Schema (migration 0014 — `0014_reviews_qa.sql`)

```sql
create table if not exists product_reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  customer_email text not null,
  customer_name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, customer_email)
);
create index if not exists product_reviews_product_idx on product_reviews(product_id, created_at desc);
drop trigger if exists product_reviews_set_updated_at on product_reviews;
create trigger product_reviews_set_updated_at before update on product_reviews
  for each row execute function set_updated_at();

create table if not exists product_questions (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  customer_email text not null,
  customer_name text not null,
  question text not null,
  answer text,
  answered_at timestamptz,
  answered_by text,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists product_questions_product_idx on product_questions(product_id, created_at desc);

-- RLS: the public may read only visible content; ALL writes go through
-- server actions (service-role) after server-side verification.
alter table product_reviews enable row level security;
create policy "read visible reviews" on product_reviews for select using (not hidden);
alter table product_questions enable row level security;
create policy "read answered questions" on product_questions
  for select using (answer is not null and not hidden);

-- Aggregate rating: products.rating/review_count always reflect non-hidden
-- reviews. Trigger covers submit, admin hide/unhide, and delete — no app path
-- can forget to refresh.
create or replace function refresh_product_rating() returns trigger
language plpgsql as $$
declare v_product uuid;
begin
  v_product := coalesce(new.product_id, old.product_id);
  update products p set
    rating = coalesce((select round(avg(r.rating)::numeric, 1) from product_reviews r
                       where r.product_id = v_product and not r.hidden), 0),
    review_count = (select count(*) from product_reviews r
                    where r.product_id = v_product and not r.hidden)
    where p.id = v_product;
  return null;
end $$;
drop trigger if exists product_reviews_refresh_rating on product_reviews;
create trigger product_reviews_refresh_rating
  after insert or update or delete on product_reviews
  for each row execute function refresh_product_rating();

-- Honest start: the seeded card ratings were mock numbers; real reviews now own them.
update products set rating = 0, review_count = 0;
```

Manual step: **apply 0014 in the Supabase SQL editor before merge** (release gate). Note it immediately zeroes the storefront card ratings (accepted — honest start).

## Architecture

- **Eligibility (server-only)** `src/lib/reviews/eligibility.ts`: `getReviewEligibility(email, productId)` → `{ eligible: boolean; orderId: string | null; alreadyReviewed: boolean }` — service-role: a delivered order with `customer_email = email` whose `order_items` contain `product_id`, minus an existing `product_reviews` row for (product, email). Pure query logic, no session reading (callers pass the verified email).
- **Customer actions** `src/lib/reviews/actions.ts` (`"use server"` — async exports ONLY, per the established rule):
  - `checkReviewEligibility(productId)` — reads the session (`getSessionUser`), returns `{ signedIn, eligible, alreadyReviewed }` for the PDP client button.
  - `submitReview(productId, { rating, title?, body })` — session required; **re-verifies eligibility server-side** (never trusts the client); validates (rating 1–5 int, body non-empty ≤ 2000, title ≤ 120); inserts with `customer_email`/`customer_name` from the session (name from `user_metadata.full_name` fallback email-localpart) + the qualifying `order_id`; unique-violation → friendly "already reviewed"; then `revalidateTag('reviews','max')` + `revalidatePath('/products/[slug]','page')` (slug passed in) + `revalidateTag('catalog','max')` (rating changed on cards).
  - `askQuestion(productId, question)` — session required; validates (non-empty ≤ 1000); inserts; no public revalidation needed (invisible until answered) but revalidate the admin inbox path.
- **Public reads** `src/lib/data/reviews.ts` (cookieless anon client — RLS enforces visibility; `unstable_cache`):
  - `getProductReviews(productId)` → visible reviews newest-first, tag `reviews`, revalidate 3600. Fail-soft `[]` (pre-migration).
  - `getProductQuestions(productId)` → answered+visible newest-first, tag `reviews` (same tag — both bust together). Fail-soft `[]`.
- **Admin** (`queries.ts` + `actions.ts`, established patterns): `getAdminReviews()` (all incl. hidden, product title joined), `getAdminQuestions()` (all, unanswered first); actions `setReviewHidden(id, hidden)`, `deleteReview(id)`, `answerQuestion(id, answer)` (records `answered_by` = admin email, `answered_at`), `setQuestionHidden(id, hidden)`, `deleteQuestion(id)` — all admin-gated + service-role + `revalidateTag('reviews','max')` + `revalidateTag('catalog','max')` (hide/delete moves the aggregate via the trigger) + `revalidatePath('/admin/reviews')`.
- **PDP** (`src/app/products/[slug]/page.tsx` + `product-details-view.tsx`): the page fetches `getProductReviews(product.id)` + `getProductQuestions(product.id)` (cached, static-friendly) and passes them down; `<ProductReviews>` is adapted to render the REAL reviews (reuse its styling: avatar/stars/verified badge — all real reviews show verified) + a rating summary/distribution; below it a new **`WriteReviewCta`** client component: on mount (or click) calls `checkReviewEligibility` → renders the form (star picker + title + body → `submitReview`) / "sign in to review" / "buy this to review" / "you already reviewed". New **`ProductQa`** section: answered list + an "Ask a question" client form (`askQuestion`; signed-out → sign-in link with `?next=` back to the product). Rating meta near the title hides stars when `reviewCount === 0` (shows "No reviews yet"); same guard on `product-card.tsx`/`product-list-item.tsx`.
- **Account entry point** (`src/lib/data/account.ts` + `account-view.tsx`/order detail page): the detail read's `order_items` select adds `product_id, products(slug)`; delivered orders render a small **"Write a review"** link per item → `/products/<slug>#reviews`. (List page unchanged.)
- **Admin UI:** `src/app/admin/reviews/page.tsx` (server: both datasets) + `src/components/admin/reviews-manager.tsx` (client, two tabs). Sidebar `NAV_ITEMS` gains `{ label: "Reviews", href: "/admin/reviews", icon: Star }` (after Blog). Questions tab shows a count badge of unanswered.

## Data flows

**Review:** delivered order → customer opens PDP (or account → "Write a review") → `WriteReviewCta` → `checkReviewEligibility` → form → `submitReview` (server re-verifies, inserts) → DB trigger updates `products.rating/review_count` → `revalidateTag('reviews'+'catalog')` → review visible with ✓ Verified badge, card rating updates.
**Q&A:** signed-in user asks → stored invisible → admin sees it in the Questions tab (unanswered first) → writes an answer → `answerQuestion` publishes (RLS now exposes it) + revalidates → Q&A appears on the PDP.
**Moderation:** admin hides/deletes a review → trigger re-aggregates → caches busted → storefront reflects it.

## Security / correctness

- **Server-side verification everywhere:** `submitReview` re-checks eligibility (delivered order + not already reviewed) with the service-role client using the SESSION email — a forged client call cannot review unbought products. `askQuestion` requires a session. Admin actions re-check `getIsAdmin()`.
- **RLS as defense-in-depth:** anon reads only `not hidden` reviews / answered+visible questions; there are NO public insert/update policies (writes are service-role only).
- **The unique (product, email) constraint** backstops the one-review rule at the DB even under races.
- **The rating trigger** is the single aggregation path (no app-side recompute to drift); migration resets seeded mocks so aggregates are truthful from day one.
- All inputs validated server-side (rating int 1–5, lengths bounded, trimmed); rendered as plain text (React-escaped).
- `"use server"` files export only async functions (learned rule); reads default/fail-soft pre-migration (PDP renders with empty reviews, no 500).
- Customer email is NEVER rendered publicly — reviews/questions show `customer_name` only.

## Testing

- **Pure (TDD):** review input validation (`validateReviewInput`: rating band/int, body/title bounds) and question validation — small pure helpers used by the actions; rating-distribution helper for the summary (counts per star from a review list).
- **Integration (after 0014, real sessions):** buyer with a delivered order sees the form and can review once (second attempt → friendly error); non-buyer/signed-out sees the right CTA; submitted review appears + card rating updates from 0; admin hides → disappears + aggregate drops; question invisible until answered → appears after admin answers; account delivered order shows the Review link; non-admin blocked from admin actions.

## Resolved decisions (from review)

- Unlock on **delivered**; **signed-in buyers only**; **auto-publish + admin hide/delete**; Q&A **signed-in ask, visible once answered**; seeded ratings **reset to 0** with stars hidden until the first real review.
