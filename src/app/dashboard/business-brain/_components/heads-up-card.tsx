import { Lightbulb } from "lucide-react";
import type { AnomalyResult } from "@/lib/business-brain";

/**
 * Heads-up card. Three states:
 *   - anomalies present     → list each one
 *   - baseline ready, none  → "Nothing unusual to flag this week"
 *   - baseline NOT ready    → "Building baseline — check back in a few weeks"
 *
 * Voice convention from spec: "💡 Your Business Brain noticed..." —
 * conversational, not preachy, not condescending.
 */
export function HeadsUpCard({ result }: { result: AnomalyResult }) {
  const { anomalies, baselineReady } = result;

  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center gap-2">
        <Lightbulb size={16} className="text-[#B8896B]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Heads-up
        </h2>
      </header>

      {anomalies.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {anomalies.map((a, i) => (
            <li
              key={`${a.type}-${i}`}
              className="rounded-lg bg-[#FFFBEB] p-4 text-sm text-[#0A0A0A]"
            >
              <p className="font-medium leading-snug">
                <span aria-hidden className="mr-1.5">💡</span>
                Your Business Brain noticed: {a.message}
              </p>
              {a.detail && (
                <p className="mt-1.5 text-xs leading-relaxed text-[#737373]">
                  {a.detail}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : baselineReady ? (
        <p className="mt-3 text-sm text-[#525252]">
          Nothing unusual to flag this week.
        </p>
      ) : (
        <p className="mt-3 text-sm text-[#525252]">
          Building baseline — check back in a few weeks. Your Business Brain needs more
          history before it can spot patterns worth surfacing.
        </p>
      )}
    </section>
  );
}
