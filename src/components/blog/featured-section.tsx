import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PostCover } from "@/components/blog/journal/cover-art";
import { categoryName } from "@/lib/mock/blog";
import { formatDate } from "@/lib/format";
import type { BlogPostData } from "@/lib/types";

/**
 * Top-of-blog spotlight: one large featured article on the left and a compact
 * "Top Reads" list (small thumb + title rows) on the right. Both are static —
 * they don't react to the grid's search/category filters.
 */
export function FeaturedSection({
  featured,
  topReads,
}: {
  featured: BlogPostData;
  topReads: BlogPostData[];
}) {
  const href = `/blog/${featured.slug}`;

  return (
    <div className="grid gap-8 lg:grid-cols-5 lg:gap-6">
      {/* featured story */}
      <section className="lg:col-span-3">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
          The Latest
        </h2>
        <article className="group mt-4 flex flex-col overflow-hidden rounded-3xl border border-cream-300 bg-card transition-all duration-300 hover:border-neem-soft hover:shadow-xl hover:shadow-neem/10">
          <Link
            href={href}
            className="relative block aspect-[16/9] overflow-hidden bg-frame"
          >
            <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
              <PostCover
                post={featured}
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority
              />
            </div>
            <span className="absolute left-4 top-4 rounded-full bg-paper/90 px-3 py-1 text-[11px] font-semibold text-neem-deep backdrop-blur-sm">
              {categoryName(featured.category)}
            </span>
          </Link>
          <div className="flex flex-1 flex-col p-6 sm:p-7">
            <p className="text-xs text-ink-soft">
              <span className="font-medium text-ink-muted">{featured.author}</span>
              {" · "}
              {formatDate(featured.dateISO)}
              {" · "}
              {featured.readMins} min read
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
              <Link href={href} className="transition-colors hover:text-neem-deep">
                {featured.title}
              </Link>
            </h3>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-muted sm:text-base sm:leading-7">
              {featured.excerpt}
            </p>
            <Link
              href={href}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neem-deep"
            >
              Read more
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
            </Link>
          </div>
        </article>
      </section>

      {/* top reads */}
      <section className="lg:col-span-2">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
          Top Reads
        </h2>
        <div className="mt-4 space-y-4">
          {topReads.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex gap-4 rounded-2xl border border-cream-300 bg-card p-3 transition-all duration-300 hover:border-neem-soft hover:shadow-md"
            >
              <span className="relative block aspect-[4/3] w-28 flex-none overflow-hidden rounded-xl bg-frame sm:w-32">
                <span className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                  <PostCover post={post} sizes="128px" />
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col justify-center">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neem-deep">
                  {categoryName(post.category)}
                </span>
                <span className="mt-1 line-clamp-2 font-display text-sm font-bold leading-snug text-ink transition-colors group-hover:text-neem-deep sm:text-base">
                  {post.title}
                </span>
                <span className="mt-1.5 text-xs text-ink-soft">
                  {formatDate(post.dateISO)} · {post.readMins} min read
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
