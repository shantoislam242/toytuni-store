# Blog 3c (extras) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The remaining blog features — tags (hub filter + post chips), scheduled publish (Draft/Scheduled/Published), blog-category admin CRUD, and an in-editor image-insert button.

**Architecture:** Pure `isPostLive`/`postStatus` + a blog-category validator; `tags`/`scheduled_at` thread through the schema/types/reads/writes and the storefront query+RLS reveal scheduled posts; a `blog-category-manager` (mirrors the product `TaxonomyManager`) + new actions; the editor gains a tags editor, a schedule control, and an insert-image button.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Supabase, shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-19-admin-blog-extras-design.md`

## Global Constraints

- **Non-standard Next.js.** Read `node_modules/next/dist/docs/` before server actions / `revalidateTag`. Middleware is `src/proxy.ts`.
- **Scheduled reveal is cron-less** — the storefront query (`published = true OR scheduled_at <= now`) + the RLS policy (same) reveal a scheduled post on the next `unstable_cache` revalidation (≤ 1h) or any admin write (`revalidateTag('blog')`). `published` is never auto-flipped; "live" is computed. `isPostLive`/`postStatus` take `now` as a param (pure/testable).
- **Defense in depth:** storefront reads filter live posts in the QUERY and the RLS policy enforces the same — a future scheduled post never leaks.
- Migration ALTERs; new columns absent from generated types → `as never` writes / `.overrideTypes()` reads. Admin writes keep `getIsAdmin()` + service-role + `revalidateTag('blog')`. Blog-category delete blocks when posts reference it. `.env.local`/`.superpowers/` gitignored — stage explicit paths.

## Manual step

After Task 2, apply `supabase/migrations/0010_blog_extras.sql` in the Supabase SQL editor (no re-seed). Unit tests + build don't require it.

## File structure

- Create `src/lib/blog/post-live.ts` (+ `.test.ts`), `src/lib/admin/blog-taxonomy.ts` (+ `.test.ts`).
- Create `supabase/migrations/0010_blog_extras.sql`.
- Modify `src/lib/types.ts`, `src/lib/data/blog.ts`, `src/lib/admin/queries.ts`, `src/lib/admin/actions.ts`.
- Create `src/app/admin/blog/categories/page.tsx`, `src/components/admin/blog-category-manager.tsx`; modify `src/app/admin/blog/page.tsx` (link).
- Modify `src/components/admin/blog-post-form.tsx`, `src/components/blog/blog-post-view.tsx`, `src/components/blog/blog-view.tsx` (+ its toolbar for a tag filter).

---

## Task 1: Pure `isPostLive`/`postStatus` + blog-category validator (TDD)

**Files:** Create `src/lib/blog/post-live.ts` (+ `.test.ts`), `src/lib/admin/blog-taxonomy.ts` (+ `.test.ts`).

**Interfaces:** Produces `isPostLive`, `postStatus`, `PostStatus`; `validateBlogCategory`, re-export `isPermutation`.

- [ ] **Step 1 — failing tests.**

`src/lib/blog/post-live.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isPostLive, postStatus } from "./post-live";

const NOW = new Date("2026-07-19T12:00:00Z");
describe("isPostLive / postStatus", () => {
  it("published → live/published", () => {
    expect(isPostLive({ published: true, scheduledAt: null, now: NOW })).toBe(true);
    expect(postStatus({ published: true, scheduledAt: null, now: NOW })).toBe("published");
  });
  it("future schedule → not live / scheduled", () => {
    expect(isPostLive({ published: false, scheduledAt: "2026-08-01T00:00:00Z", now: NOW })).toBe(false);
    expect(postStatus({ published: false, scheduledAt: "2026-08-01T00:00:00Z", now: NOW })).toBe("scheduled");
  });
  it("past schedule → live / published", () => {
    expect(isPostLive({ published: false, scheduledAt: "2026-07-01T00:00:00Z", now: NOW })).toBe(true);
    expect(postStatus({ published: false, scheduledAt: "2026-07-01T00:00:00Z", now: NOW })).toBe("published");
  });
  it("no schedule, not published → draft/not-live", () => {
    expect(isPostLive({ published: false, scheduledAt: null, now: NOW })).toBe(false);
    expect(postStatus({ published: false, scheduledAt: null, now: NOW })).toBe("draft");
  });
});
```

`src/lib/admin/blog-taxonomy.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validateBlogCategory } from "./blog-taxonomy";

describe("validateBlogCategory", () => {
  it("accepts a valid create", () => expect(validateBlogCategory({ slug: "play", name: "Play", sort: 0 }, { requireSlug: true })).toEqual({ ok: true }));
  it("rejects bad slug / empty name / negative sort", () => {
    expect(validateBlogCategory({ slug: "Bad Slug", name: "P", sort: 0 }, { requireSlug: true }).ok).toBe(false);
    expect(validateBlogCategory({ name: " ", sort: 0 }, { requireSlug: false }).ok).toBe(false);
    expect(validateBlogCategory({ name: "P", sort: -1 }, { requireSlug: false }).ok).toBe(false);
  });
  it("skips slug check on edit", () => expect(validateBlogCategory({ name: "P", sort: 1 }, { requireSlug: false })).toEqual({ ok: true }));
});
```

- [ ] **Step 2 — run → FAIL.** `npx vitest run src/lib/blog/post-live.test.ts src/lib/admin/blog-taxonomy.test.ts`

- [ ] **Step 3 — implement.**

`src/lib/blog/post-live.ts`:
```ts
export type PostStatus = "draft" | "scheduled" | "published";

type Input = { published: boolean; scheduledAt: string | null; now: Date };

/** A post is live when it's published, or its schedule time has passed. Pure. */
export function isPostLive({ published, scheduledAt, now }: Input): boolean {
  if (published) return true;
  if (scheduledAt) return new Date(scheduledAt).getTime() <= now.getTime();
  return false;
}

/** Admin status badge. Pure. */
export function postStatus(input: Input): PostStatus {
  if (isPostLive(input)) return "published";
  return input.scheduledAt ? "scheduled" : "draft";
}
```

`src/lib/admin/blog-taxonomy.ts`:
```ts
export { isPermutation } from "@/lib/admin/taxonomy";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validate a blog-category create/edit input (slug immutable on edit). Pure. */
export function validateBlogCategory(
  input: { slug?: string; name: string; sort: number },
  opts: { requireSlug: boolean },
): { ok: true } | { ok: false; error: string } {
  if (opts.requireSlug && (!input.slug || !SLUG_RE.test(input.slug))) {
    return { ok: false, error: "Slug must be lowercase letters, numbers and single dashes." };
  }
  if (input.name.trim() === "") return { ok: false, error: "Name is required." };
  if (!Number.isInteger(input.sort) || input.sort < 0) return { ok: false, error: "Sort must be a non-negative whole number." };
  return { ok: true };
}
```

- [ ] **Step 4 — run → PASS**, `npx tsc --noEmit`. Commit `feat(blog): isPostLive/postStatus + blog-category validator (TDD)`.

---

## Task 2: Migration 0010

**Files:** Create `supabase/migrations/0010_blog_extras.sql`.

- [ ] **Step 1 — migration:**
```sql
-- Blog 3c: tags + scheduled publish. Reveal a scheduled post via the RLS policy
-- once its time passes (cron-less; also enforced in the app query).
alter table blog_posts add column if not exists tags text[];
alter table blog_posts add column if not exists scheduled_at timestamptz;

drop policy if exists "read published posts" on blog_posts;
create policy "read published posts" on blog_posts
  for select using (published = true or (scheduled_at is not null and scheduled_at <= now()));
```

- [ ] **Step 2 — verify + commit.** (No code compiles against this yet.) Commit `feat(blog): migration 0010 (tags, scheduled_at, scheduled-read RLS)`.

---

## Task 3: Tags + scheduled through types / reads / writes

**Files:** Modify `src/lib/types.ts`, `src/lib/data/blog.ts`, `src/lib/admin/queries.ts`, `src/lib/admin/actions.ts`.

- [ ] **Step 1 — types.** `BlogPostData` gains `tags: string[]`. `AdminBlogPost` gains `tags: string[]; scheduledAt: string | null;` (it already has `published: boolean`). `BlogPostInput` gains `tags?: string[]; scheduledAt?: string | null;`.

- [ ] **Step 2 — storefront reads** (`src/lib/data/blog.ts`): add `tags`, `scheduled_at` to `BlogRow` + the `.select(...)` string; change the filter from `.eq("published", true)` to reveal scheduled posts:
```ts
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("… , tags, scheduled_at")
      .or(`published.eq.true,scheduled_at.lte.${nowIso}`)
      .order("date_iso", { ascending: false })
      .overrideTypes<BlogRow[], { merge: false }>();
```
(`nowIso` is captured at cache-populate time — the documented ≤1h reveal.) `rowToPost` sets `tags: r.tags ?? []`. `mockToData` sets `tags: []`.

- [ ] **Step 3 — admin reads** (`queries.ts`): `getAdminBlogPostBySlug` select + row + mapping gain `tags` + `scheduled_at` (→ `tags`, `scheduledAt`); `getAdminBlogPosts` (the list) gains `scheduled_at` (+ `published`, already there) so the list can show the status; extend `AdminBlogListItem` with `scheduledAt: string | null` (it already has `published`).

- [ ] **Step 4 — writes** (`actions.ts`): `createBlogPost` insert + `updateBlogPost` patch write `tags` (sanitized: trim, drop empties, dedupe) + `scheduled_at` (empty → null). Add a `cleanTags(tags?: string[]): string[]` helper (`[...new Set((tags ?? []).map((t) => t.trim()).filter(Boolean))]`). In `updateBlogPost`, add `tags`/`scheduled_at` to the patch when provided.

- [ ] **Step 5 — verify + commit.** `npx tsc --noEmit && npx vitest run && npm run build`. Commit `feat(blog): tags + scheduled_at through reads/writes (query reveals scheduled)`.

---

## Task 4: Blog-category admin CRUD

**Files:** Modify `src/lib/admin/queries.ts`, `src/lib/admin/actions.ts`, `src/app/admin/blog/page.tsx`. Create `src/app/admin/blog/categories/page.tsx`, `src/components/admin/blog-category-manager.tsx`.

**Interfaces:** Consumes `validateBlogCategory`/`isPermutation` (Task 1), `moveInArray`.

- [ ] **Step 1 — query** (`queries.ts`): `getAdminBlogCategories(): Promise<{ slug: string; name: string; sort: number; postCount: number }[]>` — read `blog_categories` (ordered by sort) + per-category count of `blog_posts` where `category = slug`. Type `AdminBlogCategory`.

- [ ] **Step 2 — actions** (`actions.ts`), each admin-gated + service-role + `revalidateTag('blog')` (+ `revalidatePath('/blog', '/admin/blog/categories')`):
```ts
export async function createBlogCategory(input: { slug: string; name: string; sort: number }): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const slug = input.slug.trim().toLowerCase();
  const v = validateBlogCategory({ slug, name: input.name, sort: input.sort }, { requireSlug: true });
  if (!v.ok) return v;
  const db = createAdminSupabase();
  const { data: existing } = await db.from("blog_categories" as never).select("slug").eq("slug", slug).maybeSingle();
  if (existing) return { ok: false, error: `"${slug}" already exists.` };
  const { error } = await db.from("blog_categories" as never).insert({ slug, name: input.name.trim(), sort: input.sort } as never);
  if (error) return { ok: false, error: error.message };
  revalidateBlogTaxonomy();
  return { ok: true };
}
// updateBlogCategory(slug, {name, sort}) — never writes slug.
// deleteBlogCategory(slug) — count blog_posts where category=slug; if >0 → block "N post(s) use this — reassign first."; else delete.
// reorderBlogCategories(slugs) — isPermutation guard vs current; persist sort=index.
```
Add a `revalidateBlogTaxonomy()` helper (`revalidateTag('blog','max')` + the paths). Model `deleteBlogCategory`'s count on the product `deleteTaxonomy` (but query `blog_posts` with `.eq("category", slug)`).

- [ ] **Step 3 — page + manager.** `src/app/admin/blog/categories/page.tsx` (server) → `getAdminBlogCategories()` → `<BlogCategoryManager items={…} />`. `src/components/admin/blog-category-manager.tsx` (client): mirror `taxonomy-manager.tsx` (table: name, slug, post count; per-row edit/↑/↓/delete; Add button; add/edit modal with slug (create-only) + name + sort) — but bound to the blog-category actions + NO tone field. Reuse `moveInArray`; delete surfaces the block message.

- [ ] **Step 4 — link.** In `src/app/admin/blog/page.tsx`, add a "Manage categories" link to `/admin/blog/categories` next to the "New post" button.

- [ ] **Step 5 — verify + commit.** `npx tsc --noEmit && npx vitest run && npm run build`. Commit `feat(admin): blog-category CRUD (manager + actions + delete-block)`.

---

## Task 5: Editor tags/schedule/insert-image + storefront tag chips/filter

**Files:** Modify `src/components/admin/blog-post-form.tsx`, `src/components/blog/blog-post-view.tsx`, `src/components/blog/blog-view.tsx` (+ its toolbar component for the tag filter).

**Interfaces:** Consumes `StringListEditor`, `postStatus`, `uploadBlogCover`, the `tags`/`scheduledAt` fields.

- [ ] **Step 1 — editor** (`blog-post-form.tsx`). READ the file. Add state `tags` (from `post?.tags ?? []`) + `scheduledAt` (from `post?.scheduledAt ?? ""`). Add to the form:
  - a **Tags** field: `<StringListEditor label="Tags" value={tags} onChange={setTags} addLabel="Add tag" />`.
  - a **Schedule** control (in the publish card): a `datetime-local` `Input` bound to `scheduledAt`, with a note "Set a future time to schedule; the post goes live then." Show the derived status via `postStatus({ published, scheduledAt: scheduledAt || null, now: new Date() })` as a small label.
  - an **Insert image** button beside the markdown textarea: a hidden file input → on change, `uploadBlogCover(slug, formData)` → on success insert `![](${url})` into `body` at the textarea's caret (use a `textareaRef`; splice at `selectionStart`), toast. Reuse the existing cover-upload pattern for the call.
  Include `tags` + `scheduledAt: scheduledAt.trim() === "" ? null : new Date(scheduledAt).toISOString()` in BOTH the `createBlogPost` + `updateBlogPost` call objects.

- [ ] **Step 2 — post view** (`blog-post-view.tsx`): render `post.tags` as chips below the meta row (only when non-empty) — small pill styling (`rounded-full bg-cream-100 px-2.5 py-0.5 text-xs text-ink-muted`).

- [ ] **Step 3 — hub tag filter** (`blog-view.tsx` + its toolbar). Add a `tag` state (default `null`); compute the tag union `allTags = [...new Set(posts.flatMap((p) => p.tags))]`; render a chip row of tags (single-select toggle) alongside the category filter; extend `filtered` to also require `tag === null || p.tags.includes(tag)`. Reset page on tag change (mirror the existing `changeFilter`).

- [ ] **Step 4 — verify + commit.** `npx tsc --noEmit && npx vitest run && npm run build`. Live (controller, real admin session, after migration): add tags to a post → chips on the post + the hub tag filter narrows; set a future schedule → hidden on the storefront + "Scheduled" in admin; a past schedule (or published) → live; insert an image in the editor → markdown appears + renders; manage blog categories (add/edit/delete-blocked/reorder). Commit `feat(blog): editor tags/schedule/insert-image + storefront tag chips & filter`.

---

## Final verification

- [ ] `npx vitest run` green; `npx tsc --noEmit && npm run build` clean.
- [ ] End-to-end (migration applied, real admin session): blog-category CRUD (delete blocked when referenced); tags → post chips + hub filter; scheduled post hidden until its time (query + RLS), then live; image insert works; non-admin rejected.
- [ ] PR to `master`; set the 5 per-branch Supabase preview env vars if the preview build reports `supabaseUrl is required`, then redeploy. **Apply migration 0010 before merging** (release gate — the scheduled-read RLS + `tags`/`scheduled_at` columns; else the storefront query on the new columns falls back to mock + admin blog reads error).

## Self-Review (done during authoring)

- **Spec coverage:** pure live/status + category validator → T1; migration → T2; tags/scheduled threading → T3; blog-category CRUD → T4; editor + storefront tags/schedule/image → T5. Related posts already done (3a); no tag pages / rename UI (non-goals).
- **Placeholder scan:** none — real code/commands; the manager (T4) + editor (T5) name each change + the pattern to mirror.
- **Type consistency:** `isPostLive`/`postStatus({published,scheduledAt,now})`, `PostStatus`, `validateBlogCategory`, `BlogPostData.tags`, `AdminBlogPost.{tags,scheduledAt}`, `BlogPostInput.{tags,scheduledAt}`, `getAdminBlogCategories`/`AdminBlogCategory`, `createBlogCategory`/`updateBlogCategory`/`deleteBlogCategory`/`reorderBlogCategories` — consistent across tasks.
- **Scheduled defense-in-depth** (query + RLS) + cron-less reveal caveat are the load-bearing points — in Global Constraints + T2/T3.
