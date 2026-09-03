import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/current-site";
import { createClient } from "@/lib/supabase/server";
import { DomainSettingsForm } from "./domain-settings-form";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function DomainSettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);

  if (!business) {
    return (
      <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
        <h2 className="text-base font-semibold">Custom domain</h2>
        <p className="mt-1 text-sm text-[#737373]">
          Complete checkout first to configure a custom domain.
        </p>
      </section>
    );
  }

  return (
    <DomainSettingsForm
      business={{
        subscription_tier: business.subscription_tier,
        custom_domain: business.custom_domain ?? null,
        custom_domain_verified: !!business.custom_domain_verified,
      }}
    />
  );
}
