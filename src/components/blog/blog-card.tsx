import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PostCover } from "@/components/blog/journal/cover-art";
import { categoryName } from "@/lib/mock/blog";
import { formatDate } from "@/lib/format";
import type { BlogPostData } from "@/lib/types";

/**
 * Post card for the blog grid and related-posts sections: 16:9 cover (real
 * photo when the post has one), category badge, clamped title + excerpt,
 * author / date / read-time meta and a "Read more" link. Lifts subtly on hover.
 */
export function BlogCard({ post }: { post: BlogPostData }) {
  const href = `/blog/${post.slug}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-cream-300 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-neem-soft hover:shadow-lg hover:shadow-neem/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link href={href} className="relative block aspect-[16/9] overflow-hidden bg-frame">
        <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
          <PostCover
            post={post}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-3 py-1 text-[11px] font-semibold text-neem-deep backdrop-blur-sm">
          {categoryName(post.category)}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold leading-snug text-ink">
          <Link
            href={href}
            className="line-clamp-2 transition-colors hover:text-neem-deep"
          >
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
          {post.excerpt}
        </p>

        <div className="mt-auto pt-4">
          <p className="text-xs text-ink-soft">
            <span className="font-medium text-ink-muted">{post.author}</span>
            {" · "}
            {formatDate(post.dateISO)}
            {" · "}
            {post.readMins} min read
          </p>
          <Link
            href={href}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-neem-deep"
          >
            Read more
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
          </Link>
        </div>
      </div>
    </article>
  );
}
