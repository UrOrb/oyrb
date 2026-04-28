"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { togglePassTheTorch } from "./actions";

export function MasterToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handleChange(next: boolean) {
    setError(null);
    const prev = on;
    setOn(next); // optimistic
    start(async () => {
      const result = await togglePassTheTorch({ enabled: next });
      if ("error" in result) {
        setOn(prev);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-[#E7E5E4] bg-white p-5">
      <div>
        <p className="text-sm font-medium text-[#0A0A0A]">
          Show Pass the Torch on my storefront
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#737373]">
          When off, the &ldquo;Pros I Trust&rdquo; section never renders on
          your site, regardless of your accepted vouches.
        </p>
        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      </div>
      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => handleChange(e.target.checked)}
          disabled={pending}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-[#E7E5E4] transition-colors peer-checked:bg-[#0A0A0A]" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        {pending && (
          <Loader2 size={12} className="absolute -right-5 animate-spin text-[#737373]" />
        )}
      </label>
    </div>
  );
}
