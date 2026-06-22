import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaceholderImage } from "@/components/placeholder-image";
import { ageTiers } from "@/lib/mock/age-tiers";
import { categories } from "@/lib/mock/categories";
import { bulkPrograms } from "@/lib/mock/bulk";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/types";

const toneBg: Record<Tone, string> = {
  cream: "bg-cream-200 text-ink",
  neem: "bg-neem text-paper",
  "neem-soft": "bg-neem-soft text-ink",
  wood: "bg-wood-light text-ink",
  terracotta: "bg-terracotta text-ink",
  mustard: "bg-mustard text-ink",
  "dusty-blue": "bg-dusty-blue text-ink",
  blush: "bg-blush text-ink",
};

function Tile({ href, label, tone }: { href: string; label: string; tone: Tone }) {
  return (
    <Link href={href} className="group flex flex-col gap-2">
      <PlaceholderImage
        tone={tone}
        label={label}
        className="aspect-square w-full rounded-xl border border-cream-300 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md"
      />
    </Link>
  );
}

function TileGrid({
  items,
}: {
  items: { href: string; label: string; tone: Tone }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {items.map((it) => (
        <Tile key={it.href} {...it} />
      ))}
    </div>
  );
}

export function BrowseTabs() {
  const ageItems = ageTiers.map((t) => ({
    href: t.href,
    label: t.labelBn,
    tone: t.tone,
  }));
  const categoryItems = categories.map((c) => ({
    href: c.href,
    label: c.nameBn,
    tone: c.tone,
  }));

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:max-w-[90rem] lg:px-8">
      <h2 className="text-center font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Browse the shop
      </h2>

      <Tabs defaultValue="age" className="mt-6">
        <TabsList className="mx-auto mb-6 flex h-auto flex-wrap justify-center gap-1">
          <TabsTrigger value="age">By Age</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="bulk">Bulk</TabsTrigger>
        </TabsList>

        <TabsContent value="age">
          <TileGrid items={ageItems} />
        </TabsContent>

        <TabsContent value="category">
          <TileGrid items={categoryItems} />
        </TabsContent>

        <TabsContent value="bulk">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {bulkPrograms.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className={cn(
                  "group flex flex-col justify-between gap-6 rounded-xl border border-cream-300 p-6 transition-all hover:shadow-md sm:p-8",
                  toneBg[p.tone],
                )}
              >
                <div>
                  <h3 className="font-display text-xl font-bold">{p.titleBn}</h3>
                  <p className="mt-2 max-w-sm text-sm opacity-90">{p.descBn}</p>
                </div>
                <span className="text-sm font-semibold underline-offset-4 group-hover:underline">
                  Know more →
                </span>
              </Link>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
