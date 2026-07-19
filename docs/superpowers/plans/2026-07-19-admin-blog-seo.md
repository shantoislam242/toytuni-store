# Blog 3b (SEO analysis) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Yoast-style SEO experience for blog posts — focus keyword / SEO title / meta description / OG image, two pure live analyzers (SEO + Readability) with traffic-light scores + checklists in the editor, and storefront metadata driven by the SEO fields.

**Architecture:** A shared `scoreChecks` maps a `Check[]` → score/rating; `analyzeSeo` + `analyzeReadability` (pure, TDD) produce the checks; the editor recomputes both client-side and renders `SeoPanel`/`ReadabilityPanel` + a `SnippetPreview`; the four SEO fields thread through the schema/types/actions and the post's `generateMetadata`.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Supabase, shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-19-admin-blog-seo-design.md`

## Global Constraints

- **Non-standard Next.js.** Read `node_modules/next/dist/docs/` before server actions / metadata. Middleware is `src/proxy.ts`.
- **Analyzers are pure + total** — never throw on empty/odd input; deterministic; no DOM/markdown-lib (plain string analysis on the markdown source). Reuse `markdownHeadings` (`@/lib/blog/markdown-headings`) for subheadings. English heuristics (documented as a guide, not a grader).
- **Score not persisted** — computed live in the editor. Only the four SEO fields are stored.
- Migration `0009` adds nullable `focus_keyword`/`seo_title`/`meta_description`/`og_image`; new columns absent from generated types → `as never` writes / `.overrideTypes()` reads. Admin writes keep `getIsAdmin()` + service-role + `revalidateTag('blog')`.
- Storefront `<title>` = `seoTitle ?? title`; description = `metaDescription ?? excerpt`; OG image = `ogImage ?? coverImage`. `.env.local`/`.superpowers/` gitignored — stage explicit paths.

## Manual step

After Task 4, apply `supabase/migrations/0009_blog_seo.sql` in the Supabase SQL editor (no re-seed needed). Unit tests + build don't require it (fail-soft/null fields).

## File structure

- Create `src/lib/blog/analysis.ts` (+ `.test.ts`) — `Check`/`AnalysisResult` types + `scoreChecks`.
- Create `src/lib/blog/seo-analysis.ts` (+ `.test.ts`), `src/lib/blog/readability-analysis.ts` (+ `.test.ts`).
- Create `supabase/migrations/0009_blog_seo.sql`.
- Modify `src/lib/types.ts`, `src/lib/data/blog.ts`, `src/lib/admin/queries.ts`, `src/lib/admin/actions.ts`, `src/app/blog/[slug]/page.tsx`.
- Create `src/components/admin/seo-panel.tsx`, `src/components/admin/snippet-preview.tsx`; modify `src/components/admin/blog-post-form.tsx`.

---

## Task 1: Shared `scoreChecks` + analysis types (TDD)

**Files:** Create `src/lib/blog/analysis.ts`, `src/lib/blog/analysis.test.ts`.

**Interfaces:** Produces `CheckStatus`, `Check`, `AnalysisResult`; `scoreChecks(checks): { score, rating }`.

- [ ] **Step 1 — failing test** `src/lib/blog/analysis.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { scoreChecks, type Check } from "./analysis";

const c = (status: Check["status"]): Check => ({ id: "x", status, text: "" });

describe("scoreChecks", () => {
  it("all good → 100/good", () => expect(scoreChecks([c("good"), c("good")])).toEqual({ score: 100, rating: "good" }));
  it("all bad → 0/bad", () => expect(scoreChecks([c("bad"), c("bad")])).toEqual({ score: 0, rating: "bad" }));
  it("empty → 0/bad", () => expect(scoreChecks([])).toEqual({ score: 0, rating: "bad" }));
  it("weights ok as half; buckets by threshold", () => {
    expect(scoreChecks([c("good"), c("ok"), c("bad"), c("good")])).toEqual({ score: 63, rating: "ok" }); // (1+.5+0+1)/4=.625→63
  });
});
```

- [ ] **Step 2 — run → FAIL.** `npx vitest run src/lib/blog/analysis.test.ts`

- [ ] **Step 3 — implement `src/lib/blog/analysis.ts`:**
```ts
export type CheckStatus = "good" | "ok" | "bad";
export type Check = { id: string; status: CheckStatus; text: string };
export type AnalysisResult = { score: number; rating: CheckStatus; checks: Check[] };

const WEIGHT: Record<CheckStatus, number> = { good: 1, ok: 0.5, bad: 0 };

/** Weighted average of check statuses → a 0–100 score + a rating bucket
 *  (good ≥ 70, ok ≥ 40, else bad). Empty → 0/bad. Pure. */
export function scoreChecks(checks: Check[]): { score: number; rating: CheckStatus } {
  if (checks.length === 0) return { score: 0, rating: "bad" };
  const avg = checks.reduce((s, ch) => s + WEIGHT[ch.status], 0) / checks.length;
  const score = Math.round(avg * 100);
  const rating: CheckStatus = score >= 70 ? "good" : score >= 40 ? "ok" : "bad";
  return { score, rating };
}
```

- [ ] **Step 4 — run → PASS**, `npx tsc --noEmit`. Commit `feat(blog): analysis score + check types (TDD)`.

---

## Task 2: `analyzeSeo` (pure, TDD)

**Files:** Create `src/lib/blog/seo-analysis.ts`, `src/lib/blog/seo-analysis.test.ts`.

**Interfaces:** Consumes `scoreChecks`/types (Task 1) + `markdownHeadings`. Produces `SeoInput`, `analyzeSeo(input): AnalysisResult`.

- [ ] **Step 1 — failing test** (representative cases) `src/lib/blog/seo-analysis.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { analyzeSeo } from "./seo-analysis";

const base = {
  title: "Best neem wood toys for babies",
  seoTitle: "Best neem wood toys for babies — safe & natural",
  metaDescription: "Discover the best neem wood toys for babies: safe, non-toxic and natural picks for teething, grasping and screen-free play at home.",
  slug: "best-neem-wood-toys",
  focusKeyword: "neem wood toys",
  bodyMarkdown: "## Why neem wood toys\n\nNeem wood toys are a safe, natural choice for babies. " + "word ".repeat(320) + "\n\nRead our [safety guide](/blog/safety).\n\n![A neem wood toy](/x.png)",
  excerpt: "Safe, natural neem wood toys for babies.",
};

describe("analyzeSeo", () => {
  it("scores a well-optimised post as good", () => {
    const r = analyzeSeo(base);
    expect(r.rating).toBe("good");
    expect(r.checks.find((c) => c.id === "kw-title")?.status).toBe("good");
    expect(r.checks.find((c) => c.id === "content-length")?.status).toBe("good");
    expect(r.checks.find((c) => c.id === "img-alt")?.status).toBe("good");
  });
  it("flags a missing focus keyword", () => {
    const r = analyzeSeo({ ...base, focusKeyword: "" });
    expect(r.checks.find((c) => c.id === "keyword-set")?.status).toBe("bad");
  });
  it("flags keyword absent from the title", () => {
    expect(analyzeSeo({ ...base, seoTitle: "Something else", title: "Other" }).checks.find((c) => c.id === "kw-title")?.status).toBe("bad");
  });
  it("flags an image without alt text", () => {
    expect(analyzeSeo({ ...base, bodyMarkdown: base.bodyMarkdown + "\n\n![](/noalt.png)" }).checks.find((c) => c.id === "img-alt")?.status).toBe("bad");
  });
  it("flags thin content", () => {
    expect(analyzeSeo({ ...base, bodyMarkdown: "## Hi\n\nneem wood toys are short." }).checks.find((c) => c.id === "content-length")?.status).toBe("bad");
  });
});
```

- [ ] **Step 2 — run → FAIL.**

- [ ] **Step 3 — implement `src/lib/blog/seo-analysis.ts`:**
```ts
import { markdownHeadings } from "@/lib/blog/markdown-headings";
import { scoreChecks, type AnalysisResult, type Check } from "@/lib/blog/analysis";

export type SeoInput = {
  title: string; seoTitle: string; metaDescription: string; slug: string;
  focusKeyword: string; bodyMarkdown: string; excerpt: string;
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function countWords(s: string): number {
  const m = s.replace(/[#>*_\-`![\]()]/g, " ").trim().match(/\S+/g);
  return m ? m.length : 0;
}
function keywordCount(text: string, kw: string): number {
  if (kw === "") return 0;
  const m = text.toLowerCase().match(new RegExp(`\\b${esc(kw)}\\b`, "g"));
  return m ? m.length : 0;
}
function firstParagraph(md: string): string {
  return md.split(/\n\s*\n/).map((b) => b.trim()).find((b) => b !== "" && !b.startsWith("#")) ?? "";
}
function hasLink(md: string): boolean {
  return /(^|[^!])\[[^\]]+\]\([^)]+\)/.test(md);
}
function imagesMissingAlt(md: string): number {
  const imgs = md.match(/!\[[^\]]*\]\([^)]+\)/g) ?? [];
  return imgs.filter((i) => (i.match(/!\[([^\]]*)\]/)?.[1] ?? "").trim() === "").length;
}
const good = (id: string, text: string): Check => ({ id, status: "good", text });
const ok = (id: string, text: string): Check => ({ id, status: "ok", text });
const bad = (id: string, text: string): Check => ({ id, status: "bad", text });

/** Keyword-optimisation analysis (Yoast-style, heuristic). Pure + total. */
export function analyzeSeo(input: SeoInput): AnalysisResult {
  const kw = input.focusKeyword.trim().toLowerCase();
  const body = input.bodyMarkdown;
  const words = countWords(body);
  const seoTitle = input.seoTitle.trim() || input.title;
  const metaDesc = input.metaDescription.trim() || input.excerpt;
  const checks: Check[] = [];

  if (kw === "") {
    checks.push(bad("keyword-set", "Set a focus keyword to analyse SEO."));
  } else {
    checks.push(good("keyword-set", "Focus keyword is set."));
    checks.push(seoTitle.toLowerCase().includes(kw)
      ? good("kw-title", "Focus keyword appears in the SEO title.")
      : bad("kw-title", "Add the focus keyword to the SEO title."));
    checks.push(input.slug.toLowerCase().includes(kw.replace(/\s+/g, "-"))
      ? good("kw-slug", "Focus keyword appears in the slug.")
      : ok("kw-slug", "Consider adding the focus keyword to the slug."));
    checks.push(metaDesc.toLowerCase().includes(kw)
      ? good("kw-meta", "Focus keyword appears in the meta description.")
      : bad("kw-meta", "Add the focus keyword to the meta description."));
    checks.push(firstParagraph(body).toLowerCase().includes(kw)
      ? good("kw-first-para", "Focus keyword appears in the first paragraph.")
      : ok("kw-first-para", "Add the focus keyword to your first paragraph."));
    checks.push(markdownHeadings(body).join(" ").toLowerCase().includes(kw)
      ? good("kw-subheading", "Focus keyword appears in a subheading.")
      : ok("kw-subheading", "Add the focus keyword to a subheading."));
    const density = words > 0 ? (keywordCount(body, kw) / words) * 100 : 0;
    checks.push(density >= 0.5 && density <= 3
      ? good("kw-density", `Keyword density ${density.toFixed(1)}% is in the ideal range.`)
      : (density > 0 ? ok("kw-density", `Keyword density ${density.toFixed(1)}% (aim 0.5–3%).`)
                     : bad("kw-density", "Focus keyword doesn't appear in the content.")));
  }

  const stLen = seoTitle.length;
  checks.push(stLen >= 30 && stLen <= 60
    ? good("title-length", `SEO title length (${stLen}) is good.`)
    : ok("title-length", `SEO title is ${stLen} chars (aim 30–60).`));
  const mdLen = metaDesc.length;
  checks.push(mdLen >= 120 && mdLen <= 156
    ? good("meta-length", `Meta description length (${mdLen}) is good.`)
    : ok("meta-length", `Meta description is ${mdLen} chars (aim 120–156).`));
  checks.push(words >= 300
    ? good("content-length", `${words} words — good length.`)
    : (words >= 150 ? ok("content-length", `${words} words (aim ≥ 300).`)
                    : bad("content-length", `${words} words — too thin (aim ≥ 300).`)));
  checks.push(hasLink(body) ? good("has-link", "Content has at least one link.")
                            : ok("has-link", "Add an internal or external link."));
  const noAlt = imagesMissingAlt(body);
  checks.push(noAlt === 0 ? good("img-alt", "All images have alt text.")
                          : bad("img-alt", `${noAlt} image(s) missing alt text.`));

  return { ...scoreChecks(checks), checks };
}
```

- [ ] **Step 4 — run → PASS**, `npx tsc --noEmit`. Commit `feat(blog): analyzeSeo keyword-optimisation analysis (TDD)`.

---

## Task 3: `analyzeReadability` (pure, TDD)

**Files:** Create `src/lib/blog/readability-analysis.ts`, `src/lib/blog/readability-analysis.test.ts`.

**Interfaces:** Consumes `scoreChecks`/types (Task 1). Produces `analyzeReadability(bodyMarkdown): AnalysisResult`.

- [ ] **Step 1 — failing test** `src/lib/blog/readability-analysis.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { analyzeReadability } from "./readability-analysis";

describe("analyzeReadability", () => {
  it("rates simple short prose as readable", () => {
    const r = analyzeReadability("## Play ideas\n\nBabies love to play. Toys help them grow. However, keep it simple. Also, rotate toys often to keep it fresh.");
    expect(["good", "ok"]).toContain(r.rating);
    expect(r.checks.find((c) => c.id === "long-sentences")?.status).toBe("good");
  });
  it("flags long sentences", () => {
    const long = "This is a very long sentence that keeps going and going with many many words strung together well beyond twenty words to be sure it trips the long sentence check clearly. ".repeat(3);
    expect(analyzeReadability(long).checks.find((c) => c.id === "long-sentences")?.status).not.toBe("good");
  });
  it("detects passive voice", () => {
    const passive = "The toy was made by hand. The wood was sourced locally. The parts were sanded carefully. The set was tested thoroughly.";
    expect(analyzeReadability(passive).checks.find((c) => c.id === "passive")?.status).not.toBe("good");
  });
  it("never throws on empty", () => expect(() => analyzeReadability("")).not.toThrow());
});
```

- [ ] **Step 2 — run → FAIL.**

- [ ] **Step 3 — implement `src/lib/blog/readability-analysis.ts`:**
```ts
import { scoreChecks, type AnalysisResult, type Check } from "@/lib/blog/analysis";

/** Strip markdown to rough plain text for readability heuristics. */
function toPlain(md: string): string {
  return md
    .replace(/`[^`]*`/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, (m) => m.replace(/\]\([^)]*\)/, "").replace(/^\[/, ""))
    .replace(/^#{1,6}\s+/gm, "").replace(/[*_>#-]/g, " ").replace(/\s+/g, " ").trim();
}
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s !== "");
}
function words(text: string): string[] {
  return text.match(/[A-Za-z']+/g) ?? [];
}
function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const g = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, g ? g.length : 1);
}
function fleschReadingEase(text: string): number {
  const sents = sentences(text); const ws = words(text);
  if (sents.length === 0 || ws.length === 0) return 0;
  const syl = ws.reduce((s, w) => s + syllables(w), 0);
  return 206.835 - 1.015 * (ws.length / sents.length) - 84.6 * (syl / ws.length);
}
const PASSIVE = /\b(?:was|were|is|are|been|being|be)\b\s+(?:\w+ly\s+)?\w+(?:ed|en|t)\b/i;
const TRANSITIONS = ["however","also","therefore","because","for example","in addition","meanwhile","finally","first","then","next","moreover","furthermore","so","but","although","while","since","as a result","in short"];

const good = (id: string, text: string): Check => ({ id, status: "good", text });
const ok = (id: string, text: string): Check => ({ id, status: "ok", text });
const bad = (id: string, text: string): Check => ({ id, status: "bad", text });

/** Readability analysis (Yoast-style, heuristic, English). Pure + total. */
export function analyzeReadability(bodyMarkdown: string): AnalysisResult {
  const text = toPlain(bodyMarkdown);
  const sents = sentences(text);
  const checks: Check[] = [];

  const flesch = fleschReadingEase(text);
  checks.push(flesch >= 60 ? good("flesch", `Flesch reading ease ${Math.round(flesch)} — easy to read.`)
    : flesch >= 30 ? ok("flesch", `Flesch reading ease ${Math.round(flesch)} (aim ≥ 60).`)
    : bad("flesch", `Flesch reading ease ${Math.round(flesch)} — hard to read.`));

  const longPct = sents.length ? (sents.filter((s) => words(s).length > 20).length / sents.length) * 100 : 0;
  checks.push(longPct < 25 ? good("long-sentences", `${Math.round(longPct)}% long sentences — good.`)
    : longPct < 40 ? ok("long-sentences", `${Math.round(longPct)}% of sentences are long (>20 words).`)
    : bad("long-sentences", `${Math.round(longPct)}% of sentences are long — shorten them.`));

  const passivePct = sents.length ? (sents.filter((s) => PASSIVE.test(s)).length / sents.length) * 100 : 0;
  checks.push(passivePct < 10 ? good("passive", `${Math.round(passivePct)}% passive voice — good.`)
    : passivePct < 20 ? ok("passive", `${Math.round(passivePct)}% passive voice (aim < 10%).`)
    : bad("passive", `${Math.round(passivePct)}% passive voice — use more active voice.`));

  const transPct = sents.length ? (sents.filter((s) => TRANSITIONS.some((t) => s.toLowerCase().includes(t))).length / sents.length) * 100 : 0;
  checks.push(transPct >= 30 ? good("transitions", `${Math.round(transPct)}% of sentences use transition words — good.`)
    : transPct >= 20 ? ok("transitions", `${Math.round(transPct)}% transition words (aim ≥ 30%).`)
    : bad("transitions", `${Math.round(transPct)}% transition words — add more to connect ideas.`));

  const paras = bodyMarkdown.split(/\n\s*\n/).map((p) => words(toPlain(p)).length);
  const longestPara = paras.length ? Math.max(...paras) : 0;
  checks.push(longestPara <= 150 ? good("paragraphs", "Paragraph lengths are good.")
    : ok("paragraphs", `A paragraph has ${longestPara} words — consider splitting (aim ≤ 150).`));

  return { ...scoreChecks(checks), checks };
}
```

- [ ] **Step 4 — run → PASS** (adjust the heuristic constants only if a representative test reveals an off-by-threshold — do NOT weaken the tests to pass), `npx tsc --noEmit`. Commit `feat(blog): analyzeReadability heuristic analysis (TDD)`.

---

## Task 4: Migration 0009 + SEO fields through schema/types/actions/storefront

**Files:** Create `supabase/migrations/0009_blog_seo.sql`. Modify `src/lib/types.ts`, `src/lib/data/blog.ts`, `src/lib/admin/queries.ts`, `src/lib/admin/actions.ts`, `src/app/blog/[slug]/page.tsx`.

- [ ] **Step 1 — migration** `supabase/migrations/0009_blog_seo.sql`:
```sql
-- Blog 3b: per-post SEO fields (focus keyword drives the editor's live score;
-- seo_title/meta_description/og_image override the storefront metadata).
alter table blog_posts add column if not exists focus_keyword text;
alter table blog_posts add column if not exists seo_title text;
alter table blog_posts add column if not exists meta_description text;
alter table blog_posts add column if not exists og_image text;
```

- [ ] **Step 2 — types.** `BlogPostData` (`src/lib/types.ts`) + `AdminBlogPost` (`src/lib/admin/queries.ts`) gain `seoTitle: string | null; metaDescription: string | null; ogImage: string | null; focusKeyword: string | null;`. `BlogPostInput` (`src/lib/admin/actions.ts`) gains `focusKeyword?: string | null; seoTitle?: string | null; metaDescription?: string | null; ogImage?: string | null;`.

- [ ] **Step 3 — reads.** `rowToPost` (`src/lib/data/blog.ts`): add the 4 fields (`seoTitle: r.seo_title ?? null`, etc.); extend `BlogRow` + the `.select(...)` string with `focus_keyword, seo_title, meta_description, og_image`; `mockToData` sets them to null. `getAdminBlogPostBySlug` (`queries.ts`): add the 4 columns to the select + row type + mapping.

- [ ] **Step 4 — writes.** `createBlogPost` insert + `updateBlogPost` patch (`actions.ts`): write `focus_keyword`/`seo_title`/`meta_description`/`og_image` from the input (trim; empty → null), via the existing `as never` cast. In `updateBlogPost`, add the 4 to the patch-building (only when provided).

- [ ] **Step 5 — storefront metadata.** `src/app/blog/[slug]/page.tsx` `generateMetadata`: `title: post.seoTitle || post.title`; `description: post.metaDescription || post.excerpt`; OG/twitter `images` use `post.ogImage || post.coverImage || "/og-default.png"` (applying the existing absolute/relative URL guard). Update the Article JSON-LD `description` to `post.metaDescription || post.excerpt` and `image` to the ogImage/coverImage (guarded).

- [ ] **Step 6 — verify + commit.** `npx tsc --noEmit && npx vitest run && npm run build`. Commit `feat(blog): SEO fields (migration 0009) through types/reads/writes/metadata`.

---

## Task 5: Editor SEO section — inputs + live panels + snippet preview

**Files:** Create `src/components/admin/seo-panel.tsx`, `src/components/admin/snippet-preview.tsx`. Modify `src/components/admin/blog-post-form.tsx`.

**Interfaces:** Consumes `analyzeSeo`/`analyzeReadability` (Task 2/3), `AnalysisResult` (Task 1), the SEO fields on `AdminBlogPost`/`BlogPostInput` (Task 4), `uploadBlogCover` (3a).

- [ ] **Step 1 — `seo-panel.tsx`** (client) — renders an `AnalysisResult`: a header with the traffic-light rating dot + `score/100` + a title, and a list of checks (a coloured dot per `status` + the `text`).
```tsx
"use client";
import { cn } from "@/lib/utils";
import type { AnalysisResult, CheckStatus } from "@/lib/blog/analysis";

const DOT: Record<CheckStatus, string> = { good: "bg-neem", ok: "bg-mustard", bad: "bg-danger" };

export function SeoPanel({ title, result }: { title: string; result: AnalysisResult }) {
  return (
    <div className="rounded-xl border border-cream-300 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("size-3 rounded-full", DOT[result.rating])} />
          <span className="font-semibold text-ink">{title}</span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-ink-muted">{result.score}/100</span>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {result.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            <span className={cn("mt-1.5 size-2 flex-none rounded-full", DOT[c.status])} />
            <span className="text-ink-muted">{c.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2 — `snippet-preview.tsx`** (client) — a Google-style result preview:
```tsx
"use client";
import { SITE_URL } from "@/lib/config";

export function SnippetPreview({ title, slug, description }: { title: string; slug: string; description: string }) {
  return (
    <div className="rounded-xl border border-cream-300 p-4">
      <p className="text-xs text-ink-soft">Search preview</p>
      <p className="mt-1 truncate text-xs text-neem-deep">{SITE_URL.replace(/^https?:\/\//, "")}/blog/{slug || "your-post"}</p>
      <p className="truncate text-lg text-[#1a0dab]">{title || "Your SEO title"}</p>
      <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{description || "Your meta description will appear here."}</p>
    </div>
  );
}
```

- [ ] **Step 3 — wire into `blog-post-form.tsx`.** READ the file first. Add state: `focusKeyword`, `seoTitle`, `metaDescription`, `ogImage` (seeded from `post?.focusKeyword ?? ""` etc.). Compute live:
```tsx
  const seoResult = useMemo(() => analyzeSeo({ title, seoTitle, metaDescription, slug, focusKeyword, bodyMarkdown: body, excerpt }), [title, seoTitle, metaDescription, slug, focusKeyword, body, excerpt]);
  const readResult = useMemo(() => analyzeReadability(body), [body]);
```
Add an **SEO `Card`** (after the existing content/cover cards) with: a focus-keyword `Input`; an SEO-title `Input` + a char counter (`{seoTitle.length}/60`); a meta-description `textarea` + counter (`{metaDescription.length}/156`); an OG-image upload (reuse the cover-upload control calling `uploadBlogCover(slug, …)` → sets `ogImage`); `<SnippetPreview title={seoTitle || title} slug={slug} description={metaDescription || excerpt} />`; and `<SeoPanel title="SEO analysis" result={seoResult} />` + `<SeoPanel title="Readability" result={readResult} />`. Include the 4 fields in BOTH the `createBlogPost` and `updateBlogPost` call objects (empty→null via `.trim() || null`).

- [ ] **Step 4 — verify.** `npx tsc --noEmit && npx vitest run && npm run build`. Live (controller, real admin session, after migration): open a post edit → the SEO + Readability panels show scores that update as you change the focus keyword / body / meta; save → the SEO fields persist; the storefront post's `<title>`/meta/OG reflect them. Commit `feat(admin): blog editor SEO section — live SEO + readability panels + snippet preview`.

---

## Final verification

- [ ] `npx vitest run` green (analysis/seo/readability suites + existing); `npx tsc --noEmit && npm run build` clean.
- [ ] End-to-end (migration applied, real admin session): live SEO + Readability scores respond to edits; saving persists the SEO fields; storefront `<title>`/meta description/OG image use the SEO fields (fallback when empty); analyzers never crash on empty/odd input.
- [ ] PR to `master`; set the 5 per-branch Supabase preview env vars for this branch if the preview build reports `supabaseUrl is required`, then redeploy.

## Self-Review (done during authoring)

- **Spec coverage:** shared score → T1; analyzeSeo → T2; analyzeReadability → T3; migration + SEO fields through types/reads/writes/metadata → T4; editor SEO section + live panels + snippet → T5.
- **Placeholder scan:** none — real code/tests/commands. Analyzer thresholds are concrete (documented as heuristic).
- **Type consistency:** `Check`/`AnalysisResult`/`CheckStatus`, `scoreChecks`, `SeoInput`/`analyzeSeo`, `analyzeReadability`, the 4 SEO fields on `BlogPostData`/`AdminBlogPost`/`BlogPostInput` (`seoTitle`/`metaDescription`/`ogImage`/`focusKeyword`) — consistent across tasks.
- **Purity + totality** of the analyzers is the load-bearing invariant (never throw; deterministic) — in Global Constraints + exercised in T2/T3 tests (incl. empty input).
