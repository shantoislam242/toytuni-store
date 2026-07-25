"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateSettings } from "@/lib/admin/actions";
import type { Settings } from "@/lib/data/settings-shape";
import { BD_LOCATIONS } from "@/lib/bd-locations";
import { X, Plus } from "lucide-react";

/** Every BD district (flattened from the divisions), sorted, for the
 *  inside-Dhaka zone picker. */
const ALL_DISTRICTS: string[] = Array.from(
  new Set(BD_LOCATIONS.flatMap((d) => d.districts)),
).sort();

/** Parse a user-entered integer field. Returns `null` for blank/invalid so the
 *  caller can surface a validation error (mirrors `product-edit-form`'s
 *  `parseIntOrNull`). */
function parseIntOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Store settings form (Task 3). Controlled inputs across four sections
 * (shipping fees, COD fee, contact info, footer brand text); Save calls the
 * `updateSettings` Server Action. No client Supabase import — the write goes
 * through the service-role action, same as `product-edit-form`.
 */
export function SettingsForm({ settings }: { settings: Settings }) {
  const [saving, start] = useTransition();
  const [insideFee, setInsideFee] = useState(String(settings.shipping.insideDhakaFee));
  const [outsideFee, setOutsideFee] = useState(String(settings.shipping.outsideDhakaFee));
  const [threshold, setThreshold] = useState(String(settings.shipping.freeShippingThreshold));
  const [insideDistricts, setInsideDistricts] = useState<string[]>(settings.shipping.insideDistricts);
  const [codFee, setCodFee] = useState(String(settings.codFee));
  const [phone, setPhone] = useState(settings.contact.phone);
  const [whatsapp, setWhatsapp] = useState(settings.contact.whatsapp);
  const [email, setEmail] = useState(settings.contact.email);
  const [address, setAddress] = useState(settings.contact.address);
  const [tagline, setTagline] = useState(settings.brand.tagline);
  const [description, setDescription] = useState(settings.brand.description);
  const [silver, setSilver] = useState(String(settings.customerTiers.silver));
  const [gold, setGold] = useState(String(settings.customerTiers.gold));
  const [preorderEnabled, setPreorderEnabled] = useState(settings.preorder.enabled);
  const [preorderThreshold, setPreorderThreshold] = useState(String(settings.preorder.thresholdQty));
  const [preorderLead, setPreorderLead] = useState(String(settings.preorder.leadDays));
  const [preorderAdvance, setPreorderAdvance] = useState(String(settings.preorder.advancePct));

  const handleSave = () => {
    const nums = {
      inside: parseIntOrNull(insideFee),
      outside: parseIntOrNull(outsideFee),
      thr: parseIntOrNull(threshold),
      cod: parseIntOrNull(codFee),
      silver: parseIntOrNull(silver),
      gold: parseIntOrNull(gold),
      poThreshold: parseIntOrNull(preorderThreshold),
      poLead: parseIntOrNull(preorderLead),
      poAdvance: parseIntOrNull(preorderAdvance),
    };
    if (Object.values(nums).some((n) => n === null)) {
      return toast.error("Fees and threshold must be whole numbers ≥ 0.");
    }
    if (nums.gold! < nums.silver!) {
      return toast.error("Gold threshold must be ≥ silver threshold.");
    }
    if (nums.poAdvance! > 100) {
      return toast.error("Pre-order advance must be between 0 and 100.");
    }
    const next: Settings = {
      shipping: {
        insideDhakaFee: nums.inside!,
        outsideDhakaFee: nums.outside!,
        freeShippingThreshold: nums.thr!,
        insideDistricts: insideDistricts.length ? insideDistricts : ["Dhaka"],
      },
      codFee: nums.cod!,
      contact: { phone, whatsapp, email, address },
      brand: { tagline, description },
      customerTiers: { silver: nums.silver!, gold: nums.gold! },
      preorder: {
        enabled: preorderEnabled,
        thresholdQty: nums.poThreshold!,
        leadDays: nums.poLead!,
        advancePct: nums.poAdvance!,
      },
    };
    start(async () => {
      const r = await updateSettings(next);
      r.ok ? toast.success("Settings saved.") : toast.error(r.error);
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-cream-300">
        <CardHeader>
          <CardTitle>Shipping</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Inside Dhaka fee (৳)
            </span>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={insideFee}
              onChange={(e) => setInsideFee(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Outside Dhaka fee (৳)
            </span>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={outsideFee}
              onChange={(e) => setOutsideFee(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Free shipping threshold (৳)
            </span>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="mt-1"
            />
          </label>

          {/* Inside-Dhaka district list — these get the local (inside) rate; every
              other district gets the outside rate. */}
          <div className="sm:col-span-3">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Inside-Dhaka districts (local rate)
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {insideDistricts.length === 0 ? (
                <span className="text-sm text-ink-soft">None — every district gets the outside rate.</span>
              ) : (
                insideDistricts.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1 rounded-full bg-neem/10 px-2.5 py-1 text-xs font-medium text-neem-deep">
                    {d}
                    <button
                      type="button"
                      onClick={() => setInsideDistricts((prev) => prev.filter((x) => x !== d))}
                      aria-label={`Remove ${d}`}
                      className="text-neem-deep/70 hover:text-danger"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Plus className="size-4 text-ink-soft" />
              <select
                value=""
                onChange={(e) => {
                  const d = e.target.value;
                  if (d) setInsideDistricts((prev) => (prev.includes(d) ? prev : [...prev, d]));
                }}
                className="h-9 rounded-md border border-cream-300 bg-paper px-3 text-sm text-ink outline-none focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25"
              >
                <option value="">Add a district…</option>
                {ALL_DISTRICTS.filter((d) => !insideDistricts.includes(d)).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-cream-300">
        <CardHeader>
          <CardTitle>Customer tiers</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Silver at (৳)</span>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={silver}
              onChange={(e) => setSilver(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Gold at (৳)</span>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={gold}
              onChange={(e) => setGold(e.target.value)}
              className="mt-1"
            />
          </label>
          <p className="text-xs text-ink-muted sm:col-span-2">
            Customers reach Silver/Gold when their lifetime spend crosses these amounts.
          </p>
        </CardContent>
      </Card>

      <Card className="border-cream-300">
        <CardHeader>
          <CardTitle>Cash on delivery</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="block sm:max-w-xs">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">COD fee (৳)</span>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={codFee}
              onChange={(e) => setCodFee(e.target.value)}
              className="mt-1"
            />
          </label>
        </CardContent>
      </Card>

      <Card className="border-cream-300">
        <CardHeader>
          <CardTitle>Pre-order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={preorderEnabled}
              onChange={(e) => setPreorderEnabled(e.target.checked)}
              className="size-4 accent-neem"
            />
            <span className="text-sm font-medium text-ink">
              Enable pre-order for low / out-of-stock products
            </span>
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Pre-order when stock ≤
              </span>
              <Input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={preorderThreshold}
                onChange={(e) => setPreorderThreshold(e.target.value)}
                disabled={!preorderEnabled}
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Ships in (days)
              </span>
              <Input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={preorderLead}
                onChange={(e) => setPreorderLead(e.target.value)}
                disabled={!preorderEnabled}
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Advance (%)
              </span>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                inputMode="numeric"
                value={preorderAdvance}
                onChange={(e) => setPreorderAdvance(e.target.value)}
                disabled={!preorderEnabled}
                className="mt-1"
              />
            </label>
          </div>
          <p className="text-xs text-ink-muted">
            When stock hits the threshold (low or zero), the product’s button becomes “Pre-order”, shipping in the set
            days with the advance shown. A product’s own ship date / advance, if set, override these defaults.
          </p>
        </CardContent>
      </Card>

      <Card className="border-cream-300">
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Phone</span>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">WhatsApp</span>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="mt-1" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Email</span>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Address</span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
        </CardContent>
      </Card>

      <Card className="border-cream-300">
        <CardHeader>
          <CardTitle>Brand</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Tagline</span>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1" />
          </label>
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

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
