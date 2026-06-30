import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { PlaceholderImage } from "@/components/placeholder-image";
import { BlogBody } from "@/components/blog/blog-body";
import { BlogCard } from "@/components/blog/blog-card";
import { categoryName, relatedPosts } from "@/lib/mock/blog";
import { formatDate } from "@/lib/format";
import type { BlogPost } from "@/lib/types";

/** Full article page: breadcrumb, header, cover, body, related posts. */
export function BlogPostView({ post }: { post: BlogPost }) {
  const related = relatedPosts(post);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: post.title },
        ]}
      />

      {/* header */}
      <header className="mx-auto mt-6 max-w-2xl">
        <Link
          href="/blog"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep hover:underline"
        >
          {categoryName(post.category)}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          {formatDate(post.dateISO)} · {post.readMins} min read
        </p>
      </header>

      {/* cover */}
      <PlaceholderImage
        tone={post.coverTone}
        label={post.coverLabel}
        className="mx-auto mt-6 aspect-[16/9] w-full max-w-3xl rounded-2xl"
      />

      {/* body */}
      <article className="mx-auto max-w-2xl">
        <BlogBody blocks={post.body} />
      </article>

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
    </main>
  );
}
