import Link from "next/link";
import { PlaceholderImage } from "@/components/placeholder-image";
import { categoryName } from "@/lib/mock/blog";
import { formatDate } from "@/lib/format";
import type { BlogPost } from "@/lib/types";

/** Post card used by both the hub grid and the related-posts section. */
export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-cream-300 bg-card transition-shadow hover:shadow-md">
      <Link href={`/blog/${post.slug}`} className="block">
        <PlaceholderImage
          tone={post.coverTone}
          label={post.coverLabel}
          className="aspect-[16/9] w-full"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          {categoryName(post.category)}
        </span>
        <h3 className="mt-2 font-display text-lg font-bold leading-snug text-ink">
          <Link href={`/blog/${post.slug}`} className="hover:text-neem-deep">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
          {post.excerpt}
        </p>
        <p className="mt-4 text-xs text-ink-soft">
          {formatDate(post.dateISO)} · {post.readMins} min read
        </p>
      </div>
    </article>
  );
}
