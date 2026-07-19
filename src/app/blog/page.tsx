import type { Metadata } from "next";
import { BlogView } from "@/components/blog/blog-view";
import { getBlogPosts, getBlogCategories } from "@/lib/data/blog";

export const metadata: Metadata = {
  title: "Blog — Parenting & Learning",
  alternates: { canonical: "/blog" },
  description:
    "Play ideas, safety notes and Montessori know-how for raising curious, screen-free little ones.",
};

export default async function Page() {
  const [posts, categories] = await Promise.all([
    getBlogPosts(),
    getBlogCategories(),
  ]);
  return <BlogView posts={posts} categories={categories} />;
}
