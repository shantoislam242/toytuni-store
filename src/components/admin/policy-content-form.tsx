"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePolicy, resetPolicy } from "@/lib/admin/policy-actions";
import type {
  PolicyContent, PolicySection, PolicyBlock, PolicyIcon, CalloutTone,
} from "@/lib/policy/types";

const inputCls =
  "w-full rounded-lg border border-cream-300 bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";
const selectCls = `${inputCls} h-9`;
const uid = (p: string) => `${p}${Math.random().toString(36).slice(2, 8)}`;

const POLICY_ICONS: PolicyIcon[] = [
  "sparkles", "check-circle", "x-circle", "rotate-ccw", "clock", "shield-check",
  "message-circle", "mail", "leaf", "badge-check", "truck", "wallet", "credit-card",
  "package", "info", "alert-triangle", "lock", "file-text", "eye", "cookie",
  "settings", "scale", "users", "globe", "refresh-cw", "wrench",
];
const BLOCK_TYPES: PolicyBlock["type"][] = ["paragraph", "list", "checklist", "steps", "timeline", "callout", "faq"];
const CALLOUT_TONES: CalloutTone[] = ["info", "success", "warning"];

function IconSelect({ value, onChange }: { value: PolicyIcon; onChange: (v: PolicyIcon) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as PolicyIcon)} className={selectCls}>
      {POLICY_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
    </select>
  );
}

/** Reusable editor for a `string[]` field (list / checklist items). */
function StringList({ items, onChange, placeholder }: { items: string[]; onChange: (n: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      {items.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={v} onChange={(e) => onChange(items.map((q, j) => (j === i ? e.target.value : q)))} placeholder={placeholder} />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove" className="flex size-8 flex-none items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger"><Trash2 className="size-3.5" /></button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}><Plus className="size-3.5" /> Add</Button>
    </div>
  );
}

/** Reusable editor for a `{title,text}[]` or `{q,a}[]` pair-list. */
function PairList({ items, onChange, aKey, bKey, aPlaceholder, bPlaceholder }: {
  items: Record<string, string>[]; onChange: (n: Record<string, string>[]) => void;
  aKey: string; bKey: string; aPlaceholder: string; bPlaceholder: string;
}) {
  const patch = (i: number, k: string, val: string) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: val } : it)));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-cream-200 p-2">
          <div className="flex items-center gap-2">
            <Input value={it[aKey] ?? ""} onChange={(e) => patch(i, aKey, e.target.value)} placeholder={aPlaceholder} />
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove" className="flex size-8 flex-none items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger"><Trash2 className="size-3.5" /></button>
          </div>
          <textarea value={it[bKey] ?? ""} onChange={(e) => patch(i, bKey, e.target.value)} rows={2} placeholder={bPlaceholder} className={`${inputCls} mt-1.5`} />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { [aKey]: "", [bKey]: "" }])}><Plus className="size-3.5" /> Add</Button>
    </div>
  );
}

function defaultBlock(type: PolicyBlock["type"]): PolicyBlock {
  switch (type) {
    case "paragraph": return { type, text: "" };
    case "list": return { type, items: [""] };
    case "checklist": return { type, items: [""] };
    case "steps": return { type, items: [{ title: "", text: "" }] };
    case "timeline": return { type, items: [{ title: "", text: "" }] };
    case "callout": return { type, tone: "info", title: "", text: "" };
    case "faq": return { type, items: [{ q: "", a: "" }] };
  }
}

/** Editor for one block; the type dropdown swaps the fields (resets on change). */
function BlockEditor({ block, onChange, onRemove }: { block: PolicyBlock; onChange: (b: PolicyBlock) => void; onRemove: () => void }) {
  return (
    <div className="rounded-lg border border-cream-300 bg-cream-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <select value={block.type} onChange={(e) => onChange(defaultBlock(e.target.value as PolicyBlock["type"]))} className={`${selectCls} w-40`}>
          {BLOCK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="button" onClick={onRemove} aria-label="Remove block" className="flex size-8 items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger"><Trash2 className="size-4" /></button>
      </div>
      <div className="mt-2">
        {block.type === "paragraph" && (
          <textarea value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} rows={3} placeholder="Paragraph text" className={inputCls} />
        )}
        {(block.type === "list" || block.type === "checklist") && (
          <StringList items={block.items} onChange={(items) => onChange({ ...block, items })} placeholder="Item" />
        )}
        {(block.type === "steps" || block.type === "timeline") && (
          <PairList items={block.items as unknown as Record<string, string>[]} onChange={(items) => onChange({ ...block, items: items as unknown as { title: string; text: string }[] })} aKey="title" bKey="text" aPlaceholder="Title" bPlaceholder="Text" />
        )}
        {block.type === "faq" && (
          <PairList items={block.items as unknown as Record<string, string>[]} onChange={(items) => onChange({ ...block, items: items as unknown as { q: string; a: string }[] })} aKey="q" bKey="a" aPlaceholder="Question" bPlaceholder="Answer" />
        )}
        {block.type === "callout" && (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
              <select value={block.tone ?? "info"} onChange={(e) => onChange({ ...block, tone: e.target.value as CalloutTone })} className={selectCls}>
                {CALLOUT_TONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <Input value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} placeholder="Title (optional)" />
            </div>
            <textarea value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} rows={2} placeholder="Callout text" className={inputCls} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Editor for one section (icon, title, intro, blocks). */
function SectionEditor({ section, onChange, onRemove }: { section: PolicySection; onChange: (s: PolicySection) => void; onRemove: () => void }) {
  const setBlock = (i: number, b: PolicyBlock) => onChange({ ...section, blocks: section.blocks.map((x, j) => (j === i ? b : x)) });
  return (
    <div className="rounded-xl border border-cream-300 p-3">
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
        <IconSelect value={section.icon} onChange={(icon) => onChange({ ...section, icon })} />
        <Input value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} placeholder="Section title" />
        <button type="button" onClick={onRemove} aria-label="Remove section" className="flex size-9 items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger"><Trash2 className="size-4" /></button>
      </div>
      <textarea value={section.intro ?? ""} onChange={(e) => onChange({ ...section, intro: e.target.value })} rows={2} placeholder="Intro (optional)" className={`${inputCls} mt-2`} />
      <div className="mt-2 space-y-2">
        {section.blocks.map((b, i) => (
          <BlockEditor key={i} block={b} onChange={(nb) => setBlock(i, nb)} onRemove={() => onChange({ ...section, blocks: section.blocks.filter((_, j) => j !== i) })} />
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...section, blocks: [...section.blocks, defaultBlock("paragraph")] })}><Plus className="size-4" /> Add block</Button>
      </div>
    </div>
  );
}

/** `/admin/content/policies/[slug]` — structured editor for one policy page. */
export function PolicyContentForm({ slug, initial }: { slug: string; initial: PolicyContent }) {
  const router = useRouter();
  const [c, setC] = useState<PolicyContent>(initial);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await updatePolicy(slug, c);
    setSaving(false);
    if (res.ok) { toast.success("Policy saved."); router.refresh(); }
    else toast.error(res.error);
  };
  const revert = async () => {
    if (!confirm("Reset this policy to its built-in default? Your edits will be discarded.")) return;
    setResetting(true);
    const res = await resetPolicy(slug);
    setResetting(false);
    if (res.ok) { toast.success("Reset to default."); router.refresh(); }
    else toast.error(res.error);
  };

  const summary = c.summary ?? [];
  const trust = c.trust ?? [];

  return (
    <div className="space-y-4">
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Page</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">Title</span><Input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} /></label>
          <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">Badge</span><Input value={c.badge} onChange={(e) => setC({ ...c, badge: e.target.value })} /></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">Intro</span><textarea value={c.intro} onChange={(e) => setC({ ...c, intro: e.target.value })} rows={2} className={inputCls} /></label>
          <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">Last updated</span><Input value={c.updated} onChange={(e) => setC({ ...c, updated: e.target.value })} placeholder="1 July 2026" /></label>
        </CardContent>
      </Card>

      <Card className="border-cream-300">
        <CardHeader><CardTitle>Quick summary (optional)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {summary.map((s, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
              <IconSelect value={s.icon} onChange={(icon) => setC({ ...c, summary: summary.map((x, j) => (j === i ? { ...x, icon } : x)) })} />
              <Input value={s.text} onChange={(e) => setC({ ...c, summary: summary.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} placeholder="Summary point" />
              <button type="button" onClick={() => setC({ ...c, summary: summary.filter((_, j) => j !== i) })} aria-label="Remove" className="flex size-9 items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger"><Trash2 className="size-4" /></button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setC({ ...c, summary: [...summary, { icon: "check-circle", text: "" }] })}><Plus className="size-4" /> Add summary point</Button>
        </CardContent>
      </Card>

      <Card className="border-cream-300">
        <CardHeader><CardTitle>Sections</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {c.sections.map((s, i) => (
            <SectionEditor
              key={s.id}
              section={s}
              onChange={(ns) => setC({ ...c, sections: c.sections.map((x, j) => (j === i ? ns : x)) })}
              onRemove={() => setC({ ...c, sections: c.sections.filter((_, j) => j !== i) })}
            />
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setC({ ...c, sections: [...c.sections, { id: uid("sec"), icon: "file-text", title: "", blocks: [defaultBlock("paragraph")] }] })}><Plus className="size-4" /> Add section</Button>
        </CardContent>
      </Card>

      <Card className="border-cream-300">
        <CardHeader><CardTitle>Trust badges (optional)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {trust.map((t, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
              <IconSelect value={t.icon} onChange={(icon) => setC({ ...c, trust: trust.map((x, j) => (j === i ? { ...x, icon } : x)) })} />
              <Input value={t.label} onChange={(e) => setC({ ...c, trust: trust.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder="Trust label" />
              <button type="button" onClick={() => setC({ ...c, trust: trust.filter((_, j) => j !== i) })} aria-label="Remove" className="flex size-9 items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger"><Trash2 className="size-4" /></button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setC({ ...c, trust: [...trust, { icon: "shield-check", label: "" }] })}><Plus className="size-4" /> Add trust badge</Button>
        </CardContent>
      </Card>

      <Card className="border-cream-300">
        <CardHeader><CardTitle>Closing CTA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">Title</span><Input value={c.cta.title} onChange={(e) => setC({ ...c, cta: { ...c.cta, title: e.target.value } })} /></label>
          <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">Text</span><textarea value={c.cta.text} onChange={(e) => setC({ ...c, cta: { ...c.cta, text: e.target.value } })} rows={2} className={inputCls} /></label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={c.cta.primary.label} onChange={(e) => setC({ ...c, cta: { ...c.cta, primary: { ...c.cta.primary, label: e.target.value } } })} placeholder="Primary label" />
            <Input value={c.cta.primary.href} onChange={(e) => setC({ ...c, cta: { ...c.cta, primary: { ...c.cta.primary, href: e.target.value } } })} placeholder="Primary link" />
            <Input value={c.cta.secondary?.label ?? ""} onChange={(e) => setC({ ...c, cta: { ...c.cta, secondary: { label: e.target.value, href: c.cta.secondary?.href ?? "" } } })} placeholder="Secondary label (optional)" />
            <Input value={c.cta.secondary?.href ?? ""} onChange={(e) => setC({ ...c, cta: { ...c.cta, secondary: { label: c.cta.secondary?.label ?? "", href: e.target.value } } })} placeholder="Secondary link (optional)" />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end gap-2">
        <Button variant="outline" onClick={revert} disabled={resetting || saving} className="bg-paper shadow-lg">
          {resetting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Reset to default
        </Button>
        <Button onClick={save} disabled={saving || resetting} className="shadow-lg">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}{saving ? "Saving…" : "Save policy"}
        </Button>
      </div>
    </div>
  );
}
