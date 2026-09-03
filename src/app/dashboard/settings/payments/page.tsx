import { redirect } from "next/navigation";
import { getAccountSummary } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { BillingPanel } from "./billing-panel";
import { BillingPortalCard } from "./billing-portal-card";

interface Props {
  searchParams: Promise<{ portal_error?: string }>;
}

export default async function PaymentsSettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { portal_error: portalError } = await searchParams;
  const account = await getAccountSummary();

  return (
    <div className="space-y-6">
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
    </div>
  );
}
