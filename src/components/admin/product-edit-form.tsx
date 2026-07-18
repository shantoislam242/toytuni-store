"use client";

import { useRef, useState, useTransition } from "react";
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
import { ProductImage } from "@/components/product/product-image";
import { ProductFrame } from "@/components/product/product-frame";
import {
  updateProduct,
  uploadProductImage,
  softDeleteProduct,
  type ProductPatch,
} from "@/lib/admin/actions";
import type { TaxonomyOption } from "@/components/admin/product-create-form";
import type { AdminProductDetail } from "@/lib/admin/queries";
import type { Tone } from "@/lib/types";
import { cn } from "@/lib/utils";

const BADGE_OPTIONS = ["New", "Best Seller", "Limited"] as const;
const BADGE_NONE = "__none__";

/** Parse a user-entered integer field. Returns `null` for blank/invalid so the
 *  caller can decide whether that's an error or an intentional clear. */
function parseIntOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      <p className="mt-1 text-sm text-ink">{value || "—"}</p>
    </div>
  );
}

/**
 * Product edit form (Slice 2). Operational overlay fields AND the structural
 * fields (title/description/category/age-tier/badge) are now editable — the
 * catalog is DB-sourced, so structural edits reflect on the storefront. Saving
 * calls the `updateProduct` Server Action; the image control calls
 * `uploadProductImage`; "Deactivate" calls `softDeleteProduct`. No client
 * Supabase import: all writes go through the server actions (service-role stays
 * server-only).
 */
export function ProductEditForm({
  product,
  categories,
  ageTiers,
}: {
  product: AdminProductDetail;
  categories: TaxonomyOption[];
  ageTiers: TaxonomyOption[];
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isUploading, startUploading] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description ?? "");
  const [category, setCategory] = useState(product.categorySlug ?? "");
  const [ageTier, setAgeTier] = useState(product.ageTierSlug ?? "");
  const [price, setPrice] = useState(String(product.price));
  const [compareAt, setCompareAt] = useState(
    product.compareAtPrice === null ? "" : String(product.compareAtPrice),
  );
  const [stock, setStock] = useState(String(product.stockQty));
  const [lowStock, setLowStock] = useState(String(product.lowStockThreshold));
  const [preorder, setPreorder] = useState(product.preorderShipDate ?? "");
  const [active, setActive] = useState(product.active);
  const [badge, setBadge] = useState(product.badge ?? BADGE_NONE);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const fallbackTone = (product.imageTones[0] as Tone | undefined) ?? "cream";
  const shownImageUrl = uploadedUrl ?? previewUrl ?? product.imageUrl ?? undefined;

  const handleSave = () => {
    const patch: ProductPatch = {};

    const cleanTitle = title.trim();
    if (cleanTitle === "") return toast.error("Title is required.");
    patch.title = cleanTitle;
    patch.description = description.trim() === "" ? null : description.trim();
    if (!category) return toast.error("Choose a category.");
    patch.category_slug = category;
    if (!ageTier) return toast.error("Choose an age tier.");
    patch.age_tier_slug = ageTier;

    const priceNum = parseIntOrNull(price);
    if (priceNum === null) return toast.error("Price must be a non-negative whole number.");
    patch.price = priceNum;

    if (compareAt.trim() === "") {
      patch.compare_at_price = null;
    } else {
      const c = parseIntOrNull(compareAt);
      if (c === null) return toast.error("Compare-at price must be a non-negative whole number or empty.");
      patch.compare_at_price = c;
    }

    const stockNum = parseIntOrNull(stock);
    if (stockNum === null) return toast.error("Stock must be a non-negative whole number.");
    patch.stock_qty = stockNum;

    const lowNum = parseIntOrNull(lowStock);
    if (lowNum === null) return toast.error("Low-stock threshold must be a non-negative whole number.");
    patch.low_stock_threshold = lowNum;

    patch.preorder_ship_date = preorder.trim() === "" ? null : preorder;
    patch.active = active;
    patch.badge = badge === BADGE_NONE ? null : (badge as (typeof BADGE_OPTIONS)[number]);

    startSaving(async () => {
      const result = await updateProduct(product.slug, patch);
      if (result.ok) {
        toast.success("Product saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDeactivate = () => {
    startDeleting(async () => {
      const result = await softDeleteProduct(product.slug);
      if (result.ok) {
        toast.success("Product deactivated.");
        router.push("/admin/products");
      } else {
        toast.error(result.error);
        setConfirmOpen(false);
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadedUrl(null);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return toast.error("Choose an image first.");
    const formData = new FormData();
    formData.set("file", file);

    startUploading(async () => {
      const result = await uploadProductImage(product.slug, formData);
      if (result.ok) {
        setUploadedUrl(result.url);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        toast.success("Image uploaded.");
        router.refresh();
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
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Pre-order ship date
              </span>
              <Input
                type="date"
                value={preorder}
                onChange={(e) => setPreorder(e.target.value)}
                className="mt-1"
              />
            </label>
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
            <div className="sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Status</span>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive((v) => !v)}
                className="mt-1 flex items-center gap-3"
              >
                <span
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    active ? "bg-neem" : "bg-cream-300",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform",
                      active && "translate-x-[22px]",
                    )}
                  />
                </span>
                <span className="text-sm text-ink">{active ? "Active" : "Inactive"}</span>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cream-300">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Title</span>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
              </label>
              <ReadOnlyField label="SKU" value={product.sku} />
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
            </div>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
            onClick={() => setConfirmOpen(true)}
            disabled={isDeleting || !product.active}
          >
            {product.active ? "Deactivate" : "Already inactive"}
          </Button>
          <Button size="lg" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => !isDeleting && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-cream-300 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="deactivate-title" className="font-display text-lg font-bold text-ink">
              Deactivate this product?
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              It will be hidden from the storefront but kept in the catalog and in
              existing orders. You can reactivate it later from the Status toggle.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                className="bg-danger text-white hover:bg-danger/90"
                onClick={handleDeactivate}
                disabled={isDeleting}
              >
                {isDeleting ? "Deactivating…" : "Deactivate"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="border-cream-300 lg:col-span-1">
        <CardHeader>
          <CardTitle>Product image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProductFrame className="w-full" interactive={false}>
            <ProductImage
              slug={product.slug}
              imageNum={1}
              label={product.imageLabel ?? product.title}
              fallbackTone={fallbackTone}
              imageUrl={shownImageUrl}
            />
          </ProductFrame>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border file:border-cream-300 file:bg-cream-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-cream-200"
          />

          <Button
            variant="outline"
            className="w-full"
            onClick={handleUpload}
            disabled={isUploading}
          >
            <Upload className="size-4" />
            {isUploading ? "Uploading…" : "Upload image"}
          </Button>

          <p className="text-xs text-ink-soft">
            JPG, PNG, WebP or GIF, up to 5 MB. The uploaded photo replaces the
            bundled image everywhere on the storefront.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
