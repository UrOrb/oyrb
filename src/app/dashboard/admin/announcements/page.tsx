import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { AnnouncementForm } from "./form";

export const metadata = { title: "Admin · Platform announcements" };
export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return (
      <div className="p-10 text-sm text-[#737373]">
        {gate.error} (HTTP {gate.status})
      </div>
    );
  }

  const supabase = createAdminClient();
  const { data: recent } = await supabase
    .from("email_campaigns")
    .select("id, subject, segment, recipient_count, sent_at, status")
    .eq("is_admin_send", true)
    .order("sent_at", { ascending: false })
    .limit(15);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Platform announcements
      </h1>
      <p className="mt-1 text-sm text-[#737373]">
        Send to every pro on OYRB (or a subset). Subject + body go out via
        Resend with a valid unsubscribe link. Daily cap: 10,000 recipients.
      </p>

      <AnnouncementForm adminEmail={gate.user.email} />

      {recent && recent.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">
            Recent announcements
          </h2>
          <div className="mt-3 space-y-2">
            {recent.map((c: {
              id: string;
              subject: string;
              segment: string;
              recipient_count: number;
              sent_at: string | null;
              status: string | null;
            }) => (
              <div key={c.id} className="rounded-md border border-[#E7E5E4] bg-white p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{c.subject}</p>
                  <span className="text-[10px] text-[#A3A3A3]">
                    {c.sent_at ? new Date(c.sent_at).toLocaleString() : "—"}
                  </span>
                </div>
                <p className="mt-1 text-[#525252]">
                  Sent to <strong>{c.recipient_count}</strong> · audience: {c.segment}
                  {c.status && c.status !== "sent" && (
                    <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      {c.status}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
