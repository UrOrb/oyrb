import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#0A0A0A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Crown SVG path rendered as inline svg */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Crown shape */}
          <path
            d="M2 14h16l-2-7-4 4-2-6-2 6-4-4-2 7z"
            fill="#B8896B"
          />
          {/* Three crown points */}
          <circle cx="2" cy="7" r="1.5" fill="#B8896B" />
          <circle cx="10" cy="4" r="1.5" fill="#C9A35B" />
          <circle cx="18" cy="7" r="1.5" fill="#B8896B" />
          {/* Base line */}
          <rect x="2" y="14.5" width="16" height="1.5" rx="0.75" fill="#B8896B" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
