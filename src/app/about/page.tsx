import type { Metadata } from "next";
import { AboutView } from "@/components/about/about-view";
import { getAboutContent } from "@/lib/data/about";

export function generateMetadata(): Metadata {
  return {
    title: "About Us",
    alternates: { canonical: "/about" },
    description:
      "Our story: handcrafted, natural, Montessori-inspired wooden toys made to help children learn, grow, and imagine through joyful play.",
  };
}

export default async function Page() {
  const content = await getAboutContent();
  return <AboutView content={content} />;
}
