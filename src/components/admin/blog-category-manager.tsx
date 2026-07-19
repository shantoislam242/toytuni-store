"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { moveInArray } from "@/lib/array-move";
import { createBlogCategory, updateBlogCategory, deleteBlogCategory, reorderBlogCategories } from "@/lib/admin/actions";
import type { AdminBlogCategory } from "@/lib/admin/queries";

type DialogState =
  | { mode: "add" }
  | { mode: "edit"; item: AdminBlogCategory }
  | null;

/** Blog-category CRUD table (Blog 3c, Task 4) — mirrors `TaxonomyManager`
 *  (table + per-row edit/↑/↓/delete + Add button + modal), but bound to the
 *  blog-category actions and dropping the product taxonomy's "tone" field. */
export function BlogCategoryManager({ items }: { items: AdminBlogCategory[] }) {
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
      const r = await reorderBlogCategories(next.map((x) => x.slug));
      if (!r.ok) { setRows(prev); toast.error(r.error); } else refresh();
    });
  };

  const remove = (item: AdminBlogCategory) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    start(async () => {
      const r = await deleteBlogCategory(item.slug);
      if (r.ok) { toast.success("Deleted."); refresh(); } else toast.error(r.error);
    });
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setDialog({ mode: "add" })}>
          <Plus className="size-4" /> Add category
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-cream-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 text-right font-medium">Posts</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => (
              <tr key={item.slug} className="border-b border-cream-200 last:border-b-0">
                <td className="px-3 py-2.5 font-medium text-ink">{item.name}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-ink-muted">{item.slug}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink">{item.postCount}</td>
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
              <tr><td colSpan={4} className="px-3 py-8 text-center text-ink-muted">No categories yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {dialog && (
        <BlogCategoryDialog
          state={dialog}
          defaultSort={rows.length}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); refresh(); }}
        />
      )}
    </div>
  );
}

function BlogCategoryDialog({
  state, defaultSort, onClose, onSaved,
}: {
  state: { mode: "add" } | { mode: "edit"; item: AdminBlogCategory };
  defaultSort?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = state.mode === "edit";
  const existing = isEdit ? state.item : null;
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [sort, setSort] = useState(String(existing?.sort ?? defaultSort ?? 0));
  const [busy, start] = useTransition();

  const save = () => {
    const sortNum = Number(sort);
    if (!Number.isInteger(sortNum) || sortNum < 0) return toast.error("Sort must be a whole number ≥ 0.");
    start(async () => {
      const r = isEdit
        ? await updateBlogCategory(existing!.slug, { name, sort: sortNum })
        : await createBlogCategory({ slug, name, sort: sortNum });
      if (r.ok) { toast.success(isEdit ? "Saved." : "Added."); onSaved(); } else toast.error(r.error);
    });
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={() => !busy && onClose()}>
      <div className="w-full max-w-md rounded-2xl border border-cream-300 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-bold text-ink">{isEdit ? "Edit" : "Add"} category</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Slug</span>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={isEdit}
              placeholder="craft-diy" className="mt-1 font-mono" />
            {isEdit && <span className="mt-1 block text-xs text-ink-soft">Slug can’t be changed.</span>}
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
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
