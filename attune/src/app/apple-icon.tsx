import { ImageResponse } from "next/og";
import { attuneMarkSvg } from "@/lib/logo-svg";

// iOS home-screen icon (Apple uses its own square, non-transparent icon).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const svg = attuneMarkSvg({ size: 132, id: "ai" });
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={132} height={132} alt="Attune" />
      </div>
    ),
    { ...size }
  );
}
