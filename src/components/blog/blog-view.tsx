"use client";

import { useMemo, useRef, useState } from "react";
import { SearchX } from "lucide-react";
import { BlogHero } from "@/components/blog/blog-hero";
import { FeaturedSection } from "@/components/blog/featured-section";
import { BlogToolbar } from "@/components/blog/blog-toolbar";
import { BlogCard } from "@/components/blog/blog-card";
import { BlogPagination } from "@/components/blog/blog-pagination";
import { BlogNewsletter } from "@/components/blog/blog-newsletter";
import type { BlogCategory, BlogPostData } from "@/lib/types";

const PAGE_SIZE = 6;

/**
 * Blog index — hero, featured + top-reads spotlight, then a searchable /
 * filterable, paginated grid and a newsletter band. Owns all client state
 * (query, category, page); the spotlight stays static above the filters.
 */
export function BlogView({
  posts,
  categories,
}: {
  posts: BlogPostData[];
  categories: BlogCategory[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [tag, setTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLElement>(null);

  const filterCategories: BlogCategory[] = useMemo(
    () => [{ slug: "all", name: "All" }, ...categories],
    [categories],
  );

  // Spotlight: the pinned featured post + the next three most-recent stories.
  const featured = useMemo(
    () => posts.find((p) => p.featured) ?? posts[0],
    [posts],
  );
  const rest = useMemo(
    () => (featured ? posts.filter((p) => p.slug !== featured.slug) : posts),
    [posts, featured],
  );
  const topReads = useMemo(() => rest.slice(0, 3), [rest]);

  // Tag chips reflect the grid, which filters `rest` (the featured post is
  // shown in the spotlight, not the grid) — so a tag only on the featured
  // post never yields an empty grid.
  const allTags = useMemo(
    () => [...new Set(rest.flatMap((p) => p.tags))],
    [rest],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rest.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (tag !== null && !p.tags.includes(tag)) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q)
      );
    });
  }, [rest, query, category, tag]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const changeFilter = (next: { query?: string; category?: string; tag?: string | null }) => {
    if (next.query !== undefined) setQuery(next.query);
    if (next.category !== undefined) setCategory(next.category);
    if (next.tag !== undefined) setTag(next.tag);
    setPage(1);
  };

  const changePage = (n: number) => {
    setPage(n);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:max-w-[90rem] lg:px-8">
      <BlogHero />

      {featured ? (
        <div className="mt-12">
          <FeaturedSection featured={featured} topReads={topReads} />
        </div>
      ) : null}

      {/* browse: search + categories + grid */}
      <section ref={gridRef} className="mt-14 scroll-mt-[124px]">
        <BlogToolbar
          categories={filterCategories}
          active={category}
          onCategoryChange={(slug) => changeFilter({ category: slug })}
          query={query}
          onQueryChange={(value) => changeFilter({ query: value })}
          tags={allTags}
          activeTag={tag}
          onTagChange={(next) => changeFilter({ tag: tag === next ? null : next })}
        />

        {visible.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-cream-300 px-6 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-neem-deep">
              <SearchX className="size-6" />
            </span>
            <p className="mt-4 font-display text-lg font-bold text-ink">
              No articles found
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Try a different search or category.
            </p>
          </div>
        )}

        <div className="mt-10">
          <BlogPagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={changePage}
          />
        </div>
      </section>

      <div className="mt-16">
        <BlogNewsletter />
      </div>
    </main>
  );
}
