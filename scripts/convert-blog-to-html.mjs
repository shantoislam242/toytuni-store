// One-time: convert existing blog_posts.body from markdown → sanitized HTML,
// for the switch to the rich-text (HTML) editor. Idempotent — rows that already
// look like HTML are skipped. Run once against the live DB BEFORE deploying the
// HTML render change:  node scripts/convert-blog-to-html.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { readFileSync } from "node:fs";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// --- env ---
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("Missing Supabase env in .env.local");
const REST = `${URL_}/rest/v1/blog_posts`;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

// --- sanitize (mirrors src/lib/blog/sanitize.ts) ---
const COLOR = [/^#(0x)?[0-9a-f]{3,8}$/i, /^rgba?\(\s*[\d.,\s%]+\)$/i, /^[a-z]+$/i];
function sanitizeBlogHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "h2", "h3", "strong", "em", "u", "s", "ul", "ol", "li", "a", "img", "span", "mark", "blockquote"],
    allowedAttributes: {
      a: ["href", "target", "rel"], img: ["src", "alt"],
      span: ["style"], mark: ["style"], p: ["style"], h2: ["style"], h3: ["style"], li: ["style"],
    },
    allowedStyles: {
      "*": {
        color: COLOR, "background-color": COLOR,
        "font-size": [/^\d+(?:\.\d+)?(px|em|rem|%)$/], "text-align": [/^(left|right|center|justify)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }, true) },
  });
}

// Downgrade headings to the h2/h3 the blog allowlist keeps (title is separate).
function normalizeHeadings(html) {
  return html
    .replace(/<(\/?)h1(\s[^>]*)?>/gi, "<$1h2$2>")
    .replace(/<(\/?)h[456](\s[^>]*)?>/gi, "<$1h3$2>");
}

const looksLikeHtml = (s) => /<(p|h2|h3|ul|ol|blockquote|img)\b/i.test(s);

const rows = await fetch(`${REST}?select=slug,body`, { headers }).then((r) => r.json());
console.log(`Found ${rows.length} posts.`);
let converted = 0;
for (const row of rows) {
  const body = row.body ?? "";
  if (looksLikeHtml(body)) {
    console.log(`  skip (already HTML): ${row.slug}`);
    continue;
  }
  const html = sanitizeBlogHtml(normalizeHeadings(marked.parse(body)));
  const res = await fetch(`${REST}?slug=eq.${encodeURIComponent(row.slug)}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ body: html }),
  });
  if (!res.ok) {
    console.error(`  FAILED ${row.slug}: ${res.status} ${await res.text()}`);
  } else {
    converted += 1;
    console.log(`  converted: ${row.slug}`);
  }
}
console.log(`Done. Converted ${converted} of ${rows.length}.`);
