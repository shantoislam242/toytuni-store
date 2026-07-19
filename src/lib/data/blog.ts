import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { blogPosts as mockPosts, blogCategories as mockCategories } from "@/lib/mock/blog";
import { blockToMarkdown } from "@/lib/blog/block-to-markdown";
import type { BlogCategory, BlogPostData, Tone } from "@/lib/types";

/** `blog_posts`/`blog_categories` predate the generated types in their
 *  current shape (migration 0008 repurposed `body` to text and added
 *  `cover_tone`/`cover_label`; `blog_categories` didn't exist at all) — same
 *  `as never` table-name escape hatch the seed script (`scripts/seed.ts`) and
 *  `src/lib/admin/actions.ts` use elsewhere for columns/tables absent from
 *  `database.types.ts`. Row shapes are supplied via `.overrideTypes()`. */
type BlogRow = {
  slug: string; title: string; excerpt: string | null; body: string; author: string | null;
  cover_image: string | null; category: string | null; read_mins: number | null;
  date_iso: string | null; featured: boolean; cover_tone: string | null; cover_label: string | null;
  focus_keyword: string | null; seo_title: string | null; meta_description: string | null; og_image: string | null;
  tags: string[] | null; scheduled_at: string | null;
};

function rowToPost(r: BlogRow): BlogPostData {
  return {
    slug: r.slug, title: r.title, excerpt: r.excerpt ?? "", category: r.category ?? "",
    dateISO: r.date_iso ?? "", readMins: r.read_mins ?? 3, author: r.author ?? "",
    coverTone: (r.cover_tone as Tone) ?? "cream", coverLabel: r.cover_label ?? r.title,
    coverImage: r.cover_image ?? undefined, featured: r.featured, bodyMarkdown: r.body ?? "",
    seoTitle: r.seo_title ?? null, metaDescription: r.meta_description ?? null,
    ogImage: r.og_image ?? null, focusKeyword: r.focus_keyword ?? null,
    tags: r.tags ?? [],
  };
}

/** Mock → BlogPostData (fail-soft). Body blocks become markdown. Mock posts
 *  carry no SEO overrides — always null (storefront falls back to title/excerpt/coverImage);
 *  no tags either. */
function mockToData(): BlogPostData[] {
  return mockPosts.map((p) => ({
    slug: p.slug, title: p.title, excerpt: p.excerpt, category: p.category, dateISO: p.dateISO,
    readMins: p.readMins, author: p.author, coverTone: p.coverTone, coverLabel: p.coverLabel,
    coverImage: p.coverImage, featured: p.featured ?? false, bodyMarkdown: blockToMarkdown(p.body),
    seoTitle: null, metaDescription: null, ogImage: null, focusKeyword: null,
    tags: [],
  }));
}

async function readPublishedPosts(): Promise<BlogPostData[]> {
  try {
    const supabase = createPublicSupabase();
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("blog_posts" as never)
      .select("slug, title, excerpt, body, author, cover_image, category, read_mins, date_iso, featured, cover_tone, cover_label, focus_keyword, seo_title, meta_description, og_image, tags, scheduled_at")
      .or(`published.eq.true,scheduled_at.lte.${nowIso}`)
      .order("date_iso", { ascending: false })
      .overrideTypes<BlogRow[], { merge: false }>();
    if (error) throw error;
    return (data ?? []).map(rowToPost);
  } catch (err) {
    console.error("getBlogPosts failed; mock fallback:", err);
    return mockToData();
  }
}

export const getBlogPosts = unstable_cache(readPublishedPosts, ["blog-posts"], { tags: ["blog"], revalidate: 3600 });

export function getBlogPost(slug: string): Promise<BlogPostData | undefined> {
  return unstable_cache(
    async () => (await readPublishedPosts()).find((p) => p.slug === slug),
    ["blog-post", slug], { tags: ["blog"], revalidate: 3600 },
  )();
}

async function readCategories(): Promise<BlogCategory[]> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase.from("blog_categories" as never).select("slug, name, sort")
      .order("sort", { ascending: true })
      .overrideTypes<{ slug: string; name: string; sort: number }[], { merge: false }>();
    if (error) throw error;
    return (data ?? []).map((c) => ({ slug: c.slug, name: c.name }));
  } catch (err) {
    console.error("getBlogCategories failed; mock fallback:", err);
    return mockCategories;
  }
}
export const getBlogCategories = unstable_cache(readCategories, ["blog-categories"], { tags: ["blog"], revalidate: 3600 });
