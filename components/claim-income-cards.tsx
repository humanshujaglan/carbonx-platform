"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { LockType } from "@/lib/config";
import { rankLabel, shortAddr, usd, money } from "@/lib/format";
import {
  DAY_SECONDS,
  FLEX_SLOT_BPS,
  SLOT_DAYS,
  TOP_ID_DAILY_RATE,
  TOP_ID_KEEP_SHARE,
  boosterShare,
  packageLiveRoi,
  packageRates,
} from "@/lib/roi";
import type { PlatformMarket, PlatformUser } from "@/lib/platform";
import { CardHeader, Row } from "./ui";
import { InfoSheet, SheetBlock } from "./info-sheet";
import { LiveStreamTicker, useLiveIncomeStreams } from "./incomes-dashboard";

/**
 * Package ROI, Booster, Leader and Rank Income: total earned to date, withdrawn or not.
 * Display only; claiming happens on the Withdraw page.
 */
export function ClaimIncomeCards({ user, market }: { user?: PlatformUser; market?: PlatformMarket }) {
  // Fixed when the card mounts; enough to tell which weekly payouts are still ahead
  const [nowSec] = useState(() => Math.floor(Date.now() / 1000));

  const isTopId = !!user?.isTopId;
  const lhrTier = market?.lhrTier ?? 0;
  const {
    t,
    liveRoi,
    liveLockedRoi,
    liveBooster,
    roiPerSecUsd,
    lockedPerSecUsd,
    boosterPerSecUsd,
    liveRank,
    rankPerSecUsd,
    roiSchedule,
  } = useLiveIncomeStreams(user, lhrTier);
  const boosterTier = user?.boosterTier ?? 0;
  const boosterMonthlyPct = packageRates(LockType.FLEXIBLE, isTopId ? 0 : lhrTier).monthlyPct * boosterShare(boosterTier);
  const hasLockedPositions = !!user?.positions.some((p) => p.active && !p.isCapped && p.lockType !== LockType.FLEXIBLE);

  // Lifetime totals: the contract's *Withdrawn counters are gross, so withdrawn + pending + not yet settled.
  const toUsd = (v: bigint) => Number(formatUnits(v, 18));
  // Packages keep their own cumulative roiAccrued (withdrawn or not); the Top ID is paid on its whole principal
  const roiEarned = !user
    ? 0
    : isTopId
    ? toUsd(user.roiIncomeWithdrawn) + liveRoi
    : user.positions.reduce(
        (sum, p) => sum + packageLiveRoi(p, { roiCycleStartTime: user.roiCycleStartTime, isTopId }, lhrTier, t).accruedUsd,
        0
      );
  const boosterEarned = user ? toUsd(user.boosterIncomeWithdrawn) + liveBooster : 0;
  const leaderEarned = user
    ? toUsd(user.leaderIncomeWithdrawn + user.leaderIncomePending + user.pendingLeaderBonusAvailable + user.pendingLeaderBonusLocked)
    : 0;
  const rankEarned = user ? toUsd(user.rankIncomeWithdrawn) + liveRank : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-5">
        {/* 1. Daily Package ROI Yield (LIVE STREAMING) */}
          <section className="card torch flex flex-col justify-between gap-4 p-3.5 sm:gap-5 sm:p-6 border border-white/[0.08] relative overflow-hidden">
            <div className="flex flex-1 flex-col gap-6">
              <CardHeader
                stacked
                title="Daily ROI"
                right={
                  <InfoSheet title="Daily ROI">
                    <p>
                      Daily returns on your active packages. Flexible packages run on a 30-day cycle split into six
                      5-day slots; the daily rate rises each slot and depends on the current liquidity tier. The cycle
                      restarts when you withdraw ROI. Locked packages compound 0.33% per day and are paid at 2.5x.
                    </p>
                    {isTopId && user && (
                      <SheetBlock title="Top ID ROI">
                        <Row
                          label="Rate"
                          value={`${(TOP_ID_DAILY_RATE * 100).toFixed(2)}%/day on ${usd(user.topIdPrincipal)} · ${TOP_ID_KEEP_SHARE * 100}% kept`}
                        />
                      </SheetBlock>
                    )}
                    {!isTopId && (
                      <SheetBlock title="Slot schedule">
                        <dl>
                          {FLEX_SLOT_BPS[Math.min(Math.max(lhrTier, 0), FLEX_SLOT_BPS.length - 1)].map((bps, i) => (
                            <Row
                              key={i}
                              label={`Days ${i * SLOT_DAYS + 1}–${i * SLOT_DAYS + SLOT_DAYS}${roiSchedule.slot === i + 1 ? " (now)" : ""}`}
                              value={`${(bps / 100).toFixed(2)}%/day · ${((bps * SLOT_DAYS) / 100).toFixed(2)}% per slot`}
                              accent={roiSchedule.slot === i + 1}
                            />
                          ))}
                        </dl>
                      </SheetBlock>
                    )}
                    <SheetBlock title="Your cycle">
                      <dl>
                        {!isTopId && roiSchedule.cycleDay !== undefined && (
                          <Row label="Position" value={`Day ${roiSchedule.cycleDay}/30 · Slot ${roiSchedule.slot}/6`} />
                        )}
                        <Row
                          label={isTopId ? "Accrued" : "Flexible accrued"}
                          value={`$${liveRoi.toFixed(4)} · +$${(roiPerSecUsd * DAY_SECONDS).toFixed(4)}/day`}
                        />
                        {hasLockedPositions && (
                          <Row
                            label="Locked (0.33% compounding)"
                            value={`$${liveLockedRoi.toFixed(4)} · +$${(lockedPerSecUsd * DAY_SECONDS).toFixed(4)}/day`}
                          />
                        )}
                      </dl>
                    </SheetBlock>
                  </InfoSheet>
                }
              />

              {/* LIVE STREAMING TICKER */}
              <LiveStreamTicker
                value={roiEarned}
                ratePerSec={roiPerSecUsd + lockedPerSecUsd}
                label="Daily ROI"
                hideRate
              />
            </div>
          </section>

        {/* 2. Daily Booster Income (LIVE STREAMING) */}
          <section className="card torch flex flex-col justify-between gap-4 p-3.5 sm:gap-5 sm:p-6 border border-white/[0.08] relative overflow-hidden">
            <div className="flex flex-1 flex-col gap-6">
              <CardHeader
                stacked
                title="Booster Income"
                right={
                  <InfoSheet title="Booster Income">
                    <p>
                      Extra daily income on your first package, unlocked by sponsoring direct business. Tier 1, 2 and 3
                      pay one third, two thirds and the full ROI slot rate. It runs on the same 30-day cycle as your ROI
                      and stops once it reaches 1.0x of the first package.
                    </p>
                    <SheetBlock title="Your booster">
                      <dl>
                        <Row
                          label="Tier"
                          value={`Tier ${boosterTier} · ${boosterTier > 0 ? `${boosterMonthlyPct.toFixed(2)}%/mo` : "Inactive"}`}
                        />
                        {boosterTier > 0 && roiSchedule.boosterCycleDay !== undefined && (
                          <Row
                            label="Position"
                            value={`Day ${roiSchedule.boosterCycleDay}/30 · Slot ${roiSchedule.boosterSlot}/6 · ${roiSchedule.boosterDailyPct.toFixed(3)}%/day`}
                          />
                        )}
                        {boosterTier > 0 && (
                          <Row label="Today" value={`+$${(boosterPerSecUsd * DAY_SECONDS).toFixed(4)}/day`} />
                        )}
                        <Row label="Direct business" value={user ? usd(user.totalDirectBusiness) : "$0"} />
                      </dl>
                    </SheetBlock>
                  </InfoSheet>
                }
              />

              {/* LIVE STREAMING TICKER */}
              <LiveStreamTicker value={boosterEarned} ratePerSec={boosterPerSecUsd} label="Booster" hideRate />
            </div>
          </section>

        {/* 6. Leader Income (Business Development Fund / BDF) */}
          <section className="card torch flex flex-col justify-between gap-4 p-3.5 sm:gap-5 sm:p-6 border border-white/[0.08]">
            <div className="flex flex-col gap-6">
              <CardHeader
                stacked
                title="Leader Income"
                right={
                  <InfoSheet title="Leader Income">
                    <p>
                      Business Development Fund (BDF) allocation shared with qualifying network leaders. Your balance
                      grows when the leader code you used earns from the fund. Each bonus is locked for 24 hours after it
                      is earned, then it moves to Available and can be claimed.
                    </p>
                    <SheetBlock title="Your leader">
                      <dl>
                        <Row
                          label="Leader"
                          value={
                            user && user.usedLeader && user.usedLeader !== "0x0000000000000000000000000000000000000000"
                              ? shortAddr(user.usedLeader)
                              : "No leader code used"
                          }
                          accent
                        />
                      </dl>
                    </SheetBlock>
                  </InfoSheet>
                }
              />
              <div className="text-base font-normal text-white">{money(leaderEarned)}</div>
            </div>
          </section>

        {/* 7. Rank Career Salary */}
          <section className="card torch flex flex-col justify-between gap-4 p-3.5 sm:gap-5 sm:p-6 border border-white/[0.08]">
            <div className="flex flex-col gap-6">
              <CardHeader
                stacked
                title="Rank Income"
                right={
                  <InfoSheet title="Rank Income">
                    <p>
                      Weekly salary for qualifying career ranks (Rank 1 to Rank 15), based on your team leg business.
                    </p>
                    <SheetBlock title="Your legs">
                      <dl>
                        <Row label="Current rank" value={rankLabel(user?.currentRank)} accent />
                        <Row label="Power leg" value={user ? usd(user.powerLegBusiness) : "$0"} />
                        <Row label="Weaker legs" value={user ? usd(user.weakerLegBusiness) : "$0"} />
                      </dl>
                    </SheetBlock>
                    <p>Your rank salary is paid weekly. Each rank has its own stream, and a week unlocks every 7 days.</p>
                    {[...(user?.rankSalary.streams ?? [])].reverse().map((st) => {
                    const WEEK = 7 * DAY_SECONDS;
                    const finished = st.weeksClaimed + st.claimableWeeks >= st.durationWeeks && st.claimableWeeks === 0;
                    const nextUnlock =
                      st.startTime > 0
                        ? st.startTime + (Math.floor(Math.max(0, nowSec - st.startTime) / WEEK) + 1) * WEEK
                        : 0;
                    const daysToNext = Math.max(0, Math.ceil((nextUnlock - nowSec) / DAY_SECONDS));
                    return (
                      <SheetBlock key={st.rank} title={`Rank ${st.rank}`}>
                        <div className="flex items-center justify-between gap-3 text-sm text-white">
                          <span>{usd(st.weeklyPayout)} per week</span>
                          <span className="text-muted">
                            {st.weeksClaimed} of {st.durationWeeks} weeks claimed
                          </span>
                        </div>
                        {/* One dot per week: claimed, claimable now, still locked */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {Array.from({ length: st.durationWeeks }, (_, w) => {
                            const claimed = w < st.weeksClaimed;
                            const ready = !claimed && w < st.weeksClaimed + st.claimableWeeks;
                            return (
                              <span
                                key={w}
                                className="size-3.5 rounded-full"
                                style={{
                                  background: claimed ? "#3ddc84" : ready ? "#f5b83d" : "rgb(255 255 255 / 0.1)",
                                }}
                              />
                            );
                          })}
                        </div>
                        <div className="mt-3 text-xs text-white">
                          {st.claimableWeeks > 0
                            ? `${st.claimableWeeks} ${st.claimableWeeks === 1 ? "week" : "weeks"} ready to claim`
                            : finished
                            ? "All weeks claimed"
                            : st.startTime === 0
                            ? "First week unlocks 7 days after your first claim"
                            : `Next week unlocks in ${daysToNext} ${daysToNext === 1 ? "day" : "days"}`}
                        </div>
                      </SheetBlock>
                    );
                  })}
                  </InfoSheet>
                }
              />
              <LiveStreamTicker value={rankEarned} ratePerSec={rankPerSecUsd} label="Rank" hideRate />
            </div>
          </section>

      </div>
    </div>
  );
}
