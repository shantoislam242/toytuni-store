import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, ListTree, UserRound } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { PlaceholderImage } from "@/components/placeholder-image";
import { headingId } from "@/components/blog/blog-body";
import { Markdown } from "@/components/blog/markdown";
import { BlogCard } from "@/components/blog/blog-card";
import { BlogNewsletter } from "@/components/blog/blog-newsletter";
import { ShareRail } from "@/components/blog/share-rail";
import { categoryName } from "@/lib/mock/blog";
import { markdownHeadings } from "@/lib/blog/markdown-headings";
import { formatDate } from "@/lib/format";
import type { BlogPostData } from "@/lib/types";

/**
 * Previous / next article relative to `post`, in `posts` order (matching
 * `getBlogPosts`' date_iso desc ordering, newest first). "Previous" = the
 * newer post, "next" = the older one.
 */
function adjacentPosts(
  posts: BlogPostData[],
  post: BlogPostData,
): { prev?: BlogPostData; next?: BlogPostData } {
  const i = posts.findIndex((p) => p.slug === post.slug);
  if (i === -1) return {};
  return { prev: posts[i - 1], next: posts[i + 1] };
}

/**
 * Related posts: same category first, then fill with the most recent others,
 * always excluding the current post. Guarantees a non-empty result (up to limit).
 */
function relatedPosts(
  posts: BlogPostData[],
  post: BlogPostData,
  limit = 3,
): BlogPostData[] {
  return posts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .concat(
      posts
        .filter((p) => p.slug !== post.slug && p.category !== post.category)
        .sort((a, b) => b.dateISO.localeCompare(a.dateISO)),
    )
    .slice(0, limit);
}

/**
 * Full article page: breadcrumb, centered header (category badge, title,
 * author/date/read-time meta), cover, a sticky table-of-contents + share rail
 * beside the body on desktop, previous/next navigation, related posts and a
 * newsletter band. `posts` is the full published list (for adjacent/related
 * lookups — the caller already fetched it for `generateStaticParams`).
 */
export function BlogPostView({
  post,
  posts,
}: {
  post: BlogPostData;
  posts: BlogPostData[];
}) {
  const related = relatedPosts(posts, post);
  const { prev, next } = adjacentPosts(posts, post);
  const headings = markdownHeadings(post.bodyMarkdown);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:max-w-[90rem] lg:px-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: post.title },
        ]}
      />

      {/* header */}
      <header className="mx-auto mt-8 max-w-3xl text-center">
        <Link
          href="/blog"
          className="inline-flex rounded-full bg-neem/10 px-3.5 py-1.5 text-xs font-semibold text-neem-deep transition-colors hover:bg-neem/20"
        >
          {categoryName(post.category)}
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-4" />
            <span className="font-medium text-ink-muted">{post.author}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {formatDate(post.dateISO)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" />
            {post.readMins} min read
          </span>
        </div>
        {post.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-cream-100 px-2.5 py-0.5 text-xs text-ink-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {/* cover — real photo when the post has one, else the illustrated fallback */}
      {post.coverImage ? (
        <div className="relative mx-auto mt-8 aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-3xl bg-frame">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
            priority
          />
        </div>
      ) : (
        <PlaceholderImage
          tone={post.coverTone}
          label={post.coverLabel}
          className="mx-auto mt-8 aspect-[16/9] w-full max-w-5xl rounded-3xl"
        />
      )}

      {/* body + sticky sidebar (TOC + share) */}
      <div className="mx-auto mt-6 max-w-5xl lg:mt-10 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-[124px] space-y-6">
            {headings.length > 0 ? (
              <nav
                aria-label="Table of contents"
                className="rounded-2xl border border-cream-300 bg-card p-5"
              >
                <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
                  <ListTree className="size-4 text-neem-deep" />
                  On this page
                </p>
                <ul className="mt-3 space-y-2.5 border-l border-cream-300">
                  {headings.map((h) => (
                    <li key={h}>
                      <a
                        href={`#${headingId(h)}`}
                        className="-ml-px block border-l-2 border-transparent pl-3.5 text-sm leading-5 text-ink-muted transition-colors hover:border-neem hover:text-neem-deep"
                      >
                        {h}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            <ShareRail title={post.title} vertical />
          </div>
        </aside>

        <div className="min-w-0">
          {/* share — inline row on mobile/tablet (the rail is desktop-only) */}
          <div className="mt-2 flex justify-center lg:hidden">
            <ShareRail title={post.title} />
          </div>

          <article className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
            <Markdown source={post.bodyMarkdown} />
          </article>
        </div>
      </div>

      {/* previous / next */}
      {prev || next ? (
        <nav
          aria-label="Adjacent articles"
          className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-2"
        >
          {prev ? (
            <Link
              href={`/blog/${prev.slug}`}
              className="group rounded-2xl border border-cream-300 bg-card p-5 transition-all duration-300 hover:border-neem-soft hover:shadow-md"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                Previous article
              </span>
              <span className="mt-2 line-clamp-2 block font-display font-bold leading-snug text-ink transition-colors group-hover:text-neem-deep">
                {prev.title}
              </span>
            </Link>
          ) : (
            <span aria-hidden className="hidden sm:block" />
          )}
          {next ? (
            <Link
              href={`/blog/${next.slug}`}
              className="group rounded-2xl border border-cream-300 bg-card p-5 text-right transition-all duration-300 hover:border-neem-soft hover:shadow-md"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                Next article
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
              <span className="mt-2 line-clamp-2 block font-display font-bold leading-snug text-ink transition-colors group-hover:text-neem-deep">
                {next.title}
              </span>
            </Link>
          ) : null}
        </nav>
      ) : null}

      {/* related */}
      {related.length ? (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
            More from the blog
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <BlogCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      ) : null}

      {/* newsletter — before the footer */}
      <div className="mt-16">
        <BlogNewsletter />
      </div>
    </main>
  );
}
