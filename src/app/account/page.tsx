import type { Metadata } from "next";
import { AccountView } from "@/components/account/account-view";

export function generateMetadata(): Metadata {
  return {
    title: "My Account",
    description: "Sign in to view your profile, track orders, and manage your saved items.",
    robots: { index: false, follow: true },
  };
}

export default function Page() {
  return <AccountView />;
}
