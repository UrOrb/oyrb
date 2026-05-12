import { CheckCircle2, MailCheck, MessageSquare, Sparkles } from "lucide-react";
import { ClientAvatar } from "@/components/ui/client-avatar";
import { EditTrigger } from "../edit-modal";

/**
 * Client detail hero — full-width bento tile (col-span-6 on desktop).
 *
 * Layout (desktop):
 *
 *   ┌──┐  Sarah Johnson                      VIP  ✉ ✓  📱 ✓  🎉
 *   │SJ│  Client since 4/12/2024                          [Edit client]
 *   └──┘
 *
 * The avatar is the only chromatic moment on the page (one of the 10
 * hue-sorted palette colors from PR #63's ClientAvatar). Name uses
 * font-display per Phase 9 typography rules. Edit button is an
 * outline-style trigger top-right.
 *
 * Renders directly (not through BentoTile) because the hero owns a
 * full inner layout — avatar on the left, content + edit button on
 * the right, badges along the right edge.
 */

type Props = {
  clientId: string;
  name: string;
  createdAt: string;
  marketingOptIn: boolean;
  smsConsent: boolean;
  loyaltyRewardAvailable: boolean;
  initial: {
    name: string;
    email: string;
    phone: string;
    notes: string;
  };
};

export function HeroTile({
  clientId,
  name,
  createdAt,
  marketingOptIn,
  smsConsent,
  loyaltyRewardAvailable,
  initial,
}: Props) {
  return (
    <div className="col-span-2 sm:col-span-4 lg:col-span-6 flex flex-col gap-4 rounded-lg border border-[#E7E5E4] bg-white p-6 sm:flex-row sm:items-center sm:p-7">
      {/* Avatar */}
      <ClientAvatar name={name} size="lg" />

      {/* Name + meta — flex-1 absorbs available width */}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl font-medium tracking-tight text-[#0A0A0A] sm:text-3xl">
          {name}
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Client since {new Date(createdAt).toLocaleDateString()}
        </p>

        {/* Badge row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {loyaltyRewardAvailable && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#B8896B]/10 px-2 py-0.5 text-[10px] font-semibold text-[#B8896B]">
              <Sparkles size={10} strokeWidth={2} /> Reward available
            </span>
          )}
          {marketingOptIn ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              <CheckCircle2 size={10} strokeWidth={2} /> Marketing
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FAFAF9] px-2 py-0.5 text-[10px] text-[#737373]">
              <MailCheck size={10} strokeWidth={1.5} /> No marketing
            </span>
          )}
          {smsConsent ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              <CheckCircle2 size={10} strokeWidth={2} /> SMS
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FAFAF9] px-2 py-0.5 text-[10px] text-[#737373]">
              <MessageSquare size={10} strokeWidth={1.5} /> No SMS
            </span>
          )}
        </div>
      </div>

      {/* Edit button — right-aligned on desktop, full-width on mobile */}
      <div className="shrink-0 sm:self-start">
        <EditTrigger
          clientId={clientId}
          clientName={name}
          initial={initial}
          smsConsent={smsConsent}
          variant="button"
        />
      </div>
    </div>
  );
}
