import { ExternalLink } from "lucide-react";
import { formatCents } from "@/lib/types";

type Props = {
  serviceName: string;
  serviceDescription: string | null;
  durationMinutes: number;
  priceCents: number;
  depositPaid: boolean;
  paidInFullAt: string | null;
  paidAmountCents: number | null;
  stripePaymentIntentId: string | null;
};

/**
 * Service + payment card. Service section is informational only.
 * Payment sub-section shows deposit / pay-in-full state plus a "Refund
 * in Stripe" deep-link when there's a payment intent — the only
 * actionable element. OYRB never holds money so refunds happen on
 * Stripe directly; the pro must already be logged into that account
 * for the link to resolve.
 */
export function BookingServiceCard({
  serviceName,
  serviceDescription,
  durationMinutes,
  priceCents,
  depositPaid,
  paidInFullAt,
  paidAmountCents,
  stripePaymentIntentId,
}: Props) {
  const durationLabel = formatDuration(durationMinutes);

  return (
    <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
      <h2 className="text-base font-semibold">Service</h2>

      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <Field label="Service" value={serviceName} />
        <Field label="Duration" value={durationLabel} />
        <Field label="Price" value={formatCents(priceCents)} />
      </div>

      {serviceDescription && (
        <p className="mt-4 whitespace-pre-wrap text-sm text-[#525252]">
          {serviceDescription}
        </p>
      )}

      <div className="mt-5 border-t border-[#E7E5E4] pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
          Payment
        </p>
        <div className="mt-2 space-y-1.5 text-sm text-[#525252]">
          <p>
            <span className="text-[#737373]">Deposit:</span>{" "}
            <strong className="text-[#0A0A0A]">{depositPaid ? "Paid ✓" : "Not collected"}</strong>
          </p>
          {paidInFullAt && (
            <p>
              <span className="text-[#737373]">Paid in full:</span>{" "}
              <strong className="text-emerald-700">
                {paidAmountCents != null ? formatCents(paidAmountCents) : "✓"}
              </strong>{" "}
              <span className="text-xs text-[#A3A3A3]">
                on{" "}
                {new Date(paidInFullAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </p>
          )}
          {!paidInFullAt && !depositPaid && (
            <p className="text-xs text-[#737373]">
              No OYRB-processed payment recorded for this booking.
            </p>
          )}
        </div>

        {stripePaymentIntentId && (
          <a
            href={`https://dashboard.stripe.com/payments/${stripePaymentIntentId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open this payment in your Stripe Dashboard to issue a refund"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#525252] hover:border-[#B8896B] hover:text-[#0A0A0A]"
          >
            Open in Stripe to refund <ExternalLink size={11} />
          </a>
        )}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[#0A0A0A]">{value}</p>
    </div>
  );
}

function formatDuration(min: number): string {
  if (!min || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
