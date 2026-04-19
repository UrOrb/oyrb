import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SiteForm } from "./site-form";
import { EditorTabs } from "./editor-tabs";
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

  const { data: hours } = await supabase
    .from("business_hours")
    .select("*")
    .eq("business_id", business.id);

  const h = await headers();
  const host = h.get("host") ?? "oyrb.space";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">Your site</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Everything your clients see. Publish when you&rsquo;re ready.
      </p>

      <div className="mt-8">
        <EditorTabs
          slug={business.slug}
          origin={origin}
          isPublished={!!business.is_published}
          editChildren={
            <SiteForm
              business={business as Business}
              hours={(hours ?? []) as BusinessHours[]}
              origin={origin}
            />
          }
        />
      </div>
    </div>
  );
}
