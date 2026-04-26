import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The help-chat API reads the four /help/*.md docs at module init via
  // fs.readFileSync. They live outside /src so Next's default tracer
  // doesn't pick them up — explicitly include them in the function bundle.
  outputFileTracingIncludes: {
    "/api/dashboard/help-chat": ["./help/**/*.md"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "hytwjzhgxybxobihqshd.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      // /about renamed to /meet-the-founder. Permanent so SEO equity flows to
      // the new URL. Keep this entry indefinitely — old inbound links from
      // press, social, and email signatures still need to resolve.
      { source: "/about", destination: "/meet-the-founder", permanent: true },
    ];
  },
};

export default nextConfig;
