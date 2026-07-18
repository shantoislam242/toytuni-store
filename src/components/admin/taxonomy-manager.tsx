"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { moveInArray } from "@/lib/array-move";
import { TONES, type TaxonomyKind } from "@/lib/admin/taxonomy";
import { createTaxonomy, updateTaxonomy, deleteTaxonomy, reorderTaxonomy } from "@/lib/admin/actions";
import type { AdminTaxonomyItem } from "@/lib/admin/queries";
import type { Tone } from "@/lib/types";
import { cn } from "@/lib/utils";

type DialogState =
  | { mode: "add" }
  | { mode: "edit"; item: AdminTaxonomyItem }
  | null;

// Static class map so Tailwind v4 detects every utility at build time — a
// dynamic `bg-${tone}` template string is not picked up by the scanner (see
// the same pattern in PlaceholderImage's `toneClass`). "cream" and "wood"
// map to the actual cream-300 / wood-light tokens since there's no bare
// `--color-cream` / `--color-wood` custom property in the theme.
const TONE_SWATCH: Record<Tone, string> = {
  cream: "bg-cream-300",
  neem: "bg-neem",
  "neem-soft": "bg-neem-soft",
  wood: "bg-wood-light",
  terracotta: "bg-terracotta",
  mustard: "bg-mustard",
  "dusty-blue": "bg-dusty-blue",
  blush: "bg-blush",
};

/** `item.tone` is a plain `string | null` from the DB — look up its swatch
 *  class defensively; an unrecognized/blank tone just renders the bordered
 *  circle with no fill (acceptable — the label still names the tone). */
function toneSwatchClass(tone: string | null): string | undefined {
  return tone ? TONE_SWATCH[tone as Tone] : undefined;
}

export function TaxonomyManager({ kind, items }: { kind: TaxonomyKind; items: AdminTaxonomyItem[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, start] = useTransition();

  // Re-sync local (reorderable) rows whenever the server sends fresh props,
  // e.g. after router.refresh() following a save/delete/reorder.
  useEffect(() => setRows(items), [items]);

  const refresh = () => router.refresh();

  const move = (index: number, delta: number) => {
    const next = moveInArray(rows, index, delta);
    if (next === rows) return;
    const prev = rows;
    setRows(next);
    start(async () => {
      const r = await reorderTaxonomy(kind, next.map((x) => x.slug));
      if (!r.ok) { setRows(prev); toast.error(r.error); } else refresh();
    });
  };

  const remove = (item: AdminTaxonomyItem) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    start(async () => {
      const r = await deleteTaxonomy(kind, item.slug);
      if (r.ok) { toast.success("Deleted."); refresh(); } else toast.error(r.error);
    });
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setDialog({ mode: "add" })}>
          <Plus className="size-4" /> Add {kind === "category" ? "category" : "age tier"}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-cream-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">Tone</th>
              <th className="px-3 py-2 font-medium">Tagline</th>
              <th className="px-3 py-2 text-right font-medium">Products</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => (
              <tr key={item.slug} className="border-b border-cream-200 last:border-b-0">
                <td className="px-3 py-2.5 font-medium text-ink">{item.title}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-ink-muted">{item.slug}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-ink-muted">
                    <span className={cn("size-3 rounded-full border border-cream-300", toneSwatchClass(item.tone))} />
                    {item.tone ?? "—"}
                  </span>
                </td>
                <td className="max-w-48 truncate px-3 py-2.5 text-ink-muted">{item.tagline ?? "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink">{item.productCount}</td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="icon" aria-label="Move up" disabled={i === 0 || busy}
                      onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
                    <Button variant="outline" size="icon" aria-label="Move down" disabled={i === rows.length - 1 || busy}
                      onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
                    <Button variant="outline" size="icon" aria-label="Edit" disabled={busy}
                      onClick={() => setDialog({ mode: "edit", item })}><Pencil className="size-4" /></Button>
                    <Button variant="outline" size="icon" aria-label="Delete" disabled={busy}
                      className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                      onClick={() => remove(item)}><Trash2 className="size-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-muted">No entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {dialog && (
        <TaxonomyDialog
          kind={kind}
          state={dialog}
          defaultSort={rows.length}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); refresh(); }}
        />
      )}
    </div>
  );
}

function TaxonomyDialog({
  kind, state, defaultSort, onClose, onSaved,
}: {
  kind: TaxonomyKind;
  state: { mode: "add" } | { mode: "edit"; item: AdminTaxonomyItem };
  defaultSort?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = state.mode === "edit";
  const existing = isEdit ? state.item : null;
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [tone, setTone] = useState(existing?.tone ?? "cream");
  const [tagline, setTagline] = useState(existing?.tagline ?? "");
  const [sort, setSort] = useState(String(existing?.sort ?? defaultSort ?? 0));
  const [busy, start] = useTransition();

  const save = () => {
    const sortNum = Number(sort);
    if (!Number.isInteger(sortNum) || sortNum < 0) return toast.error("Sort must be a whole number ≥ 0.");
    start(async () => {
      const payload = { title, tone, tagline: tagline.trim() === "" ? null : tagline, sort: sortNum };
      const r = isEdit
        ? await updateTaxonomy(kind, existing!.slug, payload)
        : await createTaxonomy(kind, { slug, ...payload });
      if (r.ok) { toast.success(isEdit ? "Saved." : "Added."); onSaved(); } else toast.error(r.error);
    });
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={() => !busy && onClose()}>
      <div className="w-full max-w-md rounded-2xl border border-cream-300 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-bold text-ink">
          {isEdit ? "Edit" : "Add"} {kind === "category" ? "category" : "age tier"}
        </h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Slug</span>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={isEdit}
              placeholder="wooden-toys" className="mt-1 font-mono" />
            {isEdit && <span className="mt-1 block text-xs text-ink-soft">Slug can’t be changed.</span>}
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Name</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </label>
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Tone</span>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="inline-flex items-center gap-2">
                      <span className={cn("size-3 rounded-full border border-cream-300", TONE_SWATCH[t])} />{t}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Tagline</span>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Sort</span>
            <Input type="number" min={0} step={1} inputMode="numeric" value={sort}
              onChange={(e) => setSort(e.target.value)} className="mt-1" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
