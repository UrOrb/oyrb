"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function CheckoutPoller() {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
      setElapsed((e) => e + 2);
    }, 2000);
    return () => clearInterval(interval);
  }, [router]);

  const stuck = elapsed >= 30;

  return (
    <div className="mt-8 rounded-lg border border-[#E7E5E4] bg-white p-8 text-center">
      <Loader2 className="mx-auto animate-spin text-[#B8896B]" size={32} />
      <h2 className="font-display mt-4 text-xl font-medium">
        Payment received — setting up your account…
      </h2>
      <p className="mt-2 text-sm text-[#737373]">
        This usually takes a few seconds. You&apos;ll be redirected automatically.
      </p>
      {stuck && (
        <div className="mt-6 rounded-md bg-amber-50 p-4 text-left text-sm text-amber-900">
          <p className="font-medium">Taking longer than expected?</p>
          <p className="mt-1 text-xs">
            Your payment was successful. If this screen doesn&apos;t advance in the next
            few seconds, refresh the page or email{" "}
            <a href="mailto:support@oyrb.space" className="underline">
              support@oyrb.space
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
