"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { AccountGate } from "@/components/account/account-gate";

/**
 * `/account` entry point. Real auth is now wired (Task 5 — Google + email/
 * password sign-in), but the account dashboard itself isn't built yet, so a
 * signed-in visitor just gets a minimal "you're signed in" card carrying the
 * sign-out control. Signed-out visitors still get the existing `AccountGate`
 * prompt, unchanged.
 *
 * Client component (needs `useAuth()`) — `src/app/account/page.tsx` stays a
 * server component so it can still export `generateMetadata`.
 */
export function AccountView() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-paper px-4 py-24">
        <div
          className="size-8 animate-spin rounded-full border-2 border-cream-300 border-t-neem"
          role="status"
          aria-label="Loading"
        />
      </main>
    );
  }

  if (!user) return <AccountGate />;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out.");
      // `useAuth()`'s `onAuthStateChange` listener already flips `user` to
      // null (swapping this card for `AccountGate` on its own); refresh so
      // any server-rendered, cookie-gated content on the route picks up the
      // cleared session too.
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign out.");
      setSigningOut(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center bg-paper px-4 py-16 sm:py-24">
      <div className="w-full max-w-md rounded-3xl border border-cream-200 bg-cream-50/40 px-6 py-12 text-center shadow-sm sm:px-10">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-neem/10 text-neem">
          <UserRound className="size-8" strokeWidth={1.75} aria-hidden />
        </span>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          Account
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
          You&apos;re signed in
        </h1>
        <p className="mx-auto mt-3 max-w-sm break-all text-ink-muted">{user.email}</p>
        <div className="mt-8 flex flex-col items-center gap-3">
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
    </main>
  );
}
