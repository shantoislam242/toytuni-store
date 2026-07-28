"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, LogOut, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { validatePasswordChange, MIN_PASSWORD_LEN } from "@/lib/account/security";

const inputCls =
  "h-11 w-full rounded-lg border border-cream-300 bg-paper px-3 pr-11 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";

/** Labelled password input with a show/hide (eye) toggle. */
function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  reveal,
  onToggleReveal,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete: string;
  reveal: boolean;
  onToggleReveal: () => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <div className="relative">
        <input
          type={reveal ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onToggleReveal}
          aria-label={reveal ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-soft transition-colors hover:text-ink"
        >
          {reveal ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
        </button>
      </div>
    </label>
  );
}

/**
 * `/account/security` — set/change the password and sign out everywhere.
 *
 * If the account already has a password (an email/password signup, a social
 * account that has set one before, or our `has_password` flag), the current
 * password is REQUIRED to change it — verified via a re-`signInWithPassword`,
 * since `updateUser` is session-based and wouldn't otherwise check it. A
 * social-only account with no password yet can just set one (as before).
 * `signOut({ scope: "global" })` revokes every refresh token.
 */
export function SecurityForm() {
  const router = useRouter();
  const { loading, user } = useAuth();
  const [supabase] = useState(() => createBrowserSupabase());

  const hasPassword =
    user?.user_metadata?.has_password === true ||
    !!user?.app_metadata?.providers?.includes("email") ||
    !!user?.identities?.some((i) => i.provider === "email");

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleChangePassword = async () => {
    if (hasPassword && !currentPassword.trim()) {
      toast.error("Enter your current password.");
      return;
    }
    const problem = validatePasswordChange(password, confirm);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    // Verify the current password first when one already exists.
    if (hasPassword && user?.email) {
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verifyErr) {
        setSaving(false);
        toast.error("Current password is incorrect.");
        return;
      }
    }
    // Set the new password and flag that this account now has one (so the
    // current-password field shows on the next change, regardless of provider).
    const { error } = await supabase.auth.updateUser({
      password,
      data: { ...(user?.user_metadata ?? {}), has_password: true },
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCurrentPassword("");
    setPassword("");
    setConfirm("");
    setReveal(false);
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
  const toggleReveal = () => setReveal((v) => !v);

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
          {hasPassword ? (
            <PasswordField
              label="Old password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Your current password"
              autoComplete="current-password"
              reveal={reveal}
              onToggleReveal={toggleReveal}
              disabled={disabled}
            />
          ) : null}
          <PasswordField
            label="New password"
            value={password}
            onChange={setPassword}
            placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
            autoComplete="new-password"
            reveal={reveal}
            onToggleReveal={toggleReveal}
            disabled={disabled}
          />
          <PasswordField
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter the password"
            autoComplete="new-password"
            reveal={reveal}
            onToggleReveal={toggleReveal}
            disabled={disabled}
          />
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
