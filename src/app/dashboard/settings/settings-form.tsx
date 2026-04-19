"use client";

import { useState, useTransition } from "react";
import { updateCustomDomain, deleteAccount } from "./actions";
import { Check, Globe, Copy, CreditCard, ExternalLink, Download, AlertTriangle } from "lucide-react";

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

      {/* Data Export */}
      <Section
        title="Your data"
        subtitle="Download everything your account contains — clients, bookings, services, and hours. Do this before deleting your account."
      >
        <button
          type="button"
          onClick={() => downloadExport()}
          className="inline-flex items-center gap-2 rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium hover:bg-[#F5F5F4]"
        >
          <Download size={14} />
          Download my data (JSON)
        </button>
        <p className="text-xs text-[#737373]">
          Contains 4 CSV files inside a JSON wrapper: clients.csv, bookings.csv,
          services.csv, and business_hours.csv. Open the JSON in a text editor —
          each CSV can be copied into Excel, Google Sheets, or Numbers.
        </p>
      </Section>

      {/* Delete Account */}
      <DangerZone />
    </div>
  );
}

function downloadExport() {
  const a = document.createElement("a");
  a.href = "/api/dashboard/export";
  a.download = "";
  a.click();
}

function DangerZone() {
  const [deletePending, startDelete] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = (fd: FormData) => {
    setDeleteError(null);
    startDelete(async () => {
      const r = await deleteAccount(fd);
      if (r?.error) setDeleteError(r.error);
    });
  };

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
        <div className="flex-1">
          <h2 className="font-display text-lg font-medium text-red-900">
            Delete your account
          </h2>
          <p className="mt-1 text-sm text-red-800">
            This is permanent. Your subscription will be canceled, your business
            site removed, and all data (clients, bookings, services, photos)
            deleted from our servers.
          </p>
          <p className="mt-2 text-xs text-red-700">
            We keep <strong>no backup</strong> of your account after deletion. Please
            download your data first if you want to keep it.
          </p>

          {!showConfirm ? (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="mt-4 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Delete my account…
            </button>
          ) : (
            <form action={handleDelete} className="mt-5 space-y-3">
              <label className="block text-sm font-medium text-red-900">
                Type <span className="font-mono">DELETE</span> to confirm:
              </label>
              <input
                name="confirm"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                className="block w-full max-w-xs rounded-md border border-red-300 bg-white px-3 py-2 font-mono text-sm focus:border-red-500 focus:outline-none"
                placeholder="DELETE"
              />
              {deleteError && (
                <p className="text-xs text-red-700">{deleteError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={confirmText !== "DELETE" || deletePending}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deletePending ? "Deleting…" : "Permanently delete account"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText("");
                    setDeleteError(null);
                  }}
                  disabled={deletePending}
                  className="rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm hover:bg-[#F5F5F4]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
