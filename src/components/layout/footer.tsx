import Link from "next/link";
import { Globe, Phone, Mail, Clock } from "lucide-react";
import { footerInfo, socials, type Social } from "@/lib/mock/nav";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/config";

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

export function Footer() {
  return (
    <footer className="mt-16 bg-ink text-cream-200">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {/* brand */}
        <div>
          <p className="font-display text-2xl font-bold text-paper">{BRAND_NAME}</p>
          <p className="mt-2 max-w-xs text-sm text-cream-300">{BRAND_TAGLINE}</p>
          <p className="mt-3 text-xs text-ink-soft">Made in Bangladesh 🇧🇩</p>
        </div>

        {/* contact */}
        <div className="space-y-2 text-sm">
          <p className="font-display text-base font-semibold text-paper">Contact</p>
          <p className="flex items-center gap-2">
            <Phone className="size-4 text-neem-soft" /> +880 13XX-XXXXXX
          </p>
          <p className="flex items-center gap-2">
            <Mail className="size-4 text-neem-soft" /> hello@example.com
          </p>
          <p className="flex items-start gap-2 text-cream-300">
            <Clock className="mt-0.5 size-4 shrink-0 text-neem-soft" />
            <span>Sat–Thu · 10:00 AM – 7:00 PM</span>
          </p>
        </div>

        {/* information */}
        <div>
          <p className="font-display text-base font-semibold text-paper">Information</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {footerInfo.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-cream-300 hover:text-paper">
                  {l.labelBn}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* social + copyright */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-5 sm:flex-row">
          <div className="flex items-center gap-2">
            {socials.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="flex size-9 items-center justify-center rounded-full bg-white/10 text-cream-200 transition-colors hover:bg-neem hover:text-paper"
              >
                <SocialIcon icon={s.icon} />
              </Link>
            ))}
          </div>
          <p className="text-xs text-ink-soft">
            © 2026 {BRAND_NAME} · All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
