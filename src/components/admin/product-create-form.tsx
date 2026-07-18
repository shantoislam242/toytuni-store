"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { ProductImage } from "@/components/product/product-image";
import { ProductFrame } from "@/components/product/product-frame";
import { createProduct, type CreateProductInput } from "@/lib/admin/actions";

const BADGE_OPTIONS = ["New", "Best Seller", "Limited"] as const;
const BADGE_NONE = "__none__";

/** Slug/age-tier options, mapped from the DB taxonomy by the server page. */
export type TaxonomyOption = { slug: string; label: string };

/** Parse a user-entered non-negative integer. Returns `null` for blank/invalid. */
function parseIntOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** Derive a url-safe slug from a free-text title. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * New-product form (Slice 2). Client component that gathers the full set of
 * catalog fields and calls the `createProduct` Server Action (which re-checks
 * admin + validates server-side). On success it redirects to the edit page for
 * the new product. No client Supabase import — the action owns all writes.
 */
export function ProductCreateForm({
  categories,
  ageTiers,
}: {
  categories: TaxonomyOption[];
  ageTiers: TaxonomyOption[];
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [category, setCategory] = useState<string>("");
  const [ageTier, setAgeTier] = useState<string>("");
  const [stock, setStock] = useState("0");
  const [lowStock, setLowStock] = useState("0");
  const [badge, setBadge] = useState(BADGE_NONE);
  const [description, setDescription] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Keep slug in sync with the title until the admin hand-edits it.
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = () => {
    const cleanTitle = title.trim();
    if (cleanTitle === "") return toast.error("Title is required.");
    if (slug.trim() === "") return toast.error("Slug is required.");
    if (sku.trim() === "") return toast.error("SKU is required.");

    const priceNum = parseIntOrNull(price);
    if (priceNum === null) return toast.error("Price must be a non-negative whole number.");

    let compareAtVal: number | null = null;
    if (compareAt.trim() !== "") {
      const c = parseIntOrNull(compareAt);
      if (c === null) return toast.error("Compare-at price must be a non-negative whole number or empty.");
      compareAtVal = c;
    }
    if (!category) return toast.error("Choose a category.");
    if (!ageTier) return toast.error("Choose an age tier.");

    const stockNum = parseIntOrNull(stock);
    if (stockNum === null) return toast.error("Stock must be a non-negative whole number.");
    const lowNum = parseIntOrNull(lowStock);
    if (lowNum === null) return toast.error("Low-stock threshold must be a non-negative whole number.");

    const input: CreateProductInput = {
      slug: slug.trim(),
      sku: sku.trim(),
      title: cleanTitle,
      price: priceNum,
      compareAtPrice: compareAtVal,
      categorySlug: category,
      ageTierSlug: ageTier,
      stockQty: stockNum,
      lowStockThreshold: lowNum,
      badge: badge === BADGE_NONE ? null : (badge as (typeof BADGE_OPTIONS)[number]),
      description: description.trim() || null,
      image: fileInputRef.current?.files?.[0] ?? null,
    };

    startSaving(async () => {
      const result = await createProduct(input);
      if (result.ok) {
        toast.success("Product created.");
        router.push(`/admin/products/${result.slug}`);
      } else {
        toast.error(result.error);
      }
    });
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
                placeholder="Neem wood rattle"
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Slug</span>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(e.target.value);
                }}
                placeholder="neem-wood-rattle"
                className="mt-1 font-mono"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">SKU</span>
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="NWR-0001"
                className="mt-1 font-mono"
              />
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
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Age tier</span>
              <Select value={ageTier} onValueChange={setAgeTier}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Choose age tier" />
                </SelectTrigger>
                <SelectContent>
                  {ageTiers.map((a) => (
                    <SelectItem key={a.slug} value={a.slug}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Badge</span>
              <Select value={badge} onValueChange={setBadge}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BADGE_NONE}>None</SelectItem>
                  {BADGE_OPTIONS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Short product description shown on the storefront."
                className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>
          </CardContent>
        </Card>

        <Card className="border-cream-300">
          <CardHeader>
            <CardTitle>Pricing &amp; inventory</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Price (৳)</span>
              <Input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Compare-at price (৳)
              </span>
              <Input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={compareAt}
                onChange={(e) => setCompareAt(e.target.value)}
                placeholder="None"
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Stock qty</span>
              <Input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Low-stock threshold
              </span>
              <Input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={lowStock}
                onChange={(e) => setLowStock(e.target.value)}
                className="mt-1"
              />
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button size="lg" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Creating…" : "Create product"}
          </Button>
        </div>
      </div>

      <Card className="border-cream-300 lg:col-span-1">
        <CardHeader>
          <CardTitle>Product image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProductFrame className="w-full" interactive={false}>
            <ProductImage
              slug={slug || "new-product"}
              imageNum={1}
              label={title || "New product"}
              fallbackTone="cream"
              imageUrl={previewUrl ?? undefined}
            />
          </ProductFrame>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border file:border-cream-300 file:bg-cream-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-cream-200"
          />

          <p className="text-xs text-ink-soft">
            Optional. JPG, PNG, WebP or GIF, up to 5 MB. You can also add or
            change the photo later from the edit page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
