import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { deriveStatus } from "@/lib/stripe-connect";
import { PaymentsClient } from "./payments-client";

export const metadata = {
  title: "Payments — OYRB",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string; err?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/payments");

  const business = await getCurrentBusiness();
  if (!business) redirect("/dashboard");

  const row = business as unknown as {
    id: string;
    business_name: string;
    stripe_connect_account_id: string | null;
    stripe_connect_details_submitted: boolean;
    stripe_connect_charges_enabled: boolean;
    stripe_connect_payouts_enabled: boolean;
    stripe_connect_requirements_currently_due: string[] | null;
  };

  const info = deriveStatus({
    stripe_connect_account_id: row.stripe_connect_account_id,
    stripe_connect_details_submitted: row.stripe_connect_details_submitted,
    stripe_connect_charges_enabled: row.stripe_connect_charges_enabled,
    stripe_connect_requirements_currently_due:
      row.stripe_connect_requirements_currently_due,
  });

  const params = await searchParams;

  return (
    <PaymentsClient
      businessName={row.business_name}
      status={info.status}
      requirementsCurrentlyDue={info.requirementsCurrentlyDue}
      payoutsEnabled={row.stripe_connect_payouts_enabled}
      banner={
        params.onboarded === "1"
          ? "success"
          : params.err
            ? "error"
            : null
      }
      bannerMessage={params.err ?? null}
    />
  );
}
