import type { Metadata } from "next";
import { SecurityForm } from "@/components/account/security-form";

export function generateMetadata(): Metadata {
  return { title: "Security", robots: { index: false, follow: false } };
}

export default function Page() {
  return <SecurityForm />;
}
