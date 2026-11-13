"use client";

import { useEffect, useState } from "react";
import { formatUnits, type Address } from "viem";
import { platformAbi } from "@/lib/abi";
import { LockType, viewAddress } from "@/lib/config";
import { shortAddr, usd } from "@/lib/format";
import {
  CAP_MULTIPLIER,
  DAY_SECONDS,
  TOP_ID_DAILY_RATE,
  TOP_ID_KEEP_SHARE,
  boosterShare,
  cyclePosition,
  deltaBpsSinceCheckpoint,
  flexDailyBps,
  lockedDailyUsd,
  lockedGain,
} from "@/lib/roi";
import { publicClient, type PlatformAddresses, type PlatformMarket, type PlatformUser } from "@/lib/platform";
import type { NavTab } from "./header";
import { CardHeader, Notice, Row, Spinner, useTx } from "./ui";
import { InfoSheet, SheetBlock } from "./info-sheet";
import { useWallet } from "./wallet";
import { IncomeSubTabs, type IncomeSubTabId } from "./income-sub-tabs";
import { Hierarchy } from "iconsax-react";

const TOP_ID_MATCH_DEPTH = 50;
const TOP_ID_BATCH = 50;

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

  // 3. Level income has no predictable stream: show what harvestLevelIncome would credit right now
  // (same figure as Referral Income on the withdraw page), not the whole working balance.
  const levelPerSecUsd = 0;
  const liveLevel = toUsd(user?.levelIncomeHarvestable ?? 0n);

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
  hideRate = false,
}: {
  value: number;
  ratePerSec: number;
  label?: string;
  hideRate?: boolean;
  zeroRateMessage?: string;
}) {
  const safeValue = Math.max(0, isNaN(value) ? 0 : value);
  const formatted = safeValue.toFixed(5);
  const [intStr, decStr = "00000"] = formatted.split(".");
  const integerPart = Number(intStr).toLocaleString();
  const cents = decStr.slice(0, 2);
  const micro = decStr.slice(2, 5);

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-baseline whitespace-nowrap select-none">
        <span className="text-base font-normal text-white">
          ${integerPart}.{cents}
        </span>
        <span className="text-neon text-xs font-normal ml-0.5 animate-pulse drop-shadow-[0_0_8px_rgba(31,224,58,0.5)]">
          {micro}
        </span>
      </div>

      {ratePerSec > 0 ? (
        hideRate ? null : (
        <div className="flex items-center gap-1.5 mt-1 text-2xs">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-neon shadow-[0_0_6px_#1fe03a]" />
          </span>
          <span className="text-muted font-medium">
            Accruing at{" "}
            <strong className="text-neon-soft">
              +${(ratePerSec * 86400).toFixed(4)}
            </strong>{" "}
            / day
          </span>
        </div>
        )
      ) : hideRate ? null : (
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

  // Real-time live streaming values grounded in on-chain parameters
  const lhrTier = market?.lhrTier ?? 0;
  const { liveLevel, levelPerSecUsd } = useLiveIncomeStreams(user, lhrTier);
  const isTopId = !!user?.isTopId;

  const poolWins = user?.rewardPoolWins ?? [];
  const poolWinTotal = poolWins.reduce((sum, w) => sum + w.amount, 0n);

  // One claimRewardPool call per cycle won; they run back to back
  async function claimRewardPools() {
    if (!addresses || !account || poolWins.length === 0) return;
    await tx.run(
      "Claiming Reward Pool...",
      async () => {
        let hash: Awaited<ReturnType<typeof write>> | undefined;
        for (const win of poolWins) {
          hash = await write({
            address: addresses.platform,
            abi: platformAbi,
            functionName: "claimRewardPool",
            args: [win.poolType, win.cycleId],
          });
        }
        return hash as Awaited<ReturnType<typeof write>>;
      },
      () => <span>Reward pool claimed!</span>
    );
  }

  // Top ID deep match: levels 2-50 pay 3% (L2-30) / 2% (L31-50) of each downline's ROI. They settle when that
  // downline's ROI accrues; this settles the rest in batches of 50 (the contract's limit), walking the tree
  // breadth-first from the Top ID and moving a cursor forward on every run.
  const [matchCursor, setMatchCursor] = useState(0);
  async function settleDeepMatch() {
    if (!addresses || !account) return;
    await tx.run(
      "Settling Deep Match...",
      async () => {
        const batch: Address[] = [];
        let level: Address[] = [account];
        let seen = 0;
        for (let depth = 1; depth <= TOP_ID_MATCH_DEPTH && level.length > 0 && batch.length < TOP_ID_BATCH; depth++) {
          level = (
            await Promise.all(
              level.map((a) =>
                publicClient
                  .readContract({ address: viewAddress, abi: platformAbi, functionName: "getDirectDownlines", args: [a] })
                  .catch(() => [] as Address[])
              )
            )
          ).flat() as Address[];
          // Level 1 is the normal 10% sponsor reward; the match starts at level 2.
          if (depth < 2) continue;
          for (const a of level) {
            if (seen++ >= matchCursor && batch.length < TOP_ID_BATCH) batch.push(a);
          }
        }
        if (batch.length === 0) {
          setMatchCursor(0);
          throw new Error("No level 2-50 downlines left to settle. Starting over next time.");
        }
        setMatchCursor((c) => c + batch.length);
        return write({
          address: addresses.platform,
          abi: platformAbi,
          functionName: "harvestTopIdDownlinesBatch",
          args: [batch],
        });
      },
      () => <span>Deep match settled for the next downlines.</span>
    );
  }

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
      {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}

      {/* Sub-Tabs Category Filter */}
      <IncomeSubTabs activeTab={subTab} onChange={setSubTab} />

      {/* Income Streams Grid: ALL Income Cards */}
      <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-5">
        {/* 3. Downline Level Harvest / Level Income (LIVE STREAMING) */}
        {(subTab === "all" || subTab === "level") && (
          <section className="card torch flex flex-col justify-between gap-4 p-3.5 sm:gap-5 sm:p-6 border border-white/[0.08] relative overflow-hidden">
            <div className="flex flex-col gap-6">
              <CardHeader
                stacked
                title="Referral Income"
                right={
                  <InfoSheet title="Referral Income">
                    <p>
                      Level income from your team. It is credited to your working balance whenever your downlines&apos; ROI
                      is accrued, and pauses while the liquidity tier is Rescue.
                    </p>
                    {isTopId && (
                      <SheetBlock title="Top ID deep match">
                        <dl>
                          <Row label="Level 1" value="10% (normal sponsor reward)" />
                          <Row label="Levels 2-30" value="3% of each downline's ROI" accent />
                          <Row label="Levels 31-50" value="2% of each downline's ROI" accent />
                        </dl>
                        <p>
                          Paid to your working balance whenever a downline&apos;s ROI is settled, whatever your cap.
                          Use Settle Deep Match to settle downlines in batches of 50.
                        </p>
                      </SheetBlock>
                    )}
                    <SheetBlock title="Your team">
                      <dl>
                        <Row label="Active direct sponsors" value={`${user?.activeDirectCount ?? 0}`} />
                        <Row label="Total team volume" value={user ? usd(user.totalTeamBusiness) : "$0"} accent />
                        <Row label="Power leg volume" value={user ? usd(user.powerLegBusiness) : "$0"} />
                        <Row label="Weaker legs volume" value={user ? usd(user.weakerLegBusiness) : "$0"} />
                      </dl>
                    </SheetBlock>
                  </InfoSheet>
                }
              />

              {/* LIVE STREAMING TICKER */}
              <div>
                <LiveStreamTicker
                  value={liveLevel}
                  ratePerSec={levelPerSecUsd}
                  label="Level Matching"
                  hideRate
                />
              </div>
            </div>

            {!isHome && (
              <div className="pt-3">
                <button
                  type="button"
                  disabled={!user || user.levelIncomeHarvestable === 0n || !!tx.busy}
                  onClick={() => callPlatform("Claiming Level Income...", "harvestLevelIncome")}
                  className="btn btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {tx.busy === "Claiming Level Income..." ? (
                    <Spinner />
                  ) : (
                    <>
                      <Hierarchy size={16} />
                      <span>Claim</span>
                    </>
                  )}
                </button>
                {isTopId && (
                  <button
                    type="button"
                    disabled={!user || !!tx.busy}
                    onClick={settleDeepMatch}
                    className="btn w-full mt-2 py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    {tx.busy === "Settling Deep Match..." ? (
                      <Spinner />
                    ) : (
                      <>
                        <Hierarchy size={16} />
                        <span>Settle Deep Match (L2-50)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* 5. Direct Income + Direct Lock-In */}
        {(subTab === "all" || subTab === "direct") && (
          <section className="card torch flex flex-col justify-between gap-4 p-3.5 sm:gap-5 sm:p-6 border border-white/[0.08]">
            <div className="flex flex-col gap-6">
              <CardHeader
                stacked
                title="Direct + Lock Income"
                right={
                  <InfoSheet title="Direct + Lock Income">
                    <p>
                      Referral bonuses earned directly from the members you sponsored. Each bonus is locked for 24 hours
                      after it is earned. Once that time passes it becomes available to unlock.
                    </p>
                    <SheetBlock title="Your directs">
                      <dl>
                        <Row label="Direct sponsors" value={`${user?.activeDirectCount ?? 0}`} />
                        <Row label="Direct business volume" value={user ? usd(user.totalDirectBusiness) : "$0.00"} accent />
                      </dl>
                    </SheetBlock>
                  </InfoSheet>
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted">Available</div>
                  <div className="mt-0.5 text-base font-normal text-white">
                    {user ? usd(user.pendingDirectBonusAvailable) : "$0.00"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Locked</div>
                  <div className="mt-0.5 text-base font-normal text-white">
                    {user ? usd(user.pendingDirectBonusLocked) : "$0.00"}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 8. Daily Sponsor Price Contest */}
        {(subTab === "all" || subTab === "contests") && (
          <section className="card torch flex flex-col justify-between gap-4 p-3.5 sm:gap-5 sm:p-6 border border-white/[0.08]">
            <div className="flex flex-col gap-6">
              <CardHeader
                stacked
                title="Leader Prize Contest"
                right={
                  <InfoSheet title="Leader Prize Contest">
                    <p>
                      Prize contest paid on days when the CARB price falls 5% or more from its daily high. The pool goes to the top sponsors by new business that day.
                    </p>
                    <SheetBlock title="Claim window">
                      <dl>
                        <Row label="History window" value="Up to 150 days" />
                      </dl>
                    </SheetBlock>
                  </InfoSheet>
                }
              />
              <div className="text-base font-normal text-white">
                {user ? usd(user.pendingContestRewards) : "$0.00"}
              </div>
            </div>

            {!isHome && (
              <div className="pt-3">
                <button
                  type="button"
                  disabled={!user || user.pendingContestRewards === 0n || !!tx.busy}
                  onClick={() => callPlatform("Claiming Contest Income...", "sweepContestRewards", [150n])}
                  className="btn btn-primary w-full py-2.5 text-xs font-semibold"
                >
                  {tx.busy === "Claiming Contest Income..." ? <Spinner /> : "Claim Contest Income"}
                </button>
              </div>
            )}
          </section>
        )}

        {/* 9. Leader Prize Contest */}
        {(subTab === "all" || subTab === "contests") && (
          <section className="card torch flex flex-col justify-between gap-4 p-3.5 sm:gap-5 sm:p-6 border border-white/[0.08]">
            <div className="flex flex-col gap-6">
              <CardHeader
                stacked
                title="Daily Contest"
                right={
                  <InfoSheet title="Daily Contest">
                    <p>
                      Daily contest prize pool shared among the top leaders by newcomer business. It is paid every day, whatever the price does.
                    </p>
                    <SheetBlock title="Claim window">
                      <dl>
                        <Row label="History window" value="Up to 50 days" />
                      </dl>
                    </SheetBlock>
                  </InfoSheet>
                }
              />
              <div>
                <div>
                  <div className="text-base font-normal text-white">
                    {user ? usd(user.pendingLeaderContestRewards) : "$0.00"}
                  </div>
                </div>
              </div>
            </div>

            {!isHome && (
              <div className="pt-3">
                <button
                  type="button"
                  disabled={!user || user.pendingLeaderContestRewards === 0n || !!tx.busy}
                  onClick={() => callPlatform("Claiming Leader Contest Income...", "sweepLeaderContestRewards", [50n])}
                  className="btn btn-secondary w-full py-2.5 text-xs font-semibold"
                >
                  {tx.busy === "Claiming Leader Contest Income..." ? <Spinner /> : "Claim Leader Contest Income"}
                </button>
              </div>
            )}
          </section>
        )}

        {/* 10. Protocol Reward Pool & Backing Horizon */}
        {(subTab === "all" || subTab === "rewardPool") && (
          <section className="card torch flex flex-col justify-between gap-4 p-3.5 sm:gap-5 sm:p-6 border border-white/[0.08] col-span-2">
            <div className="flex flex-col gap-6">
              <CardHeader
                stacked
                singleLine
                title="Reward Pool"
                right={
                  <InfoSheet title="Reward Pool">
                    <p>
                      Withdrawal pool fees are split 70% Neon / 20% Hydra / 10% Genosis. Each pool auto-distributes to
                      top leaders once it reaches its threshold.
                    </p>
                    <SheetBlock title="Pool progress">
                      <dl>
                        {(
                          [
                            ["Neon (70%)", market?.rewardPools.neon ?? 0n, 5_000n],
                            ["Hydra (20%)", market?.rewardPools.hydra ?? 0n, 10_000n],
                            ["Genosis (10%)", market?.rewardPools.genosis ?? 0n, 20_000n],
                          ] as const
                        ).map(([name, balance, threshold]) => (
                          <Row key={name} label={name} value={`${usd(balance)} / ${usd(threshold * 10n ** 18n)}`} />
                        ))}
                      </dl>
                    </SheetBlock>
                    <SheetBlock title="Pool totals">
                      <dl>
                        <Row label="Unclaimed liabilities" value={usd(market?.rewardPoolLiabilities ?? 0n)} />
                        <Row label="Lifetime routed" value={usd(market?.rewardPoolAccumulated ?? 0n)} />
                        <Row
                          label="Pool ledger contract"
                          value={market?.rewardPoolEngine ? shortAddr(market.rewardPoolEngine) : "—"}
                        />
                      </dl>
                    </SheetBlock>
                  </InfoSheet>
                }
              />
              {/* Winnings from pool payouts that can be claimed now */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted">You can withdraw</div>
                  <div className="mt-0.5 text-base font-normal text-white">{usd(poolWinTotal)}</div>
                </div>
                <button
                  type="button"
                  disabled={!user || poolWinTotal === 0n || !!tx.busy}
                  onClick={claimRewardPools}
                  className="btn btn-primary !rounded-lg whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold"
                >
                  {tx.busy === "Claiming Reward Pool..." ? <Spinner /> : "Claim"}
                </button>
              </div>

              {/* How full each pool is against its payout threshold */}
              <div className="flex flex-col gap-3">
                {(
                  [
                    ["Neon", market?.rewardPools.neon ?? 0n, 5_000n, ["#6b2a3c", "#ff5d7a"]],
                    ["Hydra", market?.rewardPools.hydra ?? 0n, 10_000n, ["#6b4a1a", "#f5b04a"]],
                    ["Genosis", market?.rewardPools.genosis ?? 0n, 20_000n, ["#17583a", "#3ddc84"]],
                  ] as const
                ).map(([name, balance, threshold, [from, to]]) => {
                  const target = threshold * 10n ** 18n;
                  const filled = Math.min(100, (Number(balance) / Number(target)) * 100);
                  const filledLabel =
                    filled === 0 ? "0%" : filled < 0.1 ? "<0.1%" : filled < 10 ? `${filled.toFixed(1)}%` : `${Math.round(filled)}%`;
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-sm font-medium text-white">{name}</span>
                      <div className="relative h-9 min-w-0 flex-1 overflow-hidden rounded-xl bg-white/[0.04]">
                        <div
                          className="h-full rounded-xl transition-all duration-500"
                          style={{
                            width: `${filled}%`,
                            minWidth: filled > 0 ? 8 : 0,
                            background: `linear-gradient(90deg, ${from}, ${to})`,
                          }}
                        />
                        <span className="absolute inset-y-0 left-3 flex items-center whitespace-nowrap text-xs text-white">
                          {usd(balance)} of ${threshold.toLocaleString()}
                        </span>
                      </div>
                      <span className="w-14 shrink-0 text-right text-sm text-white">{filledLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
