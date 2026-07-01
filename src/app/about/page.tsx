import type { Metadata } from "next";
import { AboutView } from "@/components/about/about-view";
import { BRAND_NAME } from "@/lib/config";

export function generateMetadata(): Metadata {
  return {
    title: `About Us — ${BRAND_NAME}`,
    description:
      "Our story: handcrafted, natural, Montessori-inspired wooden toys made to help children learn, grow, and imagine through joyful play.",
  };
}

export default function Page() {
  return <AboutView />;
}
