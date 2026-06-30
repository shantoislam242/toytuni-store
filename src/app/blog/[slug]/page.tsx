import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostView } from "@/components/blog/blog-post-view";
import { BRAND_NAME } from "@/lib/config";
import { blogPosts, blogPostBySlug } from "@/lib/mock/blog";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPostBySlug(slug);

  if (!post) {
    return { title: `Post not found | ${BRAND_NAME}` };
  }

  return {
    title: `${post.title} | ${BRAND_NAME}`,
    description: post.excerpt,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const post = blogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return <BlogPostView post={post} />;
}
