import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This project lives under C:\Databrandix HQ, which has its own (stray)
  // package-lock.json. Without an explicit root, Next.js would mis-detect
  // the parent dir as the workspace root. Pin it to this project.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
