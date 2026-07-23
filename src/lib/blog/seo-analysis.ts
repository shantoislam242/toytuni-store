import { markdownHeadings } from "@/lib/blog/markdown-headings";
import { stripHtml } from "@/lib/blog/process-html";
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
/** First paragraph text — HTML `<p>` if present, else the first non-heading
 *  markdown block. (Body is HTML now; markdown branch kept for back-compat.) */
function firstParagraph(body: string): string {
  const p = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (p) return stripHtml(p[1]);
  return body.split(/\n\s*\n/).map((b) => b.trim()).find((b) => b !== "" && !b.startsWith("#")) ?? "";
}
/** Heading text (h2/h3) joined — HTML headings if present, else markdown `## `. */
function headingsText(body: string): string {
  const html = body.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi);
  if (html) return html.map((h) => stripHtml(h)).join(" ");
  return markdownHeadings(body).join(" ");
}
function hasLink(body: string): boolean {
  return /<a\s[^>]*href=/i.test(body) || /(^|[^!])\[[^\]]+\]\([^)]+\)/.test(body);
}
function imagesMissingAlt(body: string): number {
  const mdImgs = body.match(/!\[[^\]]*\]\([^)]+\)/g) ?? [];
  const mdNoAlt = mdImgs.filter((i) => (i.match(/!\[([^\]]*)\]/)?.[1] ?? "").trim() === "").length;
  const htmlImgs = body.match(/<img\b[^>]*>/gi) ?? [];
  const htmlNoAlt = htmlImgs.filter((i) => {
    const m = i.match(/\balt=("([^"]*)"|'([^']*)')/i);
    return (m ? (m[2] ?? m[3] ?? "") : "").trim() === "";
  }).length;
  return mdNoAlt + htmlNoAlt;
}
const good = (id: string, text: string): Check => ({ id, status: "good", text });
const ok = (id: string, text: string): Check => ({ id, status: "ok", text });
const bad = (id: string, text: string): Check => ({ id, status: "bad", text });

/** Keyword-optimisation analysis (Yoast-style, heuristic). Pure + total. */
export function analyzeSeo(input: SeoInput): AnalysisResult {
  const kw = input.focusKeyword.trim().toLowerCase();
  const body = input.bodyMarkdown;
  const text = stripHtml(body); // plain text for word count + keyword density
  const words = countWords(text);
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
    checks.push(headingsText(body).toLowerCase().includes(kw)
      ? good("kw-subheading", "Focus keyword appears in a subheading.")
      : ok("kw-subheading", "Add the focus keyword to a subheading."));
    const density = words > 0 ? (keywordCount(text, kw) / words) * 100 : 0;
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
