import type { Metadata } from "next";
import { FaqView } from "@/components/faq/faq-view";
import { getFaqs } from "@/lib/data/faqs";

export function generateMetadata(): Metadata {
  return {
    title: "FAQs",
    alternates: { canonical: "/faqs" },
    description:
      "Answers to common questions about our handmade Montessori wooden toys — shipping, orders, returns, payments, product safety, and more.",
  };
}

export default async function Page() {
  const faqs = await getFaqs();
  return <FaqView faqs={faqs} />;
}
