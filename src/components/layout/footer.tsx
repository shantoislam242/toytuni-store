import Link from "next/link";
import { Globe, Phone, Mail, Clock, ArrowRight } from "lucide-react";
import { footerInfo, socials, type Social } from "@/lib/mock/nav";
import { BRAND_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

// ── Copyright-bar building blocks (babies.co.nz style) ──────────────────────

// Outlined multi-colour dots that run edge-to-edge above the copyright row.
// Colours cycle pink → green → blue → purple, matching the brand play accents.
const DOT_COLORS = [
  "border-blush",
  "border-neem-soft",
  "border-dusty-blue",
  "border-[#b09bd8]",
];

function DottedDivider() {
  return (
    <div className="flex justify-between overflow-hidden px-4 py-4 sm:px-6">
      {Array.from({ length: 44 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "size-2 shrink-0 rounded-full border-2 bg-transparent",
            DOT_COLORS[i % DOT_COLORS.length],
          )}
        />
      ))}
    </div>
  );
}

// Scalloped top trim — a row of coloured half-circle "domes" hanging from the
// footer's top edge. Fixed-width so the dome proportions stay consistent; the
// row overflows and clips at the screen edges (same look as the reference).
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
            "h-9 w-16 shrink-0 rounded-b-full",
            SCALLOP_COLORS[i % SCALLOP_COLORS.length],
          )}
        />
      ))}
    </div>
  );
}

// lucide dropped brand icons, so social glyphs are inline SVG (simple-icons paths).
const brandPath: Record<Exclude<Social["icon"], "globe">, string> = {
  facebook:
    "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  instagram:
    "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
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

const cardClass = "rounded-2xl bg-cream-50 p-6 sm:p-8";

export function Footer() {
  return (
    <footer className="bg-cream-200 text-ink">
      <ScallopTop />
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-12 sm:px-6 lg:grid-cols-3">
        {/* Keep In Touch (newsletter) */}
        <div className={cardClass}>
          <h2 className="font-display text-2xl font-bold text-ink">Keep In Touch</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Our conversation is just getting started
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-full border border-cream-300 bg-paper p-1.5 pl-4">
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

        {/* Company */}
        <div className={cardClass}>
          <h2 className="font-display text-2xl font-bold text-ink">{BRAND_NAME}</h2>
          <div className="mt-4 space-y-2.5 text-sm text-ink-muted">
            <p>BIN: XXX-XXX-XXXX</p>
            <p>Trade License: XXXXXXXX</p>
            <p className="flex items-center gap-2">
              <Phone className="size-4 text-neem" /> +880 13XX-XXXXXX
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-4 text-neem" /> hello@example.com
            </p>
            <p>Bulk Orders: +880 13XX-XXXXXX</p>
            <p className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-neem" />
              <span>Sat–Thu · 10:00 AM – 7:00 PM</span>
            </p>
          </div>
        </div>

        {/* Information */}
        <div className={cardClass}>
          <h2 className="font-display text-2xl font-bold text-ink">Information</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {footerInfo.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-ink-muted hover:text-ink">
                  {l.labelBn}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* copyright bar — social icons left, brand/copyright right. */}
      <div className="bg-cream-100 text-ink-muted">
        <DottedDivider />
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 pb-8 sm:flex-row sm:gap-4">
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

          <p className="text-sm text-ink-muted">
            © 2026 {BRAND_NAME} · All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
