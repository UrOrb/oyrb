"use client";

import { useState, useTransition } from "react";
// `deleteAccount` is intentionally NOT imported here anymore — it
// was wired to the in-form Danger Zone (now deleted, Phase 8 PR 4).
// The action itself is kept in actions.ts pending PR 5's repurposing
// as `finalizeRemoval` (the cron-driven cascade-delete). New
// destructive flow lives at /dashboard/settings/remove-brand.
import { updateCustomDomain } from "./actions";
import { Check, Globe, Copy, CreditCard, ExternalLink } from "lucide-react";

type Props = {
  business: {
    id: string;
    business_name: string;
    subscription_tier: string;
    custom_domain: string | null;
    custom_domain_verified: boolean;
  };
  userEmail: string;
};

const inputCls =
  "mt-1.5 block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#0A0A0A] focus:border-[#B8896B] focus:outline-none";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-6">
      <h2 className="font-display text-lg font-medium">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[#737373]">{subtitle}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-md bg-[#FAFAF9] px-3 py-2">
      <code className="flex-1 font-mono text-xs text-[#0A0A0A]">{value}</code>
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

export function SettingsForm({ business, userEmail }: Props) {
  const [pending, start] = useTransition();
  const [portalPending, startPortal] = useTransition();
  const [domain, setDomain] = useState(business.custom_domain ?? "");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);

  const isScale = business.subscription_tier === "scale";

  const openPortal = () => {
    setPortalError(null);
    startPortal(async () => {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setPortalError(data.error ?? "Could not open portal.");
        return;
      }
      window.location.href = data.url;
    });
  };

  const handleSubmit = (fd: FormData) => {
    setMsg(null);
    start(async () => {
      const r = await updateCustomDomain(fd);
      if (r?.error) setMsg({ type: "err", text: r.error });
      else setMsg({ type: "ok", text: "Saved. Add the DNS records below to activate." });
    });
  };

  return (
    <div className="space-y-6">
      {/* Account */}
      <Section title="Account" subtitle="Your sign-in details and subscription.">
        <div>
          <label className="text-sm font-medium">Email</label>
          <p className="mt-1 text-sm text-[#525252]">{userEmail}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Business name</label>
          <p className="mt-1 text-sm text-[#525252]">{business.business_name}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Current plan</label>
          <p className="mt-1 text-sm text-[#525252] capitalize">
            {business.subscription_tier ?? "inactive"}
          </p>
        </div>

        <div className="border-t border-[#E7E5E4] pt-5">
          <p className="mb-2 text-sm font-medium">Manage subscription</p>
          <p className="mb-3 text-xs text-[#737373]">
            Update payment method, download invoices, upgrade/downgrade your plan,
            or cancel your subscription — all via Stripe.
          </p>
          <button
            type="button"
            onClick={openPortal}
            disabled={portalPending}
            className="inline-flex items-center gap-2 rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium hover:bg-[#F5F5F4] disabled:opacity-50"
          >
            <CreditCard size={14} />
            {portalPending ? "Opening…" : "Open billing portal"}
            <ExternalLink size={11} />
          </button>
          {portalError && (
            <p className="mt-2 text-xs text-red-600">{portalError}</p>
          )}
        </div>
      </Section>

      {/* Custom domain */}
      <Section
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
            <a
              href="/pricing"
              className="mt-3 inline-flex rounded-md bg-amber-900 px-4 py-2 text-xs font-medium text-white"
            >
              See Scale plan
            </a>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="custom_domain" className="text-sm font-medium">
                Your domain
              </label>
              <p className="mt-0.5 text-xs text-[#737373]">
                Buy a domain from any registrar (GoDaddy, Namecheap, Cloudflare) then enter it here.
                Do NOT include &quot;https://&quot; or a trailing slash.
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
              <p
                className={
                  msg.type === "ok"
                    ? "text-xs text-green-700"
                    : "text-xs text-red-600"
                }
              >
                {msg.text}
              </p>
            )}

            <button
              disabled={pending}
              className="rounded-md bg-[#0A0A0A] px-5 py-2 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save domain"}
            </button>

            {/* DNS instructions once a domain is saved */}
            {business.custom_domain && (
              <div className="mt-6 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                <div className="flex items-start gap-3">
                  <Globe size={16} className="mt-0.5 shrink-0 text-[#B8896B]" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      Add these DNS records at your registrar
                    </p>
                    <p className="mt-1 text-xs text-[#737373]">
                      Login to where you bought <code>{business.custom_domain}</code>{" "}
                      → DNS or Name Servers → add these records:
                    </p>

                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#737373]">
                          Record 1 · A record
                        </p>
                        <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1 text-xs">
                          <span className="font-medium">Type</span>
                          <span>A</span>
                          <span className="font-medium">Name</span>
                          <span>@ (or leave blank)</span>
                          <span className="font-medium">Value</span>
                          <span><CopyableCode value="76.76.21.21" /></span>
                          <span className="font-medium">TTL</span>
                          <span>Auto or 3600</span>
                        </div>
                      </div>

                      <div className="border-t border-[#E7E5E4] pt-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#737373]">
                          Record 2 · CNAME for www
                        </p>
                        <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1 text-xs">
                          <span className="font-medium">Type</span>
                          <span>CNAME</span>
                          <span className="font-medium">Name</span>
                          <span>www</span>
                          <span className="font-medium">Value</span>
                          <span><CopyableCode value="cname.vercel-dns.com" /></span>
                          <span className="font-medium">TTL</span>
                          <span>Auto or 3600</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                      <strong>Last step:</strong> email <a href="mailto:support@oyrb.space" className="underline">support@oyrb.space</a> with your domain so we can activate it on our servers. Activation happens within 24 hours of DNS pointing correctly.
                    </div>

                    <p className="mt-3 text-xs text-[#A3A3A3]">
                      Status:{" "}
                      {business.custom_domain_verified ? (
                        <span className="font-semibold text-green-700">✓ Verified</span>
                      ) : (
                        <span className="font-semibold text-amber-700">Pending — waiting for DNS + activation</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}
      </Section>

    </div>
  );
}

// Phase 8 PR 4 — the in-form `DangerZone` component that called
// deleteAccount() directly was deleted. Its replacement is the
// Remove Brand link-card at the bottom of /dashboard/settings,
// which links to /dashboard/settings/remove-brand and uses the
// new initiateRemoval action (14-day grace, restore-capable). The
// deleteAccount function in actions.ts is preserved with a
// deprecation comment pending Phase 8 PR 5's repurposing as
// finalizeRemoval (cron-driven).
