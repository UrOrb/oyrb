"use client";

import Link from "next/link";
import { Pencil, TrendingUp } from "lucide-react";
import type { GoalSnapshot } from "@/lib/goal-tracking";

// Favicon palette — mirrors the avatar gradient + glow. Bar fill uses this
// gradient; empty track is a neutral.
const FAVICON_GRADIENT =
  "linear-gradient(90deg, #FF6EC7 0%, #D946EF 50%, #A855F7 100%)";
const TRACK_BG = "#EFEBEE";

function formatMoney(dollars: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(dollars));
}

function formatResetDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function milestoneFor(percent: number, remainingDollars: number, overageDollars: number): string {
  if (percent >= 100) {
    if (overageDollars > 1) return `You're crushing it! ${formatMoney(overageDollars)} over goal 💰`;
    return "Goal smashed! 🎉 You did it!";
  }
  if (percent >= 90) return `SO close! Just ${formatMoney(Math.max(1, remainingDollars))} to go!`;
  if (percent >= 75) return "Three-quarters there — final push! 🔥";
  if (percent >= 50) return "Halfway there! 🎯";
  if (percent >= 25) return "Quarter way there — nice work!";
  if (percent >= 1)  return "You're off! Keep the momentum 🚀";
  return "Let's make it happen this month! 💪";
}

type Props = {
  snapshot: GoalSnapshot;
};

export function GoalMeter({ snapshot }: Props) {
  const {
    goalAmount,
    earnedAmount,
    percent,
    resetsAt,
    countType,
    siteCount,
    customTitle,
    showOnDashboard,
    isFirstRun,
  } = snapshot;

  // Render nothing when the user has hidden the meter.
  if (!showOnDashboard) return null;

  // First-run CTA: user has never set a goal. Prompt them to.
  if (isFirstRun) {
    return (
      <div className="rounded-lg border border-[#E7E5E4] bg-white p-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: FAVICON_GRADIENT }}
            aria-hidden="true"
          >
            <TrendingUp size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#0A0A0A]">Set your monthly goal</p>
            <p className="mt-1 text-xs text-[#737373]">
              How much are you aiming to make this month? We'll track your
              progress and cheer you on.
            </p>
            <Link
              href="/dashboard/settings#goal"
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85"
            >
              Set goal →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, goalAmount - earnedAmount);
  const overage = Math.max(0, earnedAmount - goalAmount);
  const displayPercent = Math.min(100, Math.max(0, percent)); // cap bar fill at 100%
  const milestone = milestoneFor(percent, remaining, overage);

  const countTypeLabel =
    countType === "completed_appointments"
      ? "Completed appointments"
      : countType === "deposits_received"
      ? "Deposits received"
      : "Confirmed bookings";

  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-5">
      {/* Title + edit */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="h-6 w-6 rounded-full"
            style={{ background: FAVICON_GRADIENT }}
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-[#0A0A0A]">
            {customTitle?.trim() || "Monthly Goal"}
          </p>
        </div>
        <Link
          href="/dashboard/settings#goal"
          aria-label="Edit monthly goal"
          className="inline-flex items-center gap-1 rounded-md border border-[#E7E5E4] px-2 py-1 text-[11px] font-medium text-[#525252] hover:bg-[#F5F5F4]"
        >
          <Pencil size={11} /> Edit
        </Link>
      </div>

      {/* Numbers line */}
      <div className="mt-3 flex items-baseline justify-between gap-3 text-[11px] text-[#737373]">
        <span>
          <span className="font-semibold text-[#0A0A0A]">{formatMoney(earnedAmount)}</span> earned
        </span>
        <span>
          of <span className="font-semibold text-[#0A0A0A]">{formatMoney(goalAmount)}</span>
        </span>
        <span className="font-semibold text-[#0A0A0A]">
          {Math.round(percent)}% there
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="relative mt-2 h-3 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: TRACK_BG }}
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${countTypeLabel} progress toward monthly goal`}
      >
        <div
          className="oyrb-goal-bar-fill h-full rounded-full"
          style={{
            width: `${displayPercent}%`,
            background: FAVICON_GRADIENT,
          }}
        />
      </div>

      {/* Milestone message */}
      <p className="mt-3 text-xs text-[#525252]">{milestone}</p>

      {/* Footer meta */}
      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[#A3A3A3]">
        <span>
          Counting {countTypeLabel.toLowerCase()}
          {siteCount > 1 && ` · combined across ${siteCount} sites`}
        </span>
        <span>Resets {formatResetDate(resetsAt)}</span>
      </div>

      <style>{`
        .oyrb-goal-bar-fill {
          transition: width 600ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .oyrb-goal-bar-fill { transition: none; }
        }
      `}</style>
    </div>
  );
}
