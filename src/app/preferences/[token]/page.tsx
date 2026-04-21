import { resolveToken } from "@/lib/booking-tokens";
import { getPreferences } from "@/lib/comm-preferences";
import { PreferencesForm } from "./form";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Communication preferences — OYRB",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ token: string }> };

export default async function PreferencesPage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolveToken(token);

  if (!resolved || resolved.expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
        <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center">
          <h1 className="font-display text-2xl font-medium">Link expired</h1>
          <p className="mt-3 text-sm text-[#737373]">
            For your security, preference links expire after 7 days. Unsubscribe links in more
            recent emails will still work.
          </p>
        </div>
      </div>
    );
  }

  const prefs = await getPreferences(resolved.clientEmail);

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-12 px-4">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8896B]">Preferences</p>
          <h1 className="mt-2 font-display text-3xl font-medium">Email settings</h1>
          <p className="mt-2 text-sm text-[#737373]">
            Managing <strong>{resolved.clientEmail}</strong>
          </p>
        </div>

        <PreferencesForm
          token={token}
          initialRebook={prefs.rebookRemindersEnabled}
          initialMarketing={prefs.marketingEnabled}
          unsubscribed={!!prefs.unsubscribedAt}
          deletionRequested={!!prefs.dataDeletionRequestedAt}
        />

        <p className="mt-8 text-center text-[11px] text-[#A3A3A3]">
          Changes apply to all communications from OYRB across every pro.
        </p>
      </div>
    </div>
  );
}
