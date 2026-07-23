"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ticket, Trash2, Pencil, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { createCoupon, updateCoupon, deleteCoupon, type CouponInput } from "@/lib/coupons/actions";
import type { AdminCoupon } from "@/lib/admin/queries";

/** Blank/invalid → null so an optional numeric field can be left empty. */
function intOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

type FormState = {
  code: string;
  discountPct: string;
  minSubtotal: string;
  expiresAt: string;
  usageLimit: string;
  active: boolean;
};

const BLANK: FormState = {
  code: "", discountPct: "", minSubtotal: "0", expiresAt: "", usageLimit: "", active: true,
};

function fromCoupon(c: AdminCoupon): FormState {
  return {
    code: c.code,
    discountPct: String(c.discountPct),
    minSubtotal: String(c.minSubtotal),
    expiresAt: c.expiresAt ?? "",
    usageLimit: c.usageLimit == null ? "" : String(c.usageLimit),
    active: c.active,
  };
}

/**
 * Coupon management UI. A single form doubles as create (default) and edit
 * (when a row's "Edit" is clicked, `editingId` is set and the form is
 * pre-filled). The table lists every coupon with its status, usage and expiry.
 * Follows the shared admin idiom: `useTransition`, check `r.ok`, toast, then
 * `router.refresh()`.
 */
export function CouponsManager({ coupons }: { coupons: AdminCoupon[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const reset = () => { setForm(BLANK); setEditingId(null); };

  const startEdit = (c: AdminCoupon) => {
    setEditingId(c.id);
    setForm(fromCoupon(c));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = () => {
    const pct = intOrNull(form.discountPct);
    if (form.code.trim() === "") return toast.error("Coupon code is required.");
    if (pct == null || pct < 1 || pct > 100) return toast.error("Discount must be a whole number from 1 to 100.");
    const min = intOrNull(form.minSubtotal) ?? 0;
    const usage = form.usageLimit.trim() === "" ? null : intOrNull(form.usageLimit);
    if (form.usageLimit.trim() !== "" && (usage == null || usage < 1)) {
      return toast.error("Usage limit must be a whole number ≥ 1, or empty.");
    }
    const input: CouponInput = {
      code: form.code,
      discountPct: pct,
      active: form.active,
      minSubtotal: min,
      expiresAt: form.expiresAt.trim() === "" ? null : form.expiresAt,
      usageLimit: usage,
    };
    start(async () => {
      const r = editingId ? await updateCoupon(editingId, input) : await createCoupon(input);
      if (r.ok) {
        toast.success(editingId ? "Coupon updated." : "Coupon created.");
        reset();
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  const remove = (c: AdminCoupon) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    start(async () => {
      const r = await deleteCoupon(c.id);
      if (r.ok) { toast.success("Coupon deleted."); if (editingId === c.id) reset(); router.refresh(); }
      else toast.error(r.error);
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-cream-300">
        <CardHeader>
          <CardTitle>{editingId ? "Edit coupon" : "Add coupon"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Code</span>
              <Input
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="SAVE15"
                className="mt-1 font-mono"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Discount (%)</span>
              <Input
                type="number" min={1} max={100} step={1} inputMode="numeric"
                value={form.discountPct}
                onChange={(e) => set("discountPct", e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Min order (৳) — optional</span>
              <Input
                type="number" min={0} step={1} inputMode="numeric"
                value={form.minSubtotal}
                onChange={(e) => set("minSubtotal", e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Expires — optional</span>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => set("expiresAt", e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Usage limit — optional</span>
              <Input
                type="number" min={1} step={1} inputMode="numeric"
                value={form.usageLimit}
                onChange={(e) => set("usageLimit", e.target.value)}
                placeholder="Unlimited"
                className="mt-1"
              />
            </label>
            <label className="flex items-center gap-2.5 sm:mt-6">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
                className="size-4 accent-neem"
              />
              <span className="text-sm font-medium text-ink">Active</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={submit} disabled={busy}>
              <Ticket className="size-4" /> {busy ? "Saving…" : editingId ? "Save changes" : "Add coupon"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={reset} disabled={busy}>
                <X className="size-4" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-cream-300">
        <CardHeader>
          <CardTitle>Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-cream-300">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-300 bg-cream-100 text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">Code</th>
                  <th className="px-4 py-2.5 font-medium">Discount</th>
                  <th className="px-4 py-2.5 font-medium">Min order</th>
                  <th className="px-4 py-2.5 font-medium">Used</th>
                  <th className="px-4 py-2.5 font-medium">Expires</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-cream-200 last:border-b-0 hover:bg-cream-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">{c.code}</td>
                    <td className="px-4 py-3 text-ink">{c.discountPct}%</td>
                    <td className="px-4 py-3 text-ink-muted">{c.minSubtotal > 0 ? `৳${c.minSubtotal}` : "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.expiresAt ? formatDate(c.expiresAt) : "—"}</td>
                    <td className="px-4 py-3">
                      {c.active ? (
                        <span className="inline-flex items-center rounded-full bg-neem/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neem-deep">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-cream-300 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                          Off
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-2">
                        <Button variant="outline" size="icon" aria-label="Edit coupon" disabled={busy} onClick={() => startEdit(c)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="outline" size="icon" aria-label="Delete coupon" disabled={busy}
                          className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                          onClick={() => remove(c)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-muted">No coupons yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
