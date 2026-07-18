import type { Metadata } from "next";
import { getSettings } from "@/lib/data/settings";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };

/**
 * Admin Settings page. `getSettings()` reads the single `site_settings.general`
 * jsonb row (cached, tag-invalidatable) and hands it to the client form, which
 * calls the `updateSettings` Server Action on Save.
 */
export default async function Page() {
  const settings = await getSettings();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
      <p className="mt-1 text-sm text-ink-muted">Shipping, COD, contact, and footer brand text.</p>
      <div className="mt-6">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
