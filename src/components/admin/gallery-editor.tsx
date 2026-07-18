"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload, ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { moveInArray } from "@/lib/array-move";
import { uploadGalleryImage, removeGalleryImage, reorderGallery } from "@/lib/admin/actions";

export function GalleryEditor({
  slug, images, onChange,
}: {
  slug: string;
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, start] = useTransition();
  const [reordering, setReordering] = useState(false);

  const handleUpload = () => {
    const files = Array.from(fileRef.current?.files ?? []);
    if (files.length === 0) return toast.error("Choose image(s) first.");
    start(async () => {
      let latest = images;
      for (const file of files) {
        const fd = new FormData();
        fd.set("file", file);
        const r = await uploadGalleryImage(slug, fd);
        if (r.ok) { latest = r.gallery; onChange(r.gallery); }
        else { toast.error(r.error); break; }
      }
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Gallery updated.");
    });
  };

  const remove = (url: string) =>
    start(async () => {
      const r = await removeGalleryImage(slug, url);
      if (r.ok) { onChange(images.filter((u) => u !== url)); toast.success("Image removed."); }
      else toast.error(r.error);
    });

  const move = (i: number, delta: number) => {
    const next = moveInArray(images, i, delta);
    if (next === images) return;
    onChange(next);
    setReordering(true);
    start(async () => {
      const r = await reorderGallery(slug, next);
      setReordering(false);
      if (!r.ok) { toast.error(r.error); onChange(images); }
    });
  };

  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Gallery images</span>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((url, i) => (
          <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-cream-300 bg-cream-50">
            {/* Plain <img>, matching ProductImage's existing approach for
                admin-uploaded Storage URLs (tiny thumbnail; no next/image). */}
            <img src={url} alt="" className="size-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-ink/50 p-1">
              <button type="button" aria-label="Move left" disabled={i === 0 || busy}
                onClick={() => move(i, -1)} className="text-paper disabled:opacity-40"><ArrowLeft className="size-4" /></button>
              <button type="button" aria-label="Move right" disabled={i === images.length - 1 || busy}
                onClick={() => move(i, 1)} className="text-paper disabled:opacity-40"><ArrowRight className="size-4" /></button>
              <button type="button" aria-label="Remove" disabled={busy}
                onClick={() => remove(url)} className="text-paper disabled:opacity-40"><X className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="mt-2 block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border file:border-cream-300 file:bg-cream-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-cream-200" />
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={handleUpload} disabled={busy}>
        <Upload className="size-4" /> {busy ? "Working…" : reordering ? "Saving order…" : "Upload image(s)"}
      </Button>
    </div>
  );
}
