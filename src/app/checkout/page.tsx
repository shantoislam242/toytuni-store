import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { getSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Review your details, choose delivery, and place your order.",
  robots: { index: false, follow: true },
};

export default async function Page() {
  const settings = await getSettings();
  return (
    <CheckoutView
      insideDhakaFee={settings.shipping.insideDhakaFee}
      outsideDhakaFee={settings.shipping.outsideDhakaFee}
      freeShippingThreshold={settings.shipping.freeShippingThreshold}
      codFee={settings.codFee}
    />
  );
}
