import type { Metadata } from "next";

import { ApprovalQueue } from "@/components/approval-queue";
import { PageHeader } from "@/components/page-header";
import { getOutreach } from "@/lib/data";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const pending = await getOutreach("pending_approval");
  return (
    <>
      <PageHeader
        title="Approval queue"
        sub="Human-in-the-loop, always. Nothing sends without your tap."
      />
      <ApprovalQueue items={pending} />
    </>
  );
}
