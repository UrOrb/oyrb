import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; bookingId: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const { slug, bookingId } = await params;
  const supabase = createAdminClient();

  const { data: biz } = await supabase
    .from("businesses")
    .select("business_name, slug, template_theme")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!biz) notFound();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, business_id, status, services(name)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) notFound();

  // Check if already reviewed
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  const svcName = (booking as { services?: { name?: string } | null }).services?.name ?? "your appointment";

  return (
    <div className="min-h-screen bg-[#FAFAF9] px-6 py-20">
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-medium text-[#B8896B]">{biz.business_name}</p>
        <h1 className="font-display mt-2 text-3xl font-medium tracking-[-0.02em] md:text-4xl">
          {existing ? "Thanks for your review!" : "How was your visit?"}
        </h1>
        <p className="mt-3 text-sm text-[#525252]">
          {existing
            ? "You've already shared your feedback. Thank you — it helps other clients find great pros like this one."
            : `We'd love to hear about your experience with ${svcName}. Your review will appear on their booking page.`}
        </p>

        {!existing && (
          <div className="mt-8">
            <ReviewForm bookingId={bookingId} />
          </div>
        )}
      </div>
    </div>
  );
}
