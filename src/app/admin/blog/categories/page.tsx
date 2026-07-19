import type { Metadata } from "next";
import { getAdminBlogCategories } from "@/lib/admin/queries";
import { BlogCategoryManager } from "@/components/admin/blog-category-manager";

export const metadata: Metadata = { title: "Blog categories", robots: { index: false, follow: false } };

/** Blog categories admin (Blog 3c, Task 4) — the `blog_categories` counterpart
 *  to `/admin/categories`'s `TaxonomyManager`, minus the "tone" field. */
export default async function Page() {
  const categories = await getAdminBlogCategories();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Blog categories</h1>
      <p className="mt-1 text-sm text-ink-muted">Manage the categories blog posts can be filed under.</p>
      <div className="mt-6">
        <BlogCategoryManager items={categories} />
      </div>
    </div>
  );
}
