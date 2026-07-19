import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { getAdminBlogPosts } from "@/lib/admin/queries";
import { BlogPostsTable } from "@/components/admin/blog-posts-table";
import { Button } from "@/components/ui/button";

export function generateMetadata(): Metadata {
  return {
    title: "Blog",
    robots: { index: false, follow: false },
  };
}

/**
 * Blog posts list (Task 5). `getAdminBlogPosts()` is service-role, unscoped
 * by RLS — server-only — and returns every post regardless of status (incl.
 * drafts). The table itself is a client component for instant search and the
 * per-row Delete action.
 */
export default async function Page() {
  const posts = await getAdminBlogPosts();

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
        Journal
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">Blog</h1>

      {posts.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-cream-300 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-neem-deep">
            <Newspaper className="size-6" />
          </span>
          <p className="mt-4 font-medium text-ink">No posts yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Posts you write will show up here.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/admin/blog/new">
              <Plus className="size-4" />
              New post
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6">
          <BlogPostsTable items={posts} />
        </div>
      )}
    </div>
  );
}
