# Admin Blog 3a (Foundation) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the blog from mock to the DB with admin post CRUD (draft/published, markdown body + preview, category, author, cover, featured); the storefront blog reads published posts from the DB and renders markdown.

**Architecture:** A pure `blockToMarkdown` (seed) + `markdownHeadings` (TOC) feed a DB read layer (`getBlogPosts`/`getBlogPost`/`getBlogCategories`, fail-soft to mock) shaped as `BlogPostData` (markdown body); the storefront renders markdown via a `react-markdown` component; admin gets list + a markdown post form + CRUD actions.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Supabase, shadcn/ui, `react-markdown` + `remark-gfm`, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-19-admin-blog-foundation-design.md`

## Global Constraints

- **Non-standard Next.js.** Read `node_modules/next/dist/docs/` before server actions / `revalidateTag` / `unstable_cache`. Middleware is `src/proxy.ts`.
- **`blog_posts` ALREADY EXISTS** (migration 0001, empty): `slug pk, title, excerpt, body jsonb, author, cover_image, category text, read_mins, date_iso date, featured bool, published bool`. RLS + a public `published = true` read policy already exist. The migration **alters** it (repurpose `body` jsonb→text markdown; add `cover_tone`/`cover_label`) and adds `blog_categories`. Draft/published = the existing `published` boolean (draft = false). `category` stays a plain text slug (no FK). Do NOT recreate the table or add a status enum.
- **Fail-soft:** blog reads fall back to the mock (`src/lib/mock/blog.ts` `blogPosts`/`blogCategories`, converting blocks→markdown) on a thrown error; logged. Storefront shows only `published = true`; drafts never leak.
- **Markdown safety:** render via `react-markdown` + `remark-gfm` (no `dangerouslySetInnerHTML`, no raw HTML). New columns absent from generated types → `.overrideTypes()` reads + `as never` writes.
- Admin writes re-check `getIsAdmin()` + service-role + `revalidateTag('blog')`. Cover image via the existing `product-images` upload path. Toytuni theme. `.env.local`/`.superpowers/` gitignored — stage explicit paths.

## Manual step

After Task 2, apply `supabase/migrations/0008_blog_content.sql` in the Supabase SQL editor, then run `npm run db:seed` (controller can run it) before the Task 3/4/5 live verification.

## File structure

- Create `src/lib/blog/block-to-markdown.ts` (+ `.test.ts`), `src/lib/blog/markdown-headings.ts` (+ `.test.ts`); add `BlogPostData` to `src/lib/types.ts`.
- Create `supabase/migrations/0008_blog_content.sql`; modify `scripts/seed.ts`.
- Create `src/lib/data/blog.ts`; modify `src/lib/admin/queries.ts`.
- Create `src/components/blog/markdown.tsx`; modify `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`, `src/components/blog/blog-view.tsx`, `src/components/blog/blog-post-view.tsx`, `src/components/blog/blog-card.tsx`, `src/components/blog/featured-section.tsx`.
- Modify `src/lib/admin/actions.ts`; create `src/app/admin/blog/page.tsx`, `src/app/admin/blog/new/page.tsx`, `src/app/admin/blog/[slug]/edit/page.tsx`, `src/components/admin/blog-posts-table.tsx`, `src/components/admin/blog-post-form.tsx`; modify `src/components/admin/admin-sidebar.tsx`.

---

## Task 1: Pure `blockToMarkdown` + `markdownHeadings` + `BlogPostData` type (TDD)

**Files:** Create `src/lib/blog/block-to-markdown.ts` (+ `.test.ts`), `src/lib/blog/markdown-headings.ts` (+ `.test.ts`). Modify `src/lib/types.ts`.

**Interfaces:** Produces `blockToMarkdown(blocks: BlogBlock[]): string`; `markdownHeadings(md: string): string[]`; `BlogPostData` type.

- [ ] **Step 1 — failing tests.**

`src/lib/blog/block-to-markdown.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { blockToMarkdown } from "./block-to-markdown";

describe("blockToMarkdown", () => {
  it("converts h2/p/ul blocks to markdown", () => {
    const md = blockToMarkdown([
      { type: "h2", text: "Heading" },
      { type: "p", text: "A paragraph." },
      { type: "ul", items: ["one", "two"] },
    ]);
    expect(md).toBe("## Heading\n\nA paragraph.\n\n- one\n- two");
  });
  it("handles empty", () => expect(blockToMarkdown([])).toBe(""));
});
```

`src/lib/blog/markdown-headings.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { markdownHeadings } from "./markdown-headings";

describe("markdownHeadings", () => {
  it("extracts ## headings in order", () => {
    expect(markdownHeadings("## One\n\ntext\n\n## Two\n\n- x")).toEqual(["One", "Two"]);
  });
  it("ignores non-h2 and returns [] for none", () => {
    expect(markdownHeadings("# Title\ntext\n### Sub")).toEqual([]);
  });
});
```

- [ ] **Step 2 — run → FAIL.** `npx vitest run src/lib/blog/block-to-markdown.test.ts src/lib/blog/markdown-headings.test.ts`

- [ ] **Step 3 — implement.**

`src/lib/blog/block-to-markdown.ts`:
```ts
import type { BlogBlock } from "@/lib/types";

/** Convert the legacy typed blocks to markdown (used by the seed to migrate the
 *  mock posts, and by the mock fail-soft path). Pure. */
export function blockToMarkdown(blocks: BlogBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === "h2") return `## ${b.text}`;
      if (b.type === "ul") return b.items.map((i) => `- ${i}`).join("\n");
      return b.text;
    })
    .join("\n\n");
}
```

`src/lib/blog/markdown-headings.ts`:
```ts
/** Extract level-2 (`## `) heading texts from markdown, in order — for the
 *  post's table of contents. Pure. */
export function markdownHeadings(md: string): string[] {
  return md
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice(3).trim())
    .filter((t) => t !== "");
}
```

- [ ] **Step 4 — `BlogPostData` in `src/lib/types.ts`** (after `BlogPost`):
```ts
/** DB-sourced blog post for the storefront (body is markdown, not typed blocks).
 *  The mock fail-soft path maps a `BlogPost` into this via `blockToMarkdown`. */
export type BlogPostData = {
  slug: string; title: string; excerpt: string; category: string; dateISO: string;
  readMins: number; author: string; coverTone: Tone; coverLabel: string;
  coverImage?: string; featured: boolean; bodyMarkdown: string;
};
```

- [ ] **Step 5 — run → PASS**, `npx tsc --noEmit`. Commit `feat(blog): blockToMarkdown + markdownHeadings + BlogPostData (TDD)`.

---

## Task 2: Migration 0008 + seed

**Files:** Create `supabase/migrations/0008_blog_content.sql`. Modify `scripts/seed.ts`.

- [ ] **Step 1 — migration** `supabase/migrations/0008_blog_content.sql`:
```sql
-- toytuni-store — Blog 3a: repurpose the existing (empty) blog_posts.body jsonb to
-- markdown text, add cover tone/label, and add a blog_categories lookup.
-- blog_posts already exists (0001) with RLS + a public `published = true` read policy.
-- Run in the Supabase SQL editor after 0007_pdp_content.sql, then re-seed.

alter table blog_posts alter column body drop default;
alter table blog_posts alter column body type text using '';
alter table blog_posts alter column body set default '';
alter table blog_posts alter column body set not null;

alter table blog_posts add column if not exists cover_tone text;
alter table blog_posts add column if not exists cover_label text;

create table if not exists blog_categories (
  slug text primary key,
  name text not null,
  sort int not null default 0
);
alter table blog_categories enable row level security;
create policy if not exists "read blog_categories" on blog_categories for select using (true);
```
(If `create policy if not exists` isn't supported on the target Postgres, wrap in a `do $$ begin ... exception when duplicate_object then null; end $$;` block, or drop-then-create. Keep it idempotent.)

- [ ] **Step 2 — seed.** In `scripts/seed.ts`, import `{ blogPosts, blogCategories }` from `@/lib/mock/blog` and `{ blockToMarkdown }` from `@/lib/blog/block-to-markdown`. Add near the other upserts:
```ts
  const bcatRes = await db.from("blog_categories").upsert(
    blogCategories.map((c, i) => ({ slug: c.slug, name: c.name, sort: i })),
    { onConflict: "slug" },
  );
  if (bcatRes.error) throw bcatRes.error;

  const bpostRes = await db.from("blog_posts").upsert(
    blogPosts.map((p) => ({
      slug: p.slug, title: p.title, excerpt: p.excerpt, body: blockToMarkdown(p.body),
      author: p.author, cover_image: p.coverImage ?? null, category: p.category,
      read_mins: p.readMins, date_iso: p.dateISO, featured: p.featured ?? false,
      published: true, cover_tone: p.coverTone, cover_label: p.coverLabel,
    })) as never,
    { onConflict: "slug" },
  );
  if (bpostRes.error) throw bpostRes.error;
  console.log(`blog: ${blogCategories.length} categories, ${blogPosts.length} posts seeded`);
```

- [ ] **Step 3 — verify tsc** (`npx tsc --noEmit`); do NOT run db:seed (controller runs it post-migration). Commit `feat(blog): migration 0008 (body→markdown, cover tone/label, blog_categories) + seed`.

---

## Task 3: DB read layer + admin queries

**Files:** Create `src/lib/data/blog.ts`. Modify `src/lib/admin/queries.ts`.

**Interfaces:**
- Consumes: `blockToMarkdown` (Task 1), `BlogPostData`.
- Produces: `getBlogPosts()`, `getBlogPost(slug)`, `getBlogCategories()`; `getAdminBlogPosts()`, `getAdminBlogPostBySlug(slug)`.

- [ ] **Step 1 — `src/lib/data/blog.ts`:**
```ts
import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { blogPosts as mockPosts, blogCategories as mockCategories } from "@/lib/mock/blog";
import { blockToMarkdown } from "@/lib/blog/block-to-markdown";
import type { BlogCategory, BlogPostData, Tone } from "@/lib/types";

type BlogRow = {
  slug: string; title: string; excerpt: string | null; body: string; author: string | null;
  cover_image: string | null; category: string | null; read_mins: number | null;
  date_iso: string | null; featured: boolean; cover_tone: string | null; cover_label: string | null;
};

function rowToPost(r: BlogRow): BlogPostData {
  return {
    slug: r.slug, title: r.title, excerpt: r.excerpt ?? "", category: r.category ?? "",
    dateISO: r.date_iso ?? "", readMins: r.read_mins ?? 3, author: r.author ?? "",
    coverTone: (r.cover_tone as Tone) ?? "cream", coverLabel: r.cover_label ?? r.title,
    coverImage: r.cover_image ?? undefined, featured: r.featured, bodyMarkdown: r.body ?? "",
  };
}

/** Mock → BlogPostData (fail-soft). Body blocks become markdown. */
function mockToData(): BlogPostData[] {
  return mockPosts.map((p) => ({
    slug: p.slug, title: p.title, excerpt: p.excerpt, category: p.category, dateISO: p.dateISO,
    readMins: p.readMins, author: p.author, coverTone: p.coverTone, coverLabel: p.coverLabel,
    coverImage: p.coverImage, featured: p.featured ?? false, bodyMarkdown: blockToMarkdown(p.body),
  }));
}

async function readPublishedPosts(): Promise<BlogPostData[]> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, title, excerpt, body, author, cover_image, category, read_mins, date_iso, featured, cover_tone, cover_label")
      .eq("published", true)
      .order("date_iso", { ascending: false })
      .overrideTypes<BlogRow[], { merge: false }>();
    if (error) throw error;
    return (data ?? []).map(rowToPost);
  } catch (err) {
    console.error("getBlogPosts failed; mock fallback:", err);
    return mockToData();
  }
}

export const getBlogPosts = unstable_cache(readPublishedPosts, ["blog-posts"], { tags: ["blog"], revalidate: 3600 });

export function getBlogPost(slug: string): Promise<BlogPostData | undefined> {
  return unstable_cache(
    async () => (await readPublishedPosts()).find((p) => p.slug === slug),
    ["blog-post", slug], { tags: ["blog"], revalidate: 3600 },
  )();
}

async function readCategories(): Promise<BlogCategory[]> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase.from("blog_categories").select("slug, name, sort")
      .order("sort", { ascending: true })
      .overrideTypes<{ slug: string; name: string; sort: number }[], { merge: false }>();
    if (error) throw error;
    return (data ?? []).map((c) => ({ slug: c.slug, name: c.name }));
  } catch (err) {
    console.error("getBlogCategories failed; mock fallback:", err);
    return mockCategories;
  }
}
export const getBlogCategories = unstable_cache(readCategories, ["blog-categories"], { tags: ["blog"], revalidate: 3600 });
```

- [ ] **Step 2 — admin queries in `src/lib/admin/queries.ts`** (service-role, ALL statuses):
```ts
export type AdminBlogListItem = {
  slug: string; title: string; category: string | null; author: string | null;
  dateISO: string | null; featured: boolean; published: boolean;
};
export type AdminBlogPost = AdminBlogListItem & {
  excerpt: string; bodyMarkdown: string; coverImage: string | null;
  coverTone: string | null; coverLabel: string | null;
};

export async function getAdminBlogPosts(): Promise<AdminBlogListItem[]> {
  const db = createAdminSupabase();
  const { data, error } = await db.from("blog_posts")
    .select("slug, title, category, author, date_iso, featured, published")
    .order("date_iso", { ascending: false })
    .overrideTypes<{ slug: string; title: string; category: string | null; author: string | null; date_iso: string | null; featured: boolean; published: boolean }[], { merge: false }>();
  if (error) throw new Error(`getAdminBlogPosts failed: ${error.message}`);
  return (data ?? []).map((r) => ({ slug: r.slug, title: r.title, category: r.category, author: r.author, dateISO: r.date_iso, featured: r.featured, published: r.published }));
}

export async function getAdminBlogPostBySlug(slug: string): Promise<AdminBlogPost | null> {
  const db = createAdminSupabase();
  const { data, error } = await db.from("blog_posts")
    .select("slug, title, excerpt, body, author, cover_image, category, date_iso, featured, published, cover_tone, cover_label")
    .eq("slug", slug).maybeSingle()
    .overrideTypes<{ slug: string; title: string; excerpt: string | null; body: string; author: string | null; cover_image: string | null; category: string | null; date_iso: string | null; featured: boolean; published: boolean; cover_tone: string | null; cover_label: string | null }, { merge: false }>();
  if (error) throw new Error(`getAdminBlogPostBySlug failed: ${error.message}`);
  if (!data) return null;
  return {
    slug: data.slug, title: data.title, excerpt: data.excerpt ?? "", bodyMarkdown: data.body ?? "",
    author: data.author, category: data.category, dateISO: data.date_iso, featured: data.featured,
    published: data.published, coverImage: data.cover_image, coverTone: data.cover_tone, coverLabel: data.cover_label,
  };
}
```

- [ ] **Step 3 — verify + commit.** `npx tsc --noEmit && npx vitest run` (build needs the mock still compiling; a full build runs in Task 4 after the storefront switch). Commit `feat(blog): DB read layer (fail-soft) + admin blog queries`.

---

## Task 4: Markdown component + storefront reads from the DB

**Files:** Add deps; create `src/components/blog/markdown.tsx`; modify `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`, `src/components/blog/blog-view.tsx`, `src/components/blog/blog-post-view.tsx`, `src/components/blog/blog-card.tsx`, `src/components/blog/featured-section.tsx`.

**Interfaces:** Consumes `getBlogPosts`/`getBlogPost`/`getBlogCategories` (Task 3), `markdownHeadings` (Task 1), `BlogPostData`.

- [ ] **Step 1 — deps.** `npm install react-markdown remark-gfm`. Confirm they resolve + the build still works.

- [ ] **Step 2 — `src/components/blog/markdown.tsx`** — themed markdown renderer, reusing `headingId` from `blog-body.tsx` so the TOC anchors match:
```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { headingId } from "@/components/blog/blog-body";

/** Render post markdown with the article's prose styling. Safe (react-markdown,
 *  no raw HTML). h2s get stable ids for the table-of-contents anchors. */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="mt-8 space-y-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => <h2 id={headingId(String(children))} className="scroll-mt-32 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">{children}</h2>,
          h3: ({ children }) => <h3 className="font-display text-lg font-bold text-ink">{children}</h3>,
          p: ({ children }) => <p className="break-words leading-relaxed text-ink-muted">{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-2 pl-5 text-ink-muted marker:text-neem">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-2 pl-5 text-ink-muted marker:text-neem">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ href, children }) => <a href={href} className="text-neem-deep underline underline-offset-2 hover:text-neem" target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}>{children}</a>,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-neem/40 pl-4 italic text-ink-muted">{children}</blockquote>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 3 — switch the components to `BlogPostData` + markdown.** READ each file first, then:
  - `blog-post-view.tsx`: change the prop type `post: BlogPost` → `post: BlogPostData`; replace `const headings = post.body.flatMap(...)` with `const headings = markdownHeadings(post.bodyMarkdown)` (import from `@/lib/blog/markdown-headings`); replace `<BlogBody blocks={post.body} />` with `<Markdown source={post.bodyMarkdown} />` (import the new component). Everything else (title/author/dateISO/cover/TOC list) is unchanged (same field names).
  - `blog-card.tsx` + `featured-section.tsx`: change `BlogPost` → `BlogPostData` (they use only shared fields — no body — so it's a type swap).
  - `blog-view.tsx`: stop importing mock `blogPosts`/`blogCategories`; accept them as props `{ posts: BlogPostData[]; categories: BlogCategory[] }` and thread through to its children (FeaturedSection/BlogCard/toolbar). Keep `categoryName` lookups working off the `categories` prop.
  - Keep `blog-body.tsx` (still exports `headingId`); it's no longer the render path but `headingId` is reused.

- [ ] **Step 4 — storefront pages.**
  - `src/app/blog/page.tsx`: make it async; `const [posts, categories] = await Promise.all([getBlogPosts(), getBlogCategories()])`; render `<BlogView posts={posts} categories={categories} />`.
  - `src/app/blog/[slug]/page.tsx`: `generateStaticParams` → `(await getBlogPosts()).map((p) => ({ slug: p.slug }))`; `generateMetadata` + the page → `await getBlogPost(slug)` (instead of `blogPostBySlug`); `notFound()` when undefined (a draft/unknown slug 404s); keep the JSON-LD (fields `title`/`excerpt`/`dateISO`/`author`/`coverImage` all still exist on `BlogPostData`). Drop the now-unused mock imports.

- [ ] **Step 5 — verify.** `npx tsc --noEmit && npx vitest run && npm run build`. After the migration + seed (controller), live-check: `/blog` hub + a post render from the DB with markdown correct; a draft slug 404s. Commit `feat(blog): storefront reads posts from DB + renders markdown`.

---

## Task 5: Admin blog CRUD — actions, list, form, pages, sidebar

**Files:** Modify `src/lib/admin/actions.ts`, `src/components/admin/admin-sidebar.tsx`. Create `src/app/admin/blog/page.tsx`, `src/app/admin/blog/new/page.tsx`, `src/app/admin/blog/[slug]/edit/page.tsx`, `src/components/admin/blog-posts-table.tsx`, `src/components/admin/blog-post-form.tsx`.

**Interfaces:** Consumes `getAdminBlogPosts`/`getAdminBlogPostBySlug` (Task 3), `getBlogCategories` (Task 3), the new actions, `Markdown` (Task 4), the `product-images` upload path.

- [ ] **Step 1 — actions in `actions.ts`.** Add (reuse `getIsAdmin`, `createAdminSupabase`, `SLUG_RE`, `putProductImage`/`uploadImageToBucket`, `ActionResult`, `revalidateTag`/`revalidatePath`). A `BlogPostInput = { title; excerpt; bodyMarkdown; category; author; coverImage?; coverTone?; coverLabel?; featured; published }`:
```ts
function revalidateBlog(slug: string): void {
  revalidateTag("blog", "max");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/blog");
}

export async function createBlogPost(input: { slug: string } & BlogPostInput): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const slug = input.slug.trim().toLowerCase();
  if (!SLUG_RE.test(slug)) return { ok: false, error: "Slug must be lowercase letters, numbers and single dashes." };
  if (input.title.trim() === "") return { ok: false, error: "Title is required." };
  const db = createAdminSupabase();
  const { data: existing } = await db.from("blog_posts").select("slug").eq("slug", slug).maybeSingle();
  if (existing) return { ok: false, error: `A post with slug "${slug}" already exists.` };
  const { error } = await db.from("blog_posts").insert({
    slug, title: input.title.trim(), excerpt: input.excerpt.trim(), body: input.bodyMarkdown,
    author: input.author.trim(), category: input.category || null, cover_image: input.coverImage ?? null,
    cover_tone: input.coverTone ?? "cream", cover_label: input.coverLabel ?? input.title.trim(),
    featured: input.featured, published: input.published,
    date_iso: new Date().toISOString().slice(0, 10),
  } as never);
  if (error) return { ok: false, error: error.message };
  revalidateBlog(slug);
  return { ok: true };
}

export async function updateBlogPost(slug: string, patch: Partial<BlogPostInput>): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) { if (patch.title.trim() === "") return { ok: false, error: "Title is required." }; update.title = patch.title.trim(); }
  if (patch.excerpt !== undefined) update.excerpt = patch.excerpt.trim();
  if (patch.bodyMarkdown !== undefined) update.body = patch.bodyMarkdown;
  if (patch.author !== undefined) update.author = patch.author.trim();
  if (patch.category !== undefined) update.category = patch.category || null;
  if (patch.coverImage !== undefined) update.cover_image = patch.coverImage;
  if (patch.featured !== undefined) update.featured = patch.featured;
  if (patch.published !== undefined) update.published = patch.published;
  if (Object.keys(update).length === 0) return { ok: true };
  const db = createAdminSupabase();
  const { data, error } = await db.from("blog_posts").update(update as never).eq("slug", slug).select("slug").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Post not found." };
  revalidateBlog(slug);
  return { ok: true };
}

export async function deleteBlogPost(slug: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { error } = await db.from("blog_posts").delete().eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateBlog(slug);
  return { ok: true };
}
```
Define `type BlogPostInput = { title: string; excerpt: string; bodyMarkdown: string; category: string; author: string; coverImage?: string | null; coverTone?: string; coverLabel?: string; featured: boolean; published: boolean };` near these. For the cover upload, add an `uploadBlogCover(slug, formData)` that reuses `uploadImageToBucket` and returns the URL (the form then passes it as `coverImage` to create/update) — mirror `uploadProductImage` but WITHOUT writing a product column.

- [ ] **Step 2 — sidebar.** In `admin-sidebar.tsx`, remove `disabled: true` from **Blog** (now nothing is disabled).

- [ ] **Step 3 — list page + table.** `src/app/admin/blog/page.tsx` (server): `getAdminBlogPosts()` → `<BlogPostsTable items={…} />` + a "New post" link to `/admin/blog/new`. `src/components/admin/blog-posts-table.tsx` (client): a searchable table (title→edit link, category, author, date, a Published/Draft badge, Featured mark) with a Delete control per row calling `deleteBlogPost` (confirm + toast + `router.refresh()`).

- [ ] **Step 4 — form + new/edit pages.** `src/components/admin/blog-post-form.tsx` (client, shared by new + edit): fields — title, slug (create-only; read-only on edit), excerpt, category `Select` (from `getBlogCategories`, passed as a prop), author, a **markdown `<textarea>` with a live `<Markdown source={body}>` preview** side-by-side (or a Write/Preview toggle), cover image upload (calls `uploadBlogCover`, shows the returned URL/thumbnail), a **Featured** toggle, and a **Published** toggle (draft vs published). On submit: create calls `createBlogPost`, edit calls `updateBlogPost`; toast + redirect to `/admin/blog` (create) or `router.refresh()` (edit). `new/page.tsx` (server): passes `categories={await getBlogCategories()}`. `[slug]/edit/page.tsx` (server): `getAdminBlogPostBySlug(slug)` (`notFound()` if null) + categories → the form in edit mode.

- [ ] **Step 5 — verify (drive it, controller, real admin session; migration + seed applied).** `npx tsc --noEmit && npx vitest run && npm run build`. Live: create a **published** post (with markdown + cover) → appears on `/blog` + its slug renders (markdown); create a **draft** → NOT on `/blog`, slug 404s; edit a title/body → reflects; toggle featured; delete → gone; non-admin rejected on pages + actions. Clean up test posts. Commit `feat(admin): blog CRUD — list + markdown post form + actions + sidebar`.

---

## Final verification

- [ ] `npx vitest run` green; `npx tsc --noEmit && npm run build` clean; storefront static/ISR intact where it was (blog pages become dynamic/ISR reading the DB — acceptable; confirm no crash).
- [ ] End-to-end (migration + seed applied, real admin session): seeded posts render on `/blog`; admin create/edit/delete + draft/publish reflect; markdown renders safely; drafts hidden + 404; cover upload works; non-admin rejected.
- [ ] PR to `master`; set the 5 per-branch Supabase preview env vars for this branch if the preview build reports `supabaseUrl is required`, then redeploy (as prior slices).

## Self-Review (done during authoring)

- **Spec coverage:** pure block→markdown + headings + type → T1; migration (alter existing table) + seed → T2; read layer + admin queries → T3; markdown render + storefront switch → T4; admin CRUD + form + sidebar → T5. SEO (3b) + tags/schedule/rich (3c) deferred; blog-category CRUD deferred.
- **Existing-table reconciliation** (blog_posts already in 0001; `published` boolean; `category` text; body jsonb→text) is called out in Global Constraints + T2, so the migration ALTERs rather than creates.
- **Placeholder scan:** none — real code/commands. The component-swap steps (T4 Step 3) name each file + the exact change; implementer reads then adapts.
- **Type consistency:** `blockToMarkdown(blocks)`, `markdownHeadings(md)`, `BlogPostData{…,bodyMarkdown}`, `getBlogPosts/getBlogPost/getBlogCategories`, `getAdminBlogPosts/getAdminBlogPostBySlug`→`AdminBlogListItem`/`AdminBlogPost`, `createBlogPost/updateBlogPost/deleteBlogPost`, `BlogPostInput` — consistent across tasks.
