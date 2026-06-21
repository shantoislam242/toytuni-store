import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Placeholder page for any not-yet-built route (keeps nav links off 404). */
export function StubPage({ title }: { title: string }) {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-neem-deep">
        Coming soon
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold text-ink">{title}</h1>
      <p className="mt-3 text-ink-muted">
        This page isn't built yet — it's a stub for navigation checks.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
