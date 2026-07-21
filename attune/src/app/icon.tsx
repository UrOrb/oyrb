import { ImageResponse } from "next/og";
import { attuneMarkSvg } from "@/lib/logo-svg";

// App / PWA / browser icon — the Attune speech-bubble mark on white, rendered
// to a PNG at build time from the shared SVG (so it matches the in-app logo).
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  const svg = attuneMarkSvg({ size: 360, id: "ic" });
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
        <img src={src} width={360} height={360} alt="Attune" />
      </div>
    ),
    { ...size }
  );
}
