"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { Search, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product/product-image";
import { updateInventory, adjustStock } from "@/lib/admin/actions";
import { stockStatus, type StockStatus } from "@/lib/admin/inventory-status";
import type { AdminInventoryItem } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

const STATUS_META: Record<StockStatus, { label: string; cls: string }> = {
  out: { label: "Out", cls: "bg-danger/10 text-danger" },
  low: { label: "Low", cls: "bg-mustard/20 text-ink" },
  in_stock: { label: "In stock", cls: "bg-neem/10 text-neem-deep" },
};

export function InventoryTable({ items }: { items: AdminInventoryItem[] }) {
  const [rows, setRows] = useState(items);
  useEffect(() => setRows(items), [items]);
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [outOnly, setOutOnly] = useState(false);

  const patchRow = (slug: string, next: Partial<AdminInventoryItem>) =>
    setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, ...next } : r)));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !(r.title.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q))) return false;
      const st = stockStatus(r.stockQty, r.lowStockThreshold);
      if (outOnly && st !== "out") return false;
      if (lowOnly && st === "in_stock") return false;
      return true;
    });
  }, [rows, query, lowOnly, outOnly]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-cream-300 bg-cream-50/60 px-3 py-2">
          <Search className="size-4 flex-none text-ink-soft" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or SKU…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft" />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low stock only
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" checked={outOnly} onChange={(e) => setOutOnly(e.target.checked)} /> Out of stock
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-cream-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Stock</th>
              <th className="px-3 py-2 font-medium">Low-stock at</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <InventoryRow key={item.slug} item={item} onPatch={(n) => patchRow(item.slug, n)} />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-ink-muted">No products match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryRow({ item, onPatch }: { item: AdminInventoryItem; onPatch: (n: Partial<AdminInventoryItem>) => void }) {
  const [busy, start] = useTransition();
  const [stock, setStock] = useState(String(item.stockQty));
  const [thr, setThr] = useState(String(item.lowStockThreshold));
  useEffect(() => setStock(String(item.stockQty)), [item.stockQty]);
  useEffect(() => setThr(String(item.lowStockThreshold)), [item.lowStockThreshold]);

  const status = stockStatus(item.stockQty, item.lowStockThreshold);
  const meta = STATUS_META[status];

  const commitStock = () => {
    const n = Number(stock);
    if (!Number.isInteger(n) || n < 0) { setStock(String(item.stockQty)); return toast.error("Stock must be a whole number ≥ 0."); }
    if (n === item.stockQty) return;
    start(async () => {
      const r = await updateInventory(item.slug, { stockQty: n });
      if (r.ok) { onPatch({ stockQty: n }); toast.success("Stock updated."); }
      else { toast.error(r.error); setStock(String(item.stockQty)); }
    });
  };
  const adjust = (delta: number) => start(async () => {
    const r = await adjustStock(item.slug, delta);
    if (r.ok) onPatch({ stockQty: r.stock });
    else toast.error(r.error);
  });
  const commitThreshold = () => {
    const n = Number(thr);
    if (!Number.isInteger(n) || n < 0) { setThr(String(item.lowStockThreshold)); return toast.error("Threshold must be a whole number ≥ 0."); }
    if (n === item.lowStockThreshold) return;
    start(async () => {
      const r = await updateInventory(item.slug, { lowStockThreshold: n });
      if (r.ok) onPatch({ lowStockThreshold: n });
      else { toast.error(r.error); setThr(String(item.lowStockThreshold)); }
    });
  };

  return (
    <tr className="border-b border-cream-200 last:border-b-0">
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="size-10 flex-none overflow-hidden rounded-lg border border-cream-300 bg-cream-50">
            <ProductImage slug={item.slug} imageNum={1} label={item.title} fallbackTone="cream" imageUrl={item.imageUrl ?? undefined} className="size-full" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{item.title}</p>
            <p className="font-mono text-xs text-ink-muted">{item.sku}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold", meta.cls)}>{meta.label}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Decrease" disabled={busy} onClick={() => adjust(-1)}><Minus className="size-4" /></Button>
          <Input type="number" min={0} step={1} inputMode="numeric" value={stock} disabled={busy}
            onChange={(e) => setStock(e.target.value)} onBlur={commitStock}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className="w-20 text-center" />
          <Button variant="outline" size="icon" aria-label="Increase" disabled={busy} onClick={() => adjust(1)}><Plus className="size-4" /></Button>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <Input type="number" min={0} step={1} inputMode="numeric" value={thr} disabled={busy}
          onChange={(e) => setThr(e.target.value)} onBlur={commitThreshold}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className="w-20" />
      </td>
    </tr>
  );
}
