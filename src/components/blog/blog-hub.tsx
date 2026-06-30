"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import { BlogCard } from "@/components/blog/blog-card";
import { blogCategories, blogPosts } from "@/lib/mock/blog";
import { cn } from "@/lib/utils";

/** Filterable blog hub: intro + category chips + post grid. */
export function BlogHub() {
  const [active, setActive] = useState("all");

  const posts =
    active === "all"
      ? blogPosts
      : blogPosts.filter((p) => p.category === active);

  const chips = [{ slug: "all", name: "All" }, ...blogCategories];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Blog" }]} />

      {/* intro */}
      <header className="mt-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          From the journal
        </span>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          The Blog
        </h1>
        <p className="mt-2 max-w-prose text-ink-muted">
          Tips on safe, screen-free, Montessori-friendly play — from our family
          to yours.
        </p>
      </header>

      {/* category chips */}
      <div
        role="group"
        aria-label="Filter posts by category"
        className="mt-6 flex flex-wrap gap-2"
      >
        {chips.map((c) => {
          const isActive = active === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => setActive(c.slug)}
              aria-pressed={isActive}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neem",
                isActive
                  ? "border-neem bg-neem text-paper"
                  : "border-cream-300 text-ink hover:border-neem",
              )}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* post grid */}
      {posts.length ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-ink-muted">No posts yet.</p>
      )}
    </main>
  );
}
