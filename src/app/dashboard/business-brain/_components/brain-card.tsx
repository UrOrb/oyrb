import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BrainCard({
  as: Component = "section",
  children,
  className,
}: {
  as?: "section" | "div";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Component
      className={cn(
        "rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]",
        className,
      )}
    >
      {children}
    </Component>
  );
}

export function EmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-4 rounded-xl border border-dashed border-[#D7CFC8] bg-[#FAFAF9]/80 p-4 text-sm leading-relaxed text-[#737373]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BrainInset({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-[#EDE9E4] bg-white/70 p-3", className)}>
      {children}
    </div>
  );
}
