import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ siteId?: string; identity?: string }>;
}

export default async function SettingsPage({ searchParams }: Props) {
  const { siteId, identity: identityParam } = await searchParams;
  const query = new URLSearchParams();
  if (siteId) query.set("siteId", siteId);
  if (identityParam) query.set("identity", identityParam);

  redirect(`/dashboard/settings/general${query.size ? `?${query.toString()}` : ""}`);
}
