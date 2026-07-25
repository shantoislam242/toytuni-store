"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateLoyaltyContent } from "@/lib/admin/content-actions";
import {
  LOYALTY_ICONS, LOYALTY_TONES,
  type LoyaltyContent, type LoyaltyBenefit, type LoyaltyStep, type LoyaltyTier,
  type LoyaltyReward, type LoyaltyTestimonial, type LoyaltyFaq,
} from "@/lib/data/loyalty-shape";

const inputCls =
  "w-full rounded-lg border border-cream-300 bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";
const selectCls = `${inputCls} h-9`;
const uid = (p: string) => `${p}${Math.random().toString(36).slice(2, 8)}`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
function ItemRow({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-cream-200 p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">{children}</div>
        <button type="button" onClick={onRemove} aria-label="Remove" className="flex size-8 flex-none items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger">
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      {LOYALTY_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
    </select>
  );
}
function StringList({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (n: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      {items.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={p} onChange={(e) => onChange(items.map((q, j) => (j === i ? e.target.value : q)))} placeholder={placeholder} />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove" className="flex size-8 flex-none items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}><Plus className="size-3.5" /> Add</Button>
    </div>
  );
}

/** `/admin/content/loyalty` — editor for the Loyalty Rewards page (the demo
 *  member dashboard stays static). */
export function LoyaltyContentForm({ initial }: { initial: LoyaltyContent }) {
  const router = useRouter();
  const [c, setC] = useState<LoyaltyContent>(initial);
  const [saving, setSaving] = useState(false);

  type ListKey = "benefits" | "steps" | "tiers" | "rewards" | "testimonials" | "faqs";
  const updateItem = (k: ListKey, i: number, patch: object) =>
    setC((p) => ({ ...p, [k]: (p[k] as object[]).map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const removeItem = (k: ListKey, i: number) =>
    setC((p) => ({ ...p, [k]: (p[k] as object[]).filter((_, j) => j !== i) }));
  const addItem = (k: ListKey, blank: object) =>
    setC((p) => ({ ...p, [k]: [...(p[k] as object[]), blank] }));

  const save = async () => {
    setSaving(true);
    const res = await updateLoyaltyContent(c);
    setSaving(false);
    if (res.ok) { toast.success("Loyalty page updated."); router.refresh(); }
    else toast.error(res.error);
  };

  const iconTitleDescGrid = (title: string, k: "benefits" | "steps") => (
    <Card className="border-cream-300">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {(c[k] as (LoyaltyBenefit | LoyaltyStep)[]).map((f, i) => (
          <ItemRow key={f.id} onRemove={() => removeItem(k, i)}>
            <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
              <IconSelect value={f.icon} onChange={(v) => updateItem(k, i, { icon: v })} />
              <Input value={f.title} onChange={(e) => updateItem(k, i, { title: e.target.value })} placeholder="Title" />
            </div>
            <textarea value={f.desc} onChange={(e) => updateItem(k, i, { desc: e.target.value })} rows={2} placeholder="Description" className={inputCls} />
          </ItemRow>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => addItem(k, { id: uid("i"), icon: "star", title: "", desc: "" })}><Plus className="size-4" /> Add</Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* hero */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Hero</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Title"><Input value={c.hero.title} onChange={(e) => setC({ ...c, hero: { ...c.hero, title: e.target.value } })} /></Field>
          <Field label="Subtitle"><textarea value={c.hero.subtitle} onChange={(e) => setC({ ...c, hero: { ...c.hero, subtitle: e.target.value } })} rows={2} className={inputCls} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Primary button label"><Input value={c.hero.primaryLabel} onChange={(e) => setC({ ...c, hero: { ...c.hero, primaryLabel: e.target.value } })} /></Field>
            <Field label="Primary button link"><Input value={c.hero.primaryHref} onChange={(e) => setC({ ...c, hero: { ...c.hero, primaryHref: e.target.value } })} /></Field>
            <Field label="Secondary button label"><Input value={c.hero.secondaryLabel} onChange={(e) => setC({ ...c, hero: { ...c.hero, secondaryLabel: e.target.value } })} /></Field>
            <Field label="Secondary button link"><Input value={c.hero.secondaryHref} onChange={(e) => setC({ ...c, hero: { ...c.hero, secondaryHref: e.target.value } })} /></Field>
          </div>
        </CardContent>
      </Card>

      {iconTitleDescGrid("Member benefits", "benefits")}
      {iconTitleDescGrid("How it works (steps)", "steps")}

      {/* tiers */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Membership tiers</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(c.tiers as LoyaltyTier[]).map((t, i) => (
            <ItemRow key={t.id} onRemove={() => removeItem("tiers", i)}>
              <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
                <Input value={t.name} onChange={(e) => updateItem("tiers", i, { name: e.target.value })} placeholder="Tier name" />
                <IconSelect value={t.icon} onChange={(v) => updateItem("tiers", i, { icon: v })} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={t.price} onChange={(e) => updateItem("tiers", i, { price: e.target.value })} placeholder="Price / unlock (e.g. Free)" />
                <Input value={t.tagline} onChange={(e) => updateItem("tiers", i, { tagline: e.target.value })} placeholder="Tagline" />
              </div>
              <StringList label="Perks" items={t.perks} onChange={(n) => updateItem("tiers", i, { perks: n })} placeholder="Perk" />
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={!!t.featured} onChange={(e) => updateItem("tiers", i, { featured: e.target.checked })} className="size-4 accent-neem" />
                Featured (highlighted tier)
              </label>
            </ItemRow>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addItem("tiers", { id: uid("tier"), name: "", icon: "star", price: "", tagline: "", perks: [], featured: false } as LoyaltyTier)}><Plus className="size-4" /> Add tier</Button>
        </CardContent>
      </Card>

      {/* rewards */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Reward examples</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(c.rewards as LoyaltyReward[]).map((r, i) => (
            <ItemRow key={r.id} onRemove={() => removeItem("rewards", i)}>
              <div className="grid gap-2 sm:grid-cols-[10rem_8rem_1fr]">
                <IconSelect value={r.icon} onChange={(v) => updateItem("rewards", i, { icon: v })} />
                <Input type="number" value={r.points} onChange={(e) => updateItem("rewards", i, { points: Math.round(Number(e.target.value) || 0) })} placeholder="Points" />
                <Input value={r.title} onChange={(e) => updateItem("rewards", i, { title: e.target.value })} placeholder="Reward (e.g. Free Shipping)" />
              </div>
            </ItemRow>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addItem("rewards", { id: uid("r"), points: 0, title: "", icon: "gift" } as LoyaltyReward)}><Plus className="size-4" /> Add reward</Button>
        </CardContent>
      </Card>

      {/* testimonials */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Testimonials</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(c.testimonials as LoyaltyTestimonial[]).map((t, i) => (
            <ItemRow key={t.id} onRemove={() => removeItem("testimonials", i)}>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_8rem]">
                <Input value={t.name} onChange={(e) => updateItem("testimonials", i, { name: e.target.value })} placeholder="Name" />
                <Input value={t.tier} onChange={(e) => updateItem("testimonials", i, { tier: e.target.value })} placeholder="Tier (e.g. Gold member)" />
                <select value={t.tone} onChange={(e) => updateItem("testimonials", i, { tone: e.target.value })} className={selectCls}>
                  {LOYALTY_TONES.map((tn) => <option key={tn} value={tn}>{tn}</option>)}
                </select>
              </div>
              <textarea value={t.quote} onChange={(e) => updateItem("testimonials", i, { quote: e.target.value })} rows={2} placeholder="Quote" className={inputCls} />
            </ItemRow>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addItem("testimonials", { id: uid("t"), name: "", tier: "", quote: "", tone: "neem-soft" } as LoyaltyTestimonial)}><Plus className="size-4" /> Add testimonial</Button>
        </CardContent>
      </Card>

      {/* faqs */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>FAQ</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(c.faqs as LoyaltyFaq[]).map((f, i) => (
            <ItemRow key={i} onRemove={() => removeItem("faqs", i)}>
              <Input value={f.q} onChange={(e) => updateItem("faqs", i, { q: e.target.value })} placeholder="Question" />
              <textarea value={f.a} onChange={(e) => updateItem("faqs", i, { a: e.target.value })} rows={2} placeholder="Answer" className={inputCls} />
            </ItemRow>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addItem("faqs", { q: "", a: "" } as LoyaltyFaq)}><Plus className="size-4" /> Add question</Button>
        </CardContent>
      </Card>

      {/* cta */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Call to action</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Heading"><Input value={c.cta.heading} onChange={(e) => setC({ ...c, cta: { ...c.cta, heading: e.target.value } })} /></Field>
          <Field label="Subtitle"><textarea value={c.cta.subtitle} onChange={(e) => setC({ ...c, cta: { ...c.cta, subtitle: e.target.value } })} rows={2} className={inputCls} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Button label"><Input value={c.cta.buttonLabel} onChange={(e) => setC({ ...c, cta: { ...c.cta, buttonLabel: e.target.value } })} /></Field>
            <Field label="Button link"><Input value={c.cta.buttonHref} onChange={(e) => setC({ ...c, cta: { ...c.cta, buttonHref: e.target.value } })} /></Field>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} className="shadow-lg">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save Loyalty page"}
        </Button>
      </div>
    </div>
  );
}
