"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, Loader2, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateHomepageContent, uploadContentImage } from "@/lib/admin/content-actions";
import {
  DEFAULT_HERO_DESKTOP,
  DEFAULT_HERO_MOBILE,
  DEFAULT_CONTENT,
  type SiteContent,
} from "@/lib/data/content-shape";

const inputCls =
  "w-full rounded-lg border border-cream-300 bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

/** Upload/preview control for one hero image; null value → bundled default. */
function ImageField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | null;
  fallback: string;
  onChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const src = value ?? fallback;

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadContentImage(fd);
    setUploading(false);
    if (res.ok) {
      onChange(res.url);
      toast.success("Image uploaded — Save to publish.");
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg border border-cream-300 bg-cream-100">
        <Image src={src} alt="" fill sizes="320px" className="object-cover" />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        {value ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onChange(null)}>
            <RotateCcw className="size-4" /> Use default
          </Button>
        ) : null}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="hidden" />
    </div>
  );
}

/**
 * `/admin/content` — edit the homepage hero + about-teaser copy, CTAs, and hero
 * images. Saves the whole blob via `updateHomepageContent` (which busts the
 * `site-content` cache + revalidates `/`).
 */
export function HomepageContentForm({
  initial,
  products,
}: {
  initial: SiteContent;
  products: { slug: string; title: string }[];
}) {
  const router = useRouter();
  // Defensive: fill any section a stale cached blob might be missing so the
  // form never reads `undefined.slug` etc.
  const [content, setContent] = useState<SiteContent>({
    hero: initial.hero ?? DEFAULT_CONTENT.hero,
    about: initial.about ?? DEFAULT_CONTENT.about,
    featured: initial.featured ?? DEFAULT_CONTENT.featured,
  });
  const [saving, setSaving] = useState(false);

  const setHero = <K extends keyof SiteContent["hero"]>(k: K, v: SiteContent["hero"][K]) =>
    setContent((c) => ({ ...c, hero: { ...c.hero, [k]: v } }));
  const setAbout = <K extends keyof SiteContent["about"]>(k: K, v: SiteContent["about"][K]) =>
    setContent((c) => ({ ...c, about: { ...c.about, [k]: v } }));
  const setFeatured = <K extends keyof SiteContent["featured"]>(k: K, v: SiteContent["featured"][K]) =>
    setContent((c) => ({ ...c, featured: { ...c.featured, [k]: v } }));

  const save = async () => {
    setSaving(true);
    const res = await updateHomepageContent(content);
    setSaving(false);
    if (res.ok) {
      toast.success("Homepage updated.");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-4">
      {/* HERO */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Hero banner</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Labelled label="Heading (use a line break for two lines)">
            <textarea value={content.hero.heading} onChange={(e) => setHero("heading", e.target.value)} rows={2} className={inputCls} />
          </Labelled>
          <Labelled label="Subheading">
            <textarea value={content.hero.subheading} onChange={(e) => setHero("subheading", e.target.value)} rows={2} className={inputCls} />
          </Labelled>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labelled label="Primary button label"><Input value={content.hero.primaryLabel} onChange={(e) => setHero("primaryLabel", e.target.value)} /></Labelled>
            <Labelled label="Primary button link"><Input value={content.hero.primaryHref} onChange={(e) => setHero("primaryHref", e.target.value)} placeholder="/collections/all" /></Labelled>
            <Labelled label="Secondary button label"><Input value={content.hero.secondaryLabel} onChange={(e) => setHero("secondaryLabel", e.target.value)} /></Labelled>
            <Labelled label="Secondary button link"><Input value={content.hero.secondaryHref} onChange={(e) => setHero("secondaryHref", e.target.value)} placeholder="/collections/by-age" /></Labelled>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageField label="Desktop image" value={content.hero.imageDesktop} fallback={DEFAULT_HERO_DESKTOP} onChange={(url) => setHero("imageDesktop", url)} />
            <ImageField label="Mobile image" value={content.hero.imageMobile} fallback={DEFAULT_HERO_MOBILE} onChange={(url) => setHero("imageMobile", url)} />
          </div>
        </CardContent>
      </Card>

      {/* FEATURED PRODUCT */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Featured product</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Labelled label="Product (image, price & badge come from this product)">
            <select
              value={content.featured.slug}
              onChange={(e) => setFeatured("slug", e.target.value)}
              className={`${inputCls} h-10`}
            >
              {products.some((p) => p.slug === content.featured.slug) ? null : (
                <option value={content.featured.slug}>{content.featured.slug} (not found)</option>
              )}
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>{p.title}</option>
              ))}
            </select>
          </Labelled>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labelled label="Eyebrow"><Input value={content.featured.eyebrow} onChange={(e) => setFeatured("eyebrow", e.target.value)} placeholder="New Arrival" /></Labelled>
            <Labelled label="Heading (blank = the product's own title)"><Input value={content.featured.heading} onChange={(e) => setFeatured("heading", e.target.value)} placeholder="(product title)" /></Labelled>
          </div>
          <Labelled label="Description">
            <textarea value={content.featured.description} onChange={(e) => setFeatured("description", e.target.value)} rows={3} className={inputCls} />
          </Labelled>
          <div>
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">Benefits (up to 3 shown)</span>
            <div className="space-y-1.5">
              {content.featured.benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={b} onChange={(e) => setFeatured("benefits", content.featured.benefits.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Benefit" />
                  <button type="button" onClick={() => setFeatured("benefits", content.featured.benefits.filter((_, j) => j !== i))} aria-label="Remove" className="flex size-9 flex-none items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger">✕</button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setFeatured("benefits", [...content.featured.benefits, ""])}>Add benefit</Button>
            </div>
          </div>
          <Labelled label="CTA button label"><Input value={content.featured.ctaLabel} onChange={(e) => setFeatured("ctaLabel", e.target.value)} placeholder="Discover the product" /></Labelled>
          <p className="text-xs text-ink-soft">The button links to the selected product page.</p>
        </CardContent>
      </Card>

      {/* ABOUT TEASER */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>About teaser</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Labelled label="Heading"><Input value={content.about.heading} onChange={(e) => setAbout("heading", e.target.value)} /></Labelled>
          <Labelled label="Subheading"><Input value={content.about.subheading} onChange={(e) => setAbout("subheading", e.target.value)} /></Labelled>
          <Labelled label="Body">
            <textarea value={content.about.body} onChange={(e) => setAbout("body", e.target.value)} rows={3} className={inputCls} />
          </Labelled>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labelled label="Primary button label"><Input value={content.about.primaryLabel} onChange={(e) => setAbout("primaryLabel", e.target.value)} /></Labelled>
            <Labelled label="Primary button link"><Input value={content.about.primaryHref} onChange={(e) => setAbout("primaryHref", e.target.value)} placeholder="/about" /></Labelled>
            <Labelled label="Secondary button label"><Input value={content.about.secondaryLabel} onChange={(e) => setAbout("secondaryLabel", e.target.value)} /></Labelled>
            <Labelled label="Secondary button link"><Input value={content.about.secondaryHref} onChange={(e) => setAbout("secondaryHref", e.target.value)} placeholder="/collections/all" /></Labelled>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} className="shadow-lg">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save homepage"}
        </Button>
      </div>
    </div>
  );
}
