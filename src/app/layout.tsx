import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Fraunces } from "next/font/google";
import { HelpWidget } from "@/components/help/help-widget";
import { DemoOverlay } from "@/components/demo/demo-overlay";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Own Your Brand",
    template: "%s — OYRB",
  },
  description:
    "OYRB is a booking and website platform built for beauty professionals. Go from signup to a published, stylish booking site in under 10 minutes.",
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAFAF9] text-[#0A0A0A]">
        {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && <DemoOverlay />}
        {children}
        <HelpWidget />
      </body>
    </html>
  );
}
