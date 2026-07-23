# toytuni-store — Rich-text blog editor (WYSIWYG)

**Date:** 2026-07-23
**Status:** Design approved (user), pending implementation
**Scope:** Replace the plain markdown `<textarea>` blog body editor with a **WYSIWYG rich-text editor (Tiptap)** whose toolbar matches the requested mockup — font size, text color, highlight, **B / I / U / S**, align (L/C/R), ordered + bullet lists, link, image (URL + upload), and a Heading (Paragraph/H2/H3) format control. Body storage moves from markdown to **sanitized HTML**; the storefront renders that HTML; existing markdown posts are converted once.

## Locked decisions (from user)

- Full rich formatting → **HTML storage** (markdown can't express color / highlight / font-size / alignment).
- **No "Tags" button in the toolbar** — blog tags stay in the existing separate field.
- **Convert existing posts** markdown → HTML (one-time).

## Library

**Tiptap v3** (ProseMirror, headless, React 19 / Next 16 compatible). Extensions: StarterKit (bold/italic/strike/heading/paragraph/bulletList/orderedList/listItem/blockquote/history), Underline, TextStyle + Color, Highlight, TextAlign, Image, Link, plus a small **custom FontSize** mark (extends TextStyle). Editor is a `"use client"` island; set `immediatelyRender: false` for SSR-safe hydration in Next.

## Architecture

### Editor component — `src/components/admin/rich-text-editor.tsx` (new, client)
- `RichTextEditor({ value, onChange, onImageUpload })`: a Tiptap `EditorContent` + a custom toolbar. `value` is HTML; `onChange(editor.getHTML())` on update. `onImageUpload(file) → Promise<url>` is supplied by the form (reuses `uploadBlogCover`).
- **Toolbar** (matches the mockup, left→right): Font-size stepper (px), Text color (swatch + native color input), Highlight (toggle/color), **Bold / Italic / Underline / Strikethrough**, Align left/center/right, Ordered list, Bullet list, Link (prompt), Image-by-URL, Image-upload (file input → `onImageUpload` → `insertImage`). Plus a **Format** select (Paragraph / Heading 2 / Heading 3) so posts keep a real heading structure for the TOC + SEO. Each button reflects `editor.isActive(...)` state.
- Editor content area styled to resemble the storefront (same prose look), min-height, focus ring.

### Body storage + sanitize — `src/lib/admin/actions.ts`
- `blog_posts.body` now holds **HTML** (column stays `text` — no migration). `createBlogPost` / `updateBlogPost` **sanitize the HTML with `sanitize-html`** before persisting, using a strict allowlist: tags `p, br, h2, h3, strong, em, u, s, ul, ol, li, a, img, span, mark, blockquote`; attrs `a[href,target,rel]`, `img[src,alt]`, `span/mark/p/h2/h3[style]`; `allowedStyles` limited to `color`, `background-color`, `font-size`, `text-align` (color values regex-guarded); `a` forced `rel="noopener noreferrer nofollow"`, http(s) URLs only; `img` src must be http(s). Shared helper `sanitizeBlogHtml(html)` in `src/lib/blog/sanitize.ts`.

### Storefront render + TOC — `src/lib/blog/process-html.ts` (new, pure, TDD) + `src/components/blog/blog-post-view.tsx`
- `processBlogHtml(html) → { html, toc }`: injects a slug `id` into each `<h2>`/`<h3>` (slug from its text, deduped) and collects the TOC `[{ id, text, level }]`. Pure/regex-based (heading inner text stripped of tags) so it's unit-testable and needs no DOM/dep.
- `stripHtml(html) → string`: tags → plaintext (for SEO/readability + excerpts).
- `blog-post-view.tsx`: body rendered via `dangerouslySetInnerHTML` of the **already-sanitized, id-injected** HTML inside a styled wrapper (Tailwind arbitrary-variant classes `[&_h2]:… [&_p]:… [&_ul]:…` reproducing the current markdown look, incl. `mark`, alignment, colors). TOC comes from `processBlogHtml(...).toc` (replaces `markdownHeadings`). Body is re-sanitized at render too (defense-in-depth; pages are cached).

### SEO / readability
- `analyzeSeo` / `analyzeReadability` (and the editor's live SeoPanel) receive `stripHtml(body)` instead of raw markdown, so word count / keyword density / readability stay correct. Any markdown-heading-specific check is switched to the HTML heading list (from `processBlogHtml`).

### Existing posts — one-time conversion
- `scripts/convert-blog-to-html.mjs`: reads every `blog_posts` row, `marked(body)` → HTML → `sanitizeBlogHtml` → writes back. Idempotent-guarded (skip rows that already look like HTML). **Run once against the live DB before deploying the render change** (release gate — otherwise old markdown bodies would render as escaped text). Service-role key from env.

### Form changes — `src/components/admin/blog-post-form.tsx`
- Replace the Write/Preview markdown textarea (and its inline `![](url)` insert) with `<RichTextEditor value={body} onChange={setBody} onImageUpload={uploadViaCover} />`. Keep the existing separate cover-image, OG-image, tags, SEO, scheduling, featured/published controls unchanged. `body` state still feeds `bodyMarkdown` on the action (the field name stays; its content is now HTML). Preview tab removed (editor is WYSIWYG).

## Security

- The ONLY new XSS surface is stored HTML rendered with `dangerouslySetInnerHTML`. Mitigated by sanitizing on **save** (authoritative) AND on **render** (defense-in-depth) with a strict `sanitize-html` allowlist — no `script`/`iframe`/`on*`/`javascript:`; styles limited to a safe CSS subset; links forced `nofollow noopener`. Admin-only authoring (actions already `getIsAdmin`-gated).

## Non-goals (v1)

Tables / code blocks / embeds / videos (StarterKit basics only + the mockup's tools); collaborative editing; a Markdown export; the toolbar "Tags" button; changing cover/OG/tags/SEO/scheduling UX. No DB migration (body column already `text`).

## Testing

- **Pure (TDD):** `processBlogHtml` — id injection + slug dedupe + TOC extraction across h2/h3, headings with nested marks, no headings; `stripHtml` — tags removed, entities/whitespace sane; `sanitizeBlogHtml` — drops `script`/`onerror`/`javascript:` href, keeps allowed style props, strips disallowed ones.
- **Integration (real admin session, after the conversion script):** write a post using every toolbar control → save → storefront shows the exact formatting (colors/highlight/size/align/lists/image/link), TOC lists the H2/H3 with working anchors, SEO panel word-count is sane; edit an existing (converted) post → its content loads into the editor intact; a `<script>`/`onerror` pasted in never executes.

## Architecture summary

Tiptap emits HTML → sanitized on save → stored in `body` → sanitized + id-injected on render → shown via `dangerouslySetInnerHTML` in a styled wrapper, with the TOC + SEO derived from that HTML. One new client editor component, a couple of pure helpers, a sanitizer, and a one-time conversion script. No migration.
