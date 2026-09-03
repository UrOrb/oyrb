import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function BookingSettingsPage({ searchParams }: Props) {
  const { siteId } = await searchParams;
  redirect(`/dashboard/settings/operations${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`);
}
