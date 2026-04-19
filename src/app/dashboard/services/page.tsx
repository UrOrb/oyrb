import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ServicesManager } from "./services-manager";
import type { Service } from "@/lib/types";
import { getCurrentBusiness } from "@/lib/current-site";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function ServicesPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);

  if (!business) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium">Services</h1>
        <p className="mt-4 text-sm text-[#737373]">Complete checkout first to create services.</p>
      </div>
    );
  }

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">Services</h1>
      <p className="mt-1 text-sm text-[#737373]">
        What you offer, how long, and how much. Deposits reduce no-shows.
      </p>

      <div className="mt-8">
        <ServicesManager services={(services ?? []) as Service[]} />
      </div>
    </div>
  );
}
