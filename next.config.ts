import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
