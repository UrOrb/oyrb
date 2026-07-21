import type { MetadataRoute } from "next";

// Web App Manifest — makes Attune installable to a phone's home screen as a
// standalone, full-screen app. Served automatically at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Attune — communication coach",
    short_name: "Attune",
    description:
      "Practice real conversations out loud with a character that listens, reacts, and adapts. Don't just practice what to say — practice what happens after you say it.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f5f2",
    theme_color: "#c2683f",
    categories: ["education", "productivity", "lifestyle"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
