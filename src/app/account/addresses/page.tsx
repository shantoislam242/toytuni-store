import type { Metadata } from "next";
import { listAddresses } from "@/lib/account/addresses";
import { AddressBook } from "@/components/account/address-book";

export function generateMetadata(): Metadata {
  return {
    title: "Addresses",
    robots: { index: false, follow: false },
  };
}

/**
 * `/account/addresses` — saved address book. The layout gates the session;
 * this fetches the user's addresses server-side (service-role, session-scoped)
 * and hands them to the client `AddressBook`, which mutates via server actions
 * and re-reads through `router.refresh()`.
 */
export default async function Page() {
  const addresses = await listAddresses();
  return <AddressBook addresses={addresses} />;
}
