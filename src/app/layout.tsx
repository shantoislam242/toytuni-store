import type { Metadata } from "next";
import { Bricolage_Grotesque, Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { BRAND_NAME, SITE_URL } from "@/lib/config";
import { SiteJsonLd } from "@/components/seo/site-json-ld";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FooterGate } from "@/components/layout/footer-gate";
import { SiteBackground } from "@/components/layout/site-background";
import { MobileBottomBar } from "@/components/layout/mobile-bottom-bar";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { DeferredIslands } from "@/components/layout/deferred-islands";
import { CartProvider } from "@/lib/cart/cart-context";
import { CheckoutProvider } from "@/lib/checkout/checkout-context";
import { WishlistProvider } from "@/lib/wishlist/wishlist-context";
import { HomeResetProvider, HomeResetBoundary } from "@/components/layout/home-reset";
import { Preloader } from "@/components/Preloader";
import { Toaster } from "@/components/ui/sonner";

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

// Serif accent — used for the hero editorial heading. Above the fold but not the
// LCP element, so skip preloading (it swaps in via display: swap) to protect the
// hero image's bandwidth on slow connections.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const SITE_DESCRIPTION =
  "Bangladesh-made, neem-wood, non-toxic, handmade Montessori toys for children ages 0–3.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // Pages export SHORT titles (e.g. "Checkout"); the template adds the brand
    // once. The default is used for pages that set no title of their own.
    default: `${BRAND_NAME} — Montessori Wooden Toys for Ages 0–3`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: BRAND_NAME,
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — Montessori Wooden Toys`,
    description: SITE_DESCRIPTION,
    images: [
      { url: "/og-default.png", width: 1200, height: 630, alt: `${BRAND_NAME} — handmade neem-wood Montessori toys` },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — Montessori Wooden Toys`,
    description: SITE_DESCRIPTION,
    images: ["/og-default.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col overflow-x-clip bg-paper pb-[calc(3.5rem+env(safe-area-inset-bottom))] font-sans text-foreground md:pb-0"
      >
        <SiteJsonLd />
        <Preloader />
        <SiteBackground />
        <CartProvider>
          <CheckoutProvider>
            <WishlistProvider>
              <HomeResetProvider>
                <Header />
                <div className="flex flex-1 flex-col">
                  <HomeResetBoundary>{children}</HomeResetBoundary>
                </div>
                <FooterGate>
                  <Footer />
                </FooterGate>
                <MobileBottomBar />
                <WhatsAppButton />
                <DeferredIslands />
                <Toaster />
              </HomeResetProvider>
            </WishlistProvider>
          </CheckoutProvider>
        </CartProvider>
      </body>
    </html>
  );
}
