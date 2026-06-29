"use client";

import { usePathname } from "next/navigation";
import { isBareRoute } from "@/lib/routes";

/**
 * Hides its children on bare routes (sign in / sign up) so focused auth screens
 * render without the global footer. Keeps the Footer itself a server component
 * by gating it from the client via children.
 */
export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isBareRoute(pathname)) return null;
  return <>{children}</>;
}
