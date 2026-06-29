import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FooterGate } from "@/components/layout/footer-gate";
import { SiteBackground } from "@/components/layout/site-background";
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

// Accent — used selectively (e.g. footer "Follow us")
const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "600", "700"],
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
      className={`${bricolage.variable} ${inter.variable} ${poppins.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col bg-paper pb-[calc(3.5rem+env(safe-area-inset-bottom))] font-sans text-foreground md:pb-0"
      >
        <SiteBackground />
        <CartProvider>
          <WishlistProvider>
            <Header />
            <div className="flex flex-1 flex-col">{children}</div>
            <FooterGate>
              <Footer />
            </FooterGate>
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
