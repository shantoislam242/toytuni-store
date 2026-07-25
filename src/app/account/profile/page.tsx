import type { Metadata } from "next";
import { ProfileForm } from "@/components/account/profile-form";

export function generateMetadata(): Metadata {
  return { title: "Profile", robots: { index: false, follow: false } };
}

export default function Page() {
  return <ProfileForm />;
}
