# toytuni-store — Phase 3 Slice: Blog 3b (SEO analysis)

**Date:** 2026-07-19
**Status:** Design approved, pending spec review
**Scope:** A Yoast-style SEO experience for blog posts — a **focus keyword**, **SEO title**, **meta description**, and **OG image**, plus two live analysis panels in the editor: an **SEO score** (keyword optimisation) and a **Readability score**, each a traffic-light rating + a checklist of pass/warn/fail with suggestions, computed by pure analyzers. The storefront renders the SEO title / meta description / OG image. Second of three blog sub-slices (3a Foundation ✓ → **3b SEO** → 3c rich/tags/schedule).

## Background

Blog 3a is merged and live: posts are DB-backed with markdown bodies + admin CRUD (`blog_posts`, `BlogPostData`, `getBlogPost`, `blog-post-form.tsx`, `createBlogPost`/`updateBlogPost`). The post page `generateMetadata` currently uses `post.title` + `post.excerpt` + `coverImage`. There is no SEO tooling. The user wants the WordPress/Yoast experience: a focus keyword driving a live SEO score + a readability score, with actionable checks — exactly what this slice adds.

## Goals

- **SEO meta fields** on `blog_posts` (migration): `focus_keyword`, `seo_title`, `meta_description`, `og_image` (all nullable). Threaded through `BlogPostData`/`AdminBlogPost`/`BlogPostInput` and the create/update actions.
- **`analyzeSeo(input)`** (pure, TDD) — keyword-optimisation checks against the focus keyword: keyword present; keyword in SEO title / slug / meta description / first paragraph / a subheading; keyword density (≈0.5–3%); SEO-title length (≈30–60 chars); meta-description length (≈120–156 chars); content length (≥300 words); at least one link; images have alt text. Returns `{ score 0–100, rating: bad|ok|good, checks: {id, status: good|ok|bad, text}[] }`.
- **`analyzeReadability(bodyMarkdown)`** (pure, TDD) — Flesch reading ease (≥60); % long sentences (>20 words) < 25%; long paragraphs (>150 words) flagged; passive-voice sentences < 10% (English heuristic); transition-word sentences ≥ 30%; subheading distribution (no over-long run without a `##`). Same result shape.
- **Editor SEO section** — inputs (focus keyword, SEO title + char counter, meta description + char counter, OG image upload) + **two live panels** (SEO + Readability) recomputed client-side as the admin types, each showing the traffic-light score + an expandable checklist; plus a **Google snippet preview** (SEO title / URL / meta description as they'd appear in search).
- **Storefront metadata:** `generateMetadata` → `<title>` = `seoTitle ?? title`; `description` = `metaDescription ?? excerpt`; OG/twitter image = `ogImage ?? coverImage`; JSON-LD description likewise.

## Non-goals (this slice)

- Not real Yoast parity — heuristic analyzers (English content) covering the core checks; no keyword-synonym/related-keyword analysis, no live SERP data, no cornerstone-content flags, no XML-sitemap-per-keyword.
- No tags, scheduled publish, rich blocks, related posts, blog-category CRUD → **3c**.
- No multi-locale readability (English heuristics only).
- No stored/aggregated SEO score history — the score is computed live in the editor (and can be recomputed anytime); it is NOT persisted.

## Locked decisions

- Full Yoast set: **SEO analysis + Readability analysis**, two independent scores.
- Four meta fields: focus keyword, SEO title, meta description, OG image.
- Analyzers are **pure + client-side** in the editor (instant feedback, no server round-trip) and TDD-covered.
- Thresholds follow Yoast-like defaults (documented in the analyzer).
- Score = weighted from check statuses → 0–100 → rating (good ≥ ~70, ok ≥ ~40, else bad); the rating bullet colours mirror Yoast (green/orange/red).
- Include the **Google snippet preview** (small, part of the experience).

## Schema (migration 0009)

- `alter table blog_posts add column if not exists focus_keyword text;` `add column if not exists seo_title text;` `add column if not exists meta_description text;` `add column if not exists og_image text;`
- No seed change required (existing posts get null SEO fields → the storefront falls back to title/excerpt/cover; the editor shows an empty focus keyword and a low score until filled). Optionally the seed can set `focus_keyword`/`meta_description` from the mock for a couple of posts (nice-to-have, not required).

## Architecture

- **`src/lib/blog/seo-analysis.ts`** (pure): `analyzeSeo(input: SeoInput): AnalysisResult` where `SeoInput = { title; seoTitle; metaDescription; slug; focusKeyword; bodyMarkdown; excerpt }`, `AnalysisResult = { score: number; rating: "bad"|"ok"|"good"; checks: { id: string; status: "good"|"ok"|"bad"; text: string }[] }`. Helpers: word count, keyword occurrences (case-insensitive, word-boundary), first-paragraph extraction, markdown link/image detection (reusing `markdownHeadings` for subheadings). No DOM/markdown lib — plain string analysis on the markdown source.
- **`src/lib/blog/readability-analysis.ts`** (pure): `analyzeReadability(bodyMarkdown: string): AnalysisResult`. Helpers: sentence split, syllable estimate (for Flesch), passive-voice regex heuristic, a transition-word list. Same `AnalysisResult` shape.
- **`src/lib/blog/analysis-score.ts`** (pure, optional shared): map a `checks[]` → `{ score, rating }` (shared by both analyzers) so scoring lives in one tested place.
- **Types/queries/actions:** add `focusKeyword`/`seoTitle`/`metaDescription`/`ogImage` to `BlogPostData` (`src/lib/types.ts`), `AdminBlogPost` + `getAdminBlogPostBySlug` mapping (`src/lib/admin/queries.ts`), `BlogPostInput` + `createBlogPost`/`updateBlogPost` writes (`src/lib/admin/actions.ts`), and `rowToPost` in `src/lib/data/blog.ts`.
- **Editor:** `src/components/admin/blog-post-form.tsx` gains an SEO card — the four inputs (with char counters for SEO title/meta description), an OG image upload (reuse `uploadBlogCover`), a `SeoPanel` + `ReadabilityPanel` (client) that call `analyzeSeo`/`analyzeReadability` on the current form state (via `useMemo`) and render the score + checklist, and a `SnippetPreview` (title/url/description). New components: `src/components/admin/seo-panel.tsx` (shared score + checklist renderer, given an `AnalysisResult`), `src/components/admin/snippet-preview.tsx`.
- **Storefront:** `src/app/blog/[slug]/page.tsx` `generateMetadata` + the Article JSON-LD read `seoTitle`/`metaDescription`/`ogImage` with fallbacks; `getBlogPost`/`BlogPostData` carry them.

## Data flow — optimise a post

1. Admin edits a post → types a **focus keyword** + SEO title + meta description → the SEO + Readability panels recompute live (pure, client) → traffic-light scores + checks with suggestions ("Add the focus keyword to your first paragraph", "12% of sentences are long — try to shorten").
2. Admin saves → `updateBlogPost` persists the SEO fields.
3. The storefront post renders `<title>`/meta description/OG from the SEO fields (fallback to title/excerpt/cover).

## Security / correctness

- Analyzers are pure + deterministic; no user input reaches the DOM unsanitised (the panels render plain text check messages; the snippet preview escapes the title/description as text).
- SEO fields validated on write (trim; meta description/seo title are plain text; og_image an optional URL). Admin-gated writes unchanged.
- The analyzers never throw on empty/odd input (empty keyword → "set a focus keyword" bad check; empty body → low scores) — total functions.
- New columns absent from generated types → `as never` writes / `.overrideTypes()` reads (established).

## Testing

- **Pure (TDD, the bulk):** `analyzeSeo` — each check's good/ok/bad transitions (keyword in/out of title, density bands, length bands, links, alt text, content length); `analyzeReadability` — Flesch bands, long-sentence %, passive-voice detection, transition-word %, paragraph length; `analysis-score` — checks→score/rating mapping.
- **Integration (drive it, real admin session):** the editor's SEO + Readability panels show live scores that change as the keyword/body/meta change; saving persists the SEO fields; the storefront post's `<title>`/meta description/OG reflect the SEO fields (and fall back when empty). Verified after the migration.

## Open questions for review

- Score weighting: simple average of check weights vs. a "worst-bucket caps the rating" rule. Proposal: **weighted average → thresholds** (predictable), documented in `analysis-score`.
- Passive-voice/transition heuristics are English-only + approximate. Proposal: ship the heuristic (clearly a guide, not a grader); note the limitation.
