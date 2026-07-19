# toytuni-store — Phase 3 Slice: Admin Blog 3a (Foundation)

**Date:** 2026-07-19
**Status:** Design approved, pending spec review
**Scope:** Move the blog from mock to the DB and give the admin full post CRUD — create / edit / delete, draft vs published, a **markdown** body with live preview, category, author, cover image, and featured flag. The storefront blog reads published posts from the DB (fail-soft to mock) and renders markdown. First of three blog sub-slices (**3a Foundation** → 3b SEO analysis → 3c rich editor/tags/schedule). Fifth (final) admin section.

## Background

Phase 3 Slices 1/2/3a/3b + Settings + Categories + Inventory + Customers are merged and live. The blog is entirely mock: `src/lib/mock/blog.ts` (`blogCategories` — parenting/safety/montessori/play; `blogPosts` — each a `BlogPost` with a `BlogBlock[]` body of `h2`/`p`/`ul`). The storefront `/blog` (`BlogView`) + `/blog/[slug]` (`BlogPostView`, with `generateStaticParams`/`generateMetadata`) read the mock. The admin sidebar shows **Blog** disabled ("Soon"). This slice makes the DB the source of truth and adds admin authoring. SEO fields/analysis (3b) and tags/scheduling/rich blocks (3c) come later.

## Goals

- **Schema:** `blog_categories` (slug/name/sort) + `blog_posts` (core fields + markdown `body` + `status` draft/published + `featured` + `cover_image` + timestamps).
- **Seed:** migrate the mock posts + categories into the DB, converting each `BlogBlock[]` body → **markdown** (`h2`→`## `, `p`→paragraph, `ul`→`- ` list).
- **Reads (fail-soft to mock):** `getBlogPosts()` (published only, for the storefront), `getBlogPost(slug)`, `getBlogCategories()` — cached (tag `blog`).
- **Storefront:** `/blog` + `/blog/[slug]` read from the DB; the post body is **markdown, rendered** (via `react-markdown` + `remark-gfm`). Drafts are hidden from the storefront (404 / excluded from the hub).
- **Admin:** `/admin/blog` (list: title, category, status, date, featured) + create/edit/delete a post — title, slug (create-only), excerpt, markdown body (textarea + live preview), category (select), author, cover image (upload), featured, status (draft/published). Enable the **Blog** sidebar item.

## Non-goals (this slice)

- **SEO fields + analysis** (focus keyword, SEO title, meta description, the Yoast-style score) → **3b**.
- **Tags, scheduled publish, rich block editor (images/quotes inline beyond markdown), readability, related posts, social preview** → **3c**.
- **Blog-category admin CRUD** — categories are seeded + pickable this slice; managing them is deferred (they rarely change).
- No comments, no revisions/history, no multi-author management (author is a free-text byline).

## Locked decisions

- **Markdown body** (not blocks); rendered with **`react-markdown` + `remark-gfm`** (safe React rendering — no `dangerouslySetInnerHTML`, no raw HTML).
- **Status = draft | published** (scheduling is 3c). Drafts never appear on the storefront.
- Mock kept as a **fail-soft fallback**.
- Cover image → the existing public **`product-images`** Supabase Storage bucket (reuse the admin upload path).
- Blog categories **seeded** from the mock; admin picks from them (no category CRUD yet).

## Schema (migration) — ADAPTS the existing table

**IMPORTANT:** `blog_posts` **already exists** (migration `0001`, currently empty) with: `slug text primary key, title text, excerpt text, body jsonb default '[]', author text, cover_image text, category text, read_mins int, date_iso date, featured boolean default false, published boolean default true`. RLS is already enabled with a public policy `read published posts using (published = true)`. So the migration **alters** this table rather than creating it, and uses the existing `published` boolean for draft/published (draft = `published = false`) and the existing `category` text column (slug string) — NOT a status enum or a category FK.

Migration `0008_blog_content.sql`:
- `alter table blog_posts alter column body drop default;` `alter table blog_posts alter column body type text using '';` `alter table blog_posts alter column body set default '';` `alter table blog_posts alter column body set not null;` — repurpose the (empty) jsonb body to **markdown text**.
- `alter table blog_posts add column if not exists cover_tone text;` `add column if not exists cover_label text;` — for the illustrated cover fallback.
- `create table if not exists blog_categories (slug text primary key, name text not null, sort int not null default 0);` — names for the picker/chips (the existing `blog_posts.category` stays a plain text slug; no FK).
- The existing RLS + published-read policy are kept as-is (no RLS work needed).
- **Seed** (`scripts/seed.ts`): upsert `blog_categories` from mock `blogCategories`; upsert `blog_posts` from `blogPosts` with `body = blockToMarkdown(post.body)`, `published = true`, `date_iso = post.dateISO`, `read_mins = post.readMins`, `featured = post.featured ?? false`, `category = post.category`, `cover_tone`/`cover_label` from the mock. Idempotent (`onConflict: "slug"`).

**Draft/published:** the app uses the `published` boolean (the admin toggle writes it). "status draft/published" in this doc = `published = false | true`.

## Architecture

- **`src/lib/blog/block-to-markdown.ts`** (pure, TDD): `blockToMarkdown(blocks: BlogBlock[]): string` — `h2`→`## text`, `p`→`text`, `ul`→`- item` lines, blocks joined by blank lines. Used by the seed (and available if any mock post ever needs converting live).
- **`src/lib/data/blog.ts`** (server-only): `getBlogPosts()` (published, newest first), `getBlogPost(slug)` (published; drafts → treat as not found for the storefront), `getBlogCategories()` — cookieless `createPublicSupabase()` + `unstable_cache` tag `blog`; fail-soft to the mock (`blogPosts`/`blogCategories`) on error. A `rowToPost(row)` mapper → the app's `BlogPost` shape (body stays a markdown string on a new `bodyMarkdown` field, or `BlogPost.body` is widened — see note). Admin reads (all statuses) via a service-role `getAdminBlogPosts()`/`getAdminBlogPostBySlug()` in `src/lib/admin/queries.ts`.
- **`BlogPost` type note:** the storefront currently types `body: BlogBlock[]`. Introduce a DB-sourced post shape with `bodyMarkdown: string` for the rendered path; the post view renders markdown instead of iterating blocks. Keep the mock/type compatible during fail-soft (the mock fallback converts its blocks via `blockToMarkdown` at read time so the render path is uniformly markdown).
- **Markdown rendering:** a `src/components/blog/markdown.tsx` client/server component wrapping `react-markdown` + `remark-gfm`, themed (prose-like classes matching the current article styling). Add the two deps to `package.json`.
- **Storefront pages:** `/blog/page.tsx` + `/blog/[slug]/page.tsx` fetch from `src/lib/data/blog.ts` (were importing mock); `generateStaticParams` lists published slugs; `generateMetadata` uses the post's title/excerpt. `BlogView`/`BlogPostView` receive posts as props (or read the server fn) and render markdown.
- **Admin:**
  - `src/lib/admin/actions.ts`: `createBlogPost(input)` (validate slug unique/url-safe, title required; insert), `updateBlogPost(slug, patch)` (title/excerpt/body/category/author/cover/featured/status), `deleteBlogPost(slug)`, `setBlogPostStatus(slug, status)` (or fold into update). Cover image via the existing `uploadImageToBucket`/`uploadProductImage` path (reused for `cover_image`). Each re-checks `getIsAdmin()` + service-role + `revalidateTag('blog')` + `revalidatePath('/blog', '/blog/[slug]', '/admin/blog')`.
  - `src/app/admin/blog/page.tsx` (list) + `src/app/admin/blog/new/page.tsx` + `src/app/admin/blog/[slug]/edit/page.tsx` (or a shared form) + `src/components/admin/blog-post-form.tsx` (client — fields + a markdown textarea with a live `<Markdown>` preview + cover upload + status toggle). `src/components/admin/blog-posts-table.tsx` (list).
  - `src/components/admin/admin-sidebar.tsx`: remove `disabled` from **Blog** (now nothing is disabled).

## Data flow — publish a post

1. Admin `/admin/blog/new` → fills title/slug/excerpt/markdown body/category/author/cover → sets status **published** → `createBlogPost`.
2. Action inserts `blog_posts` (+ cover upload), `revalidateTag('blog')` + paths.
3. `getBlogPosts()` includes it → `/blog` hub + `/blog/<slug>` show it (markdown rendered). A **draft** post is excluded from the storefront and 404s at its slug.

## Security / correctness

- Admin writes re-check `getIsAdmin()` + service-role; slug url-safe + unique; markdown rendered safely (react-markdown, no raw HTML injection).
- Storefront reads only `status = 'published'` (RLS public policy + the query filter); drafts never leak.
- Fail-soft: `getBlogPosts`/`getBlogPost`/`getBlogCategories` fall back to the mock on a thrown error (blog stays up), logged.
- `blog_posts`/`blog_categories` columns absent from generated types → `.overrideTypes()` reads + `as never` writes (established pattern), no regenerated types.

## Testing

- **Pure (TDD):** `blockToMarkdown` (h2/p/ul → correct markdown; mixed order; empty).
- **Integration (drive it, real admin session):** seed populates posts/categories; the storefront `/blog` + a post render from the DB (markdown correct); an admin-created **published** post appears on the storefront, a **draft** does not (and its slug 404s); edit a title/body → reflects; delete → gone; cover upload renders; non-admin rejected. Verify against the live DB after the migration + seed.

## Open questions for review

- `react-markdown` + `remark-gfm` dependency: confirmed acceptable (standard, safe, ~small). Alternative (hand-rolled renderer) rejected as error-prone.
- Draft slug on the storefront: 404 vs. redirect. Proposal: **404** (`notFound()`), consistent with an unknown slug.
