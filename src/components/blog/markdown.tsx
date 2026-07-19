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
