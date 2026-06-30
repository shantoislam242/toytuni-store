import type { Metadata } from "next";
import { ContactView } from "@/components/contact/contact-view";
import { BRAND_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `Contact — ${BRAND_NAME}`,
  description:
    "Questions about our Montessori wooden toys, your order, or anything else? Get in touch with the Databrandix team.",
};

export default function Page() {
  return <ContactView />;
}
