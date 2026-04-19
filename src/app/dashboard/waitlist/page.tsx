import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Mail, Phone, Clock, CheckCircle2 } from "lucide-react";
import { getCurrentBusiness } from "@/lib/current-site";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function WaitlistPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);

  if (!business) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium">Waitlist</h1>
        <p className="mt-4 text-sm text-[#737373]">Complete checkout first.</p>
      </div>
    );
  }

  const tier = business.subscription_tier ?? "starter";
  const hasAccess = tier === "studio" || tier === "scale";

  if (!hasAccess) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight">Waitlist</h1>
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6">
          <p className="font-display text-lg font-medium text-amber-900">
            Upgrade to Studio or Scale for Waitlist
          </p>
          <p className="mt-2 text-sm text-amber-800">
            The Waitlist feature captures clients whose preferred times are full — when someone cancels, they&apos;re automatically notified so you never lose a revenue opportunity.
          </p>
          <a
            href="/pricing"
            className="mt-5 inline-flex rounded-md bg-amber-900 px-4 py-2 text-sm font-medium text-white"
          >
            See plans
          </a>
        </div>
      </div>
    );
  }

  const { data: entries } = await supabase
    .from("waitlist")
    .select("*, services(name)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const waiting = (entries ?? []).filter((e: { status: string }) => e.status === "waiting");
  const other = (entries ?? []).filter((e: { status: string }) => e.status !== "waiting");

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">Waitlist</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Clients waiting for a spot. Notified automatically when a booking cancels.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">
          Waiting ({waiting.length})
        </h2>
        <div className="mt-3 space-y-2">
          {waiting.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E7E5E4] p-8 text-center text-sm text-[#737373]">
              No one on the waitlist yet.
            </div>
          ) : (
            waiting.map((e) => <WaitlistRow key={e.id} entry={e} />)
          )}
        </div>
      </section>

      {other.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">
            History
          </h2>
          <div className="mt-3 space-y-2 opacity-75">
            {other.slice(0, 20).map((e) => (
              <WaitlistRow key={e.id} entry={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type WaitlistEntry = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  preferred_window: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  notified_at: string | null;
  services: { name: string } | null;
};

function WaitlistRow({ entry }: { entry: WaitlistEntry }) {
  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold">{entry.client_name}</p>
          <p className="mt-0.5 text-xs text-[#737373]">
            Wants: {entry.services?.name ?? "Any service"}
            {entry.preferred_window && ` · ${entry.preferred_window}`}
          </p>
          {entry.notes && (
            <p className="mt-1 text-xs text-[#525252]">{entry.notes}</p>
          )}
          <div className="mt-2 flex gap-3 text-xs text-[#525252]">
            <a
              href={`mailto:${entry.client_email}`}
              className="flex items-center gap-1 hover:text-[#B8896B]"
            >
              <Mail size={11} /> {entry.client_email}
            </a>
            {entry.client_phone && (
              <a
                href={`tel:${entry.client_phone}`}
                className="flex items-center gap-1 hover:text-[#B8896B]"
              >
                <Phone size={11} /> {entry.client_phone}
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
              entry.status === "waiting"
                ? "bg-amber-50 text-amber-700"
                : entry.status === "notified"
                ? "bg-blue-50 text-blue-700"
                : entry.status === "booked"
                ? "bg-green-50 text-green-700"
                : "bg-[#F5F5F4] text-[#737373]"
            }`}
          >
            {entry.status === "notified" && (
              <CheckCircle2 size={11} className="mr-1 inline" />
            )}
            {entry.status}
          </span>
          <p className="text-[10px] text-[#A3A3A3]">
            <Clock size={9} className="inline" /> {" "}
            {new Date(entry.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
