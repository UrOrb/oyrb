"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminUnpauseStrike } from "./unpause/actions";

export function UnpauseButton({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm("Unpause this business? The storefront will re-publish immediately.")) return;
    setError(null);
    setSubmitting(true);
    const result = await adminUnpauseStrike(businessId);
    if ("error" in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className="rounded-full bg-[#0A0A0A] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Unpausing…" : "Unpause storefront"}
      </button>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
