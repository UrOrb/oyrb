import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TabBar } from "@/components/tab-bar";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: { default: "STAXK", template: "%s · STAXK" },
  description:
    "A reverse-recruiting engine: source jobs, screen your own resume, find warm paths, and run approval-gated outreach.",
  applicationName: "STAXK",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "STAXK" },
};

export const viewport: Viewport = {
  themeColor: "#0E1116",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Set data-theme before paint so there's no flash. "system" = no attribute.
const themeInit = `try{var t=localStorage.getItem("staxk-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-bg text-fg">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-signal focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <div className="mx-auto flex min-h-dvh w-full max-w-screen-xl">
          <main id="main" className="w-full pb-24 md:pb-8">
            {children}
          </main>
        </div>
        <TabBar />
      </body>
    </html>
  );
}
