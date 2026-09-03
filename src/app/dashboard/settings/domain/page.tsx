import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function DomainSettingsPage({ searchParams }: Props) {
  const { siteId } = await searchParams;
  redirect(`/dashboard/settings/general${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`);
}
