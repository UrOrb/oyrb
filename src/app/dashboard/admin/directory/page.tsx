import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { adminApproveListing, adminForceDelistListing } from "@/app/dashboard/directory/actions";

export const metadata = { title: "Directory review · Admin" };

type ReportedRow = {
  user_id: string;
  slug: string | null;
  report_count: number;
  is_hidden_pending_review: boolean;
  is_listed: boolean;
  bio: string | null;
  updated_at: string;
};

type ConsentRow = {
  user_id: string;
  agreement_version: string;
  accepted_at: string;
};

export default async function AdminDirectoryPage() {
  const gate = await requireAdmin();
  if (!gate.ok) redirect("/dashboard");

  const admin = createAdminClient();
  const [{ data: reported }, { data: consentLog }] = await Promise.all([
    admin
      .from("directory_listings")
      .select("user_id, slug, report_count, is_hidden_pending_review, is_listed, bio, updated_at")
      .or("is_hidden_pending_review.eq.true,report_count.gt.0")
      .order("report_count", { ascending: false })
      .limit(50),
    admin
      .from("directory_consent_log")
      .select("user_id, agreement_version, accepted_at")
      .order("accepted_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Directory — admin review
      </h1>
      <p className="mt-1 text-sm text-[#737373]">
        Listings with reports or auto-hidden pending review. Listings with 3+
        unhandled reports are auto-hidden; you can approve to restore or
        force-delist to remove permanently.
      </p>

      <section className="mt-8">
        <h2 className="text-base font-semibold">Reported listings</h2>
        {!reported || reported.length === 0 ? (
          <p className="mt-2 text-sm text-[#737373]">No reports at the moment.</p>
        ) : (
          <div className="mt-3 divide-y divide-[#E7E5E4] rounded-lg border border-[#E7E5E4] bg-white">
            {(reported as ReportedRow[]).map((r) => (
              <div key={r.user_id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#0A0A0A]">
                    /find/{r.slug ?? "(no slug)"}
                  </p>
                  <p className="mt-0.5 text-xs text-[#737373]">
                    Reports: {r.report_count} · Listed:{" "}
                    {r.is_listed ? "yes" : "no"} · Hidden pending review:{" "}
                    {r.is_hidden_pending_review ? "yes" : "no"}
                  </p>
                  {r.bio && (
                    <p className="mt-2 line-clamp-3 text-xs text-[#525252]">{r.bio}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <form
                    action={async () => {
                      "use server";
                      await adminApproveListing(r.user_id);
                    }}
                  >
                    <button
                      type="submit"
                      className="w-full rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100"
                    >
                      Approve & clear
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await adminForceDelistListing(r.user_id);
                    }}
                  >
                    <button
                      type="submit"
                      className="w-full rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100"
                    >
                      Force delist
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold">Recent consent acceptances</h2>
        <p className="mt-0.5 text-xs text-[#737373]">
          Immutable audit log of who accepted which agreement version, when.
        </p>
        {!consentLog || consentLog.length === 0 ? (
          <p className="mt-2 text-sm text-[#737373]">No acceptances logged yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-[#E7E5E4] bg-white">
            <table className="w-full text-xs">
              <thead className="bg-[#FAFAF9] text-[#737373]">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">User</th>
                  <th className="px-4 py-2 text-left font-medium">Version</th>
                  <th className="px-4 py-2 text-left font-medium">Accepted</th>
                </tr>
              </thead>
              <tbody>
                {(consentLog as ConsentRow[]).map((c, i) => (
                  <tr key={i} className="border-t border-[#E7E5E4]">
                    <td className="px-4 py-2 font-mono text-[10px] text-[#525252]">{c.user_id}</td>
                    <td className="px-4 py-2 text-[#0A0A0A]">{c.agreement_version}</td>
                    <td className="px-4 py-2 text-[#737373]">
                      {new Date(c.accepted_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
