"use client";

import { formatUnits } from "viem";
import { ArrowRight } from "iconsax-react";
import type { PlatformUser } from "@/lib/platform";
import { POWER_LEG_SHARE, WEAKER_LEGS_SHARE, rankTeamRequirementUsd, targetRank } from "@/lib/rank";
import type { NavTab } from "./header";

const usdFull = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function usdCompact(v: number) {
  if (v >= 1e6) return `$${+(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${+(v / 1e3).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

const pct = (value: number, of: number) => (of > 0 ? Math.min(100, Math.floor((value / of) * 100)) : 0);

export function RankBusinessCard({
  user,
  onNavigateTab,
}: {
  user?: PlatformUser;
  onNavigateTab?: (tab: NavTab) => void;
}) {
  const rank = targetRank(user?.currentRank ?? 0);
  const required = rankTeamRequirementUsd(rank);
  const weakerCap = required * WEAKER_LEGS_SHARE;
  const powerCap = required * POWER_LEG_SHARE;

  const weaker = user ? Number(formatUnits(user.weakerLegBusiness, 18)) : 0;
  const power = user ? Number(formatUnits(user.powerLegBusiness, 18)) : 0;
  // Mirrors the contract: the power leg only counts up to 40% of the requirement.
  const powerCounted = Math.min(power, powerCap);
  const counted = weaker + powerCounted;

  const segments = [
    { name: "Weaker legs", share: "60%", value: weaker, cap: weakerCap, ratio: WEAKER_LEGS_SHARE, color: "#1fe03a" },
    { name: "Power leg", share: "40%", value: powerCounted, cap: powerCap, ratio: POWER_LEG_SHARE, color: "#f5b83d" },
  ];

  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-5" aria-label="Business for rank activation">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-text">Rank activation</h3>
        <button
          type="button"
          onClick={() => onNavigateTab?.("team")}
          aria-label="Open team"
          className="flex size-9 items-center justify-center rounded-full border border-white/15 text-muted transition hover:border-neon/50 hover:text-neon cursor-pointer"
        >
          <ArrowRight size={16} color="currentColor" className="-rotate-45" />
        </button>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-semibold text-white">{user ? usdFull(counted) : "—"}</span>
        <span className="text-xs text-muted">
          of {usdFull(required)} for Rank {rank}
        </span>
      </div>

      {/* 60:40 bar: weaker legs take 60% of the width, the power leg 40% */}
      <div className="flex h-12 gap-2">
        {segments.map((seg) => (
          <div
            key={seg.name}
            className="relative overflow-hidden rounded-xl bg-white/[0.06]"
            style={{ width: `${seg.ratio * 100}%` }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-xl transition-all duration-500"
              style={{ width: `${pct(seg.value, seg.cap)}%`, background: seg.color }}
            />
          </div>
        ))}
      </div>

      <dl className="flex flex-col">
        {segments.map((seg) => (
          <div
            key={seg.name}
            className="flex items-center gap-3 border-t border-white/[0.08] py-3 text-sm first:border-t-0"
          >
            <span className="size-3 shrink-0 rounded-full" style={{ background: seg.color }} />
            <dt className="min-w-0 flex-1 truncate text-white">
              {seg.name} <span className="text-muted">{seg.share}</span>
            </dt>
            <dd className="shrink-0 font-semibold text-white">
              {usdCompact(seg.value)}
              <span className="font-normal text-muted"> / {usdCompact(seg.cap)}</span>
            </dd>
            <dd className="w-10 shrink-0 text-right text-muted">{pct(seg.value, seg.cap)}%</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
