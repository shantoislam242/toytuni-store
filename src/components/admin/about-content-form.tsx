"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateAboutContent } from "@/lib/admin/content-actions";
import {
  ABOUT_ICONS,
  ABOUT_TONES,
  type AboutContent,
  type AboutFeature,
  type AboutMilestone,
  type AboutStat,
  type AboutTestimonial,
} from "@/lib/data/about-shape";

const inputCls =
  "w-full rounded-lg border border-cream-300 bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";
const selectCls = `${inputCls} h-9`;

function uid(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

/** Header row for a repeatable item with a remove button. */
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

/** One icon-feature grid (mission/vision, why-us, values, philosophy). Top-level
 *  (not nested in the form) so editing a field never remounts it / drops focus. */
function FeatureGrid({
  title, items, onUpdate, onRemove, onAdd,
}: {
  title: string;
  items: AboutFeature[];
  onUpdate: (i: number, patch: Partial<AboutFeature>) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
}) {
  return (
    <Card className="border-cream-300">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.map((f, i) => (
          <ItemRow key={f.id} onRemove={() => onRemove(i)}>
            <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
              <select value={f.icon} onChange={(e) => onUpdate(i, { icon: e.target.value as AboutFeature["icon"] })} className={selectCls}>
                {ABOUT_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
              </select>
              <Input value={f.title} onChange={(e) => onUpdate(i, { title: e.target.value })} placeholder="Title" />
            </div>
            <textarea value={f.desc} onChange={(e) => onUpdate(i, { desc: e.target.value })} rows={2} placeholder="Description" className={inputCls} />
          </ItemRow>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" /> Add
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * `/admin/content/about` — full editor for the About page: header, story
 * paragraphs, four icon-feature grids (mission/vision, why-us, values,
 * philosophy), journey milestones, stats, testimonials, and the CTA. Saves the
 * whole blob via `updateAboutContent`.
 */
export function AboutContentForm({ initial }: { initial: AboutContent }) {
  const router = useRouter();
  const [c, setC] = useState<AboutContent>(initial);
  const [saving, setSaving] = useState(false);

  // Generic list helpers keyed by the AboutContent field name.
  type ListKey = "missionVision" | "whyChooseUs" | "values" | "philosophy" | "journey" | "stats" | "testimonials";
  const updateItem = (key: ListKey, i: number, patch: object) =>
    setC((prev) => ({ ...prev, [key]: (prev[key] as object[]).map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const removeItem = (key: ListKey, i: number) =>
    setC((prev) => ({ ...prev, [key]: (prev[key] as object[]).filter((_, j) => j !== i) }));
  const addItem = (key: ListKey, blank: object) =>
    setC((prev) => ({ ...prev, [key]: [...(prev[key] as object[]), blank] }));

  const save = async () => {
    setSaving(true);
    const res = await updateAboutContent(c);
    setSaving(false);
    if (res.ok) {
      toast.success("About page updated.");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  const featureGrid = (title: string, k: Extract<ListKey, "missionVision" | "whyChooseUs" | "values" | "philosophy">) => (
    <FeatureGrid
      title={title}
      items={c[k] as AboutFeature[]}
      onUpdate={(i, patch) => updateItem(k, i, patch)}
      onRemove={(i) => removeItem(k, i)}
      onAdd={() => addItem(k, { id: uid("f"), icon: "heart", title: "", desc: "" } as AboutFeature)}
    />
  );

  return (
    <div className="space-y-4">
      {/* header */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Page header</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Title"><textarea value={c.header.title} onChange={(e) => setC({ ...c, header: { ...c.header, title: e.target.value } })} rows={2} className={inputCls} /></Field>
          <Field label="Subtitle"><textarea value={c.header.subtitle} onChange={(e) => setC({ ...c, header: { ...c.header, subtitle: e.target.value } })} rows={2} className={inputCls} /></Field>
        </CardContent>
      </Card>

      {/* story */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Our story</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Heading"><Input value={c.story.heading} onChange={(e) => setC({ ...c, story: { ...c.story, heading: e.target.value } })} /></Field>
          {c.story.paragraphs.map((p, i) => (
            <ItemRow key={i} onRemove={() => setC({ ...c, story: { ...c.story, paragraphs: c.story.paragraphs.filter((_, j) => j !== i) } })}>
              <textarea value={p} onChange={(e) => setC({ ...c, story: { ...c.story, paragraphs: c.story.paragraphs.map((q, j) => (j === i ? e.target.value : q)) } })} rows={3} placeholder="Paragraph" className={inputCls} />
            </ItemRow>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setC({ ...c, story: { ...c.story, paragraphs: [...c.story.paragraphs, ""] } })}>
            <Plus className="size-4" /> Add paragraph
          </Button>
        </CardContent>
      </Card>

      {featureGrid("Mission & Vision", "missionVision")}
      {featureGrid("Why choose us", "whyChooseUs")}
      {featureGrid("Our values", "values")}
      {featureGrid("Montessori philosophy", "philosophy")}

      {/* journey */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Journey (milestones)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(c.journey as AboutMilestone[]).map((m, i) => (
            <ItemRow key={i} onRemove={() => removeItem("journey", i)}>
              <div className="grid gap-2 sm:grid-cols-[6rem_1fr]">
                <Input value={m.year} onChange={(e) => updateItem("journey", i, { year: e.target.value })} placeholder="2026" />
                <Input value={m.title} onChange={(e) => updateItem("journey", i, { title: e.target.value })} placeholder="Title" />
              </div>
              <textarea value={m.desc} onChange={(e) => updateItem("journey", i, { desc: e.target.value })} rows={2} placeholder="Description" className={inputCls} />
            </ItemRow>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addItem("journey", { year: "", title: "", desc: "" } as AboutMilestone)}>
            <Plus className="size-4" /> Add milestone
          </Button>
        </CardContent>
      </Card>

      {/* stats */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Stats</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(c.stats as AboutStat[]).map((s, i) => (
            <ItemRow key={s.id} onRemove={() => removeItem("stats", i)}>
              <div className="grid gap-2 sm:grid-cols-4">
                <Input value={s.prefix ?? ""} onChange={(e) => updateItem("stats", i, { prefix: e.target.value })} placeholder="Prefix" />
                <Input type="number" value={s.target} onChange={(e) => updateItem("stats", i, { target: Math.round(Number(e.target.value) || 0) })} placeholder="Number" />
                <Input value={s.suffix ?? ""} onChange={(e) => updateItem("stats", i, { suffix: e.target.value })} placeholder="Suffix (K+, %…)" />
                <Input value={s.label} onChange={(e) => updateItem("stats", i, { label: e.target.value })} placeholder="Label" />
              </div>
            </ItemRow>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addItem("stats", { id: uid("s"), target: 0, suffix: "", label: "" } as AboutStat)}>
            <Plus className="size-4" /> Add stat
          </Button>
        </CardContent>
      </Card>

      {/* testimonials */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Testimonials</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(c.testimonials as AboutTestimonial[]).map((t, i) => (
            <ItemRow key={t.id} onRemove={() => removeItem("testimonials", i)}>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_5rem_7rem]">
                <Input value={t.name} onChange={(e) => updateItem("testimonials", i, { name: e.target.value })} placeholder="Name" />
                <Input value={t.location} onChange={(e) => updateItem("testimonials", i, { location: e.target.value })} placeholder="Location" />
                <select value={t.rating} onChange={(e) => updateItem("testimonials", i, { rating: Number(e.target.value) })} className={selectCls}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}★</option>)}
                </select>
                <select value={t.tone} onChange={(e) => updateItem("testimonials", i, { tone: e.target.value })} className={selectCls}>
                  {ABOUT_TONES.map((tn) => <option key={tn} value={tn}>{tn}</option>)}
                </select>
              </div>
              <textarea value={t.quote} onChange={(e) => updateItem("testimonials", i, { quote: e.target.value })} rows={2} placeholder="Quote" className={inputCls} />
            </ItemRow>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addItem("testimonials", { id: uid("t"), name: "", location: "", quote: "", rating: 5, tone: "neem-soft" } as AboutTestimonial)}>
            <Plus className="size-4" /> Add testimonial
          </Button>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Call to action</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Heading"><Input value={c.cta.heading} onChange={(e) => setC({ ...c, cta: { ...c.cta, heading: e.target.value } })} /></Field>
          <Field label="Subtitle"><textarea value={c.cta.subtitle} onChange={(e) => setC({ ...c, cta: { ...c.cta, subtitle: e.target.value } })} rows={2} className={inputCls} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Primary button label"><Input value={c.cta.primaryLabel} onChange={(e) => setC({ ...c, cta: { ...c.cta, primaryLabel: e.target.value } })} /></Field>
            <Field label="Primary button link"><Input value={c.cta.primaryHref} onChange={(e) => setC({ ...c, cta: { ...c.cta, primaryHref: e.target.value } })} /></Field>
            <Field label="Secondary button label"><Input value={c.cta.secondaryLabel} onChange={(e) => setC({ ...c, cta: { ...c.cta, secondaryLabel: e.target.value } })} /></Field>
            <Field label="Secondary button link"><Input value={c.cta.secondaryHref} onChange={(e) => setC({ ...c, cta: { ...c.cta, secondaryHref: e.target.value } })} /></Field>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} className="shadow-lg">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save About page"}
        </Button>
      </div>
    </div>
  );
}
