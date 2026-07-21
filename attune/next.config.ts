import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This app lives inside a larger repo that has its own lockfile. Pin the
  // file-tracing root to this directory so Next doesn't infer the parent.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
