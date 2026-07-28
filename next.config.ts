import type { NextConfig } from "next";

/**
 * Content-Security-Policy — now ENFORCED (was report-only during the initial
 * roll-out; no violations surfaced for the app's own resources, all of which
 * are self-hosted or explicitly allow-listed below). `'unsafe-inline'` is still
 * required by Next's inline hydration bootstrap, the Preloader guard script,
 * and the JSON-LD `<script>` blocks; moving those to nonces (which would let us
 * drop `'unsafe-inline'`) is the eventual follow-up. Supabase is allowed for
 * storage images (img) and the auth/data client (connect, incl. realtime
 * websockets); Cloudflare Turnstile for the signup/login bot check.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "img-src 'self' data: blob: https:",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
  // youtube: product PDP embeds a product video (www.youtube.com/embed/…).
  "frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  "form-action 'self'",
].join("; ");

/**
 * Security headers applied to every response. These are all safe to enforce
 * (no app behaviour depends on their absence): HSTS forces HTTPS, the frame
 * headers stop clickjacking, `nosniff` stops MIME-confusion, and the
 * Permissions-Policy switches off browser features the store never uses.
 */
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // This project lives under C:\Databrandix HQ, which has its own (stray)
  // package-lock.json. Without an explicit root, Next.js would mis-detect
  // the parent dir as the workspace root. Pin it to this project.
  turbopack: {
    root: __dirname,
  },
  // Tree-shake barrel-imported packages so each route only ships the icons /
  // primitives it actually uses (cuts "unused JavaScript" / bundle size). No
  // runtime or visual change — purely which modules get bundled.
  experimental: {
    optimizePackageImports: ["lucide-react", "radix-ui", "motion"],
  },
  // Serve modern formats from the built-in image optimizer: AVIF first (best
  // compression), then WebP, falling back to the source for older browsers.
  // Purely smaller bytes on the wire — no visual/layout change.
  images: {
    formats: ["image/avif", "image/webp"],
    // Allow next/image to optimise admin-uploaded product photos stored in
    // Supabase Storage (`products.image_url`, set from the admin UI).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qbvymmzraatzcewiztve.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
