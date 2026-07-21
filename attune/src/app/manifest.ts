import type { MetadataRoute } from "next";

// Web App Manifest — makes Attune installable to a phone's home screen as a
// standalone, full-screen app. Served automatically at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Attune — communication coach",
    short_name: "Attune",
    description:
      "Practice the conversation, not just the words. Talk out loud with a character that listens, reacts, and adapts — and live through the real reaction.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b12",
    theme_color: "#8b7df6",
    categories: ["education", "productivity", "lifestyle"],
    icons: [
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
