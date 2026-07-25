"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateNavContent } from "@/lib/admin/content-actions";
import { SOCIAL_ICONS, type NavContent, type NavLink } from "@/lib/data/nav-shape";

const selectCls =
  "h-9 w-full rounded-lg border border-cream-300 bg-paper px-3 text-sm text-ink outline-none focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";

/** Editor for one label+href link list. Top-level (stable identity → no focus loss). */
function LinkListEditor({ links, onChange }: { links: NavLink[]; onChange: (n: NavLink[]) => void }) {
  const patch = (i: number, k: keyof NavLink, v: string) => onChange(links.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={l.labelBn} onChange={(e) => patch(i, "labelBn", e.target.value)} placeholder="Label" className="flex-1" />
          <Input value={l.href} onChange={(e) => patch(i, "href", e.target.value)} placeholder="/path" className="flex-1 font-mono text-xs" />
          <button type="button" onClick={() => onChange(links.filter((_, j) => j !== i))} aria-label="Remove" className="flex size-9 flex-none items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger"><Trash2 className="size-4" /></button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...links, { labelBn: "", href: "" }])}><Plus className="size-4" /> Add link</Button>
    </div>
  );
}

/** `/admin/content/navigation` — edit header main nav, footer columns, socials. */
export function NavContentForm({ initial }: { initial: NavContent }) {
  const router = useRouter();
  const [c, setC] = useState<NavContent>(initial);
  const [saving, setSaving] = useState(false);

  const setList = (k: keyof NavContent, v: NavLink[]) => setC((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const res = await updateNavContent(c);
    setSaving(false);
    if (res.ok) { toast.success("Navigation updated."); router.refresh(); }
    else toast.error(res.error);
  };

  const columns: { key: keyof NavContent; title: string }[] = [
    { key: "main", title: "Header menu" },
    { key: "footerShop", title: "Footer — Shop" },
    { key: "footerCustomerCare", title: "Footer — Customer Care" },
    { key: "footerAbout", title: "Footer — About" },
    { key: "footerSupport", title: "Footer — Support" },
  ];

  return (
    <div className="space-y-4">
      {columns.map((col) => (
        <Card key={col.key} className="border-cream-300">
          <CardHeader><CardTitle>{col.title}</CardTitle></CardHeader>
          <CardContent>
            <LinkListEditor links={c[col.key] as NavLink[]} onChange={(v) => setList(col.key, v)} />
          </CardContent>
        </Card>
      ))}

      {/* socials */}
      <Card className="border-cream-300">
        <CardHeader><CardTitle>Social links</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-ink-soft">Paste your real profile URLs. Leave a link as “#” to hide that icon.</p>
          {c.socials.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={s.icon} onChange={(e) => setC({ ...c, socials: c.socials.map((x, j) => (j === i ? { ...x, icon: e.target.value as typeof x.icon } : x)) })} className={`${selectCls} w-32 flex-none`}>
                {SOCIAL_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
              </select>
              <Input value={s.label} onChange={(e) => setC({ ...c, socials: c.socials.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder="Label" className="w-32 flex-none" />
              <Input value={s.href} onChange={(e) => setC({ ...c, socials: c.socials.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)) })} placeholder="https://…" className="flex-1 font-mono text-xs" />
              <button type="button" onClick={() => setC({ ...c, socials: c.socials.filter((_, j) => j !== i) })} aria-label="Remove" className="flex size-9 flex-none items-center justify-center rounded-md text-ink-soft hover:bg-danger/10 hover:text-danger"><Trash2 className="size-4" /></button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setC({ ...c, socials: [...c.socials, { label: "", href: "#", icon: "globe" }] })}><Plus className="size-4" /> Add social</Button>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} className="shadow-lg">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}{saving ? "Saving…" : "Save navigation"}
        </Button>
      </div>
    </div>
  );
}
