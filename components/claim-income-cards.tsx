"use client";

import { useState } from "react";
import { platformAbi } from "@/lib/abi";
import { LockType } from "@/lib/config";
import { rankLabel, shortAddr, usd } from "@/lib/format";
import {
  DAY_SECONDS,
  FLEX_SLOT_BPS,
  MIN_WITHDRAWAL_USD,
  SLOT_DAYS,
  TOP_ID_DAILY_RATE,
  TOP_ID_KEEP_SHARE,
  boosterShare,
  packageRates,
} from "@/lib/roi";
import type { PlatformAddresses, PlatformMarket, PlatformUser } from "@/lib/platform";
import { CardHeader, Notice, Row, Spinner, useTx } from "./ui";
import { BottomSheet, InfoSheet, SheetBlock } from "./info-sheet";
import { LiveStreamTicker, useLiveIncomeStreams } from "./incomes-dashboard";
import { useWallet } from "./wallet";

/** Package ROI, Booster, Leader and Rank Salary: the incomes that have their own claim button. */
export function ClaimIncomeCards({
  user,
  addresses,
  market,
  onDone,
}: {
  user?: PlatformUser;
  addresses?: PlatformAddresses;
  market?: PlatformMarket;
  onDone: () => void;
}) {
  const { account, write } = useWallet();
  const tx = useTx(onDone);

  const [rankSheetOpen, setRankSheetOpen] = useState(false);
  // Fixed when the card mounts; enough to tell which weekly payouts are still ahead
  const [nowSec] = useState(() => Math.floor(Date.now() / 1000));

  const isTopId = !!user?.isTopId;
  const lhrTier = market?.lhrTier ?? 0;
  const {
    liveRoi,
    settledRoi,
    settledBooster,
    liveLockedRoi,
    liveBooster,
    roiPerSecUsd,
    lockedPerSecUsd,
    boosterPerSecUsd,
    roiSchedule,
  } = useLiveIncomeStreams(user, lhrTier);
  const boosterTier = user?.boosterTier ?? 0;
  const boosterMonthlyPct = packageRates(LockType.FLEXIBLE, isTopId ? 0 : lhrTier).monthlyPct * boosterShare(boosterTier);
  const hasLockedPositions = !!user?.positions.some((p) => p.active && !p.isCapped && p.lockType !== LockType.FLEXIBLE);

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
    <div className="flex flex-col gap-4">
      {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}
      <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-5">
        {/* 1. Daily Package ROI Yield (LIVE STREAMING) */}
          <section className="card torch flex flex-col justify-between gap-4 p-3.5 sm:gap-5 sm:p-6 border border-white/[0.08] relative overflow-hidden">
            <div className="flex flex-1 flex-col gap-6">
              <CardHeader
                stacked
                title="Daily ROI"
                right={
                  <InfoSheet title="Package ROI">
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
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <LiveStreamTicker
                  value={liveRoi + liveLockedRoi}
                  ratePerSec={roiPerSecUsd + lockedPerSecUsd}
                  label="Daily ROI"
                  hideRate
                />
                <button
                  type="button"
                  disabled={!user || settledRoi < MIN_WITHDRAWAL_USD || !!tx.busy}
                  onClick={() => callPlatform("Claiming ROI Income...", "withdrawROI")}
                  className="btn btn-primary !rounded-lg justify-self-end whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold"
                >
                  {tx.busy === "Claiming ROI Income..." ? <Spinner /> : "Claim"}
                </button>
              </div>
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
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <LiveStreamTicker
                  value={liveBooster}
                  ratePerSec={boosterPerSecUsd}
                  label="Booster"
                  hideRate
                />
                <button
                  type="button"
                  disabled={!user || settledBooster < MIN_WITHDRAWAL_USD || !!tx.busy}
                  onClick={() => callPlatform("Claiming Booster Income...", "withdrawBooster")}
                  className="btn btn-primary !rounded-lg justify-self-end whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold"
                >
                  {tx.busy === "Claiming Booster Income..." ? <Spinner /> : "Claim"}
                </button>
              </div>
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
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="text-base font-normal text-white">
                  {user
                    ? usd(user.leaderIncomePending + user.pendingLeaderBonusAvailable + user.pendingLeaderBonusLocked)
                    : "$0.00"}
                </div>
                <button
                  type="button"
                  disabled={!user || user.leaderIncomePending + user.pendingLeaderBonusAvailable === 0n || !!tx.busy}
                  onClick={() => callPlatform("Claiming Leader Income...", "withdrawLeaderIncome")}
                  className="btn btn-primary !rounded-lg justify-self-end whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold"
                >
                  {tx.busy === "Claiming Leader Income..." ? <Spinner /> : "Claim"}
                </button>
              </div>
            </div>
          </section>

        {/* 7. Rank Career Salary */}
          <section className="card torch flex flex-col justify-between gap-4 p-3.5 sm:gap-5 sm:p-6 border border-white/[0.08]">
            <div className="flex flex-col gap-6">
              <CardHeader
                stacked
                title="Rank and Reward"
                right={
                  <InfoSheet title="Rank and Reward">
                    <p>
                      Weekly salary for qualifying career ranks (Rank 1 to Rank 15), based on your team leg business.
                    </p>
                    <SheetBlock title="Your legs">
                      <dl>
                        <Row label="Power leg" value={user ? usd(user.powerLegBusiness) : "$0"} />
                        <Row label="Weaker legs" value={user ? usd(user.weakerLegBusiness) : "$0"} />
                      </dl>
                    </SheetBlock>
                  </InfoSheet>
                }
              />
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="text-base font-normal text-white">{rankLabel(user?.currentRank)}</div>
                <button
                  type="button"
                  disabled={!user || user.currentRank === 0 || !!tx.busy}
                  onClick={() => setRankSheetOpen(true)}
                  className="btn btn-primary !rounded-lg justify-self-end whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold"
                >
                  {tx.busy === "Claiming Rank Salary Income..." ? <Spinner /> : "Claim"}
                </button>
                <BottomSheet open={rankSheetOpen} onClose={() => setRankSheetOpen(false)} title="Rank and Reward">
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
                  <button
                    type="button"
                    disabled={!user || user.rankSalary.totalClaimable === 0n || !!tx.busy}
                    onClick={() => {
                      setRankSheetOpen(false);
                      callPlatform("Claiming Rank Salary Income...", "claimWeeklySalaryBonus");
                    }}
                    className="btn btn-primary w-full py-2.5 text-xs font-semibold"
                  >
                    {user ? `Claim ${usd(user.rankSalary.totalClaimable)}` : "Claim"}
                  </button>
                </BottomSheet>
              </div>
            </div>
          </section>

      </div>
    </div>
  );
}
