import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, MailCheck, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { formatCents } from "@/lib/types";
import { ClientEditForm } from "./edit-form";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ siteId?: string }>;
}

type ClientRow = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  visit_count: number | null;
  marketing_opt_in: boolean;
  marketing_opt_in_at: string | null;
  sms_consent: boolean;
  sms_consent_at: string | null;
  imported_via_id: string | null;
  created_at: string;
};

/**
 * Server-rendered shell for the client detail / edit page. Loads the
 * client + last booking metadata, renders read-only metadata strip,
 * then hands editable fields off to <ClientEditForm>.
 *
 * Existence-leak posture: a client that doesn't belong to the caller's
 * business returns the same 404 as a non-existent id — RLS handles the
 * gating, the route just doesn't distinguish in the response.
 */
export default async function ClientDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { siteId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getCurrentBusiness(siteId);
  if (!business) notFound();

  const { data: clientRaw } = await supabase
    .from("clients")
    .select(
      "id, business_id, name, email, phone, notes, visit_count, marketing_opt_in, marketing_opt_in_at, sms_consent, sms_consent_at, imported_via_id, created_at",
    )
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!clientRaw) notFound();
  const client = clientRaw as ClientRow;

  // Last completed/confirmed booking — drives the "Last visit" line in
  // the metadata strip. Cancelled bookings excluded so the pro sees the
  // most recent actual encounter, not a no-show that got cancelled.
  const { data: lastBookingRaw } = await supabase
    .from("bookings")
    .select("end_at, status, services(name, price_cents)")
    .eq("client_id", client.id)
    .neq("status", "cancelled")
    .order("end_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastBooking = lastBookingRaw as
    | { end_at: string; status: string; services: { name: string; price_cents: number } | null }
    | null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1 text-xs text-[#737373] transition-colors hover:text-[#0A0A0A]"
      >
        <ChevronLeft size={12} strokeWidth={1.5} />
        All clients
      </Link>

      <div className="mt-3">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          {client.name}
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Client since {new Date(client.created_at).toLocaleDateString()}
          {client.imported_via_id && <> · Added via import</>}
        </p>
      </div>

      {/* Read-only metadata strip. Visits / spend / consent — anything
          that isn't directly editable lives here so the pro can see the
          full picture without leaving this page. */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Visits"
          value={client.visit_count != null ? `${client.visit_count}` : "0"}
          hint={
            lastBooking
              ? `Last: ${new Date(lastBooking.end_at).toLocaleDateString()}`
              : "No bookings yet"
          }
        />
        <Stat
          label="Last service"
          value={lastBooking?.services?.name ?? "—"}
          hint={
            lastBooking?.services?.price_cents != null
              ? formatCents(lastBooking.services.price_cents)
              : undefined
          }
        />
        <ConsentStat
          label="Marketing"
          enabled={client.marketing_opt_in}
          since={client.marketing_opt_in_at}
          icon={<MailCheck size={11} strokeWidth={1.5} />}
        />
        <ConsentStat
          label="SMS"
          enabled={client.sms_consent}
          since={client.sms_consent_at}
          icon={<MessageSquare size={11} strokeWidth={1.5} />}
        />
      </div>

      {/* Editable fields — name / email / phone / notes. Form ships
          changes via PATCH /api/dashboard/clients/[id]. */}
      <section className="mt-6 overflow-hidden rounded-lg border border-[#E7E5E4] bg-white">
        <header className="border-b border-[#E7E5E4] px-5 py-4">
          <h2 className="font-display text-base font-medium text-[#0A0A0A]">
            Contact details
          </h2>
          <p className="mt-1 text-xs text-[#737373]">
            Edit name, email, phone, and notes. Changes apply to all of
            this client&rsquo;s bookings — historical and future.
          </p>
        </header>
        <ClientEditForm
          clientId={client.id}
          initial={{
            name: client.name,
            email: client.email ?? "",
            phone: client.phone ?? "",
            notes: client.notes ?? "",
          }}
          smsConsent={client.sms_consent}
        />
      </section>

      <p className="mt-4 text-xs text-[#737373]">
        Editing a phone number on an SMS-opted-in client requires re-opt-in
        for legal compliance.{" "}
        <Link href="/dashboard/clients" className="underline hover:text-[#0A0A0A]">
          Back to all clients
        </Link>
        .
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-4">
      <p className="text-[10px] uppercase tracking-wide text-[#A3A3A3]">{label}</p>
      <p className="mt-1.5 text-base font-medium text-[#0A0A0A]">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-[#737373]">{hint}</p>}
    </div>
  );
}

function ConsentStat({
  label,
  enabled,
  since,
  icon,
}: {
  label: string;
  enabled: boolean;
  since: string | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-4">
      <p className="text-[10px] uppercase tracking-wide text-[#A3A3A3]">{label}</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        {enabled ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            <CheckCircle2 size={10} strokeWidth={2} /> Opted in
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-[#737373]">
            {icon} Not opted in
          </span>
        )}
      </div>
      {enabled && since && (
        <p className="mt-1 text-[11px] text-[#737373]">
          Since {new Date(since).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
