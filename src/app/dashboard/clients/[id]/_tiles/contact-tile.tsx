import { Mail, Phone, MessageSquare } from "lucide-react";
import { BentoTile } from "../../../_components/bento-tile";

/**
 * Contact tile — email + phone with tel:/mailto:/sms: anchors.
 *
 * Renders inline as a stack on mobile, stays compact on desktop.
 * Each anchor stops propagation so taps fire their native intent
 * (mailto: opens mail client; tel: dials; sms: opens SMS composer).
 * Empty state: "No contact info yet — add via Edit."
 */

type Props = {
  email: string | null;
  phone: string | null;
};

export function ContactTile({ email, phone }: Props) {
  const empty = !email && !phone;

  return (
    <BentoTile
      className="col-span-2 sm:col-span-4 lg:col-span-2"
      ariaLabel="Contact"
    >
      <p className="text-sm font-semibold text-[#0A0A0A]">Contact</p>

      {empty ? (
        <p className="mt-2 text-xs leading-relaxed text-[#737373]">
          No contact info yet — add via Edit.
        </p>
      ) : (
        <div className="mt-3 space-y-2 text-sm text-[#525252]">
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 truncate hover:text-[#B8896B]"
            >
              <Mail size={13} strokeWidth={1.5} className="shrink-0" />
              <span className="truncate">{email}</span>
            </a>
          )}
          {phone && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2 hover:text-[#B8896B]"
                aria-label={`Call ${phone}`}
              >
                <Phone size={13} strokeWidth={1.5} />
                {phone}
              </a>
              <a
                href={`sms:${phone}`}
                className="flex items-center gap-1 text-xs text-[#737373] hover:text-[#B8896B]"
                aria-label={`Text ${phone}`}
              >
                <MessageSquare size={12} strokeWidth={1.5} />
                Text
              </a>
            </div>
          )}
        </div>
      )}
    </BentoTile>
  );
}
