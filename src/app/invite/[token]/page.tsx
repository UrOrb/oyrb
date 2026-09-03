/* eslint-disable react-hooks/purity */
import Link from "next/link";
import { Image as ImageIcon, Heart, Flame } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "You've been invited to OYRB",
};

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * Public landing page for non-OYRB pros invited via the email-invite
 * flow. The invite row is keyed by an opaque server-generated token
 * (migration 032). RLS on pro_invites grants no anon SELECT — we read
 * via the service-role client and render only the fields we want to
 * expose, keeping tokens unguessable + invite metadata away from
 * pre-signup visitors.
 */
export default async function InviteLandingPage({ params }: Props) {
  const { token } = await params;

  // Cheap shape check before hitting the DB. Tokens are 32-char hex
  // (crypto.randomUUID().replace(/-/g, "")). Anything else is invalid.
  if (!/^[a-f0-9]{32}$/i.test(token)) {
    return <InvalidState reason="invalid" />;
  }

  const supabase = createAdminClient();

  const { data: invite } = await supabase
    .from("pro_invites")
    .select(
      `
      id, vouch_note, status, expires_at, invitee_email,
      requester:businesses!requesting_business_id (
        business_name, slug, profile_image_url
      )
    `,
    )
    .eq("token", token)
    .maybeSingle();

  if (!invite) return <InvalidState reason="invalid" />;
  if (invite.status === "accepted") return <InvalidState reason="accepted" />;
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return <InvalidState reason="expired" />;
  }

  // PostgREST returns the embedded resource as either object or array
  // depending on cardinality inference. Normalize.
  const requesterRaw = (invite as unknown as {
    requester:
      | { business_name: string; slug: string; profile_image_url: string | null }
      | Array<{ business_name: string; slug: string; profile_image_url: string | null }>
      | null;
  }).requester;
  const requester = Array.isArray(requesterRaw) ? requesterRaw[0] : requesterRaw;

  if (!requester) return <InvalidState reason="invalid" />;

  const signupHref = `/signup?invite=${encodeURIComponent(token)}`;
  const loginHref = `/login?invite=${encodeURIComponent(token)}`;

  return (
    <div className="min-h-screen bg-[#FAFAF9] px-6 py-16">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-8 shadow-sm">
          {/* Hero — referrer's avatar (or fallback) over a soft accent stripe. */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-16 rounded-t-2xl bg-gradient-to-b from-[#B8896B]/15 to-transparent"
              style={{ marginInline: "-32px", marginTop: "-32px" }}
            />
            <div className="relative flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#F5F5F4] shadow">
                {requester.profile_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={requester.profile_image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon size={26} className="text-[#A3A3A3]" />
                )}
              </div>
            </div>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#B8896B]">
            <Flame size={12} strokeWidth={1.8} /> You&apos;ve been personally invited
          </p>

          <h1 className="mt-2 text-center font-display text-2xl font-medium tracking-[-0.01em] text-[#0A0A0A]">
            <strong className="font-semibold">{requester.business_name}</strong>{" "}
            wants to add you to their Pro Referrals on OYRB.
          </h1>

          {invite.vouch_note && (
            <p className="mt-5 rounded-lg bg-[#FAFAF9] px-4 py-3 text-center text-sm italic text-[#525252]">
              &ldquo;{invite.vouch_note}&rdquo;
            </p>
          )}

          <p className="mt-5 text-sm leading-relaxed text-[#525252]">
            When {requester.business_name} is fully booked or away, their
            clients will see your business on their storefront. They book
            directly with you — {requester.business_name} takes nothing,
            OYRB takes nothing.
          </p>

          <div className="mt-7 flex flex-col gap-2.5">
            <Link
              href={signupHref}
              className="flex items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Heart size={14} /> Sign up to accept this invitation
            </Link>
            <Link
              href={loginHref}
              className="flex items-center justify-center rounded-md border border-[#E7E5E4] bg-white px-4 py-2.5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#F5F5F4]"
            >
              Already on OYRB? Sign in to accept
            </Link>
          </div>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-[#A3A3A3]">
            By accepting, you agree to be shown on{" "}
            {requester.business_name}&apos;s storefront when they&apos;re
            unavailable. You can remove yourself from their list at any
            time after signing up.
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-[#A3A3A3]">
          OYRB — own your brand.{" "}
          <Link href="/" className="underline hover:text-[#525252]">
            What&apos;s OYRB?
          </Link>
        </p>
      </div>
    </div>
  );
}

function InvalidState({ reason }: { reason: "invalid" | "expired" | "accepted" }) {
  const heading =
    reason === "accepted"
      ? "This invitation has already been accepted."
      : reason === "expired"
        ? "This invitation has expired."
        : "This invitation isn't valid.";
  const body =
    reason === "accepted"
      ? "If this was you, you'll find the referral under Trusted Pros in your dashboard."
      : reason === "expired"
        ? "Ask the pro who sent it to send a fresh invite — links expire after 30 days."
        : "Double-check the link, or ask the pro who sent it to send a fresh invite.";

  return (
    <div className="min-h-screen bg-[#FAFAF9] px-6 py-16">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F5F4]">
            <Flame size={20} strokeWidth={1.5} className="text-[#A3A3A3]" />
          </div>
          <h1 className="mt-4 font-display text-xl font-medium tracking-tight text-[#0A0A0A]">
            {heading}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#737373]">{body}</p>

          <Link
            href="/signup"
            className="mt-6 inline-flex rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Start a free OYRB trial
          </Link>
        </div>
      </div>
    </div>
  );
}
