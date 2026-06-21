import { Users, ShieldCheck, Star } from "lucide-react";
import { trustStats } from "@/lib/mock/trust";
import type { TrustStat } from "@/lib/types";

const icon: Record<TrustStat["icon"], typeof Users> = {
  users: Users,
  "shield-check": ShieldCheck,
  star: Star,
};

export function TrustStrip() {
  return (
    <section className="border-y border-cream-300 bg-cream-50">
      <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-cream-300 px-6 py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:py-6">
        {trustStats.map((s) => {
          const Icon = icon[s.icon];
          return (
            <div
              key={s.id}
              className="flex items-center justify-center gap-3 py-4 sm:py-0"
            >
              <Icon className="size-7 shrink-0 text-neem" />
              <div>
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
