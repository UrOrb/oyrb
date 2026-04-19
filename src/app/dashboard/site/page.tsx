import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SiteBuilder } from "./site-builder";
import type { Business, BusinessHours } from "@/lib/types";

export default async function SitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium">Site</h1>
        <p className="mt-4 text-sm text-[#737373]">
          Complete checkout first to create your site.
        </p>
      </div>
    );
  }

  const [{ data: hours }, { data: services }] = await Promise.all([
    supabase.from("business_hours").select("*").eq("business_id", business.id),
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents, deposit_cents, description")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("price_cents", { ascending: true }),
  ]);

  const h = await headers();
  const host = h.get("host") ?? "oyrb.space";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  return (
    <SiteBuilder
      business={business as Business}
      hours={(hours ?? []) as BusinessHours[]}
      services={services ?? []}
      origin={origin}
    />
  );
}
