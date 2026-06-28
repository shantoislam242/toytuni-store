import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileBottomBar } from "@/components/layout/mobile-bottom-bar";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { CartProvider } from "@/lib/cart/cart-context";
import { WishlistProvider } from "@/lib/wishlist/wishlist-context";
import { Toaster } from "@/components/ui/sonner";
import { CursorSparkleTrail } from "@/components/home/cursor-sparkle-trail";

// Display / headings
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

// Body
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Montessori Wooden Toys",
    template: "%s | Montessori Wooden Toys",
  },
  description:
    "Bangladesh-made, neem-wood, non-toxic, handmade children's toys for ages 0–3.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${inter.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col bg-background pb-[calc(3.5rem+env(safe-area-inset-bottom))] font-sans text-foreground md:pb-0"
      >
        <CartProvider>
          <WishlistProvider>
            <Header />
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer />
            <MobileBottomBar />
            <WhatsAppButton />
            <CursorSparkleTrail />
            <Toaster />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
