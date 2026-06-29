import Link from "next/link";
import { Globe, ArrowRight } from "lucide-react";
import {
  footerShop,
  footerCustomerCare,
  footerAbout,
  footerSupport,
  socials,
  type NavLink,
  type Social,
} from "@/lib/mock/nav";
import { BRAND_NAME, BRAND_DESCRIPTION } from "@/lib/config";
import { cn } from "@/lib/utils";

// ── Scalloped top trim ──────────────────────────────────────────────────────
// A row of coloured half-circle "domes" hanging from the footer's top edge,
// inset with side padding and stretched (flex-1) to fill the width evenly. Two
// breakpoint variants keep the dome proportions pleasant.
const SCALLOP_COLORS = [
  "bg-[#9385d4]", // purple
  "bg-[#86d07f]", // green
  "bg-[#ec6a8d]", // pink
  "bg-[#6fa3e0]", // blue
];

function ScallopTop() {
  return (
    <div className="flex overflow-hidden" aria-hidden>
      {Array.from({ length: 60 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            // width = 2× height → a true semicircle dome; flush with the footer
            // top, edge-to-edge, clipping at the right.
            "h-8 w-16 shrink-0 rounded-b-full",
            SCALLOP_COLORS[i % SCALLOP_COLORS.length],
          )}
        />
      ))}
    </div>
  );
}

// ── Dotted divider ──────────────────────────────────────────────────────────
// A row of small outlined pastel circles, evenly spread edge-to-edge. Sits
// above the copyright row in place of a plain rule.
const DOT_COLORS = [
  "border-blush",
  "border-neem-soft",
  "border-dusty-blue",
  "border-[#b09bd8]",
];

function DottedDivider() {
  return (
    <div
      className="flex justify-between overflow-hidden px-4 py-4 sm:px-6"
      aria-hidden
    >
      {Array.from({ length: 52 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "size-2 shrink-0 rounded-full border-2 bg-transparent opacity-80",
            DOT_COLORS[i % DOT_COLORS.length],
          )}
        />
      ))}
    </div>
  );
}

// ── Social glyphs ───────────────────────────────────────────────────────────
// lucide dropped brand icons, so social glyphs are inline SVG (simple-icons).
const brandPath: Record<Exclude<Social["icon"], "globe">, string> = {
  facebook:
    "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  instagram:
    "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
  tiktok:
    "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  youtube:
    "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
};

function SocialIcon({ icon }: { icon: Social["icon"] }) {
  if (icon === "globe") return <Globe className="size-4" />;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
      <path d={brandPath[icon]} />
    </svg>
  );
}

// ── Payment marks ───────────────────────────────────────────────────────────
// Each method sits in a white rounded card with its real brand colours.
function PaymentBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-14 items-center justify-center rounded-md border border-cream-300 bg-white shadow-sm">
      {children}
    </span>
  );
}

function Payments() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {/* Visa */}
      <PaymentBadge>
        <span className="text-[13px] font-bold italic tracking-tight text-[#1434CB]">
          VISA
        </span>
      </PaymentBadge>
      {/* Mastercard */}
      <PaymentBadge>
        <svg viewBox="0 0 32 20" className="h-4 w-7" aria-hidden>
          <circle cx="13" cy="10" r="7" fill="#EB001B" />
          <circle cx="19" cy="10" r="7" fill="#F79E1B" fillOpacity="0.85" />
        </svg>
      </PaymentBadge>
      {/* American Express */}
      <PaymentBadge>
        <span className="text-[11px] font-bold tracking-tight text-[#2E77BC]">
          AMEX
        </span>
      </PaymentBadge>
      {/* PayPal */}
      <PaymentBadge>
        <span className="text-[12px] font-bold italic">
          <span className="text-[#003087]">Pay</span>
          <span className="text-[#0099DE]">Pal</span>
        </span>
      </PaymentBadge>
      {/* Apple Pay */}
      <PaymentBadge>
        <span className="inline-flex items-center gap-0.5 text-black">
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden>
            <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.88 2.65 3.22 2.6 1.29-.05 1.78-.83 3.34-.83 1.56 0 1.99.83 3.35.81 1.38-.02 2.26-1.27 3.11-2.53.98-1.45 1.38-2.85 1.4-2.92-.03-.01-2.69-1.03-2.72-4.09zM14.6 4.45c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44z" />
          </svg>
          <span className="text-[12px] font-semibold">Pay</span>
        </span>
      </PaymentBadge>
      {/* Google Pay */}
      <PaymentBadge>
        <span className="inline-flex items-center gap-0.5">
          <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
            />
          </svg>
          <span className="text-[12px] font-semibold text-[#5F6368]">Pay</span>
        </span>
      </PaymentBadge>
    </div>
  );
}

// ── Reusable link column ────────────────────────────────────────────────────
function FooterColumn({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <nav aria-label={title}>
      <h3 className="font-[family-name:var(--font-poppins)] text-base font-bold text-ink">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.labelBn}>
            <Link href={l.href} className="text-ink-muted hover:text-ink">
              {l.labelBn}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="bg-cream-200 font-[family-name:var(--font-poppins)] text-ink">
      <ScallopTop />

      {/* Main footer — one unified container, flat columns (no cards) */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-12">
          {/* Brand block — logo, description, newsletter, follow us */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-4">
            <Link
              href="/"
              className="font-[family-name:var(--font-poppins)] text-2xl font-bold tracking-tight text-ink"
            >
              {BRAND_NAME}
            </Link>
            <p className="mt-3 max-w-sm text-sm text-ink-muted">
              {BRAND_DESCRIPTION}
            </p>

            {/* follow us */}
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
              <h3 className="font-[family-name:var(--font-poppins)] text-base font-bold leading-[20.8px] tracking-[0.6px] text-ink">
                Follow us
              </h3>
              <div className="flex items-center gap-2">
                {socials.map((s) => (
                  <Link
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="flex size-9 items-center justify-center rounded-full bg-ink/5 text-ink-muted transition-colors hover:bg-neem hover:text-paper"
                  >
                    <SocialIcon icon={s.icon} />
                  </Link>
                ))}
              </div>
            </div>

            {/* newsletter */}
            <div className="mt-6 flex max-w-sm items-center gap-2 rounded-full border border-cream-300 bg-paper p-1.5 pl-4">
              <input
                type="email"
                placeholder="Enter your email"
                aria-label="Email address"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
              />
              <button
                type="button"
                aria-label="Subscribe"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neem text-paper transition-colors hover:bg-neem-deep"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Link columns — share the row with the brand block */}
          <div className="lg:col-span-2">
            <FooterColumn title="Shop" links={footerShop} />
          </div>
          <div className="lg:col-span-2">
            <FooterColumn title="Customer Care" links={footerCustomerCare} />
          </div>
          <div className="lg:col-span-2">
            <FooterColumn title="About" links={footerAbout} />
          </div>
          <div className="lg:col-span-2">
            <FooterColumn title="Support" links={footerSupport} />
          </div>
        </div>

        {/* payment methods — centered at the bottom of the main footer */}
        <div className="mt-12 flex justify-center">
          <Payments />
        </div>
      </div>

      {/* Bottom bar — dotted divider, then copyright row */}
      <div>
        <DottedDivider />
        <div className="mx-auto max-w-6xl px-4 pt-2 pb-10 sm:px-6">
          <div className="flex flex-col items-center gap-3 text-sm sm:flex-row sm:justify-between">
            <p className="text-ink-muted">
              © 2026 All Rights Reserved. {BRAND_NAME}
            </p>
            <nav aria-label="Legal" className="flex items-center gap-3">
              <Link href="/policy/terms" className="text-ink-muted hover:text-ink">
                Terms &amp; Conditions
              </Link>
              <span aria-hidden className="h-4 w-px bg-ink/15" />
              <Link
                href="/policy/privacy"
                className="text-ink-muted hover:text-ink"
              >
                Privacy policy
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
