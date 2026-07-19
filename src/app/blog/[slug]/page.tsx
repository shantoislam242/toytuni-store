import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostView } from "@/components/blog/blog-post-view";
import { BRAND_NAME, SITE_URL } from "@/lib/config";
import { JsonLd } from "@/components/seo/json-ld";
import { getBlogPost, getBlogPosts } from "@/lib/data/blog";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return (await getBlogPosts()).map((post) => ({ slug: post.slug }));
}

/** Resolve a possibly-relative image path to an absolute URL — Storage/CDN
 *  URLs (og_image/coverImage) are already absolute; the bundled default
 *  isn't. Shared by generateMetadata and the Article JSON-LD below. */
function absoluteImageUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return { title: "Post not found" };
  }

  // Blog 3b: per-post SEO overrides (migration 0009) win over the
  // auto-derived title/excerpt/coverImage when set.
  const seoTitle = post.seoTitle || post.title;
  const seoDescription = post.metaDescription || post.excerpt;
  const ogImageUrl = absoluteImageUrl(post.ogImage || post.coverImage || "/og-default.png");

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      siteName: BRAND_NAME,
      url: `/blog/${slug}`,
      title: seoTitle,
      description: seoDescription,
      publishedTime: post.dateISO,
      images: [{ url: ogImageUrl, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: [ogImageUrl],
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const [post, posts] = await Promise.all([getBlogPost(slug), getBlogPosts()]);

  if (!post) {
    notFound();
  }

  const coverUrl = absoluteImageUrl(post.ogImage || post.coverImage || "/og-default.png");
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    datePublished: post.dateISO,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/og-default.png` },
    },
    image: [coverUrl],
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };

  return (
    <>
      <JsonLd data={[articleLd, breadcrumbLd]} />
      <BlogPostView post={post} posts={posts} />
    </>
  );
}
