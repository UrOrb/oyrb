"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

/**
 * TEMPORARY smoke-test chart for Phase 9 PR 6 commit 1.
 * Verifies Recharts builds under Next.js 16 + Turbopack + React 19
 * before the full feature commit lands.
 *
 * Removed in commit 2 along with the temporary mount on the money tab.
 */
const TEST_DATA = [
  { week: "W1", value: 800 },
  { week: "W2", value: 1200 },
  { week: "W3", value: 950 },
];

export function SmokeTestChart() {
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">
        Recharts smoke test (remove in commit 2)
      </p>
      <div className="mt-3 h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={TEST_DATA} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#737373" }} />
            <YAxis tick={{ fontSize: 11, fill: "#737373" }} width={32} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="#B8896B" fill="#B8896B" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
