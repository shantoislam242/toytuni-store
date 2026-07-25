"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateBulkContent } from "@/lib/admin/content-actions";
import {
  BULK_ICONS, BULK_TONES, type BulkContent, type BulkTier, type BulkBenefit, type BulkStep,
} from "@/lib/data/bulk-shape";

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

/** Edit a tier's "what you get" bullet list (top-level to keep focus stable). */
function PointsEditor({ points, onChange }: { points: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium uppercase tracking-wide text-ink-muted">Points</span>
      {points.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={p} onChange={(e) => onChange(points.map((q, j) => (j === i ? e.target.value : q)))} placeholder="What you get" />
          <button type="button" onClick={() => onChange(points.filter((_, j) => j !== i))} aria-label="Remove point" className="flex size-8 flex-none items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...points, ""])}>
        <Plus className="size-3.5" /> Add point
      </Button>
    </div>
  );
}

/** `/admin/content/bulk` — editor for the Wholesale/Bulk page. */
export function BulkContentForm({ initial }: { initial: BulkContent }) {
  const router = useRouter();
  const [c, setC] = useState<BulkContent>(initial);
  const [saving, setSaving] = useState(false);

  type ListKey = "tiers" | "benefits" | "steps";
  const updateItem = (k: ListKey, i: number, patch: object) =>
    setC((p) => ({ ...p, [k]: (p[k] as object[]).map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const removeItem = (k: ListKey, i: number) =>
    setC((p) => ({ ...p, [k]: (p[k] as object[]).filter((_, j) => j !== i) }));
  const addItem = (k: ListKey, blank: object) =>
    setC((p) => ({ ...p, [k]: [...(p[k] as object[]), blank] }));

  const save = async () => {
    setSaving(true);
    const res = await updateBulkContent(c);
    setSaving(false);
    if (res.ok) { toast.success("Bulk page updated."); router.refresh(); }
    else toast.error(res.error);
  };

  const setHeaderStat = (i: number, v: string) =>
    setC((p) => ({ ...p, header: { ...p.header, stats: p.header.stats.map((s, j) => (j === i ? v : s)) } }));

  return (
    <div className="space-y-4">
      {/* header */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Header</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Title"><Input value={c.header.title} onChange={(e) => setC({ ...c, header: { ...c.header, title: e.target.value } })} /></Field>
          <Field label="Subtitle"><textarea value={c.header.subtitle} onChange={(e) => setC({ ...c, header: { ...c.header, subtitle: e.target.value } })} rows={2} className={inputCls} /></Field>
          <Field label="CTA button label"><Input value={c.header.ctaLabel} onChange={(e) => setC({ ...c, header: { ...c.header, ctaLabel: e.target.value } })} /></Field>
          <div>
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">Stat strip</span>
            <div className="space-y-1.5">
              {c.header.stats.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={s} onChange={(e) => setHeaderStat(i, e.target.value)} placeholder="250+ preschools" />
                  <button type="button" onClick={() => setC({ ...c, header: { ...c.header, stats: c.header.stats.filter((_, j) => j !== i) } })} aria-label="Remove stat" className="flex size-8 flex-none items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setC({ ...c, header: { ...c.header, stats: [...c.header.stats, ""] } })}>
                <Plus className="size-3.5" /> Add stat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* tiers */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Program tiers</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(c.tiers as BulkTier[]).map((t, i) => (
            <ItemRow key={t.id} onRemove={() => removeItem("tiers", i)}>
              <div className="grid gap-2 sm:grid-cols-[8rem_1fr_8rem]">
                <select value={t.icon} onChange={(e) => updateItem("tiers", i, { icon: e.target.value })} className={selectCls}>
                  {BULK_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                </select>
                <Input value={t.titleBn} onChange={(e) => updateItem("tiers", i, { titleBn: e.target.value })} placeholder="Title" />
                <select value={t.tone} onChange={(e) => updateItem("tiers", i, { tone: e.target.value })} className={selectCls}>
                  {BULK_TONES.map((tn) => <option key={tn} value={tn}>{tn}</option>)}
                </select>
              </div>
              <textarea value={t.descBn} onChange={(e) => updateItem("tiers", i, { descBn: e.target.value })} rows={2} placeholder="Description" className={inputCls} />
              <PointsEditor points={t.points} onChange={(next) => updateItem("tiers", i, { points: next })} />
            </ItemRow>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addItem("tiers", { id: uid("tier"), icon: "tag", titleBn: "", descBn: "", points: [], tone: "neem-soft" } as BulkTier)}>
            <Plus className="size-4" /> Add tier
          </Button>
        </CardContent>
      </Card>

      {/* benefits */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Why partner with us (benefits)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(c.benefits as BulkBenefit[]).map((b, i) => (
            <ItemRow key={b.id} onRemove={() => removeItem("benefits", i)}>
              <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
                <select value={b.icon} onChange={(e) => updateItem("benefits", i, { icon: e.target.value })} className={selectCls}>
                  {BULK_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                </select>
                <Input value={b.titleBn} onChange={(e) => updateItem("benefits", i, { titleBn: e.target.value })} placeholder="Title" />
              </div>
              <textarea value={b.descBn} onChange={(e) => updateItem("benefits", i, { descBn: e.target.value })} rows={2} placeholder="Description" className={inputCls} />
            </ItemRow>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addItem("benefits", { id: uid("b"), icon: "tag", titleBn: "", descBn: "" } as BulkBenefit)}>
            <Plus className="size-4" /> Add benefit
          </Button>
        </CardContent>
      </Card>

      {/* steps */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>How it works (steps)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(c.steps as BulkStep[]).map((s, i) => (
            <ItemRow key={s.id} onRemove={() => removeItem("steps", i)}>
              <Input value={s.titleBn} onChange={(e) => updateItem("steps", i, { titleBn: e.target.value })} placeholder="Step title" />
              <textarea value={s.descBn} onChange={(e) => updateItem("steps", i, { descBn: e.target.value })} rows={2} placeholder="Description" className={inputCls} />
            </ItemRow>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addItem("steps", { id: uid("s"), titleBn: "", descBn: "" } as BulkStep)}>
            <Plus className="size-4" /> Add step
          </Button>
        </CardContent>
      </Card>

      {/* contact */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Wholesale desk contact</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Field label="Phone"><Input value={c.contact.phone} onChange={(e) => setC({ ...c, contact: { ...c.contact, phone: e.target.value } })} /></Field>
          <Field label="Email"><Input value={c.contact.email} onChange={(e) => setC({ ...c, contact: { ...c.contact, email: e.target.value } })} /></Field>
          <Field label="Hours"><Input value={c.contact.hours} onChange={(e) => setC({ ...c, contact: { ...c.contact, hours: e.target.value } })} /></Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} className="shadow-lg">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save Bulk page"}
        </Button>
      </div>
    </div>
  );
}
