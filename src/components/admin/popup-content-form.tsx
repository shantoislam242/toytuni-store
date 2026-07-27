"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, Loader2, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePopupContent, uploadContentImage } from "@/lib/admin/content-actions";
import { DEFAULT_POPUP_IMAGE, type PopupContent } from "@/lib/data/popup-shape";

const inputCls =
  "w-full rounded-lg border border-cream-300 bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

/** Upload/preview control for the pop-up image; null value → bundled default. */
function ImageField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const src = value ?? DEFAULT_POPUP_IMAGE;

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadContentImage(fd);
    setUploading(false);
    if (res.ok) {
      onChange(res.url);
      toast.success("Image uploaded — Save to publish.");
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">Image</span>
      <div className="relative aspect-[3/4] w-40 overflow-hidden rounded-lg border border-cream-300 bg-cream-100">
        <Image src={src} alt="" fill sizes="160px" className="object-cover" />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        {value ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onChange(null)}>
            <RotateCcw className="size-4" /> Use default
          </Button>
        ) : null}
      </div>
      <p className="mt-1.5 text-xs text-ink-soft">Portrait (about 3 : 4) works best.</p>
      <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="hidden" />
    </div>
  );
}

/**
 * `/admin/content/popup` — edit the timed newsletter pop-up (copy, image, delay,
 * on/off). Saves the whole blob via `updatePopupContent` (busts `popup-content`).
 */
export function PopupContentForm({ initial }: { initial: PopupContent }) {
  const router = useRouter();
  const [c, setC] = useState<PopupContent>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PopupContent>(k: K, v: PopupContent[K]) =>
    setC((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    const res = await updatePopupContent(c);
    setSaving(false);
    if (res.ok) {
      toast.success("Pop-up updated.");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-cream-300">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Newsletter pop-up</span>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={(e) => set("enabled", e.target.checked)}
                className="size-4 accent-neem"
              />
              {c.enabled ? "Enabled" : "Disabled"}
            </label>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Labelled label="Eyebrow (small pill)">
              <Input value={c.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} placeholder="Toytuni family" />
            </Labelled>
            <Labelled label="Show after (seconds)">
              <Input
                type="number"
                min={3}
                max={300}
                value={c.delaySeconds}
                onChange={(e) => set("delaySeconds", Number(e.target.value) || 0)}
              />
            </Labelled>
          </div>
          <Labelled label="Heading">
            <Input value={c.heading} onChange={(e) => set("heading", e.target.value)} />
          </Labelled>
          <Labelled label="Subheading">
            <textarea value={c.subheading} onChange={(e) => set("subheading", e.target.value)} rows={3} className={inputCls} />
          </Labelled>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labelled label="Button label">
              <Input value={c.buttonLabel} onChange={(e) => set("buttonLabel", e.target.value)} placeholder="Join Now" />
            </Labelled>
            <Labelled label="Fine print">
              <Input value={c.finePrint} onChange={(e) => set("finePrint", e.target.value)} />
            </Labelled>
          </div>

          <ImageField value={c.image} onChange={(url) => set("image", url)} />
        </CardContent>
      </Card>

      <Card className="border-cream-300">
        <CardHeader><CardTitle>After sign-up</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Labelled label="Success heading">
            <Input value={c.successHeading} onChange={(e) => set("successHeading", e.target.value)} />
          </Labelled>
          <Labelled label="Success message">
            <textarea value={c.successBody} onChange={(e) => set("successBody", e.target.value)} rows={2} className={inputCls} />
          </Labelled>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} className="shadow-lg">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save pop-up"}
        </Button>
      </div>
    </div>
  );
}
