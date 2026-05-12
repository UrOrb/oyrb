import { StickyNote } from "lucide-react";
import { EditTrigger } from "../edit-modal";

/**
 * Notes tile — read-only display with a click-to-edit affordance.
 *
 * The entire tile surface is a button (via EditTrigger's "notes-target"
 * variant) that opens the edit modal with `initialFocus="notes"`. No
 * inline editing on the tile — keeps the form-save logic in one place
 * (the existing ClientEditForm).
 *
 * Empty state nudges the pro to add notes ("Add notes about this
 * client..."). Hover affordance on the whole tile via the shared
 * EditTrigger chrome.
 */
type Props = {
  clientId: string;
  clientName: string;
  notes: string;
  /** Full set of editable fields, passed through to the modal. */
  initial: {
    name: string;
    email: string;
    phone: string;
    notes: string;
  };
  smsConsent: boolean;
};

const EMPTY_PROMPT =
  "Add notes about this client — preferences, allergies, conversation topics, formula, whatever you want to remember.";

export function NotesTile({
  clientId,
  clientName,
  notes,
  initial,
  smsConsent,
}: Props) {
  const trimmed = notes.trim();
  const empty = !trimmed;

  return (
    <div className="col-span-2 sm:col-span-2 lg:col-span-2">
      <EditTrigger
        clientId={clientId}
        clientName={clientName}
        initial={initial}
        smsConsent={smsConsent}
        variant="notes-target"
        initialFocus="notes"
        triggerLabel={`Edit notes for ${clientName}`}
      >
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#0A0A0A]">
          <StickyNote
            size={13}
            strokeWidth={1.5}
            className="text-[#B8896B]"
          />
          Notes
        </div>
        {empty ? (
          <p className="mt-2 text-xs leading-relaxed text-[#737373]">
            {EMPTY_PROMPT}
          </p>
        ) : (
          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-[#525252] line-clamp-6">
            {trimmed}
          </p>
        )}
      </EditTrigger>
    </div>
  );
}
