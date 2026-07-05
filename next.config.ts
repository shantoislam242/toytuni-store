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
    optimizePackageImports: ["lucide-react", "radix-ui"],
  },
};

export default nextConfig;
