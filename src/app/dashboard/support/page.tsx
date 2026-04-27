import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { SupportForm } from "./support-form";

interface Props {
  searchParams: Promise<{ prefill?: string; category?: string }>;
}

export const metadata = { title: "Contact Support" };

export default async function SupportPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getCurrentBusiness();
  const { prefill, category } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-medium tracking-tight">Contact Support</h1>
      <p className="mt-1 text-sm text-[#737373]">We read every message.</p>

      <div className="mt-8">
        <SupportForm
          userEmail={user.email ?? ""}
          businessName={business?.business_name ?? null}
          initialMessage={typeof prefill === "string" ? prefill : ""}
          initialCategory={typeof category === "string" ? category : ""}
        />
      </div>
    </div>
  );
}
