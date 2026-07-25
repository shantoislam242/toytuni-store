"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { validatePasswordChange, MIN_PASSWORD_LEN } from "@/lib/account/security";

const inputCls =
  "h-11 w-full rounded-lg border border-cream-300 bg-paper px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";

/**
 * `/account/security` — set a new password and sign out everywhere. Both use
 * the browser Supabase client: `updateUser({ password })` (session-based, no
 * current password needed — Supabase re-auths via the active session) and
 * `signOut({ scope: "global" })`, which revokes every refresh token, then we
 * send the visitor home.
 */
export function SecurityForm() {
  const router = useRouter();
  const { loading, user } = useAuth();
  const [supabase] = useState(() => createBrowserSupabase());

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleChangePassword = async () => {
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
    setPassword("");
    setConfirm("");
    toast.success("Password updated.");
  };

  const handleSignOutAll = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      setSigningOut(false);
      toast.error(error.message);
      return;
    }
    toast.success("Signed out on all devices.");
    router.replace("/");
    router.refresh();
  };

  const disabled = loading || !user;

  return (
    <div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Account</p>
        <h1 className="mt-0.5 font-display text-2xl font-bold text-ink sm:text-3xl">Security</h1>
      </div>

      {/* change password */}
      <div className="mt-6 max-w-xl rounded-2xl border border-cream-300 bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <KeyRound className="size-5 text-neem-deep" /> Change password
        </h2>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
              className={inputCls}
              disabled={disabled}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter the password"
              className={inputCls}
              disabled={disabled}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleChangePassword}
          disabled={disabled || saving}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-neem px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-neem-deep disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Updating…" : "Update password"}
        </button>
      </div>

      {/* sign out everywhere */}
      <div className="mt-6 max-w-xl rounded-2xl border border-cream-300 bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <LogOut className="size-5 text-neem-deep" /> Sign out everywhere
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Sign out of this account on all devices and browsers. You&apos;ll need to sign in again.
        </p>
        <button
          type="button"
          onClick={handleSignOutAll}
          disabled={disabled || signingOut}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-cream-300 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          {signingOut ? "Signing out…" : "Sign out all devices"}
        </button>
      </div>
    </div>
  );
}
