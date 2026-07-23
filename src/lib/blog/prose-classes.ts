/** Shared typographic styling for rendered blog HTML — used BOTH by the Tiptap
 *  editor content area (admin) and the storefront body wrapper, so the WYSIWYG
 *  matches what gets published. Tailwind arbitrary-variant selectors style the
 *  raw HTML tags Tiptap emits (h2/h3/p/lists/links/images/quote/mark). Inline
 *  color / highlight / font-size / alignment come through as element styles and
 *  are intentionally not overridden here. */
export const BLOG_PROSE =
  "text-ink leading-7 " +
  "[&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-ink [&_h2]:mt-8 [&_h2]:mb-3 " +
  "[&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-ink [&_h3]:mt-6 [&_h3]:mb-2 " +
  "[&_p]:my-4 [&_p]:text-ink-muted " +
  "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ul]:text-ink-muted " +
  "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1 [&_ol]:text-ink-muted " +
  "[&_li]:pl-1 " +
  "[&_a]:text-neem-deep [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-neem " +
  "[&_strong]:font-semibold [&_strong]:text-ink " +
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-cream-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-muted " +
  "[&_img]:my-5 [&_img]:rounded-xl [&_img]:border [&_img]:border-cream-200 [&_img]:max-w-full [&_img]:h-auto " +
  "[&_mark]:rounded [&_mark]:px-0.5";
