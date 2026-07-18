"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateSettings } from "@/lib/admin/actions";
import type { Settings } from "@/lib/data/settings-shape";

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
  const [codFee, setCodFee] = useState(String(settings.codFee));
  const [phone, setPhone] = useState(settings.contact.phone);
  const [whatsapp, setWhatsapp] = useState(settings.contact.whatsapp);
  const [email, setEmail] = useState(settings.contact.email);
  const [address, setAddress] = useState(settings.contact.address);
  const [tagline, setTagline] = useState(settings.brand.tagline);
  const [description, setDescription] = useState(settings.brand.description);

  const handleSave = () => {
    const nums = {
      inside: parseIntOrNull(insideFee),
      outside: parseIntOrNull(outsideFee),
      thr: parseIntOrNull(threshold),
      cod: parseIntOrNull(codFee),
    };
    if (Object.values(nums).some((n) => n === null)) {
      return toast.error("Fees and threshold must be whole numbers ≥ 0.");
    }
    const next: Settings = {
      shipping: { insideDhakaFee: nums.inside!, outsideDhakaFee: nums.outside!, freeShippingThreshold: nums.thr! },
      codFee: nums.cod!,
      contact: { phone, whatsapp, email, address },
      brand: { tagline, description },
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
