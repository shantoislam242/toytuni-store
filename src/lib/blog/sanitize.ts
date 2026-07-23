import sanitizeHtml from "sanitize-html";

/** Allowed inline-style color values: hex, rgb()/rgba(), or a CSS named colour. */
const COLOR = [/^#(0x)?[0-9a-f]{3,8}$/i, /^rgba?\(\s*[\d.,\s%]+\)$/i, /^[a-z]+$/i];

/**
 * Sanitize a rich-text blog body (the HTML Tiptap emits) down to a strict,
 * safe allowlist before it is ever stored or rendered. Blocks script/iframe/
 * event handlers/`javascript:` URLs; keeps only the formatting the editor
 * produces (headings, emphasis, lists, links, images, and a small CSS subset:
 * colour, highlight background, font-size, text-align). Links are forced to
 * `nofollow noopener` and open in a new tab. Applied on SAVE (authoritative)
 * and again on RENDER (defense-in-depth). Pure (no I/O).
 */
export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "h2", "h3", "strong", "em", "u", "s",
      "ul", "ol", "li", "a", "img", "span", "mark", "blockquote",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
      span: ["style"],
      mark: ["style"],
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
      li: ["style"],
    },
    allowedStyles: {
      "*": {
        color: COLOR,
        "background-color": COLOR,
        "font-size": [/^\d+(?:\.\d+)?(px|em|rem|%)$/],
        "text-align": [/^(left|right|center|justify)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }, true),
    },
  });
}
