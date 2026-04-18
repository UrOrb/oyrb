import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "#0A0A0A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="108"
          height="108"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M2 14h16l-2-7-4 4-2-6-2 6-4-4-2 7z" fill="#B8896B" />
          <circle cx="2" cy="7" r="1.5" fill="#B8896B" />
          <circle cx="10" cy="4" r="1.5" fill="#C9A35B" />
          <circle cx="18" cy="7" r="1.5" fill="#B8896B" />
          <rect x="2" y="14.5" width="16" height="1.5" rx="0.75" fill="#B8896B" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
