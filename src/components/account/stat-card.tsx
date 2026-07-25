import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One Overview metric tile (Total Orders, Pending, Wishlist, Total Spent).
 * Presentational and server/client-safe — the wishlist tile reuses it from a
 * client wrapper (`WishlistStatCard`) that supplies a live count.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "neem",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: "neem" | "mustard" | "blush" | "blue";
}) {
  const accents: Record<string, string> = {
    neem: "bg-neem/10 text-neem-deep",
    mustard: "bg-mustard/20 text-[#8a6d1a]",
    blush: "bg-blush/15 text-terracotta",
    blue: "bg-dusty-blue/15 text-dusty-blue",
  };
  return (
    <div className="rounded-2xl border border-cream-300 bg-card p-5">
      <span className={cn("flex size-9 items-center justify-center rounded-xl", accents[accent])}>
        <Icon className="size-5" strokeWidth={1.9} aria-hidden />
      </span>
      <p className="mt-3 text-2xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm text-ink-muted">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}
