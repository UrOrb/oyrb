import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ siteId?: string; portal_error?: string }>;
}

export default async function PaymentsSettingsPage({ searchParams }: Props) {
  const { siteId, portal_error: portalError } = await searchParams;
  const query = new URLSearchParams();
  if (siteId) query.set("siteId", siteId);
  if (portalError) query.set("portal_error", portalError);

  redirect(`/dashboard/settings/general${query.size ? `?${query.toString()}` : ""}`);
}
