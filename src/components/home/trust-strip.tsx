import { Users, ShieldCheck, Star } from "lucide-react";
import { trustStats } from "@/lib/mock/trust";
import type { TrustStat } from "@/lib/types";

const icon: Record<TrustStat["icon"], typeof Users> = {
  users: Users,
  "shield-check": ShieldCheck,
  star: Star,
};

const accentById: Record<string, { outer: string; inner: string }> = {
  parents: {
    outer:
      "left-1/2 top-1/2 h-24 w-[124%] -translate-x-1/2 -translate-y-1/2 rounded-[48%_64%_42%_58%/54%_44%_60%_46%] bg-neem-soft/25 blur-[42px] sm:h-28",
    inner:
      "left-[42%] top-[46%] h-16 w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-[62%_38%_58%_42%/44%_56%_40%_60%] bg-neem/15 blur-[34px]",
  },
  lab: {
    outer:
      "left-1/2 top-1/2 h-24 w-[126%] -translate-x-1/2 -translate-y-1/2 rounded-[42%_58%_54%_46%/58%_38%_62%_42%] bg-wood-light/25 blur-[46px] sm:h-28",
    inner:
      "left-[56%] top-[54%] h-14 w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-[52%_48%_36%_64%/46%_58%_42%_54%] bg-mustard/18 blur-[36px]",
  },
  reviews: {
    outer:
      "left-1/2 top-1/2 h-24 w-[122%] -translate-x-1/2 -translate-y-1/2 rounded-[58%_42%_64%_36%/46%_62%_38%_54%] bg-blush/25 blur-[44px] sm:h-28",
    inner:
      "left-[48%] top-[44%] h-12 w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-[36%_64%_44%_56%/60%_42%_58%_40%] bg-mustard/16 blur-[34px]",
  },
};

export function TrustStrip() {
  return (
    <section className="overflow-hidden border-y border-cream-300 bg-cream-50">
      <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-cream-300 px-6 py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:py-6">
        {trustStats.map((s) => {
          const Icon = icon[s.icon];
          const accent = accentById[s.id];
          return (
            <div
              key={s.id}
              className="relative isolate flex min-h-24 items-center justify-center gap-3 overflow-visible py-4 sm:min-h-20 sm:py-0"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-3 inset-y-0 z-0 motion-safe:animate-trust-accent-float sm:inset-x-0"
              >
                <span className={`absolute ${accent.outer}`} />
                <span className={`absolute ${accent.inner}`} />
              </div>
              <Icon className="relative z-10 size-7 shrink-0 text-neem" />
              <div className="relative z-10">
                <p className="font-display text-lg font-bold leading-tight text-ink">
                  {s.valueBn}
                </p>
                <p className="text-sm text-ink-muted">{s.labelBn}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
