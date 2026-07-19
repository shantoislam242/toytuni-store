"use client";
import { cn } from "@/lib/utils";
import type { AnalysisResult, CheckStatus } from "@/lib/blog/analysis";

const DOT: Record<CheckStatus, string> = { good: "bg-neem", ok: "bg-mustard", bad: "bg-danger" };

export function SeoPanel({ title, result }: { title: string; result: AnalysisResult }) {
  return (
    <div className="rounded-xl border border-cream-300 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("size-3 rounded-full", DOT[result.rating])} />
          <span className="font-semibold text-ink">{title}</span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-ink-muted">{result.score}/100</span>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {result.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            <span className={cn("mt-1.5 size-2 flex-none rounded-full", DOT[c.status])} />
            <span className="text-ink-muted">{c.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
