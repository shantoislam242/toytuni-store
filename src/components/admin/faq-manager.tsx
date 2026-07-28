"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HelpCircle, Trash2, Pencil, X, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createFaq, updateFaq, deleteFaq, reorderFaqs } from "@/lib/admin/faq-actions";
import { FAQ_CATEGORIES, type AdminFaq, type FaqInput } from "@/lib/faq/faqs-shape";

const inputCls =
  "w-full rounded-lg border border-cream-300 bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";

type FormState = {
  category: string;
  question: string;
  answer: string;
  linkLabel: string;
  linkHref: string;
  active: boolean;
};

const BLANK: FormState = {
  category: FAQ_CATEGORIES[0], question: "", answer: "", linkLabel: "", linkHref: "", active: true,
};

function fromFaq(f: AdminFaq): FormState {
  return {
    category: f.category,
    question: f.question,
    answer: f.answer,
    linkLabel: f.link?.label ?? "",
    linkHref: f.link?.href ?? "",
    active: f.active,
  };
}

/** The shared field set — reused by the "Add FAQ" card and the inline editor. */
function FaqFields({
  value,
  set,
}: {
  value: FormState;
  set: <K extends keyof FormState>(key: K, v: FormState[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Category</span>
          <select value={value.category} onChange={(e) => set("category", e.target.value)} className={`${inputCls} mt-1`}>
            {FAQ_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2.5 sm:mt-6">
          <input type="checkbox" checked={value.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-neem" />
          <span className="text-sm font-medium text-ink">Active (visible on the site)</span>
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Question</span>
        <Input value={value.question} onChange={(e) => set("question", e.target.value)} placeholder="How do I place an order?" className="mt-1" />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Answer</span>
        <textarea value={value.answer} onChange={(e) => set("answer", e.target.value)} rows={3} className={`${inputCls} mt-1`} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Link label — optional</span>
          <Input value={value.linkLabel} onChange={(e) => set("linkLabel", e.target.value)} placeholder="Shipping & Delivery" className="mt-1" />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Link URL — optional</span>
          <Input value={value.linkHref} onChange={(e) => set("linkHref", e.target.value)} placeholder="/policy/shipping" className="mt-1" />
        </label>
      </div>
    </div>
  );
}

/**
 * FAQ management UI (`/admin/faqs`). The top card CREATES a FAQ; each row in the
 * list edits IN PLACE — clicking its pencil opens an inline editor on that same
 * FAQ (no jump to the top form). The list also supports delete, an active
 * toggle, and up/down reordering (persisted via `reorderFaqs`).
 */
export function FaqManager({ faqs }: { faqs: AdminFaq[] }) {
  const router = useRouter();
  const [addForm, setAddForm] = useState<FormState>(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(BLANK);
  const [busy, start] = useTransition();

  const setAdd = <K extends keyof FormState>(k: K, v: FormState[K]) => setAddForm((f) => ({ ...f, [k]: v }));
  const setEdit = <K extends keyof FormState>(k: K, v: FormState[K]) => setEditForm((f) => ({ ...f, [k]: v }));

  const startEdit = (f: AdminFaq) => {
    setEditingId(f.id);
    setEditForm(fromFaq(f));
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(BLANK);
  };

  const add = () => {
    const input: FaqInput = { ...addForm };
    start(async () => {
      const r = await createFaq(input);
      if (r.ok) {
        toast.success("FAQ added.");
        setAddForm(BLANK);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const input: FaqInput = { ...editForm };
    start(async () => {
      const r = await updateFaq(editingId, input);
      if (r.ok) {
        toast.success("FAQ updated.");
        cancelEdit();
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  const remove = (f: AdminFaq) => {
    if (!confirm(`Delete this FAQ?\n\n${f.question}`)) return;
    start(async () => {
      const r = await deleteFaq(f.id);
      if (r.ok) { toast.success("FAQ deleted."); if (editingId === f.id) cancelEdit(); router.refresh(); }
      else toast.error(r.error);
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= faqs.length) return;
    const ids = faqs.map((f) => f.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    start(async () => {
      const r = await reorderFaqs(ids);
      if (r.ok) router.refresh();
      else toast.error(r.error);
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Add FAQ</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FaqFields value={addForm} set={setAdd} />
          <Button onClick={add} disabled={busy}>
            <HelpCircle className="size-4" /> {busy ? "Saving…" : "Add FAQ"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-cream-300">
        <CardHeader><CardTitle>FAQs ({faqs.length})</CardTitle></CardHeader>
        <CardContent>
          {faqs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-cream-300 px-6 py-14 text-center text-ink-muted">No FAQs yet.</div>
          ) : (
            <ul className="space-y-2">
              {faqs.map((f, i) => (
                <li key={f.id} className="rounded-xl border border-cream-300 p-3">
                  {editingId === f.id ? (
                    <div className="space-y-4">
                      <FaqFields value={editForm} set={setEdit} />
                      <div className="flex gap-2">
                        <Button onClick={saveEdit} disabled={busy}>
                          <HelpCircle className="size-4" /> {busy ? "Saving…" : "Save changes"}
                        </Button>
                        <Button variant="outline" onClick={cancelEdit} disabled={busy}>
                          <X className="size-4" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex flex-none flex-col">
                        <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} className="text-ink-soft hover:text-ink disabled:opacity-30" aria-label="Move up"><ChevronUp className="size-4" /></button>
                        <button type="button" disabled={busy || i === faqs.length - 1} onClick={() => move(i, 1)} className="text-ink-soft hover:text-ink disabled:opacity-30" aria-label="Move down"><ChevronDown className="size-4" /></button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{f.category}</span>
                          {!f.active && <span className="rounded-full border border-cream-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Hidden</span>}
                          <span className="font-medium text-ink">{f.question}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{f.answer}</p>
                      </div>
                      <div className="flex flex-none items-center gap-1.5">
                        <Button variant="outline" size="icon" aria-label="Edit FAQ" disabled={busy} onClick={() => startEdit(f)}><Pencil className="size-4" /></Button>
                        <Button variant="outline" size="icon" aria-label="Delete FAQ" disabled={busy} className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger" onClick={() => remove(f)}><Trash2 className="size-4" /></Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
