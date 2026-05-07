import { ComingSoonCard } from "../_components/coming-soon-card";

export const metadata = { title: "Time — Business Brain" };

export default function TimeTabPage() {
  return (
    <ComingSoonCard
      title="Time"
      phase="Phase 4.3"
      description="Where your hours go. Average actual duration vs scheduled, profit per minute, longest and shortest services. Powered by the timing pings from Phase 3."
    />
  );
}
