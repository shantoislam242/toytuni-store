import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/config";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-neem-deep">
        Phase 0 · Foundation
      </p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        {BRAND_NAME}
      </h1>
      <p className="mt-4 max-w-md text-lg text-ink-muted">{BRAND_TAGLINE}</p>
      <div className="mt-8">
        <Button asChild size="lg">
          <Link href="/styleguide">View design system →</Link>
        </Button>
      </div>
      <p className="mt-6 font-mono text-xs text-ink-soft">
        Storefront coming in the next phase.
      </p>
    </main>
  );
}
