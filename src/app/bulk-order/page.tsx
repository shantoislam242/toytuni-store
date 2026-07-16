import type { Metadata } from "next";
import { BulkOrderView } from "@/components/bulk/bulk-order-view";

// Hidden snapshot of the Bulk page that includes the wholesale order builder.
// Not linked anywhere, kept out of the sitemap, and marked noindex + disallowed
// in robots so search engines never surface it. Reachable only by direct URL.
export function generateMetadata(): Metadata {
  return {
    title: "Wholesale & Bulk Orders",
    robots: { index: false, follow: false },
  };
}

export default function Page() {
  return <BulkOrderView />;
}
