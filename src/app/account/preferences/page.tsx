import type { Metadata } from "next";
import { PreferencesForm } from "@/components/account/preferences-form";

export function generateMetadata(): Metadata {
  return { title: "Preferences", robots: { index: false, follow: false } };
}

export default function Page() {
  return <PreferencesForm />;
}
