"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { uploadAvatar } from "@/lib/account/profile";
import { PHONE_RE, normalizeBdPhone } from "@/lib/checkout/address-fields";

const inputCls =
  "h-11 w-full rounded-lg border border-cream-300 bg-paper px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";

/**
 * `/account/profile` — edit display name, phone, and avatar. Metadata writes go
 * through the browser Supabase client (`auth.updateUser`), which the auth
 * context observes (USER_UPDATED) so the header/sidebar reflect changes; a
 * `router.refresh()` also re-renders the server layout's copy of the name.
 * The avatar file upload is a server action (needs service-role storage) that
 * returns a URL we then store in `user_metadata.avatar_url`.
 */
export function ProfileForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [supabase] = useState(() => createBrowserSupabase());
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Seed the form from the session once it's known.
  useEffect(() => {
    if (!user) return;
    const m = user.user_metadata ?? {};
    setFullName((m.full_name as string) ?? "");
    setPhone(((m.phone as string) ?? "").replace(/^\+880/, ""));
    setAvatarUrl((m.avatar_url as string) ?? null);
  }, [user]);

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const up = await uploadAvatar(fd);
    if (!up.ok) {
      setUploading(false);
      toast.error(up.error);
      return;
    }
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: up.url } });
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAvatarUrl(up.url);
    toast.success("Photo updated.");
    router.refresh();
  };

  const handleSave = async () => {
    if (phone.trim() && !PHONE_RE.test(phone.trim())) {
      toast.error("Enter a valid BD number, e.g. 01712345678 or 1712345678.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        phone: phone.trim() ? normalizeBdPhone(phone) : "",
      },
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved.");
    router.refresh();
  };

  const disabled = loading || !user;

  return (
    <div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Account</p>
        <h1 className="mt-0.5 font-display text-2xl font-bold text-ink sm:text-3xl">Profile</h1>
      </div>

      <div className="mt-6 max-w-xl rounded-2xl border border-cream-300 bg-card p-6">
        {/* avatar */}
        <div className="flex items-center gap-4">
          <span className="relative flex size-16 flex-none items-center justify-center overflow-hidden rounded-full bg-neem/10 text-xl font-bold text-neem-deep">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <UserRound className="size-7" strokeWidth={1.75} />
            )}
          </span>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={disabled || uploading}
              className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-cream-100 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {uploading ? "Uploading…" : "Change photo"}
            </button>
            <p className="mt-1 text-xs text-ink-soft">JPG, PNG or WebP, up to 5 MB.</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarPick}
            className="hidden"
          />
        </div>

        {/* fields */}
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Full name</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className={inputCls}
              disabled={disabled}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Phone</span>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="01712345678"
              className={inputCls}
              disabled={disabled}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
            <input
              type="email"
              value={user?.email ?? ""}
              readOnly
              disabled
              className={`${inputCls} cursor-not-allowed bg-cream-100 text-ink-muted`}
            />
            <span className="mt-1 block text-xs text-ink-soft">Email can&apos;t be changed here.</span>
          </label>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || saving}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-neem px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-neem-deep disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
