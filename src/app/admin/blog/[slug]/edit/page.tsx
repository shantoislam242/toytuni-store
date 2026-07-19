import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminBlogPostBySlug } from "@/lib/admin/queries";
import { getBlogCategories } from "@/lib/data/blog";
import { BlogPostForm } from "@/components/admin/blog-post-form";

export function generateMetadata(): Metadata {
  return {
    title: "Edit post",
    robots: { index: false, follow: false },
  };
}

/**
 * Blog post edit page (Task 5). `getAdminBlogPostBySlug()` is service-role —
 * server-only — and returns the post whether published or a draft. The form
 * itself is a client component that calls `updateBlogPost` / `uploadBlogCover`.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, categories] = await Promise.all([
    getAdminBlogPostBySlug(slug),
    getBlogCategories(),
  ]);
  if (!post) notFound();

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
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">{post.title}</h1>
        <p className="mt-0.5 font-mono text-sm text-ink-muted">{post.slug}</p>
      </div>

      <div className="mt-6">
        <BlogPostForm post={post} categories={categories} />
      </div>
    </div>
  );
}
