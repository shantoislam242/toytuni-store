"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SeoPanel } from "@/components/admin/seo-panel";
import { SnippetPreview } from "@/components/admin/snippet-preview";
import { StringListEditor } from "@/components/admin/string-list-editor";
import { createBlogPost, updateBlogPost, uploadBlogCover } from "@/lib/admin/actions";
import type { AdminBlogPost } from "@/lib/admin/queries";
import type { BlogCategory } from "@/lib/types";
import { analyzeSeo } from "@/lib/blog/seo-analysis";
import { analyzeReadability } from "@/lib/blog/readability-analysis";
import { htmlToBlockText } from "@/lib/blog/process-html";
import { postStatus } from "@/lib/blog/post-live";
import { cn } from "@/lib/utils";

/** Derive a url-safe slug from a free-text title (mirrors `ProductCreateForm`'s
 *  `slugify`). */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Convert a stored UTC ISO timestamp (`AdminBlogPost.scheduledAt`) into the
 *  local `YYYY-MM-DDTHH:mm` value a native `datetime-local` input expects.
 *  Round-trips with `new Date(localValue).toISOString()` on submit, since the
 *  browser interprets that local string in the same timezone this shift
 *  undoes. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // shift by the local tz offset so toISOString slice yields LOCAL wall-clock
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

function ToggleField({
  label, checked, onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3"
    >
      <span
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked ? "bg-neem" : "bg-cream-300",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-[22px]",
          )}
        />
      </span>
      <span className="text-sm text-ink">{label}</span>
    </button>
  );
}

/**
 * Blog post form (Task 5). Shared by the new-post and edit-post pages — in
 * edit mode `post` is supplied and the slug field becomes read-only (slugs
 * are immutable once created, same rule as `TaxonomyManager`'s dialog).
 *
 * Cover upload: `uploadBlogCover` only needs a slug *string* to namespace the
 * Storage object path, not an existing `blog_posts` row — so on the NEW-post
 * form the admin can upload a cover as soon as they've entered/derived a
 * slug, before clicking "Create post". The returned URL is held in local
 * state and sent as `coverImage` on create/update, same as the rest of the
 * form's fields.
 */
export function BlogPostForm({
  categories,
  post,
}: {
  categories: BlogCategory[];
  post?: AdminBlogPost;
}) {
  const router = useRouter();
  const isEdit = post !== undefined;
  const [isSaving, startSaving] = useTransition();
  const [isUploading, startUploading] = useTransition();

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [category, setCategory] = useState(post?.category ?? "");
  const [author, setAuthor] = useState(post?.author ?? "");
  const [body, setBody] = useState(post?.bodyMarkdown ?? "");
  const [featured, setFeatured] = useState(post?.featured ?? false);
  const [published, setPublished] = useState(post?.published ?? false);
  const [coverImage, setCoverImage] = useState<string | null>(post?.coverImage ?? null);
  const [tags, setTags] = useState<string[]>(post?.tags ?? []);
  const [scheduledAt, setScheduledAt] = useState(isoToLocalInput(post?.scheduledAt ?? null));

  const [focusKeyword, setFocusKeyword] = useState(post?.focusKeyword ?? "");
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription ?? "");
  const [ogImage, setOgImage] = useState<string | null>(post?.ogImage ?? null);
  const [isUploadingOgImage, startUploadingOgImage] = useTransition();

  // Body is now HTML. analyzeSeo takes it directly (it strips tags internally +
  // reads HTML structure for heading/link/image checks); readability wants
  // plain text.
  // Readability needs paragraph structure preserved (htmlToBlockText keeps block
  // breaks); analyzeSeo takes the HTML directly (it strips + reads structure).
  const bodyText = useMemo(() => htmlToBlockText(body), [body]);
  const seoResult = useMemo(
    () => analyzeSeo({ title, seoTitle, metaDescription, slug, focusKeyword, bodyMarkdown: body, excerpt }),
    [title, seoTitle, metaDescription, slug, focusKeyword, body, excerpt],
  );
  const readResult = useMemo(() => analyzeReadability(bodyText), [bodyText]);

  // Keep slug in sync with the title until the admin hand-edits it (create only).
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEdit && !slugEdited) setSlug(slugify(value));
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (slug.trim() === "") return toast.error("Enter a slug first.");
    const formData = new FormData();
    formData.set("file", file);
    startUploading(async () => {
      const result = await uploadBlogCover(slug, formData);
      if (result.ok) {
        setCoverImage(result.url);
        toast.success("Cover image uploaded.");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleOgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (slug.trim() === "") return toast.error("Enter a slug first.");
    const formData = new FormData();
    formData.set("file", file);
    startUploadingOgImage(async () => {
      const result = await uploadBlogCover(slug, formData);
      if (result.ok) {
        setOgImage(result.url);
        toast.success("OG image uploaded.");
      } else {
        toast.error(result.error);
      }
    });
  };

  /** Upload an image for the rich-text editor's toolbar (returns the URL, or
   *  null on error). Reuses the same `uploadBlogCover` action as the cover/OG
   *  uploads (public `product-images` bucket, namespaced by slug). */
  const handleEditorImageUpload = async (file: File): Promise<string | null> => {
    if (slug.trim() === "") {
      toast.error("Enter a slug first.");
      return null;
    }
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadBlogCover(slug, formData);
    if (result.ok) {
      toast.success("Image inserted.");
      return result.url;
    }
    toast.error(result.error);
    return null;
  };

  const handleSubmit = () => {
    const cleanTitle = title.trim();
    if (cleanTitle === "") return toast.error("Title is required.");
    if (slug.trim() === "") return toast.error("Slug is required.");
    if (!category) return toast.error("Choose a category.");
    if (author.trim() === "") return toast.error("Author is required.");

    if (isEdit && post) {
      startSaving(async () => {
        const result = await updateBlogPost(post.slug, {
          title: cleanTitle,
          excerpt: excerpt.trim(),
          bodyMarkdown: body,
          category,
          author: author.trim(),
          coverImage,
          featured,
          published,
          focusKeyword: focusKeyword.trim() || null,
          seoTitle: seoTitle.trim() || null,
          metaDescription: metaDescription.trim() || null,
          ogImage,
          tags,
          scheduledAt: scheduledAt.trim() === "" ? null : new Date(scheduledAt).toISOString(),
        });
        if (result.ok) {
          toast.success("Post saved.");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      });
    } else {
      startSaving(async () => {
        const result = await createBlogPost({
          slug: slug.trim(),
          title: cleanTitle,
          excerpt: excerpt.trim(),
          bodyMarkdown: body,
          category,
          author: author.trim(),
          coverImage,
          featured,
          published,
          focusKeyword: focusKeyword.trim() || null,
          seoTitle: seoTitle.trim() || null,
          metaDescription: metaDescription.trim() || null,
          ogImage,
          tags,
          scheduledAt: scheduledAt.trim() === "" ? null : new Date(scheduledAt).toISOString(),
        });
        if (result.ok) {
          toast.success("Post created.");
          router.push("/admin/blog");
        } else {
          toast.error(result.error);
        }
      });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="border-cream-300">
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Title</span>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="How we choose safe finishes for wooden toys"
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Slug</span>
              {isEdit ? (
                <p className="mt-1 font-mono text-sm text-ink">{slug}</p>
              ) : (
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="safe-finishes-for-wooden-toys"
                  className="mt-1 font-mono"
                />
              )}
              {isEdit && <span className="mt-1 block text-xs text-ink-soft">Slug can&rsquo;t be changed.</span>}
            </label>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Category</span>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Author</span>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} className="mt-1" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Excerpt</span>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                placeholder="One or two sentences shown on the blog listing and cards."
                className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>
            <div className="sm:col-span-2">
              <StringListEditor label="Tags" value={tags} onChange={setTags} addLabel="Add tag" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-cream-300">
          <CardHeader>
            <CardTitle>Body</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextEditor value={body} onChange={setBody} onImageUpload={handleEditorImageUpload} />
            <p className="mt-2 text-xs text-ink-soft">
              Format freely — headings, colours, highlight, size, alignment, lists, links and images. Use “Upload image”
              in the toolbar to add photos (needs a slug first).
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button size="lg" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving…" : isEdit ? "Save changes" : "Create post"}
          </Button>
        </div>
      </div>

      <div className="space-y-4 lg:col-span-1">
        <Card className="border-cream-300">
          <CardHeader>
            <CardTitle>Cover image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {coverImage ? (
              <div className="relative aspect-video overflow-hidden rounded-lg border border-cream-300 bg-cream-50">
                {/* Plain <img>, matching GalleryEditor's approach for
                    admin-uploaded Storage URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImage} alt="" className="size-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-cream-300 bg-cream-50 text-xs text-ink-soft">
                No cover image
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              disabled={isUploading}
              className="block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border file:border-cream-300 file:bg-cream-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-cream-200"
            />

            <p className="text-xs text-ink-soft">
              <Upload className="mr-1 inline size-3.5 align-[-2px]" />
              {isUploading ? "Uploading…" : "JPG, PNG, WebP or GIF, up to 5 MB. Needs a slug first."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-cream-300">
          <CardHeader>
            <CardTitle>Visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleField label={featured ? "Featured" : "Not featured"} checked={featured} onChange={setFeatured} />
            <ToggleField label={published ? "Published" : "Draft"} checked={published} onChange={setPublished} />
            <p className="text-xs text-ink-soft">
              Drafts are hidden from the storefront blog and 404 if visited directly.
            </p>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Schedule</span>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1"
              />
              <span className="mt-1 block text-xs text-ink-soft">
                Set a future time to schedule; the post goes live then.
              </span>
            </label>
            <p className="text-xs font-medium text-ink-muted">
              Status:{" "}
              <span className="text-ink">
                {postStatus({ published, scheduledAt: scheduledAt || null, now: new Date() })}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-cream-300 lg:col-span-3">
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Focus keyword</span>
              <Input
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                placeholder="wooden toy safety"
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-ink-muted">
                <span>SEO title</span>
                <span className="tabular-nums normal-case text-ink-soft">{seoTitle.length}/60</span>
              </span>
              <Input
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={title || "Defaults to the post title"}
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-ink-muted">
                <span>Meta description</span>
                <span className="tabular-nums normal-case text-ink-soft">{metaDescription.length}/156</span>
              </span>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={3}
                placeholder={excerpt || "Defaults to the post excerpt"}
                className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>

            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">OG image</span>
              <div className="mt-1 space-y-3">
                {ogImage ? (
                  <div className="relative aspect-video overflow-hidden rounded-lg border border-cream-300 bg-cream-50">
                    {/* Plain <img>, matching the cover-image control's approach for
                        admin-uploaded Storage URLs. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ogImage} alt="" className="size-full object-cover" />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-cream-300 bg-cream-50 text-xs text-ink-soft">
                    No OG image — falls back to the cover image
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleOgImageUpload}
                  disabled={isUploadingOgImage}
                  className="block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border file:border-cream-300 file:bg-cream-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-cream-200"
                />

                <p className="text-xs text-ink-soft">
                  <Upload className="mr-1 inline size-3.5 align-[-2px]" />
                  {isUploadingOgImage ? "Uploading…" : "JPG, PNG, WebP or GIF, up to 5 MB. Needs a slug first."}
                </p>
              </div>
            </div>

            <SnippetPreview title={seoTitle || title} slug={slug} description={metaDescription || excerpt} />
          </div>

          <div className="space-y-4">
            <SeoPanel title="SEO analysis" result={seoResult} />
            <SeoPanel title="Readability" result={readResult} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
