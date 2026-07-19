import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/orders/track-order-form";

export function generateMetadata(): Metadata {
  return {
    title: "Track your order",
    description:
      "Check the status of your Toytuni order — enter your order number and the phone number you ordered with to see its progress and download your invoice.",
    alternates: { canonical: "/track-order" },
  };
}

/**
 * Public `/track-order` — no login. A customer enters their order number and
 * the phone they ordered with; the server verifies the phone against the order
 * (the pair is the credential) and returns a masked timeline + tracking + a
 * verified invoice download. Indexable (normal robots) — it's a public
 * self-service page, and it reveals nothing until a phone matches.
 */
export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
        Track your order
      </h1>
      <p className="mt-3 max-w-prose text-ink-muted">
        Enter your order number and the phone number you used to place the order.
        We&apos;ll show its current status, tracking, and let you download the
        invoice — no account needed.
      </p>
      <TrackOrderForm />
    </main>
  );
}
