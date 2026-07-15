import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STAXK",
    short_name: "STAXK",
    description:
      "Reverse-recruiting engine — jobs as leads, outreach as a pipeline, you as the only user.",
    start_url: "/",
    display: "standalone",
    background_color: "#0E1116",
    theme_color: "#0E1116",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
