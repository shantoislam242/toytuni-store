import type { Metadata } from "next";

// The reset-password page is a Client Component and can't export metadata, so
// this route-level layout supplies it. Auth pages are kept out of the index.
export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new password for your Toytuni account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
