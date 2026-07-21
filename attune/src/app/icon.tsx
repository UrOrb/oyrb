import { ImageResponse } from "next/og";

// Home-screen / PWA icon, rendered at build time to a PNG (no binary asset
// checked in). A warm clay orb — the app's "presence" — on soft paper.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f5f2",
        }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, #d98a5f, #a24f28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 240,
            fontWeight: 600,
            fontFamily: "Georgia, serif",
          }}
        >
          A
        </div>
      </div>
    ),
    { ...size }
  );
}
