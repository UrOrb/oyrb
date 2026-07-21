import { ImageResponse } from "next/og";

// iOS home-screen icon (Apple uses its own square, non-transparent icon).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 132,
            height: 132,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, #d98a5f, #a24f28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 88,
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
