import { Mail, Phone, MessageSquare, Shield } from "lucide-react";

type Props = {
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientNotes: string | null;
  smsConsent: boolean;
  ageIsMinor: boolean;
  guardianName: string | null;
};

/**
 * Client card. Surfaces the contact links the pro needs (mailto/tel/sms)
 * plus notes the client left at booking time. When the client booked as
 * a minor, an inline "Booked with parent/guardian" line appears — calm
 * informational treatment, not alarming. SMS consent state is shown so
 * the pro understands whether their reminder texts will reach the
 * client.
 */
export function BookingClientCard({
  clientName,
  clientEmail,
  clientPhone,
  clientNotes,
  smsConsent,
  ageIsMinor,
  guardianName,
}: Props) {
  return (
    <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
      <h2 className="text-base font-semibold">Client</h2>
      <p className="mt-1 text-sm font-medium text-[#0A0A0A]">{clientName}</p>

      {ageIsMinor && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-[#FAFAF9] px-3 py-2 text-xs text-[#525252]">
          <Shield size={14} className="mt-0.5 shrink-0 text-[#B8896B]" />
          <span>
            Booked with parent or guardian
            {guardianName ? <>: <strong>{guardianName}</strong></> : null}.
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#525252]">
        {clientEmail && (
          <a
            href={`mailto:${clientEmail}`}
            className="inline-flex items-center gap-1.5 hover:text-[#B8896B]"
          >
            <Mail size={14} /> {clientEmail}
          </a>
        )}
        {clientPhone && (
          <a
            href={`tel:${clientPhone}`}
            className="inline-flex items-center gap-1.5 hover:text-[#B8896B]"
            aria-label={`Call ${clientPhone}`}
          >
            <Phone size={14} /> {clientPhone}
          </a>
        )}
        {clientPhone && (
          <a
            href={`sms:${clientPhone}`}
            className="inline-flex items-center gap-1.5 text-[#737373] hover:text-[#B8896B]"
            aria-label={`Text ${clientPhone}`}
          >
            <MessageSquare size={14} /> Text
          </a>
        )}
      </div>

      {clientPhone && (
        <p className="mt-3 text-xs text-[#737373]">
          {smsConsent
            ? "✓ Opted in to SMS reminders."
            : "Not opted in to SMS reminders — reminder texts won't fire."}
        </p>
      )}

      {clientNotes && clientNotes.trim().length > 0 && (
        <div className="mt-5 border-t border-[#E7E5E4] pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
            Client notes
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-[#525252]">
            {clientNotes}
          </p>
        </div>
      )}
    </section>
  );
}
