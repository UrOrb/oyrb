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
          borderRadius: 10,
          background: "linear-gradient(135deg, #FF6EC7 0%, #D946EF 50%, #A855F7 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(217,70,239,0.5)",
        }}
      >
        {/* Cute 4-point sparkle star — beauty + tech */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          {/* Main sparkle */}
          <path
            d="M9 1 C9 1 9.8 5.5 9 9 C8.2 12.5 9 17 9 17 C9 17 9.8 12.5 9 9 C8.2 5.5 9 1 9 1Z"
            fill="white"
          />
          <path
            d="M1 9 C1 9 5.5 9.8 9 9 C12.5 8.2 17 9 17 9 C17 9 12.5 9.8 9 9 C5.5 8.2 1 9 1 9Z"
            fill="white"
          />
          {/* Diagonal arms (softer) */}
          <path
            d="M3.5 3.5 C3.5 3.5 6.8 6.8 9 9 C11.2 11.2 14.5 14.5 14.5 14.5 C14.5 14.5 11.2 11.2 9 9 C6.8 6.8 3.5 3.5 3.5 3.5Z"
            fill="white"
            opacity="0.5"
          />
          <path
            d="M14.5 3.5 C14.5 3.5 11.2 6.8 9 9 C6.8 11.2 3.5 14.5 3.5 14.5 C3.5 14.5 6.8 11.2 9 9 C11.2 6.8 14.5 3.5 14.5 3.5Z"
            fill="white"
            opacity="0.5"
          />
          {/* Center dot glow */}
          <circle cx="9" cy="9" r="2" fill="white" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
