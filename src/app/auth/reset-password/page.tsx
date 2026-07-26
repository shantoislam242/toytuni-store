"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BRAND_NAME } from "@/lib/config";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { validatePasswordChange, MIN_PASSWORD_LEN } from "@/lib/account/security";

/**
 * `/auth/reset-password` — the landing page for the "Forgot password?" email
 * link. The link points at `/auth/callback?next=/auth/reset-password`, which
 * exchanges the recovery code for a session before redirecting here, so by the
 * time this page renders the visitor holds a live (recovery) session and can
 * set a new password with `updateUser({ password })` — no current password
 * needed. If there's no session (link expired, or opened directly), we say so
 * and point back to sign-in to request a fresh link.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const { loading, user } = useAuth();
  const [supabase] = useState(() => createBrowserSupabase());

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = validatePasswordChange(password, confirm);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.", {
      description: "You can now sign in with your email and password.",
    });
    router.replace("/account");
    router.refresh();
  };

  return (
    <main className="flex min-h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] flex-col bg-paper px-4 md:min-h-dvh">
      <div className="flex justify-center pt-8 pb-4">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight text-ink">
          {BRAND_NAME}
        </Link>
      </div>

      <div className="flex flex-1 items-start justify-center pt-24">
        <div className="w-full max-w-sm">
          <span className="flex size-11 items-center justify-center rounded-full bg-neem/10 text-neem-deep">
            <KeyRound className="size-5" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">Set a new password</h1>

          {loading ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 className="size-4 animate-spin" /> Checking your link…
            </p>
          ) : !user ? (
            <>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                This reset link is invalid or has expired. Request a new one from the sign-in
                page.
              </p>
              <Link
                href="/signin"
                className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-neem text-base font-semibold text-paper transition hover:bg-neem-deep"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                Choose a new password for{" "}
                <span className="font-semibold text-ink break-all">{user.email}</span>.
              </p>

              <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
                <div className="flex items-stretch rounded-lg border border-cream-300 bg-paper transition-colors focus-within:border-neem">
                  <input
                    type={reveal ? "text" : "password"}
                    autoComplete="new-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={`New password (min ${MIN_PASSWORD_LEN} characters)`}
                    aria-label="New password"
                    className="h-12 w-full flex-1 bg-transparent px-4 text-[15px] text-ink outline-none placeholder:text-ink-soft"
                  />
                  <button
                    type="button"
                    onClick={() => setReveal((v) => !v)}
                    aria-label={reveal ? "Hide password" : "Show password"}
                    className="flex w-11 items-center justify-center text-ink-soft transition-colors hover:text-ink"
                  >
                    {reveal ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>

                <input
                  type={reveal ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  aria-label="Confirm new password"
                  className="h-12 w-full rounded-lg border border-cream-300 bg-paper px-4 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-neem"
                />

                <button
                  type="submit"
                  disabled={saving}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-neem text-base font-semibold text-paper transition hover:bg-neem-deep disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {saving ? "Updating…" : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
