import { DesktopNav } from "./tab-bar";
import { ThemeToggle } from "./theme-toggle";

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-signal">
            STAXK
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
        </div>
        <div className="flex items-center gap-3">
          <DesktopNav />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
