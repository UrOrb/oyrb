import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is the default bundler in Next.js 16 — no flag needed.
  // Pin the root so a parent workspace lockfile can't hijack module
  // resolution when STAXK lives inside another repo during development.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
