"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, Globe } from "lucide-react";
import { updateCustomDomain } from "./actions";
import { SectionCard } from "./section-card";

type Props = {
  business: {
    id: string;
    subscription_tier: string;
    custom_domain: string | null;
    custom_domain_verified: boolean;
  };
};

const inputCls =
  "mt-1.5 block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#0A0A0A] focus:border-[#B8896B] focus:outline-none";

function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-2 rounded-md bg-[#FAFAF9] px-3 py-2">
      <code className="flex-1 break-all font-mono text-xs text-[#0A0A0A]">{value}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="shrink-0 rounded-md border border-[#E7E5E4] bg-white p-1.5 hover:bg-[#F5F5F4]"
        aria-label="Copy"
      >
        {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      </button>
    </div>
  );
}

export function SettingsForm({ business }: Props) {
  const [pending, start] = useTransition();
  const [domain, setDomain] = useState(business.custom_domain ?? "");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const isScale = business.subscription_tier === "scale";
  const savedDomain = business.custom_domain;
  const displayDomain = domain.trim() || savedDomain;

  const handleSubmit = (fd: FormData) => {
    setMsg(null);
    start(async () => {
      const r = await updateCustomDomain(fd);
      if (r?.error) setMsg({ type: "err", text: r.error });
      else setMsg({ type: "ok", text: "Saved. Add the DNS records below to activate." });
    });
  };

  return (
    <SectionCard
      title="Custom domain"
      subtitle={
        isScale
          ? "Point your own domain at your OYRB site."
          : "Upgrade to Scale to use your own domain."
      }
    >
      {!isScale ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            <strong>Scale tier</strong> required. Upgrade to use a custom domain like{" "}
            <code>yourstudio.com</code>.
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-flex rounded-md bg-amber-900 px-4 py-2 text-xs font-medium text-white"
          >
            See Scale plan
          </Link>
        </div>
      ) : (
        <form action={handleSubmit} className="space-y-5">
          <input type="hidden" name="business_id" value={business.id} />
          <div>
            <label htmlFor="custom_domain" className="text-sm font-medium">
              Your domain
            </label>
            <p className="mt-0.5 text-xs text-[#737373]">
              Buy a domain from any registrar, then enter it here without
              &quot;https://&quot; or a trailing slash.
            </p>
            <input
              id="custom_domain"
              name="custom_domain"
              type="text"
              placeholder="yourstudio.com"
              defaultValue={business.custom_domain ?? ""}
              onChange={(e) => setDomain(e.target.value)}
              className={inputCls}
            />
          </div>

          {msg && (
            <p className={msg.type === "ok" ? "text-xs text-green-700" : "text-xs text-red-600"}>
              {msg.text}
            </p>
          )}

          <button
            disabled={pending}
            className="rounded-md bg-[#0A0A0A] px-5 py-2 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save domain"}
          </button>

          {savedDomain && (
            <div className="mt-6 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] p-4">
              <div className="flex items-start gap-3">
                <Globe size={16} className="mt-0.5 shrink-0 text-[#B8896B]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    Add these DNS records at your registrar
                  </p>
                  <p className="mt-1 text-xs text-[#737373]">
                    Log in where you bought <code>{displayDomain}</code>, open DNS
                    or name server settings, and add these records.
                  </p>

                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#737373]">
                        Record 1 · A record
                      </p>
                      <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                        <span className="font-medium">Type</span>
                        <span>A</span>
                        <span className="font-medium">Name</span>
                        <span>@ (or leave blank)</span>
                        <span className="font-medium">Value</span>
                        <CopyableCode value="76.76.21.21" />
                        <span className="font-medium">TTL</span>
                        <span>Auto or 3600</span>
                      </div>
                    </div>

                    <div className="border-t border-[#E7E5E4] pt-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#737373]">
                        Record 2 · CNAME for www
                      </p>
                      <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                        <span className="font-medium">Type</span>
                        <span>CNAME</span>
                        <span className="font-medium">Name</span>
                        <span>www</span>
                        <span className="font-medium">Value</span>
                        <CopyableCode value="cname.vercel-dns.com" />
                        <span className="font-medium">TTL</span>
                        <span>Auto or 3600</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                    <strong>Last step:</strong> email{" "}
                    <a href="mailto:support@oyrb.space" className="underline">
                      support@oyrb.space
                    </a>{" "}
                    with your domain so we can activate it on our servers.
                  </div>

                  <p className="mt-3 text-xs text-[#A3A3A3]">
                    Status:{" "}
                    {business.custom_domain_verified ? (
                      <span className="font-semibold text-green-700">Verified</span>
                    ) : (
                      <span className="font-semibold text-amber-700">
                        Pending - waiting for DNS + activation
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </SectionCard>
  );
}
