"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTk } from "@/lib/format";
import { divisionNames, districtsForDivision } from "@/lib/bd-locations";
import { PHONE_RE, normalizeBdPhone } from "@/lib/checkout/address-fields";
import { createManualOrder } from "@/lib/admin/manual-order";

type PickProduct = { slug: string; title: string; sku: string; price: number; stockQty: number };

const inputCls =
  "h-10 w-full rounded-lg border border-cream-300 bg-paper px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </span>
      {children}
    </label>
  );
}

/**
 * Admin "new order" form — place an order for a customer (phone/in-store). Picks
 * products from the catalog, collects customer + delivery details, and calls
 * `createManualOrder` (which re-validates everything via the shared
 * `createOrder`). Delivery + any coupon are priced server-side at placement.
 */
export function ManualOrderForm({ products }: { products: PickProduct[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Record<string, number>>({}); // slug → qty
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [address, setAddress] = useState({ division: "", district: "", area: "", addressLine: "", landmark: "" });
  const [coupon, setCoupon] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, products]);

  const lineList = Object.entries(lines).filter(([, qty]) => qty > 0);
  const subtotal = lineList.reduce((sum, [slug, qty]) => sum + (bySlug.get(slug)?.price ?? 0) * qty, 0);

  const addLine = (slug: string) => {
    setLines((l) => ({ ...l, [slug]: (l[slug] ?? 0) + 1 }));
    setQuery("");
  };
  const setQty = (slug: string, qty: number) =>
    setLines((l) => ({ ...l, [slug]: Math.max(0, qty) }));
  const removeLine = (slug: string) =>
    setLines((l) => {
      const { [slug]: _drop, ...rest } = l;
      return rest;
    });

  const districts = districtsForDivision(address.division);

  const submit = async () => {
    if (lineList.length === 0) return toast.error("Add at least one product.");
    if (!customer.name.trim()) return toast.error("Customer name is required.");
    if (!PHONE_RE.test(customer.phone.trim())) return toast.error("Enter a valid BD phone, e.g. 01712345678.");
    if (!address.division || !address.district) return toast.error("Select a division and district.");
    if (!address.area.trim() || !address.addressLine.trim()) return toast.error("Area and full address are required.");

    setSubmitting(true);
    const res = await createManualOrder({
      customer: {
        name: customer.name.trim(),
        phone: normalizeBdPhone(customer.phone),
        email: customer.email.trim() || undefined,
      },
      address: {
        division: address.division,
        district: address.district,
        area: address.area.trim(),
        addressLine: address.addressLine.trim(),
        landmark: address.landmark.trim() || undefined,
      },
      lines: lineList.map(([slug, qty]) => ({ slug, qty })),
      notes: notes.trim() || undefined,
      couponCode: coupon.trim() || undefined,
      deliveryFee: 0, // display-only; createOrder prices it authoritatively
      shippingMethodId: "standard",
    });
    setSubmitting(false);

    if (res.ok) {
      toast.success(`Order ${res.orderNumber} created.`);
      router.push("/admin/orders");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      {/* left: products + customer + address */}
      <div className="space-y-4">
        <Card className="border-cream-300">
          <CardHeader><CardTitle>Products</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products by name or SKU…"
                className="pl-9"
              />
              {matches.length > 0 ? (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-cream-300 bg-paper shadow-lg">
                  {matches.map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => addLine(p.slug)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-cream-100"
                    >
                      <span className="min-w-0 truncate text-ink">
                        {p.title} <span className="text-ink-soft">· {p.sku}</span>
                      </span>
                      <span className="flex-none text-ink-muted">{formatTk(p.price)}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {lineList.length === 0 ? (
              <div className="flex flex-col items-center rounded-lg border border-dashed border-cream-300 px-4 py-8 text-center text-sm text-ink-muted">
                <ShoppingCart className="mb-2 size-6 text-ink-soft" />
                Search above to add products to the order.
              </div>
            ) : (
              <ul className="divide-y divide-cream-200 rounded-lg border border-cream-200">
                {lineList.map(([slug, qty]) => {
                  const p = bySlug.get(slug);
                  if (!p) return null;
                  return (
                    <li key={slug} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{p.title}</p>
                        <p className="text-xs text-ink-soft">
                          {formatTk(p.price)} · stock {p.stockQty}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setQty(slug, qty - 1)} className="flex size-7 items-center justify-center rounded-md border border-cream-300 text-ink-muted hover:bg-cream-100" aria-label="Decrease">
                          <Minus className="size-3.5" />
                        </button>
                        <input
                          type="number" min={1} value={qty}
                          onChange={(e) => setQty(slug, Math.round(Number(e.target.value) || 0))}
                          className="h-7 w-12 rounded-md border border-cream-300 bg-paper text-center text-sm text-ink outline-none focus-visible:border-neem"
                        />
                        <button type="button" onClick={() => setQty(slug, qty + 1)} className="flex size-7 items-center justify-center rounded-md border border-cream-300 text-ink-muted hover:bg-cream-100" aria-label="Increase">
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="w-20 flex-none text-right text-sm font-medium tabular-nums text-ink">
                        {formatTk(p.price * qty)}
                      </span>
                      <button type="button" onClick={() => removeLine(slug)} className="flex size-7 flex-none items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger" aria-label="Remove">
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-cream-300">
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" required>
              <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Recipient's name" />
            </Field>
            <Field label="Phone" required>
              <Input
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                placeholder="01712345678" inputMode="numeric"
              />
            </Field>
            <Field label="Email (optional)">
              <Input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="you@example.com" type="email" />
            </Field>
          </CardContent>
        </Card>

        <Card className="border-cream-300">
          <CardHeader><CardTitle>Delivery address</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Division" required>
              <select value={address.division} onChange={(e) => setAddress({ ...address, division: e.target.value, district: "" })} className={inputCls}>
                <option value="">Select division</option>
                {divisionNames.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="District" required>
              <select value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} disabled={!address.division} className={`${inputCls} disabled:opacity-60`}>
                <option value="">{address.division ? "Select district" : "Select division first"}</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Area / Thana" required>
              <Input value={address.area} onChange={(e) => setAddress({ ...address, area: e.target.value })} placeholder="e.g. Banani" />
            </Field>
            <Field label="Full address" required>
              <Input value={address.addressLine} onChange={(e) => setAddress({ ...address, addressLine: e.target.value })} placeholder="House / Road / Block" />
            </Field>
            <Field label="Landmark (optional)">
              <Input value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })} placeholder="Nearby landmark" />
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* right: summary + extras + submit */}
      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="border-cream-300">
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">Items</span>
              <span className="font-medium text-ink">{lineList.reduce((n, [, q]) => n + q, 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">Subtotal</span>
              <span className="font-semibold text-ink">{formatTk(subtotal)}</span>
            </div>
            <p className="text-xs text-ink-soft">Delivery{coupon.trim() ? " + coupon" : ""} is calculated when the order is placed.</p>

            <Field label="Coupon (optional)">
              <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Code" className="font-mono uppercase" />
            </Field>
            <Field label="Notes (optional)">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Internal note or delivery instruction" className={`${inputCls} h-auto resize-y py-2`} />
            </Field>

            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? "Placing…" : "Place order"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
