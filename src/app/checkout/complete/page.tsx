import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Order Confirmation",
  robots: { index: false, follow: false },
};

type Outcome = "paid" | "cod" | "failed" | "cancelled";

const COPY: Record<
  Outcome,
  { icon: typeof CheckCircle2; tone: string; title: string; body: (o: string) => string; ok: boolean }
> = {
  paid: {
    icon: CheckCircle2,
    tone: "bg-neem/10 text-neem-deep",
    title: "Payment successful!",
    body: (o) => `Your order ${o} is confirmed and paid. A confirmation email with your invoice is on its way.`,
    ok: true,
  },
  cod: {
    icon: CheckCircle2,
    tone: "bg-neem/10 text-neem-deep",
    title: "Order placed!",
    body: (o) => `Your order ${o} is confirmed. Pay in cash when it's delivered — we'll be in touch soon.`,
    ok: true,
  },
  failed: {
    icon: XCircle,
    tone: "bg-danger/10 text-danger",
    title: "Payment failed",
    body: (o) => `We couldn't complete the payment for ${o}, so the order was cancelled. No charge was made — please try again.`,
    ok: false,
  },
  cancelled: {
    icon: Clock,
    tone: "bg-mustard/20 text-ink",
    title: "Payment cancelled",
    body: (o) => `You cancelled the payment for ${o}, so the order wasn't placed. Your cart is ready whenever you'd like to try again.`,
    ok: false,
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; status?: string }>;
}) {
  const { order, status } = await searchParams;
  const outcome: Outcome =
    status === "paid" || status === "cod" || status === "failed" || status === "cancelled"
      ? status
      : "cod";
  const orderLabel = order ?? "your order";
  const { icon: Icon, tone, title, body, ok } = COPY[outcome];

  return (
    <main className="mx-auto w-full max-w-[80rem] flex-1 px-4 py-16 sm:px-6">
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-cream-300 bg-card px-6 py-12 text-center shadow-sm">
        <span className={`flex size-16 items-center justify-center rounded-full ${tone}`}>
          <Icon className="size-8" />
        </span>
        <h1 className="mt-6 font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {order ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1 text-sm font-semibold text-ink">
            <Package className="size-4" /> {order}
          </p>
        ) : null}
        <p className="mt-4 text-sm text-ink-muted">{body(orderLabel)}</p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          {ok ? (
            <>
              <Button asChild>
                <Link href="/account/orders">
                  View my orders <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/collections/all">Continue shopping</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild>
                <Link href="/cart">
                  Back to cart <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/collections/all">Continue shopping</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
