import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { getOrdersForEmail } from "@/lib/data/account";
import { AccountView } from "@/components/account/account-view";

export function generateMetadata(): Metadata {
  return {
    title: "My Account",
    description: "Sign in to view your profile, track orders, and manage your saved items.",
    robots: { index: false, follow: true },
  };
}

/**
 * Account route. Async Server Component: it reads the authoritative session
 * (`getSessionUser`) and, for a signed-in visitor, their order history — then
 * hands both to the client `AccountView` as props. The service-role order read
 * therefore stays server-side, scoped to the signed-in user's own email.
 * Signed-out visitors get `AccountView`'s sign-in gate.
 */
export default async function Page() {
  const user = await getSessionUser();
  if (!user) return <AccountView />;

  const orders = await getOrdersForEmail(user.email!);
  return (
    <AccountView
      user={{ name: user.user_metadata?.full_name ?? user.email!, email: user.email! }}
      orders={orders}
    />
  );
}
