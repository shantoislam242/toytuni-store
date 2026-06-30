import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProductDetail } from "@/lib/types";

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-[15px] text-ink-muted">No information yet.</p>;
  return (
    <ul className="list-disc space-y-3 pl-5 text-[15px] leading-7 text-ink-muted marker:text-ink-muted">
      {items.map((item) => (
        <li key={item} className="pl-1">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Detail/spec table row. */
function SpecRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-cream-200 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-ink">{label}</dt>
      <dd className="text-sm text-ink-muted">{value}</dd>
    </div>
  );
}

/** Pill-style tab trigger: outlined when idle, filled (blush) when active. */
const pillClass =
  "h-auto flex-none rounded-full border border-cream-300 px-5 py-2 text-sm font-medium text-ink-muted shadow-none transition-colors hover:border-neem-soft hover:text-ink data-active:border-neem data-active:bg-neem/15 data-active:font-bold data-active:text-neem-deep data-active:shadow-none";

/**
 * Tabbed product information shown as side-by-side pills: Description, Why Play,
 * How to Play, Details, and Return & Exchange. Falls back gracefully when
 * optional fields are missing.
 */
export function ProductTabs({ detail }: { detail: ProductDetail }) {
  const specs = detail.specs;

  return (
    <Tabs defaultValue="description" className="mx-auto max-w-3xl gap-6">
      <TabsList className="flex h-auto w-full flex-wrap justify-center gap-2 bg-transparent p-0">
        <TabsTrigger value="description" className={pillClass}>
          Description
        </TabsTrigger>
        <TabsTrigger value="why" className={pillClass}>
          Learning Benefits
        </TabsTrigger>
        <TabsTrigger value="how" className={pillClass}>
          How to Play
        </TabsTrigger>
        <TabsTrigger value="details" className={pillClass}>
          Specifications
        </TabsTrigger>
        <TabsTrigger value="return" className={pillClass}>
          Shipping &amp; Returns
        </TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="space-y-6">
        <p className="max-w-2xl text-[15px] leading-7 text-ink-muted">
          {detail.description}
        </p>
        {detail.features.length ? (
          <div>
            <h3 className="mb-3 font-display text-lg font-bold text-ink">Features</h3>
            <BulletList items={detail.features} />
          </div>
        ) : null}
        {detail.benefits.length ? (
          <div>
            <h3 className="mb-3 font-display text-lg font-bold text-ink">Benefits</h3>
            <BulletList items={detail.benefits} />
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="why">
        <div className="max-w-2xl">
          <h3 className="mb-3 font-display text-lg font-bold text-ink">Why your child will love it</h3>
          <BulletList items={detail.whyPlay ?? []} />
        </div>
      </TabsContent>

      <TabsContent value="how">
        <div className="max-w-2xl">
          <h3 className="mb-3 font-display text-lg font-bold text-ink">How to play</h3>
          <BulletList items={detail.howPlay ?? []} />
        </div>
      </TabsContent>

      <TabsContent value="details">
        <dl className="max-w-2xl">
          <SpecRow label="Age range" value={specs?.ageRange} />
          <SpecRow label="Materials" value={specs?.materials} />
          <SpecRow label="Safety" value={specs?.safety} />
          <SpecRow label="Weight" value={specs?.weight} />
          <SpecRow label="Dimensions" value={specs?.dimensions} />
        </dl>
      </TabsContent>

      <TabsContent value="return">
        <p className="max-w-2xl text-sm leading-7 text-ink-muted">
          {detail.returnPolicy}
        </p>
      </TabsContent>
    </Tabs>
  );
}
