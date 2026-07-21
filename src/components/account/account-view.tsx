"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Package, ShoppingBag, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { AccountGate } from "@/components/account/account-gate";
import { formatDate, formatTk } from "@/lib/format";
import type { AccountOrder } from "@/lib/data/account";

/**
 * `/account` dashboard. Rendered by the account Server Component, which passes
 * the signed-in user + their order history as props (so the service-role order
 * read stays server-side). Signed-out visitors are rendered without props and
 * get the `AccountGate` prompt.
 *
 * Client component because it owns the sign-out control (`useAuth().signOut()`).
 */
export function AccountView({
  user,
  orders = [],
}: {
  user?: { name: string; email: string };
  orders?: AccountOrder[];
}) {
  const { signOut, isAdmin } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  // Signed out: the server passes no user → show the existing sign-in gate.
  if (!user) return <AccountGate />;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out.");
      // The account page is a Server Component gated on the session cookie;
      // refresh so it re-renders as the (now signed-out) gate.
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign out.");
      setSigningOut(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
      {/* profile */}
      <section className="rounded-3xl border border-cream-200 bg-cream-50/40 px-6 py-8 shadow-sm sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-neem/10 text-neem">
              <UserRound className="size-7" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
                Account
              </p>
              <h1 className="mt-0.5 break-words font-display text-2xl font-bold text-ink sm:text-3xl">
                {user.name}
              </h1>
              <p className="mt-0.5 break-all text-sm text-ink-muted">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin ? (
              <Button asChild size="lg">
                <Link href="/admin">
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
              </Button>
            ) : null}
            <Button
              size="lg"
              variant="outline"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <LogOut className="size-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </div>
      </section>

      {/* order history */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
          <Package className="size-5 text-neem-deep" aria-hidden />
          Order history
        </h2>

        {orders.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-cream-300 px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-neem-deep">
              <ShoppingBag className="size-6" />
            </span>
            <p className="mt-4 font-medium text-ink">No orders yet</p>
            <p className="mt-1 text-sm text-ink-muted">
              When you place an order, it&apos;ll show up here.
            </p>
            <Button asChild className="mt-6">
              <Link href="/collections/all">Start shopping</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {orders.map((order) => (
              <li key={order.orderNumber}>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="block rounded-2xl border border-cream-300 bg-card p-5 transition-colors hover:border-neem/40 hover:bg-cream-50/60"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <div>
                      <p className="font-mono text-sm font-semibold text-ink">
                        {order.orderNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center rounded-full bg-neem/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neem-deep">
                        {order.status}
                      </span>
                      <p className="mt-1 font-display text-lg font-bold text-ink">
                        {formatTk(order.total)}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-3 divide-y divide-cream-200 border-t border-cream-200">
                    {order.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-baseline justify-between gap-3 py-2 text-sm"
                      >
                        <span className="min-w-0 flex-1 break-words text-ink">
                          {item.title}
                          <span className="text-ink-soft"> × {item.qty}</span>
                        </span>
                        <span className="tabular-nums font-medium text-ink">
                          {formatTk(item.lineTotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
