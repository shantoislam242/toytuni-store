import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBlogCategories } from "@/lib/data/blog";
import { BlogPostForm } from "@/components/admin/blog-post-form";

export function generateMetadata(): Metadata {
  return {
    title: "New post",
    robots: { index: false, follow: false },
  };
}

/**
 * New blog post page (Task 5). Reads the DB blog categories server-side and
 * hands them to the client form, which calls the `createBlogPost` Server
 * Action (admin re-check + validation live server-side). A published post
 * goes live on `/blog` on save; a draft stays hidden.
 */
export default async function Page() {
  const categories = await getBlogCategories();

  return (
    <div>
      <Link
        href="/admin/blog"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Back to blog
      </Link>

      <div className="mt-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          Journal
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">New post</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Write a post. Toggle Published when it&rsquo;s ready to go live.
        </p>
      </div>

      <div className="mt-6">
        <BlogPostForm categories={categories} />
      </div>
    </div>
  );
}
