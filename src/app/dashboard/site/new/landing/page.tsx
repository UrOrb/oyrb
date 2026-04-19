import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewSiteLandingPoller } from "./poller";

export const metadata = { title: "Setting up your new site…" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ session?: string }>;
}

export default async function NewSiteLandingPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Snapshot the user's site IDs at landing time. The webhook may not have
  // fired yet — the client poller compares against this baseline and forwards
  // to the new site once it appears.
  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id);
  const knownIds = (existing ?? []).map((b) => b.id);

  const params = await searchParams;
  return (
    <NewSiteLandingPoller knownIds={knownIds} sessionId={params.session ?? null} />
  );
}
