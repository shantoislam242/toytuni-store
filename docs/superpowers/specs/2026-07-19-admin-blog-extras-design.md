# toytuni-store — Phase 3 Slice: Blog 3c (extras — final blog slice)

**Date:** 2026-07-19
**Status:** Design approved, pending spec review
**Scope:** The remaining WordPress-style blog features: **tags** (freeform, with hub filtering + post chips), **scheduled publish** (Draft / Scheduled / Published), **blog-category admin CRUD**, and an **inline image-insert** button in the markdown editor. Related posts already ship (3a). Third/final blog sub-slice; completes the 5-section admin build.

## Background

Blog 3a (posts→DB + markdown CRUD) + 3b (SEO analysis) are merged and live. `blog_posts` has `published boolean` + `scheduled_at`? (no) and `category text` (slug); `blog_categories (slug,name,sort)` exists but has no admin CRUD. The storefront hub (`blog-view.tsx`) already filters by category + search + paginates, and `blog-post-view.tsx` already shows related + prev/next. The editor (`blog-post-form.tsx`) is a markdown textarea + preview. Missing: tags, scheduling, blog-category management, and an in-editor image insert. This slice adds them.

## Goals

- **Tags:** a freeform `blog_posts.tags text[]`; the editor edits them (chip list), the post shows tag chips, and the hub gains a tag filter. No separate tag table.
- **Scheduled publish:** a `blog_posts.scheduled_at timestamptz`; a post is **live** when `published = true` OR (`scheduled_at` is set and `scheduled_at <= now()`). Status in admin = **Draft** (not published, no future schedule), **Scheduled** (not published, future `scheduled_at`), **Published** (published true). The storefront query + the RLS policy both reveal a scheduled post once its time passes.
- **Blog-category CRUD:** an admin screen to add / edit / delete / reorder `blog_categories` (slug/name/sort); a delete is **blocked** when posts reference the category (`blog_posts.category = slug`).
- **Inline image insert:** an "Insert image" control in the editor that uploads (reusing `uploadBlogCover`) and inserts `![alt](url)` markdown at the cursor.

## Non-goals (this slice)

- No cron / scheduled job — a scheduled post is revealed by the storefront query/RLS the first time it's read after `scheduled_at`, i.e. on the next cache revalidation (≤ 1-hour `unstable_cache` TTL) or any admin write that busts `revalidateTag('blog')`. It does NOT auto-publish at the exact second (documented). It never flips `published` to true; "live" is computed.
- No tag pages (`/blog/tag/<t>`) — tags filter the existing hub only; no per-tag route/SEO this slice.
- No tag rename/merge management UI (tags are freeform strings per post).
- No related-posts work (already done in 3a).
- No rich WYSIWYG — markdown stays the body format; the image button just inserts markdown.

## Locked decisions

- Tags = **freeform `text[]`** (no tag table); edited via the existing `StringListEditor`.
- Scheduled: **`published || (scheduled_at <= now)`** = live; three admin statuses (Draft/Scheduled/Published); RLS + query both updated; cron-less reveal accepted.
- Blog-category **delete blocks when referenced** (posts use the slug).
- Image insert = **upload → insert markdown** (reuse `uploadBlogCover`).

## Schema (migration 0010)

- `alter table blog_posts add column if not exists tags text[];`
- `alter table blog_posts add column if not exists scheduled_at timestamptz;`
- Replace the RLS read policy: `drop policy if exists "read published posts" on blog_posts;` `create policy "read published posts" on blog_posts for select using (published = true or (scheduled_at is not null and scheduled_at <= now()));`
- No seed change (existing posts: null tags/scheduled_at → unchanged behavior).

## Architecture

- **`src/lib/blog/post-live.ts`** (pure, TDD): `isPostLive({ published, scheduledAt, now }): boolean` (published true → live; else scheduledAt set and ≤ now → live; else not) and `postStatus({ published, scheduledAt, now }): "draft" | "scheduled" | "published"` for the admin badge.
- **`src/lib/admin/blog-taxonomy.ts`** (pure, TDD): a small validator for blog-category input (slug url-safe, name required, sort ≥ 0) + `isPermutation` (or reuse `@/lib/admin/taxonomy`'s `isPermutation`). (Kept separate from product taxonomy — different table, no product FK.)
- **Tags/scheduled through the stack:** `blog_posts.tags`/`scheduled_at` → `BlogPostData` (`tags: string[]`, and the post's live-ness handled by the query) + `AdminBlogPost` (`tags: string[]; scheduledAt: string | null; published: boolean`) + `BlogPostInput` (`tags?: string[]; scheduledAt?: string | null`) + create/update writes + `rowToPost`. `getBlogPosts`/`getBlogPost` filter `published = true OR scheduled_at <= now` (server-side, mirroring the RLS) and drop scheduled-future posts; the storefront `getBlogPosts` no longer relies solely on `published`.
- **Storefront:** `blog-post-view.tsx` renders tag chips (below the meta row); `blog-view.tsx` gains a tag filter (a chip row or a select built from the union of all posts' tags) composing with the existing category/search filters.
- **Admin blog-category CRUD:** `src/lib/admin/queries.ts` `getAdminBlogCategories()` (rows + per-category post count); `src/lib/admin/actions.ts` `createBlogCategory`/`updateBlogCategory`/`deleteBlogCategory` (block on post count > 0) / `reorderBlogCategories`; `src/app/admin/blog/categories/page.tsx` + `src/components/admin/blog-category-manager.tsx` (a table + add/edit dialog + reorder + delete, mirroring the product `TaxonomyManager` pattern but on `blog_categories`); a link to it from the blog list page.
- **Editor:** `blog-post-form.tsx` — a **Tags** field (`<StringListEditor>` bound to a `tags` state), a **schedule** control (a `datetime-local` input for `scheduledAt` shown when not published, feeding the status), and an **Insert image** button near the markdown textarea (file input → `uploadBlogCover(slug, …)` → insert `![](url)` at the caret via the textarea ref). Include `tags`/`scheduledAt` in the create/update calls; the status/badge uses `postStatus`.

## Data flow — schedule a post

1. Admin edits a post, leaves **Published** off, sets a future **scheduled_at** → saves → `updateBlogPost` writes `scheduled_at`, `published = false`.
2. Admin list shows **Scheduled (date)**. The storefront hub/post exclude it (query `scheduled_at <= now` false; RLS same).
3. After `scheduled_at` passes, the next `getBlogPosts` read past the cache TTL (or any admin write) includes it → it goes live (query + RLS both reveal it).

## Security / correctness

- `isPostLive`/`postStatus` pure + deterministic (take `now` as a param; no `Date.now()` inside → testable).
- Storefront reads filter live posts server-side (query) AND the RLS enforces it (defense in depth) — a future scheduled post never leaks.
- Blog-category delete blocks when referenced (count check + no orphaned post category); admin-gated writes + service-role.
- Tags sanitized on write (trim, drop empties, dedupe); freeform but bounded to plain strings.
- New columns absent from generated types → `as never` writes / `.overrideTypes()` reads.
- Image insert reuses the validated `uploadBlogCover` (content-type/size).

## Testing

- **Pure (TDD):** `isPostLive`/`postStatus` (published→live/published; future schedule→not-live/scheduled; past schedule→live/published; none→not-live/draft); blog-category validator + permutation.
- **Integration (drive it, real admin session, after migration):** add/edit/delete/reorder a blog category (delete blocked when a post uses it); add tags to a post → chips on the post + the hub tag filter narrows results; set a future `scheduled_at` → post hidden on the storefront, shown as "Scheduled" in admin; a past `scheduled_at` (or published) → live; insert an image in the editor → markdown appears + renders on the post; non-admin rejected. Verify against the live DB after the migration.

## Open questions for review

- Tag filter UI: a chip row (click to toggle) vs. a select. Proposal: **a chip row** of the top tags (union across posts), single-select, composing with category/search.
- Scheduled reveal latency: accepted (cron-less; ≤ 1-hour TTL or admin-write reveal). Optionally shorten the blog `unstable_cache` `revalidate` from 3600 to e.g. 300 for snappier scheduling — **proposal: keep 3600** (a schedule is coarse; not worth 12× the revalidation load).
