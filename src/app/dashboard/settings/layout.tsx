import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsTabs } from "./settings-tabs";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Account info, billing, booking rules, domains, and preferences.
        </p>
        <Suspense fallback={null}>
          <SettingsTabs />
        </Suspense>
      </div>
      {children}
    </div>
  );
}
