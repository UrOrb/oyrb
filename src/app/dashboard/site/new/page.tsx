import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Mail, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Add a new site" };

export default async function AddNewSitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, business_name, slug, subscription_tier")
    .eq("owner_id", user.id);

  // No site yet → just send them through normal onboarding (pricing → checkout
  // → /dashboard/site).
  if (!businesses || businesses.length === 0) {
    redirect("/dashboard");
  }

  const tier = businesses[0]?.subscription_tier ?? "starter";
  const onScale = tier === "scale";

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-[#737373] hover:text-[#0A0A0A]">
        ← Back to dashboard
      </Link>

      <h1 className="font-display mt-4 text-2xl font-medium tracking-tight">Add a new site</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Manage multiple booking sites from one dashboard — one for each location, brand, or specialty.
      </p>

      <div className="mt-8 rounded-lg border border-[#E7E5E4] bg-white p-6">
        <p className="text-sm font-semibold">
          {onScale ? "You're on the Scale plan ✦" : "Multi-site is on the Scale plan"}
        </p>
        <p className="mt-1 text-xs text-[#737373]">
          {onScale
            ? "Reach out and we'll provision your next site within one business day."
            : "Upgrade to Scale to add additional booking sites — multi-location, custom domains per site, and unlimited SMS reminders."}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {!onScale && (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white hover:opacity-85"
            >
              See Scale plan <ArrowRight size={12} />
            </Link>
          )}
          <a
            href="mailto:hello@oyrb.space?subject=Add%20a%20new%20site"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-xs font-medium hover:bg-[#F5F5F4]"
          >
            <Mail size={12} /> Email us
          </a>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-xs text-[#525252]">
        <p className="font-semibold">Your existing sites</p>
        <ul className="mt-2 space-y-1">
          {businesses.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2">
              <span>{b.business_name}</span>
              <a
                href={`/s/${b.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[#737373] hover:text-[#0A0A0A]"
              >
                /s/{b.slug} <ExternalLink size={10} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
