"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { formatUnits } from "viem";
import leafImage from "@/public/leave.png";
import { platformAbi } from "@/lib/abi";
import { LockType } from "@/lib/config";
import { formatWorkingCapHeadroom, rankLabel, shortAddr, usd } from "@/lib/format";
import { VestingOptions } from "./vesting-options";
import {
  CAP_MULTIPLIER,
  DAY_SECONDS,
  MIN_WITHDRAWAL_USD,
  TOP_ID_DAILY_RATE,
  TOP_ID_KEEP_SHARE,
  boosterShare,
  cyclePosition,
  deltaBpsSinceCheckpoint,
  flexDailyBps,
  lockedDailyUsd,
  lockedGain,
  packageRates,
} from "@/lib/roi";
import type { PlatformAddresses, PlatformMarket, PlatformUser } from "@/lib/platform";
import type { NavTab } from "./header";
import { CardHeader, Notice, Pill, Row, Spinner, useTx } from "./ui";
import { useWallet } from "./wallet";
import { IncomeSubTabs, type IncomeSubTabId } from "./income-sub-tabs";
import {
  ArrowRight,
  Award,
  CardReceive,
  Cup,
  Flash,
  Hierarchy,
  Profile2User,
  SecuritySafe,
  Share,
  Timer,
  Wallet3,
} from "iconsax-react";

/**
 * Streams live ROI, Booster and Level income using the same schedules the contracts apply:
 * - Flexible ROI: 6 five-day slots per 30-day cycle, daily bps set by the active LHR tier,
 *   measured from the contract checkpoint (completed cycles / bps already credited).
 * - Locked ROI: 0.33% daily compounding on the growing balance, paid out at the 2.5x cap.
 * - Booster: 1/3, 2/3 or 3/3 of the flexible schedule on the first package amount.
 * - Top ID: linear 0.5%/day on topIdCurrentPrincipal (75% kept, 25% to partner pool), no packages.
 * Values are a pure function of time + the last on-chain snapshot, so polling never makes them jump.
 * The contract credits whole days; the ticker also shows today's in-progress fraction, while
 * `settledRoi` / `settledBooster` are exactly what withdrawROI / withdrawBooster would pay now.
 */
export function useLiveIncomeStreams(user?: PlatformUser, lhrTier = 0) {
  const isTopId = !!user?.isTopId;
  const [now, setNow] = useState<number>(() => Date.now());

  // Animation frame loop updating 'now'
  useEffect(() => {
    let animId: number;
    let last = Date.now();
    const update = () => {
      const cur = Date.now();
      if (cur - last >= 40) { // ~25 fps update for silky smooth live numbers
        setNow(cur);
        last = cur;
      }
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, []);

  const t = now / 1000;
  const toUsd = (v: bigint) => Number(formatUnits(v, 18));

  // 1. Package ROI
  let flexUnaccrued = 0;
  let flexSettled = 0;
  let roiPerSecUsd = 0;
  let liveLockedRoi = 0;
  let lockedPerSecUsd = 0;
  let flexElapsed: number | undefined;
  if (user && isTopId && user.topIdPrincipal > 0n && user.topIdLastCompoundedTime > 0) {
    const dailyUsd = toUsd(user.topIdPrincipal) * TOP_ID_DAILY_RATE * TOP_ID_KEEP_SHARE;
    const days = Math.max(0, t - user.topIdLastCompoundedTime) / DAY_SECONDS;
    flexUnaccrued = dailyUsd * days;
    flexSettled = dailyUsd * Math.floor(days);
    roiPerSecUsd = dailyUsd / DAY_SECONDS;
  }
  for (const pos of isTopId ? [] : user?.positions ?? []) {
    if (!pos.active || pos.isCapped) continue;
    const principal = toUsd(pos.initialPrincipal);

    if (pos.lockType === LockType.FLEXIBLE || pos.lockType === LockType.LOCKED_50) {
      const isHybrid = pos.lockType === LockType.LOCKED_50;
      const flexPrincipal = isHybrid ? principal / 2 : principal;
      // Hybrid flex half caps at 1.25x of the full principal (= 2.5x of its half)
      const room = Math.max(0, flexPrincipal * CAP_MULTIPLIER - toUsd(isHybrid ? pos.flexRoiAccrued : pos.roiAccrued));
      const cycleStart = user?.roiCycleStartTime || pos.createdAt;
      const elapsed = Math.max(0, t - cycleStart);
      flexElapsed ??= elapsed;
      const delta = (flexPrincipal * deltaBpsSinceCheckpoint(lhrTier, elapsed, pos.completedCycles, pos.lastAccruedCycleBps)) / 10_000;
      const settled = (flexPrincipal * deltaBpsSinceCheckpoint(lhrTier, elapsed, pos.completedCycles, pos.lastAccruedCycleBps, 1, false)) / 10_000;
      flexUnaccrued += Math.min(delta, room);
      flexSettled += Math.min(settled, room);
      if (delta < room) roiPerSecUsd += (flexPrincipal * flexDailyBps(lhrTier, elapsed)) / 10_000 / DAY_SECONDS;
    }

    if ((pos.lockType === LockType.LOCKED_100 || pos.lockType === LockType.LOCKED_50) && pos.lockedAt > 0) {
      const lockPrincipal = pos.lockType === LockType.LOCKED_50 ? principal / 2 : principal;
      const elapsed = Math.max(0, t - pos.lockedAt);
      liveLockedRoi += lockedGain(lockPrincipal, elapsed);
      lockedPerSecUsd += lockedDailyUsd(lockPrincipal, elapsed) / DAY_SECONDS;
    }
  }
  const liveRoi = toUsd(user?.roiIncomePending ?? 0n) + flexUnaccrued;
  const settledRoi = toUsd(user?.roiIncomePending ?? 0n) + flexSettled;

  // 2. Booster (Top ID ignores the LHR tier and the 1.0x / working caps)
  let boosterUnaccrued = 0;
  let boosterSettled = 0;
  let boosterPerSecUsd = 0;
  const share = boosterShare(user?.boosterTier ?? 0);
  if (user && share > 0 && !user.boosterCapReached && user.roiCycleStartTime > 0) {
    const tier = isTopId ? 0 : lhrTier;
    const base = toUsd(user.boosterFirstPackageAmount);
    const room = isTopId
      ? Infinity
      : Math.max(0, Math.min(base - toUsd(user.boosterAccrued), toUsd(user.workingCapHeadroom)));
    const elapsed = Math.max(0, t - user.roiCycleStartTime);
    const delta =
      (base * deltaBpsSinceCheckpoint(tier, elapsed, user.boosterCompletedCycles, user.boosterLastAccruedCycleBps, share)) / 10_000;
    const settled =
      (base * deltaBpsSinceCheckpoint(tier, elapsed, user.boosterCompletedCycles, user.boosterLastAccruedCycleBps, share, false)) / 10_000;
    boosterUnaccrued = Math.min(delta, room);
    boosterSettled = Math.min(settled, room);
    if (delta < room) boosterPerSecUsd = (base * flexDailyBps(tier, elapsed) * share) / 10_000 / DAY_SECONDS;
  }
  const liveBooster = toUsd(user?.boosterIncomePending ?? 0n) + boosterUnaccrued;
  const settledBooster = toUsd(user?.boosterIncomePending ?? 0n) + boosterSettled;

  // 3. Level income has no predictable stream: the contract credits it to the working balance
  // when downlines' ROI is accrued (and pauses it at the Rescue LHR tier), so show what is credited.
  const levelPerSecUsd = 0;
  const liveLevel = toUsd(user?.workingIncomePending ?? 0n);

  const position = flexElapsed !== undefined ? cyclePosition(flexElapsed) : undefined;
  // Booster runs on the same 30-day / 6-slot schedule, measured from roiCycleStartTime
  const boosterElapsed = user?.roiCycleStartTime ? Math.max(0, t - user.roiCycleStartTime) : undefined;
  const boosterPosition = boosterElapsed !== undefined ? cyclePosition(boosterElapsed) : undefined;
  const roiSchedule = {
    cycleDay: position ? position.day + 1 : undefined,
    slot: position ? position.slot + 1 : undefined,
    flexDailyPct: flexDailyBps(lhrTier, flexElapsed ?? 0) / 100,
    boosterCycleDay: boosterPosition ? boosterPosition.day + 1 : undefined,
    boosterSlot: boosterPosition ? boosterPosition.slot + 1 : undefined,
    boosterDailyPct: (flexDailyBps(isTopId ? 0 : lhrTier, boosterElapsed ?? 0) * share) / 100,
  };

  const totalLive = liveRoi + liveLockedRoi + liveBooster + liveLevel;
  const totalRatePerSec = roiPerSecUsd + lockedPerSecUsd + boosterPerSecUsd + levelPerSecUsd;

  return {
    liveRoi,
    settledRoi,
    settledBooster,
    liveLockedRoi,
    liveBooster,
    liveLevel,
    roiPerSecUsd,
    lockedPerSecUsd,
    boosterPerSecUsd,
    levelPerSecUsd,
    totalLive,
    totalRatePerSec,
    roiSchedule,
  };
}

/**
 * Live streaming number ticker with pulsing green micro-decimals
 */
export function LiveStreamTicker({
  value,
  ratePerSec,
  label,
  zeroRateMessage,
}: {
  value: number;
  ratePerSec: number;
  label?: string;
  zeroRateMessage?: string;
}) {
  const safeValue = Math.max(0, isNaN(value) ? 0 : value);
  const formatted = safeValue.toFixed(5);
  const [intStr, decStr = "00000"] = formatted.split(".");
  const integerPart = Number(intStr).toLocaleString();
  const cents = decStr.slice(0, 2);
  const micro = decStr.slice(2, 5);

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline font-mono tracking-tight tabular-nums select-none">
        <span className="text-3xl font-semibold text-white">
          ${integerPart}.{cents}
        </span>
        <span className="text-neon text-sm font-semibold tracking-normal ml-0.5 animate-pulse drop-shadow-[0_0_8px_rgba(31,224,58,0.5)]">
          {micro}
        </span>
      </div>

      {ratePerSec > 0 ? (
        <div className="flex items-center gap-1.5 mt-1 text-2xs">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-neon shadow-[0_0_6px_#1fe03a]" />
          </span>
          <span className="text-muted font-medium">
            Accruing at{" "}
            <strong className="text-neon-soft font-mono tabular-nums">
              +${(ratePerSec * 86400).toFixed(4)}
            </strong>{" "}
            / day
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mt-1 text-2xs text-muted">
          <span className="size-2 rounded-full bg-white/20" />
          <span>{zeroRateMessage ?? "Inactive · No accrual rate active"}</span>
        </div>
      )}
    </div>
  );
}

export function IncomesDashboard({
  user,
  addresses,
  market,
  onDone,
  isHome = false,
  onNavigateTab,
}: {
  user?: PlatformUser;
  addresses?: PlatformAddresses;
  market?: PlatformMarket;
  onDone: () => void;
  isHome?: boolean;
  onNavigateTab?: (tab: NavTab) => void;
}) {
  const { account, write } = useWallet();
  const tx = useTx(onDone);

  const [subTab, setSubTab] = useState<IncomeSubTabId>("all");
  const [vestingOption, setVestingOption] = useState<number>(0);

  // Real-time live streaming values grounded in on-chain parameters
  const isTopId = !!user?.isTopId;
  const lhrTier = market?.lhrTier ?? 0;
  const {
    liveRoi,
    settledRoi,
    settledBooster,
    liveLockedRoi,
    liveBooster,
    liveLevel,
    roiPerSecUsd,
    lockedPerSecUsd,
    boosterPerSecUsd,
    levelPerSecUsd,
    totalLive,
    totalRatePerSec,
    roiSchedule,
  } = useLiveIncomeStreams(user, lhrTier);
  const boosterTier = user?.boosterTier ?? 0;
  const boosterMonthlyPct = (packageRates(LockType.FLEXIBLE, isTopId ? 0 : lhrTier).monthlyPct * boosterShare(boosterTier));
  const hasLockedPositions = !!user?.positions.some((p) => p.active && !p.isCapped && p.lockType !== LockType.FLEXIBLE);

  // Complete on-chain total pending calculation including ALL income streams
  const totalPending = user
    ? user.roiIncomePending +
      user.boosterIncomePending +
      user.workingIncomePending +
      user.leaderIncomePending +
      user.pendingDirectBonusAvailable +
      user.pendingLeaderContestRewards +
      user.pendingContestRewards
    : 0n;

  // ROI / booster are settled by the contract inside withdrawROI / withdrawBooster, so count them as claimable
  const totalClaimableUsd = user
    ? Number(formatUnits(totalPending - user.roiIncomePending - user.boosterIncomePending, 18)) + settledRoi + settledBooster
    : 0;

  const totalWithdrawn = user
    ? user.roiIncomeWithdrawn +
      user.boosterIncomeWithdrawn +
      user.workingIncomeWithdrawn +
      user.leaderIncomeWithdrawn
    : 0n;

  async function callPlatform(label: string, fnName: string, args: readonly unknown[] = []) {
    if (!addresses || !account) return;
    await tx.run(
      label,
      async () => {
        return write({
          address: addresses.platform,
          abi: platformAbi,
          functionName: fnName,
          args,
        });
      },
      () => <span>Action completed successfully!</span>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Stat Ribbon with Live Streaming Summary */}
      <section className="card p-5 sm:p-6 border border-white/[0.08]" aria-label="Income overview">
        {tx.result && <div className="mb-4"><Notice tone={tx.result.tone}>{tx.result.text}</Notice></div>}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-neon shadow-[0_0_8px_#1fe03a]" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-neon">
                Decentralized Income Ecosystem
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <h2 className="text-3xl font-semibold text-white tracking-tight font-mono tabular-nums">
                ${totalLive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <span className="text-xs font-semibold text-muted">Total Live Accrued Income</span>
            </div>
          </div>

          {/* 24h Live Streaming Velocity */}
          <div className="well px-4 py-2.5 flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-xl bg-neon/15 text-neon">
              <Flash size={16} color="#1fe03a" variant="Bold" />
            </span>
            <div className="flex flex-col">
              <span className="text-2xs uppercase tracking-wider text-muted font-semibold">Streaming Velocity</span>
              <span className="text-xs font-semibold text-neon-soft font-mono tabular-nums">
                +${(totalRatePerSec * 86400).toFixed(2)} / 24h
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="well p-4">
            <div className="label">Ready to Claim</div>
            <div className="mt-1 text-xl font-semibold text-gradient text-neon-soft">
              {user ? `$${totalClaimableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
            </div>
          </div>
          <div className="well p-4">
            <div className="label">Direct Available & Locked</div>
            <div className="mt-1 flex flex-col">
              <span className="text-xl font-semibold text-white">
                {user ? usd(user.pendingDirectBonusAvailable) : "$0.00"}
              </span>
              <span className="text-2xs text-muted">
                Locked: {user ? usd(user.pendingDirectBonusLocked) : "$0.00"}
              </span>
            </div>
          </div>
          <div className="well p-4">
            <div className="label">Working Cap Headroom</div>
            <div className="mt-1 text-xl font-semibold text-text">
              {formatWorkingCapHeadroom(user)}
            </div>
          </div>
          <div className="well p-4">
            <div className="label">Lifetime Withdrawn</div>
            <div className="mt-1 text-xl font-semibold text-text">
              {user ? usd(totalWithdrawn) : "—"}
            </div>
          </div>
        </div>
      </section>

      {/* Sub-Tabs Category Filter */}
      <IncomeSubTabs activeTab={subTab} onChange={setSubTab} />

      {/* Income Streams Grid: ALL Income Cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 1. Daily Package ROI Yield (LIVE STREAMING) */}
        {(subTab === "all" || subTab === "roi") && (
          <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08] relative overflow-hidden">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={leafImage}
                title="1. Daily Package ROI"
                right={
                  <Pill tone="green">
                    {user && user.positions.filter((p) => p.active).length > 0
                      ? `${user.positions.filter((p) => p.active).length} Active`
                      : "Active Packages"}
                  </Pill>
                }
              />

              {/* LIVE STREAMING TICKER */}
              <div className="well p-4 flex flex-col justify-between gap-2 border border-neon/20 shadow-[0_0_15px_rgba(31,224,58,0.1)]">
                <div className="label">Live Streaming ROI Yield</div>
                <LiveStreamTicker
                  value={liveRoi + liveLockedRoi}
                  ratePerSec={roiPerSecUsd + lockedPerSecUsd}
                  label="Daily ROI"
                  zeroRateMessage="No active investment packages found"
                />
              </div>

              <div className="well p-3 flex flex-col gap-1 text-2xs">
                {isTopId && user && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Top ID ROI:</span>
                    <span className="font-medium text-text">
                      {(TOP_ID_DAILY_RATE * 100).toFixed(2)}%/day on {usd(user.topIdPrincipal)} · {TOP_ID_KEEP_SHARE * 100}% kept
                    </span>
                  </div>
                )}
                {!isTopId && roiSchedule.cycleDay !== undefined && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Flexible Cycle:</span>
                    <span className="font-medium text-text">
                      Day {roiSchedule.cycleDay}/30 · Slot {roiSchedule.slot}/6 · {roiSchedule.flexDailyPct.toFixed(2)}%/day
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-muted">{isTopId ? "Accrued (claimable):" : "Flexible (claimable):"}</span>
                  <span className="font-medium text-neon-soft font-mono tabular-nums">
                    ${liveRoi.toFixed(4)} · +${(roiPerSecUsd * DAY_SECONDS).toFixed(4)}/day
                  </span>
                </div>
                {hasLockedPositions && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Locked 0.33% compounding (paid at 2.5x):</span>
                    <span className="font-medium text-text font-mono tabular-nums">
                      ${liveLockedRoi.toFixed(4)} · +${(lockedPerSecUsd * DAY_SECONDS).toFixed(4)}/day
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="well p-3">
                  <div className="label">Claimable Now</div>
                  <div className="text-sm font-semibold text-neon-soft">
                    {user ? `$${settledRoi.toFixed(2)}` : "—"}
                  </div>
                </div>
                <div className="well p-3">
                  <div className="label">Total ROI Withdrawn</div>
                  <div className="text-sm font-semibold text-text">
                    {user ? usd(user.roiIncomeWithdrawn) : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-white/[0.04]">
              {isHome ? (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.("withdraw")}
                    className="btn btn-secondary flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-neon/40"
                  >
                    <span>Claim in Portal</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={!user || !!tx.busy}
                    onClick={() => account && callPlatform("Accruing ROI...", "accrueUserROI", [account])}
                    className="btn btn-secondary py-2.5 px-3 text-xs"
                    title="Settle accrued ROI and booster into your contract balance"
                  >
                    Accrue All
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!user || settledRoi < MIN_WITHDRAWAL_USD || !!tx.busy}
                    onClick={() => callPlatform("Claiming ROI Income...", "withdrawROI")}
                    className="btn btn-primary flex-1 py-2.5 text-xs"
                  >
                    {tx.busy === "Claiming ROI Income..." ? <Spinner /> : "Claim ROI Income"}
                  </button>
                  <button
                    type="button"
                    disabled={!user || !!tx.busy}
                    onClick={() => account && callPlatform("Accruing ROI...", "accrueUserROI", [account])}
                    className="btn btn-secondary py-2.5 px-3 text-xs"
                    title="Settle accrued ROI and booster into your contract balance"
                  >
                    Accrue All
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {/* 2. Daily Booster Income (LIVE STREAMING) */}
        {(subTab === "all" || subTab === "booster") && (
          <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08] relative overflow-hidden">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={leafImage}
                title="2. Daily Booster Income"
                right={
                  <Pill tone={boosterTier > 0 ? "gold" : "neutral"}>
                    Tier {boosterTier} · {boosterTier > 0 ? `${boosterMonthlyPct.toFixed(2)}%/mo` : "Inactive"}
                  </Pill>
                }
              />

              {/* LIVE STREAMING TICKER */}
              <div className="well p-4 flex flex-col justify-between gap-2 border border-neon/20 shadow-[0_0_15px_rgba(31,224,58,0.1)]">
                <div className="label">Live Streaming Booster Yield</div>
                <LiveStreamTicker
                  value={liveBooster}
                  ratePerSec={boosterPerSecUsd}
                  label="Booster"
                  zeroRateMessage={
                    boosterTier === 0
                      ? "Tier 0 (Inactive) · Qualify directs to unlock 1/3 of the ROI schedule"
                      : user?.boosterCapReached
                      ? "Booster capped at 1.0x of first package"
                      : "Booster Inactive · Sponsor direct volume to unlock"
                  }
                />
              </div>

              {boosterTier > 0 && (
                <div className="well p-3 flex flex-col gap-1 text-2xs">
                  {roiSchedule.boosterCycleDay !== undefined && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted">Booster Cycle:</span>
                      <span className="font-medium text-text">
                        Day {roiSchedule.boosterCycleDay}/30 · Slot {roiSchedule.boosterSlot}/6 ·{" "}
                        {roiSchedule.boosterDailyPct.toFixed(3)}%/day
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Schedule:</span>
                    <span className="font-medium text-text">
                      {boosterTier >= 3 ? "Full" : `${boosterTier}/3 of`} slot rate on first package
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Today:</span>
                    <span className="font-medium text-neon-soft font-mono tabular-nums">
                      +${(boosterPerSecUsd * DAY_SECONDS).toFixed(4)}/day
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="well p-3">
                  <div className="label">Claimable Now</div>
                  <div className="text-sm font-semibold text-neon-soft">
                    {user ? `$${settledBooster.toFixed(2)}` : "—"}
                  </div>
                </div>
                <div className="well p-3">
                  <div className="label">Total Withdrawn</div>
                  <div className="text-sm font-semibold text-text">
                    {user ? usd(user.boosterIncomeWithdrawn) : "—"}
                  </div>
                </div>
              </div>

              <div className="well p-3 flex flex-col gap-1 text-2xs">
                <div className="flex justify-between">
                  <span className="text-muted">Direct Business Progress:</span>
                  <span className="font-medium text-text">{user ? usd(user.totalDirectBusiness) : "$0"}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.04]">
              {isHome ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab?.("withdraw")}
                  className="btn btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-neon/40"
                >
                  <span>Claim in Portal</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!user || settledBooster < MIN_WITHDRAWAL_USD || !!tx.busy}
                  onClick={() => callPlatform("Claiming Booster Income...", "withdrawBooster")}
                  className="btn btn-primary w-full py-2.5 text-xs font-semibold"
                >
                  {tx.busy === "Claiming Booster Income..." ? <Spinner /> : "Claim Booster Income"}
                </button>
              )}
            </div>
          </section>
        )}

        {/* 3. Downline Level Harvest / Level Income (LIVE STREAMING) */}
        {(subTab === "all" || subTab === "level") && (
          <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08] relative overflow-hidden">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={leafImage}
                title="3. Downline Level Harvest"
                right={<Pill tone="cyan">Team Unilevel</Pill>}
              />

              {/* LIVE STREAMING TICKER */}
              <div className="well p-4 flex flex-col justify-between gap-2 border border-neon/20 shadow-[0_0_15px_rgba(31,224,58,0.1)]">
                <div className="label">Credited Level Income</div>
                <LiveStreamTicker
                  value={liveLevel}
                  ratePerSec={levelPerSecUsd}
                  label="Level Matching"
                  zeroRateMessage="Credited to your working balance when downlines' ROI is accrued"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="well p-3">
                  <div className="label">Working Balance</div>
                  <div className="text-sm font-semibold text-neon-soft">
                    {user ? usd(user.workingIncomePending) : "—"}
                  </div>
                </div>
                <div className="well p-3">
                  <div className="label">Total Team Volume</div>
                  <div className="text-sm font-semibold text-text">
                    {user ? usd(user.totalTeamBusiness) : "$0"}
                  </div>
                </div>
              </div>

              <div className="well p-3.5 flex flex-col gap-2">
                <Row
                  label="Direct Downlines Count"
                  value={`${user?.activeDirectCount ?? 0} active sponsors`}
                />
                <Row
                  label="Total Team Volume"
                  value={user ? usd(user.totalTeamBusiness) : "$0"}
                  accent
                />
                <Row
                  label="Power Leg Volume"
                  value={user ? usd(user.powerLegBusiness) : "$0"}
                />
                <Row
                  label="Weaker Legs Volume"
                  value={user ? usd(user.weakerLegBusiness) : "$0"}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.04]">
              {isHome ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.("withdraw")}
                    className="btn btn-secondary flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-neon/40"
                  >
                    <span>Claim in Portal</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={!user || !!tx.busy}
                    onClick={() => callPlatform("Claiming Level Income...", "harvestLevelIncome")}
                    className="btn btn-primary py-2.5 px-3 text-xs font-semibold"
                  >
                    {tx.busy === "Claiming Level Income..." ? <Spinner /> : "Claim Level Income"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!user || !!tx.busy}
                  onClick={() => callPlatform("Claiming Level Income...", "harvestLevelIncome")}
                  className="btn btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {tx.busy === "Claiming Level Income..." ? (
                    <Spinner />
                  ) : (
                    <>
                      <Hierarchy size={16} />
                      <span>Claim Level Income</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </section>
        )}

        {/* 4. Working Income & Cap Headroom */}
        {(subTab === "all" || subTab === "working") && (
          <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08]">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={leafImage}
                title="4. Working Income Payout"
                right={<Pill tone="green">Ready</Pill>}
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="well p-3">
                  <div className="label">Working Balance</div>
                  <div className="text-base font-semibold text-neon-soft">
                    {user ? usd(user.workingIncomePending) : "—"}
                  </div>
                </div>
                <div className="well p-3">
                  <div className="label">Headroom Left</div>
                  <div className="text-base font-semibold text-text">
                    {formatWorkingCapHeadroom(user)}
                  </div>
                </div>
              </div>

              <VestingOptions
                value={vestingOption}
                onChange={setVestingOption}
                amountUsd={user ? Number(formatUnits(user.workingIncomePending, 18)) : 0}
              />
            </div>

            <div className="pt-3 border-t border-white/[0.04]">
              {isHome ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab?.("withdraw")}
                  className="btn btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-neon/40"
                >
                  <span>Claim in Portal</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!user || Number(formatUnits(user.workingIncomePending, 18)) < MIN_WITHDRAWAL_USD || !!tx.busy}
                  onClick={() => {
                    const amt = user ? user.workingIncomePending : 0n;
                    callPlatform("Claiming Working Income...", "withdrawWorkingIncome", [amt, vestingOption]);
                  }}
                  className="btn btn-primary w-full py-2.5 text-xs font-semibold"
                >
                  {tx.busy === "Claiming Working Income..." ? (
                    <Spinner />
                  ) : (
                    `Claim Working Income (${user ? usd(user.workingIncomePending) : "$0"})`
                  )}
                </button>
              )}
            </div>
          </section>
        )}

        {/* 5. Direct Referral Income & Direct Lock-In */}
        {(subTab === "all" || subTab === "direct") && (
          <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08]">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={leafImage}
                title="5. Direct Referral Income & Lock-In"
                right={<Pill tone="gold">Direct Slips</Pill>}
              />
              <p className="text-xs text-muted leading-relaxed">
                Referral bonuses earned directly from sponsored downlines. Available slips can be unlocked, while locked slips mature over time.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div className="well p-3">
                  <div className="label">Direct Available to Unlock</div>
                  <div className="text-base font-semibold text-neon-soft">
                    {user ? usd(user.pendingDirectBonusAvailable) : "$0.00"}
                  </div>
                </div>
                <div className="well p-3">
                  <div className="label">Direct Lock-In (Locked Slips)</div>
                  <div className="text-base font-semibold text-amber-400">
                    {user ? usd(user.pendingDirectBonusLocked) : "$0.00"}
                  </div>
                </div>
              </div>

              <div className="well p-3.5 flex flex-col gap-2">
                <Row
                  label="Direct Downlines Count"
                  value={`${user?.activeDirectCount ?? 0} direct sponsors`}
                />
                <Row
                  label="Total Direct Business Volume"
                  value={user ? usd(user.totalDirectBusiness) : "$0.00"}
                  accent
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.04]">
              {isHome ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab?.("team")}
                  className="btn btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-neon/40"
                >
                  <span>View Referral Team</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateTab?.("team")}
                  className="btn btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-neon/40"
                >
                  <span>Manage Direct Network</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </section>
        )}

        {/* 6. Leader Income (Business Development Fund / BDF) */}
        {(subTab === "all" || subTab === "leader") && (
          <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08]">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={leafImage}
                title="6. Leader Income (Business Dev Fund)"
                right={<Pill tone="cyan">BDF Pool</Pill>}
              />
              <p className="text-xs text-muted leading-relaxed">
                Business Development Fund (BDF) allocation distributed to qualifying network leaders, regional coordinators, and community ambassadors.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div className="well p-3">
                  <div className="label">Available Leader / BDF Balance</div>
                  <div className="text-base font-semibold text-neon-soft">
                    {user ? usd(user.leaderIncomePending) : "$0.00"}
                  </div>
                </div>
                <div className="well p-3">
                  <div className="label">Lifetime BDF Withdrawn</div>
                  <div className="text-base font-semibold text-text">
                    {user ? usd(user.leaderIncomeWithdrawn) : "$0.00"}
                  </div>
                </div>
              </div>

              <div className="well p-3.5 flex flex-col gap-2">
                <Row
                  label="Leader Status"
                  value={user && user.usedLeader && user.usedLeader !== "0x0000000000000000000000000000000000000000" ? `Leader: ${shortAddr(user.usedLeader)}` : "No leader code used"}
                  accent
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.04]">
              {isHome ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab?.("withdraw")}
                  className="btn btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-neon/40"
                >
                  <span>Claim in Portal</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!user || user.leaderIncomePending === 0n || !!tx.busy}
                  onClick={() => callPlatform("Claiming Leader Income...", "withdrawLeaderIncome")}
                  className="btn btn-primary w-full py-2.5 text-xs font-semibold"
                >
                  {tx.busy === "Claiming Leader Income..." ? (
                    <Spinner />
                  ) : (
                    `Claim Leader Income (${user ? usd(user.leaderIncomePending) : "$0.00"})`
                  )}
                </button>
              )}
            </div>
          </section>
        )}

        {/* 7. Rank Career Salary */}
        {(subTab === "all" || subTab === "rank") && (
          <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08]">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={leafImage}
                title="7. Rank Salary & Career Overrides"
                right={<Pill tone="gold">{rankLabel(user?.currentRank)}</Pill>}
              />
              <p className="text-xs text-muted leading-relaxed">
                Weekly salary for qualifying career ranks (Rank 1 to Rank 15), based on your team leg business.
              </p>

              <div className="well p-3.5 flex flex-col gap-2">
                <Row
                  label="Current Career Rank"
                  value={rankLabel(user?.currentRank)}
                  accent
                />
                <Row
                  label="Team Leg Balance"
                  value={`${user ? usd(user.powerLegBusiness) : "$0"} (Power) / ${user ? usd(user.weakerLegBusiness) : "$0"} (Weaker)`}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.04]">
              <button
                type="button"
                disabled={!user || !!tx.busy}
                onClick={() => callPlatform("Claiming Rank Salary Income...", "claimWeeklySalaryBonus")}
                className="btn btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                {tx.busy === "Claiming Rank Salary Income..." ? <Spinner /> : "Claim Rank Salary Income"}
              </button>
            </div>
          </section>
        )}

        {/* 8. Daily Sponsor Price Contest */}
        {(subTab === "all" || subTab === "contests") && (
          <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08]">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={leafImage}
                title="8. Daily Sponsor Price Contest"
                right={<Pill tone="green">Sponsor Pool</Pill>}
              />
              <p className="text-xs text-muted leading-relaxed">
                Daily prize contest distributed to top personal direct volume sponsors across each 24-hour cycle.
              </p>

              <div className="well p-3.5 flex items-center justify-between">
                <div>
                  <div className="label">Claimable Sponsor Contest</div>
                  <div className="text-xl font-semibold text-neon-soft">
                    {user ? usd(user.pendingContestRewards) : "$0.00"}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xs text-muted block">History Window</span>
                  <span className="text-xs font-semibold text-white">Up to 150 Days</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.04]">
              <button
                type="button"
                disabled={!user || user.pendingContestRewards === 0n || !!tx.busy}
                onClick={() => callPlatform("Claiming Contest Income...", "sweepContestRewards", [150n])}
                className="btn btn-primary w-full py-2.5 text-xs font-semibold"
              >
                {tx.busy === "Claiming Contest Income..." ? <Spinner /> : "Claim Contest Income"}
              </button>
            </div>
          </section>
        )}

        {/* 9. Leader Prize Contest */}
        {(subTab === "all" || subTab === "contests") && (
          <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08]">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={leafImage}
                title="9. Leader Prize Contest"
                right={<Pill tone="gold">Leader Pool</Pill>}
              />
              <p className="text-xs text-muted leading-relaxed">
                Daily contest prize pool allocated exclusively to top branch generation leaders and community builders.
              </p>

              <div className="well p-3.5 flex items-center justify-between">
                <div>
                  <div className="label">Claimable Leader Prize</div>
                  <div className="text-xl font-semibold text-neon-soft">
                    {user ? usd(user.pendingLeaderContestRewards) : "$0.00"}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xs text-muted block">History Window</span>
                  <span className="text-xs font-semibold text-white">Up to 50 Days</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.04]">
              <button
                type="button"
                disabled={!user || user.pendingLeaderContestRewards === 0n || !!tx.busy}
                onClick={() => callPlatform("Claiming Leader Contest Income...", "sweepLeaderContestRewards", [50n])}
                className="btn btn-secondary w-full py-2.5 text-xs font-semibold"
              >
                {tx.busy === "Claiming Leader Contest Income..." ? <Spinner /> : "Claim Leader Contest Income"}
              </button>
            </div>
          </section>
        )}

        {/* 10. Protocol Reward Pool & Backing Horizon */}
        {(subTab === "all" || subTab === "rewardPool") && (
          <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08] lg:col-span-2">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={leafImage}
                title="10. Protocol Reward Pool & Backing Horizon"
              />
              <p className="text-xs text-muted leading-relaxed">
                Withdrawal pool fees are split 70% Neon / 20% Hydra / 10% Genosis. Each pool auto-distributes to top leaders once it reaches its threshold.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="well p-3.5">
                  <div className="label">Reward Pool Balance</div>
                  <div className="mt-1 text-xl font-semibold text-neon-soft">
                    {usd(market?.rewardPoolBalance ?? 0n)}
                  </div>
                  <span className="text-2xs text-muted">
                    Unclaimed liabilities: {usd(market?.rewardPoolLiabilities ?? 0n)}
                  </span>
                </div>
                <div className="well p-3.5">
                  <div className="label">Pool Ledger Contract</div>
                  <div className="mt-1 text-sm font-mono font-semibold text-white">
                    {market?.rewardPoolEngine ? shortAddr(market.rewardPoolEngine) : "—"}
                  </div>
                  <span className="text-2xs text-muted">
                    Lifetime routed: {usd(market?.rewardPoolAccumulated ?? 0n)}
                  </span>
                </div>
                <div className="well p-3.5">
                  <div className="label">Total Platform Active Deposit</div>
                  <div className="mt-1 text-xl font-semibold text-white">
                    {market?.totalPlatformActiveDeposit !== undefined ? usd(market.totalPlatformActiveDeposit) : "—"}
                  </div>
                  <span className="text-2xs text-muted">Global Staked Principal</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    ["Neon (70%)", market?.rewardPools.neon ?? 0n, 5_000n],
                    ["Hydra (20%)", market?.rewardPools.hydra ?? 0n, 10_000n],
                    ["Genosis (10%)", market?.rewardPools.genosis ?? 0n, 20_000n],
                  ] as const
                ).map(([name, balance, threshold]) => (
                  <div key={name} className="well p-3 flex justify-between gap-2 text-2xs">
                    <span className="text-muted">{name}</span>
                    <span className="font-medium text-text font-mono tabular-nums">
                      {usd(balance)} / {usd(threshold * 10n ** 18n)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
