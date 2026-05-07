import { TabBar } from "./_components/tab-bar";

/**
 * Business Brain shared shell. Renders the page header + horizontal
 * tab bar. Each tab is its own URL so users can bookmark a specific
 * view.
 *
 * Tabs:
 *   - This Week  (Phase 4.1 — shipped)
 *   - Money      (Phase 4.2 — coming soon placeholder)
 *   - Time       (Phase 4.3 — coming soon placeholder)
 *   - Clients    (Phase 4.4 — coming soon placeholder)
 *   - Where They Come From (Phase 4.5 — coming soon placeholder)
 */
export default function BusinessBrainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl pb-12">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-medium tracking-tight">Business Brain</h1>
        <p className="mt-1 text-sm text-[#737373]">
          Your read-out — recent and upcoming work, money flow, patterns worth noticing.
        </p>
      </header>
      <TabBar />
      <div className="mt-6">{children}</div>
    </div>
  );
}
