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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return { title: "Post not found" };
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      siteName: BRAND_NAME,
      url: `/blog/${slug}`,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.dateISO,
      images: [{ url: post.coverImage ?? "/og-default.png", alt: post.title }],
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const [post, posts] = await Promise.all([getBlogPost(slug), getBlogPosts()]);

  if (!post) {
    notFound();
  }

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.dateISO,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/og-default.png` },
    },
    image: [`${SITE_URL}${post.coverImage ?? "/og-default.png"}`],
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
