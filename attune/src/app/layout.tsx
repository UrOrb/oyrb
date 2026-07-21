import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, Quicksand } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/theme-toggle";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// Rounded geometric sans used for the "Attune" wordmark, matching the logo.
const quicksand = Quicksand({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Attune — Practice the conversation, not just the words.",
    template: "%s — Attune",
  },
  description:
    "A real-time AI communication coach that speaks, listens, reacts, and emotionally adapts like a real conversation partner. Practice hard conversations, interviews, negotiations, and talks — and experience the reaction, not just the script.",
  applicationName: "Attune",
  appleWebApp: {
    capable: true,
    title: "Attune",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0b12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="lavender"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${quicksand.variable}`}
    >
      <body className="min-h-dvh room-bg">
        {/* Apply the saved theme before paint to avoid a flash of the default. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('attune-theme')||'lavender';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
