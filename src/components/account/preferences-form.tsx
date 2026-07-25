"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

/** A labelled on/off switch. */
function Toggle({
  checked,
  onChange,
  disabled,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-neem" : "bg-cream-300",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 transform rounded-full bg-paper shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

/**
 * `/account/preferences` — email notification toggles, stored in
 * `user_metadata` (`notify_orders` / `notify_marketing`). No email system
 * consumes them yet; this persists the customer's choice so it's honoured once
 * one does. Order-update emails default on, marketing off.
 */
export function PreferencesForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [supabase] = useState(() => createBrowserSupabase());

  const [orderEmails, setOrderEmails] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const m = user.user_metadata ?? {};
    setOrderEmails(m.notify_orders !== false); // default on
    setMarketing(m.notify_marketing === true); // default off
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { notify_orders: orderEmails, notify_marketing: marketing },
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Preferences saved.");
    router.refresh();
  };

  const disabled = loading || !user;

  return (
    <div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Account</p>
        <h1 className="mt-0.5 font-display text-2xl font-bold text-ink sm:text-3xl">Preferences</h1>
      </div>

      <div className="mt-6 max-w-xl rounded-2xl border border-cream-300 bg-card px-6 py-2">
        <div className="divide-y divide-cream-200">
          <Toggle
            checked={orderEmails}
            onChange={setOrderEmails}
            disabled={disabled}
            label="Order updates"
            hint="Emails about your order confirmation, shipping, and delivery."
          />
          <Toggle
            checked={marketing}
            onChange={setMarketing}
            disabled={disabled}
            label="Offers & news"
            hint="Occasional emails about new toys, restocks, and promotions."
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={disabled || saving}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-neem px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-neem-deep disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        {saving ? "Saving…" : "Save preferences"}
      </button>
    </div>
  );
}
