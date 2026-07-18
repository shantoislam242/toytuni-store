import type { Metadata } from "next";
import { ContactView } from "@/components/contact/contact-view";
import { getSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
  description:
    "Questions about our Montessori wooden toys, your order, or anything else? Get in touch with the Toytuni team.",
};

export default async function Page() {
  const settings = await getSettings();
  return <ContactView contact={settings.contact} />;
}
