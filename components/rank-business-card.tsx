"use client";

import { formatUnits } from "viem";
import { ArrowRight } from "iconsax-react";
import type { PlatformUser } from "@/lib/platform";
import { POWER_LEG_SHARE, WEAKER_LEGS_SHARE, targetRank } from "@/lib/rank";
import type { NavTab } from "./header";

const usdFull = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function usdCompact(v: number) {
  if (v >= 1e6) return `$${+(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${+(v / 1e3).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

const usd = (v?: bigint) => (v === undefined ? 0 : Number(formatUnits(v, 18)));

const pct = (value: number, of: number) => (of > 0 ? Math.min(100, Math.floor((value / of) * 100)) : 0);

export function RankBusinessCard({
  user,
  onNavigateTab,
}: {
  user?: PlatformUser;
  onNavigateTab?: (tab: NavTab) => void;
}) {
  const rank = targetRank(user?.currentRank ?? 0);
  // Conditions come live from the team engine; until they load (or if the read fails) the caps show "—".
  const req = user?.rankRequirement;
  const hasReq = !!req;
  const required = usd(req?.teamBusiness);
  const weakerCap = required * WEAKER_LEGS_SHARE;
  const powerCap = required * POWER_LEG_SHARE;

  const isTopId = !!user?.isTopId;
  const weaker = user ? Number(formatUnits(user.weakerLegBusiness, 18)) : 0;
  const power = user ? Number(formatUnits(user.powerLegBusiness, 18)) : 0;
  // Mirrors the contract: the power leg only counts up to 40% of the requirement. The Top ID has no
  // 60:40 rule, so all of its team business counts.
  const powerCounted = isTopId ? power : Math.min(power, powerCap);
  const counted = weaker + powerCounted;

  // Other requirements, which the Top ID is exempt from.
  const selfStake = user ? Number(formatUnits(user.activeDeposit, 18)) : 0;
  const directBiz = user ? Number(formatUnits(user.activeDirectBusiness, 18)) : 0;
  const extras = isTopId
    ? []
    : [
        { name: "Own active stake", value: selfStake, cap: usd(req?.selfStake) },
        { name: "Active direct business", value: directBiz, cap: usd(req?.directBusiness) },
      ];

  const segments = [
    { name: "Weaker legs", share: "60%", value: weaker, cap: weakerCap, ratio: WEAKER_LEGS_SHARE, color: "linear-gradient(to bottom, #3bf857, #0a7a24)" },
    { name: "Power leg", share: "40%", value: powerCounted, cap: powerCap, ratio: POWER_LEG_SHARE, color: "linear-gradient(to bottom, #ffd166, #e8590c)" },
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
          of {hasReq ? usdFull(required) : "—"} for Rank {rank}
        </span>
      </div>

      {isTopId ? (
        <>
          {/* Top ID: team business only, no 60:40 split */}
          <div className="relative h-12 overflow-hidden rounded-xl bg-white/[0.06]">
            <div
              className="absolute inset-y-0 left-0 rounded-xl transition-all duration-500"
              style={{
                width: `${pct(counted, required)}%`,
                background: "linear-gradient(to bottom, #3bf857, #0a7a24)",
              }}
            />
          </div>
          <p className="text-xs text-muted">
            Top ID ranks activate on total team business alone: no 60:40 split, own stake or direct business needed.
          </p>
        </>
      ) : (
        <>
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
              <span className="font-normal text-muted"> / {hasReq ? usdCompact(seg.cap) : "—"}</span>
            </dd>
            <dd className="w-10 shrink-0 text-right text-muted">{pct(seg.value, seg.cap)}%</dd>
          </div>
        ))}
      </dl>

      {extras.length > 0 && (
        <dl className="flex flex-col">
          {extras.map((row) => (
            <div
              key={row.name}
              className="flex items-center gap-3 border-t border-white/[0.08] py-3 text-sm first:border-t-0"
            >
              <dt className="min-w-0 flex-1 truncate text-white">{row.name}</dt>
              <dd className="shrink-0 font-semibold text-white">
                {usdCompact(row.value)}
                <span className="font-normal text-muted"> / {hasReq ? usdCompact(row.cap) : "—"}</span>
              </dd>
              <dd className="w-10 shrink-0 text-right text-muted">{pct(row.value, row.cap)}%</dd>
            </div>
          ))}
        </dl>
      )}
        </>
      )}
    </section>
  );
}
