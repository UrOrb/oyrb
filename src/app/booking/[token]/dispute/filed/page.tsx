import Link from "next/link";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Inquiry filed — OYRB",
};

type Props = { params: Promise<{ token: string }> };

export default async function DisputeFiledPage({ params }: Props) {
  const { token } = await params;
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8896B]">
        Inquiry filed
      </p>
      <h1 className="mt-2 font-display text-2xl font-medium tracking-tight md:text-3xl">
        Your Dispute Inquiry has been filed.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-[#525252]">
        The professional has 48 hours to upload counter-evidence. After that, OYRB reviews the
        documentation from both sides and applies a rating adjustment based on what&apos;s there.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[#525252]">
        We&apos;ll email you with a status update when the inquiry is moved to OYRB review and
        again when it&apos;s resolved. A confirmation email is on its way to you now.
      </p>
      <div className="mt-6 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-xs text-[#525252]">
        <strong className="text-[#0A0A0A]">Reminder:</strong> OYRB does not process refunds. The
        Dispute Inquiry system affects ratings only. For refunds, contact the professional directly
        or your bank/Stripe.
      </div>
      <Link
        href={`/booking/${token}`}
        className="mt-6 inline-block text-sm text-[#B8896B] underline"
      >
        Back to your booking
      </Link>
    </main>
  );
}
