import { Sparkles } from "lucide-react";

/**
 * Shared "Coming soon" card for placeholder Business Brain tabs
 * (4.2 Money / 4.3 Time / 4.4 Clients / 4.5 Where They Come From).
 * Tells the pro honestly what each tab will surface so the
 * placeholder isn't dead air.
 */
export function ComingSoonCard({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#E7E5E4] bg-white p-8 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#FAFAF9]">
        <Sparkles size={18} className="text-[#B8896B]" strokeWidth={1.5} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#B8896B]">
        Coming with {phase}
      </p>
      <h2 className="mt-2 font-display text-xl font-medium tracking-tight">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#525252]">
        {description}
      </p>
    </div>
  );
}
