import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingPanel } from "../billing-panel";
import { BillingPortalCard } from "../billing-portal-card";
import { SettingsForm } from "../settings-form";
import { getCurrentBusiness } from "@/lib/current-site";
import { getAccountSummary } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";

interface Props {
  searchParams: Promise<{ siteId?: string; portal_error?: string }>;
}

export default async function GeneralSettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId, portal_error: portalError } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  const account = await getAccountSummary();

  if (!business) {
    return (
      <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
        <h2 className="text-base font-semibold">General</h2>
        <p className="mt-1 text-sm text-[#737373]">
          Complete checkout first to access settings.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
        <h2 className="font-display text-lg font-medium">Account</h2>
        <p className="mt-1 text-sm text-[#737373]">
          Your sign-in details and current business.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#A3A3A3]">
              Email
            </p>
            <p className="mt-1 break-words text-sm text-[#525252]">{user.email}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#A3A3A3]">
              Business
            </p>
            <p className="mt-1 text-sm text-[#525252]">{business.business_name}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#A3A3A3]">
              Current plan
            </p>
            <span className="mt-1 inline-flex rounded-full bg-[#F1EFEC] px-2.5 py-1 text-xs font-semibold capitalize text-[#0A0A0A]">
              {business.subscription_tier ?? "inactive"}
            </span>
          </div>
        </div>
      </section>

      {account?.subscription ? (
        <BillingPanel summary={account} />
      ) : (
        <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
          <h2 className="text-base font-semibold">Billing</h2>
          <p className="mt-1 text-sm text-[#737373]">
            Subscribe first to manage billing and invoices.
          </p>
        </section>
      )}

      <BillingPortalCard initialError={portalError} />

      <SettingsForm
        business={{
          subscription_tier: business.subscription_tier,
          custom_domain: business.custom_domain ?? null,
          custom_domain_verified: !!business.custom_domain_verified,
        }}
      />

      <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[#525252]">Remove your brand</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[#737373]">
              Start a 14-day removal window. Your storefront comes down today;
              your account deletes after 14 days.
            </p>
          </div>
          <Link
            href="/dashboard/settings/remove-brand"
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#525252] hover:border-[#A3A3A3] hover:text-[#0A0A0A]"
          >
            <span className="group-hover:underline group-hover:decoration-amber-700 group-hover:underline-offset-4">
              Remove brand
            </span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
