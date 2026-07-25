import type { Metadata } from "next";
import { BulkView } from "@/components/bulk/bulk-view";
import { getBulkContent } from "@/lib/data/bulk";

export function generateMetadata(): Metadata {
  return {
    title: "Wholesale & Bulk Orders",
    alternates: { canonical: "/bulk" },
    description:
      "Wholesale and bulk ordering for preschools, retailers, and international distributors — safe, natural neem-wood Montessori toys.",
  };
}

export default async function Page() {
  const content = await getBulkContent();
  return <BulkView content={content} />;
}
