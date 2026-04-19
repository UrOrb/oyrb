import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { getCurrentBusiness } from "@/lib/current-site";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function SettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);

  if (!business) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium">Settings</h1>
        <p className="mt-4 text-sm text-[#737373]">Complete checkout first to access settings.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-[#737373]">Account info, domain, and preferences.</p>

      <div className="mt-8">
        <SettingsForm
          business={{
            id: business.id,
            business_name: business.business_name,
            subscription_tier: business.subscription_tier,
            custom_domain: business.custom_domain ?? null,
            custom_domain_verified: !!business.custom_domain_verified,
          }}
          userEmail={user.email ?? ""}
        />
      </div>
    </div>
  );
}
