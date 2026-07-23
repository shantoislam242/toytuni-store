export type TocItem = { id: string; text: string; level: 2 | 3 };

/** Plain text from an HTML string: tags dropped, common entities decoded,
 *  whitespace collapsed. Used for the TOC labels, SEO/readability word counts,
 *  and heading slugs. Pure. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** URL-safe slug from heading text (already tag-free). */
function slugify(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "section";
}

/**
 * Inject a stable slug `id` into every `<h2>`/`<h3>` of a (sanitized) blog HTML
 * body and collect the table of contents. Duplicate slugs get a `-1`, `-2`
 * suffix so anchors stay unique. Pure/regex-based (heading inner text is
 * tag-stripped for the slug + label) — no DOM or parser dependency, so it runs
 * anywhere and is trivially unit-testable.
 */
export function processBlogHtml(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();

  const out = html.replace(
    /<h([23])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/gi,
    (_match, lvl: string, attrs: string, inner: string) => {
      const level = Number(lvl) as 2 | 3;
      const text = stripHtml(inner);
      const base = slugify(text);
      let id = base;
      if (used.has(base)) {
        const n = (used.get(base) ?? 0) + 1;
        used.set(base, n);
        id = `${base}-${n}`;
      } else {
        used.set(base, 0);
      }
      toc.push({ id, text, level });
      const cleanedAttrs = attrs.replace(/\sid=("[^"]*"|'[^']*')/gi, "");
      return `<h${lvl}${cleanedAttrs} id="${id}">${inner}</h${lvl}>`;
    },
  );

  return { html: out, toc };
}
