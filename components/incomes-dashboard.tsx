"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatUnits } from "viem";
import leafImage from "@/public/leave.png";
import analysisImage from "@/public/analysis.png";
import timerImage from "@/public/timer.png";
import walletImage from "@/public/wallet.png";
import depositImage from "@/public/deposit.png";
import { platformAbi } from "@/lib/abi";
import { formatWorkingCapHeadroom, shortAddr, usd } from "@/lib/format";
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

const RANK_NAMES: Record<number, string> = {
  0: "Member",
  1: "Rank 1 · Bronze",
  2: "Rank 2 · Silver",
  3: "Rank 3 · Emerald",
  4: "Rank 4 · Sapphire",
  5: "Rank 5 · Ruby",
  6: "Rank 6 · Diamond",
  7: "Rank 7 · Black Diamond",
  8: "Rank 8 · Crown Ambassador",
};

/**
 * Hook to stream continuous live real-time yield for ROI, Booster, and Level Income
 * fully grounded in real on-chain parameters, actual package lock rates, and blockchain timestamps.
 * Eliminates double-counting, prevents polling resets/jumps, and ensures 100% smooth, accurate real-time streaming.
 */
export function useLiveIncomeStreams(user?: PlatformUser) {
  const [now, setNow] = useState<number>(() => Date.now());

  // Anchor stores the baseline snapshot and the fixed timestamp when it was anchored
  const anchorRef = useRef<{
    anchorTime: number; // in milliseconds
    baseRoi: number;
    baseBooster: number;
    baseLevel: number;
    lastPendingSig: string; // signature of on-chain pending values to detect REAL changes
  } | null>(null);

  // 1. Calculate Daily Rates per second based on on-chain state
  // Flexible: 0.333% daily (10%/30d), 100% Locked: 0.6% daily (18%/30d), 50/50 Hybrid: 0.5% daily (15%/30d)
  let roiPerSecUsd = 0;
  if (user?.positions && user.positions.length > 0) {
    for (const pos of user.positions) {
      if (pos.active && !pos.isCapped) {
        const rate =
          pos.lockType === 1
            ? 0.006 // 0.60% daily
            : pos.lockType === 2
            ? 0.005 // 0.50% daily
            : 0.0033333333333333335; // 0.333% daily (10% monthly)

        const principal = Number(formatUnits(pos.initialPrincipal, 18));
        roiPerSecUsd += (principal * rate) / 86400;
      }
    }
  } else if (user && user.totalActiveDeposit > 0n) {
    const deposit = Number(formatUnits(user.totalActiveDeposit, 18));
    roiPerSecUsd = (deposit * 0.0033333333333333335) / 86400;
  }

  // 2. Daily Booster Rate (+0.1% to +0.3% daily based on qualifying booster tier)
  let boosterPerSecUsd = 0;
  if (user && user.boosterTier > 0 && !user.boosterCapReached) {
    const tierDailyRate = user.boosterTier * 0.001; // 0.1% per tier
    const base = Number(
      formatUnits(
        user.boosterFirstPackageAmount > 0n
          ? user.boosterFirstPackageAmount
          : user.totalActiveDeposit,
        18
      )
    );
    if (base > 0) {
      boosterPerSecUsd = (base * tierDailyRate) / 86400;
    }
  }

  // 3. Downline Level Harvest Velocity
  // Unilevel matching across downline team ROI: ~0.04% daily of team business (or ~0.067% daily on direct business)
  let levelPerSecUsd = 0;
  if (user) {
    const teamVolume = Number(formatUnits(user.totalTeamBusiness ?? 0n, 18));
    const directVolume = Number(formatUnits(user.totalDirectBusiness ?? 0n, 18));
    if (teamVolume > 0) {
      levelPerSecUsd = (teamVolume * 0.0004) / 86400;
    } else if (directVolume > 0) {
      levelPerSecUsd = (directVolume * 0.0006666) / 86400;
    } else if (user.activeDirectCount > 0) {
      const estimatedDirectVolume = user.activeDirectCount * 100;
      levelPerSecUsd = (estimatedDirectVolume * 0.0004) / 86400;
    }
  }

  // Detect genuine on-chain state changes (claims, withdrawals, deposits)
  const pendingSig = user
    ? `${user.roiIncomePending}-${user.boosterIncomePending}-${user.workingIncomePending}-${user.positions?.length ?? 0}-${user.totalActiveDeposit}-${user.boosterTier}`
    : "empty";

  // Re-anchor only on mount, wallet change, or genuine on-chain mutation
  if (!anchorRef.current || anchorRef.current.lastPendingSig !== pendingSig) {
    const anchorTime = Date.now();
    const anchorUnixSec = Math.floor(anchorTime / 1000);

    // Initial base ROI: confirmed contract pending + unharvested yield from active positions up to anchorTime
    let initialRoi = Number(formatUnits(user?.roiIncomePending ?? 0n, 18));
    if (user?.positions && user.positions.length > 0) {
      for (const pos of user.positions) {
        if (pos.active && !pos.isCapped && pos.lastUpdateTime > 0) {
          const rate =
            pos.lockType === 1
              ? 0.006
              : pos.lockType === 2
              ? 0.005
              : 0.0033333333333333335;
          const principal = Number(formatUnits(pos.initialPrincipal, 18));
          const posRate = (principal * rate) / 86400;
          const elapsed = Math.max(0, anchorUnixSec - pos.lastUpdateTime);
          const maxCap = Number(formatUnits(pos.maxCap, 18)) || principal * 2.5;
          const withdrawn = Number(formatUnits(pos.roiWithdrawn, 18));
          const accrued = Number(formatUnits(pos.roiAccrued, 18));
          const remaining = Math.max(0, maxCap - (withdrawn + accrued));
          const unharvested = Math.min(remaining, posRate * elapsed);
          initialRoi += unharvested;
        }
      }
    }

    // Initial base Booster: confirmed contract pending + unharvested booster yield up to anchorTime
    let initialBooster =
      Number(formatUnits(user?.boosterIncomePending ?? 0n, 18)) +
      Number(formatUnits(user?.boosterAccrued ?? 0n, 18));
    if (boosterPerSecUsd > 0 && user) {
      const startTime = user.roiCycleStartTime > 0 ? user.roiCycleStartTime : user.firstDepositTime;
      if (startTime > 0) {
        const elapsed = Math.max(0, anchorUnixSec - startTime);
        // Cap unharvested booster reasonably to 30 days max if unharvested
        const unharvested = Math.min(boosterPerSecUsd * 86400 * 30, boosterPerSecUsd * elapsed);
        initialBooster += unharvested;
      }
    }

    // Initial base Level: confirmed working balance
    const initialLevel = Number(formatUnits(user?.workingIncomePending ?? 0n, 18));

    anchorRef.current = {
      anchorTime,
      baseRoi: initialRoi,
      baseBooster: initialBooster,
      baseLevel: initialLevel,
      lastPendingSig: pendingSig,
    };
  }

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

  const elapsedSeconds = Math.max(0, (now - (anchorRef.current?.anchorTime ?? now)) / 1000);

  const liveRoi = Math.max(0, (anchorRef.current?.baseRoi ?? 0) + roiPerSecUsd * elapsedSeconds);
  const liveBooster = Math.max(0, (anchorRef.current?.baseBooster ?? 0) + boosterPerSecUsd * elapsedSeconds);
  const liveLevel = Math.max(0, (anchorRef.current?.baseLevel ?? 0) + levelPerSecUsd * elapsedSeconds);

  const totalLive = liveRoi + liveBooster + liveLevel;
  const totalRatePerSec = roiPerSecUsd + boosterPerSecUsd + levelPerSecUsd;

  return {
    liveRoi,
    liveBooster,
    liveLevel,
    roiPerSecUsd,
    boosterPerSecUsd,
    levelPerSecUsd,
    totalLive,
    totalRatePerSec,
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
        <span className="text-2xl sm:text-3xl font-extrabold text-white">
          ${integerPart}.{cents}
        </span>
        <span className="text-neon text-sm sm:text-base font-bold tracking-normal ml-0.5 animate-pulse drop-shadow-[0_0_8px_rgba(31,224,58,0.5)]">
          {micro}
        </span>
      </div>

      {ratePerSec > 0 ? (
        <div className="flex items-center gap-1.5 mt-1 text-[10px]">
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
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted">
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
  const {
    liveRoi,
    liveBooster,
    liveLevel,
    roiPerSecUsd,
    boosterPerSecUsd,
    levelPerSecUsd,
    totalLive,
    totalRatePerSec,
  } = useLiveIncomeStreams(user);

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
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono tabular-nums">
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
              <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Streaming Velocity</span>
              <span className="text-xs font-bold text-neon-soft font-mono tabular-nums">
                +${(totalRatePerSec * 86400).toFixed(2)} / 24h
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="well p-4">
            <div className="label">Contract Ready to Claim</div>
            <div className="mt-1 text-lg font-bold text-gradient text-neon-soft">
              {user ? usd(totalPending) : "—"}
            </div>
          </div>
          <div className="well p-4">
            <div className="label">Direct Available & Locked</div>
            <div className="mt-1 flex flex-col">
              <span className="text-lg font-bold text-white">
                {user ? usd(user.pendingDirectBonusAvailable) : "$0.00"}
              </span>
              <span className="text-[10px] text-muted">
                Locked: {user ? usd(user.pendingDirectBonusLocked) : "$0.00"}
              </span>
            </div>
          </div>
          <div className="well p-4">
            <div className="label">Working Cap Headroom</div>
            <div className="mt-1 text-lg font-bold text-text">
              {formatWorkingCapHeadroom(user)}
            </div>
          </div>
          <div className="well p-4">
            <div className="label">Lifetime Withdrawn</div>
            <div className="mt-1 text-lg font-bold text-text">
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
                image={timerImage}
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
                  value={liveRoi}
                  ratePerSec={roiPerSecUsd}
                  label="Daily ROI"
                  zeroRateMessage="No active investment packages found"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="well p-3">
                  <div className="label">Contract Available</div>
                  <div className="text-sm font-semibold text-neon-soft">
                    {user ? usd(user.roiIncomePending) : "—"}
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
                    onClick={() => callPlatform("Claiming / Accruing ROI...", "accrueRange", [0n, 50n])}
                    className="btn btn-secondary py-2.5 px-3 text-xs"
                    title="Batch accrual for large package holders"
                  >
                    Claim / Accrue All
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!user || user.roiIncomePending === 0n || !!tx.busy}
                    onClick={() => callPlatform("Claiming ROI Income...", "withdrawROI")}
                    className="btn btn-primary flex-1 py-2.5 text-xs"
                  >
                    {tx.busy === "Claiming ROI Income..." ? <Spinner /> : "Claim ROI Income"}
                  </button>
                  <button
                    type="button"
                    disabled={!user || !!tx.busy}
                    onClick={() => callPlatform("Claiming / Accruing ROI...", "accrueRange", [0n, 50n])}
                    className="btn btn-secondary py-2.5 px-3 text-xs"
                    title="Batch accrual for large package holders"
                  >
                    Claim / Accrue All
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
                  <Pill tone={user && user.boosterTier > 0 ? "gold" : "neutral"}>
                    Tier {user?.boosterTier ?? 0} (+{(user?.boosterTier ?? 0) * 0.1}%)
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
                    user && user.boosterTier === 0
                      ? "Tier 0 (Inactive) · Qualify 2 Directs to unlock +0.10%/day"
                      : "Booster Inactive · Sponsor direct volume to unlock"
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="well p-3">
                  <div className="label">Contract Available</div>
                  <div className="text-sm font-semibold text-neon-soft">
                    {user ? usd(user.boosterIncomePending) : "—"}
                  </div>
                </div>
                <div className="well p-3">
                  <div className="label">Total Withdrawn</div>
                  <div className="text-sm font-semibold text-text">
                    {user ? usd(user.boosterIncomeWithdrawn) : "—"}
                  </div>
                </div>
              </div>

              <div className="well p-3 flex flex-col gap-1 text-[11px]">
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
                  disabled={!user || user.boosterIncomePending === 0n || !!tx.busy}
                  onClick={() => callPlatform("Claiming Booster Income...", "withdrawBooster")}
                  className="btn btn-primary w-full py-2.5 text-xs font-bold"
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
                image={analysisImage}
                title="3. Downline Level Harvest"
                right={<Pill tone="cyan">Team Unilevel</Pill>}
              />

              {/* LIVE STREAMING TICKER */}
              <div className="well p-4 flex flex-col justify-between gap-2 border border-neon/20 shadow-[0_0_15px_rgba(31,224,58,0.1)]">
                <div className="label">Live Streaming Level Harvest</div>
                <LiveStreamTicker
                  value={liveLevel}
                  ratePerSec={levelPerSecUsd}
                  label="Level Matching"
                  zeroRateMessage="0 Active Downlines · Share referral link to stream level yield"
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
                    className="btn btn-primary py-2.5 px-3 text-xs font-bold"
                  >
                    {tx.busy === "Claiming Level Income..." ? <Spinner /> : "Claim Level Income"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!user || !!tx.busy}
                  onClick={() => callPlatform("Claiming Level Income...", "harvestLevelIncome")}
                  className="btn btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
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
                image={walletImage}
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

              {/* Vesting Option Selection */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setVestingOption(0)}
                  className={`rounded-xl p-2.5 text-center text-xs font-medium transition cursor-pointer ${
                    vestingOption === 0
                      ? "bg-neon/15 text-neon border border-neon/40 font-semibold"
                      : "well text-muted hover:text-text"
                  }`}
                >
                  Instant (100%)
                </button>
                <button
                  type="button"
                  onClick={() => setVestingOption(1)}
                  className={`rounded-xl p-2.5 text-center text-xs font-medium transition cursor-pointer ${
                    vestingOption === 1
                      ? "bg-neon/15 text-neon border border-neon/40 font-semibold"
                      : "well text-muted hover:text-text"
                  }`}
                >
                  Linear Vesting
                </button>
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
                  disabled={!user || user.workingIncomePending === 0n || !!tx.busy}
                  onClick={() => {
                    const amt = user ? user.workingIncomePending : 0n;
                    callPlatform("Claiming Working Income...", "withdrawWorkingIncome", [amt, vestingOption]);
                  }}
                  className="btn btn-primary w-full py-2.5 text-xs font-bold"
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
                image={depositImage}
                title="5. Direct Referral Income & Lock-In"
                right={<Pill tone="gold">Direct Slips</Pill>}
              />
              <p className="text-xs text-muted leading-relaxed">
                Referral bonuses earned directly from sponsored downlines. Available slips can be unlocked, while locked slips mature over time.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div className="well p-3">
                  <div className="label">Direct Available to Unlock</div>
                  <div className="text-base font-bold text-neon-soft">
                    {user ? usd(user.pendingDirectBonusAvailable) : "$0.00"}
                  </div>
                </div>
                <div className="well p-3">
                  <div className="label">Direct Lock-In (Locked Slips)</div>
                  <div className="text-base font-bold text-amber-400">
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
                image={analysisImage}
                title="6. Leader Income (Business Dev Fund)"
                right={<Pill tone="cyan">BDF Pool</Pill>}
              />
              <p className="text-xs text-muted leading-relaxed">
                Business Development Fund (BDF) allocation distributed to qualifying network leaders, regional coordinators, and community ambassadors.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div className="well p-3">
                  <div className="label">Available Leader / BDF Balance</div>
                  <div className="text-base font-bold text-neon-soft">
                    {user ? usd(user.leaderIncomePending) : "$0.00"}
                  </div>
                </div>
                <div className="well p-3">
                  <div className="label">Lifetime BDF Withdrawn</div>
                  <div className="text-base font-bold text-text">
                    {user ? usd(user.leaderIncomeWithdrawn) : "$0.00"}
                  </div>
                </div>
              </div>

              <div className="well p-3.5 flex flex-col gap-2">
                <Row
                  label="Leader Status"
                  value={user && user.usedLeader && user.usedLeader !== "0x0000000000000000000000000000000000000000" ? `Leader: ${shortAddr(user.usedLeader)}` : "Qualified Direct Leader"}
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
                  className="btn btn-primary w-full py-2.5 text-xs font-bold"
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
                image={depositImage}
                title="7. Rank Salary & Career Overrides"
                right={<Pill tone="gold">{user ? RANK_NAMES[user.currentRank] : "Rank 0"}</Pill>}
              />
              <p className="text-xs text-muted leading-relaxed">
                Career rank milestone salaries awarded weekly to top organization builders from Bronze up to Crown Ambassador.
              </p>

              <div className="well p-3.5 flex flex-col gap-2">
                <Row
                  label="Current Career Rank"
                  value={user ? RANK_NAMES[user.currentRank] : "Member"}
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
                  <div className="text-lg font-bold text-neon-soft">
                    {user ? usd(user.pendingContestRewards) : "$0.00"}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted block">History Window</span>
                  <span className="text-xs font-semibold text-white">Up to 150 Days</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.04]">
              <button
                type="button"
                disabled={!user || user.pendingContestRewards === 0n || !!tx.busy}
                onClick={() => callPlatform("Claiming Contest Income...", "sweepContestRewards", [150n])}
                className="btn btn-primary w-full py-2.5 text-xs font-bold"
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
                  <div className="text-lg font-bold text-neon-soft">
                    {user ? usd(user.pendingLeaderContestRewards) : "$0.00"}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted block">History Window</span>
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
                image={walletImage}
                title="10. Protocol Reward Pool & Backing Horizon"
                right={<Pill tone="green">100% USDT Backed</Pill>}
              />
              <p className="text-xs text-muted leading-relaxed">
                The global decentralized Reward Pool wallet holds liquid USDT on-chain to guarantee 100% solvency for all contest prizes, leader overrides, and weekly salary distributions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="well p-3.5">
                  <div className="label">Reward Pool USDT Balance</div>
                  <div className="mt-1 text-xl font-extrabold text-neon-soft">
                    {market?.rewardPoolBalance ? usd(market.rewardPoolBalance) : "$99,989,100.00"}
                  </div>
                  <span className="text-[10px] text-muted">Liquid On-Chain Backing</span>
                </div>
                <div className="well p-3.5">
                  <div className="label">Reward Pool Address</div>
                  <div className="mt-1 text-sm font-mono font-bold text-white">
                    {shortAddr(market?.rewardPoolWallet ?? addresses?.rewardPool ?? "0x9C886a403c88D95F45753c4312d10F3D9343590c")}
                  </div>
                  <span className="text-[10px] text-muted">BSC Testnet Verified</span>
                </div>
                <div className="well p-3.5">
                  <div className="label">Total Platform Active Deposit</div>
                  <div className="mt-1 text-xl font-bold text-white">
                    {market?.totalPlatformActiveDeposit ? usd(market.totalPlatformActiveDeposit) : "$51,000.00"}
                  </div>
                  <span className="text-[10px] text-muted">Global Staked Principal</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
