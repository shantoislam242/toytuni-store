"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteBlogPost } from "@/lib/admin/actions";
import type { AdminBlogListItem } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        published ? "bg-neem/15 text-neem-deep" : "bg-muted text-muted-foreground",
      )}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

/**
 * Blog posts list (Task 5). Client component so the title/category/author
 * search filters instantly — the underlying data (`getAdminBlogPosts()`,
 * service-role, every status incl. drafts) is fetched once, server-side, by
 * the parent page. Rows link to the markdown editor at
 * `/admin/blog/[slug]/edit`; Delete calls `deleteBlogPost` directly (confirm
 * + toast + `router.refresh()`), same idiom as `TaxonomyManager`'s row delete.
 */
export function BlogPostsTable({ items }: { items: AdminBlogListItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.author ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  const remove = (item: AdminBlogListItem) => {
    if (!confirm(`Delete "${item.title}"? This can't be undone.`)) return;
    setBusySlug(item.slug);
    startTransition(async () => {
      const result = await deleteBlogPost(item.slug);
      setBusySlug(null);
      if (result.ok) {
        toast.success("Post deleted.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, category or author…"
            className="h-9 pl-8"
          />
        </div>
        <Button asChild size="sm">
          <Link href="/admin/blog/new">
            <Plus className="size-4" />
            New post
          </Link>
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-cream-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-300 bg-cream-100 text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Author</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Featured</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">
                  {items.length === 0 ? "No posts yet." : `No posts match "${query}".`}
                </td>
              </tr>
            ) : (
              filtered.map((post) => (
                <tr
                  key={post.slug}
                  className="border-b border-cream-200 last:border-b-0 hover:bg-cream-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/blog/${post.slug}/edit`}
                      className="font-medium text-ink hover:underline"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{post.category ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{post.author ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{post.dateISO ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge published={post.published} />
                  </td>
                  <td className="px-4 py-3">
                    {post.featured ? (
                      <Star className="size-4 fill-mustard text-mustard" aria-label="Featured" />
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Delete ${post.title}`}
                      disabled={isPending && busySlug === post.slug}
                      className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                      onClick={() => remove(post)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
