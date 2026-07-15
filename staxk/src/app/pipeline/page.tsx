import type { Metadata } from "next";

import { Kanban } from "@/components/kanban";
import { PageHeader } from "@/components/page-header";
import { getJobs } from "@/lib/data";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const jobs = await getJobs();
  return (
    <>
      <PageHeader
        title="Pipeline"
        sub="Arrow keys move focus · Space picks up and drops a card"
      />
      <div className="py-4">
        <Kanban jobs={jobs} />
      </div>
    </>
  );
}
