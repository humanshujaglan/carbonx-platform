"use client";

import { useState } from "react";
import Image from "next/image";
import leafImage from "@/public/leave.png";
import analysisImage from "@/public/analysis.png";
import timerImage from "@/public/timer.png";
import walletImage from "@/public/wallet.png";
import depositImage from "@/public/deposit.png";
import { platformAbi } from "@/lib/abi";
import { usd } from "@/lib/format";
import type { PlatformAddresses, PlatformUser } from "@/lib/platform";
import { CardHeader, Notice, Pill, Progress, Row, Spinner, useTx } from "./ui";
import { useWallet } from "./wallet";
import { IncomeSubTabs, type IncomeSubTabId } from "./income-sub-tabs";

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

export function IncomesDashboard({
  user,
  addresses,
  onDone,
}: {
  user?: PlatformUser;
  addresses?: PlatformAddresses;
  onDone: () => void;
}) {
  const { account, write } = useWallet();
  const tx = useTx(onDone);

  const [subTab, setSubTab] = useState<IncomeSubTabId>("all");
  const [workingWithdrawAmount, setWorkingWithdrawAmount] = useState<string>("");
  const [vestingOption, setVestingOption] = useState<number>(0);

  // Quick total calculations
  const totalPending = user
    ? user.roiIncomePending +
      user.boosterIncomePending +
      user.workingIncomePending +
      user.leaderIncomePending +
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
      (hash) => <span>Action completed successfully!</span>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Overview Stat Ribbon */}
      <section className="card p-5 sm:p-6" aria-label="Income overview">
        {tx.result && <div className="mb-4"><Notice tone={tx.result.tone}>{tx.result.text}</Notice></div>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="well p-4">
            <div className="label">Total Unclaimed Income</div>
            <div className="mt-1 text-xl font-bold text-gradient text-neon-soft">
              {user ? usd(totalPending) : "—"}
            </div>
          </div>
          <div className="well p-4">
            <div className="label">Total Income Withdrawn</div>
            <div className="mt-1 text-xl font-bold text-text">
              {user ? usd(totalWithdrawn) : "—"}
            </div>
          </div>
          <div className="well p-4">
            <div className="label">Working Cap Headroom</div>
            <div className="mt-1 text-xl font-bold text-text">
              {user ? (user.workingCapHeadroom >= 10n ** 30n ? "Unlimited (Top ID)" : usd(user.workingCapHeadroom)) : "—"}
            </div>
          </div>
          <div className="well p-4">
            <div className="label">Total Direct Volume</div>
            <div className="mt-1 text-xl font-bold text-text">
              {user ? usd(user.totalDirectBusiness) : "—"}
            </div>
          </div>
        </div>
      </section>

      {/* Sub-Tabs Category Filter modeled after infinitesix.io */}
      <IncomeSubTabs activeTab={subTab} onChange={setSubTab} />

      {/* Income Streams Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 1. Daily ROI Yield */}
        {(subTab === "all" || subTab === "roi") && (
          <section className="card flex flex-col justify-between gap-4 p-5 sm:p-6">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={timerImage}
                title="1. Daily Package ROI"
                right={<Pill tone="green">Daily Yield</Pill>}
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="well p-3">
                  <div className="label">Available ROI</div>
                  <div className="text-base font-semibold text-neon-soft">
                    {user ? usd(user.roiIncomePending) : "—"}
                  </div>
                </div>
                <div className="well p-3">
                  <div className="label">Total ROI Withdrawn</div>
                  <div className="text-base font-semibold text-text">
                    {user ? usd(user.roiIncomeWithdrawn) : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
              <button
                type="button"
                disabled={!user || user.roiIncomePending === 0n || !!tx.busy}
                onClick={() => callPlatform("Withdrawing ROI...", "withdrawROI")}
                className="btn btn-primary flex-1 py-2.5 text-xs"
              >
                {tx.busy === "Withdrawing ROI..." ? <Spinner /> : "Withdraw ROI"}
              </button>
              <button
                type="button"
                disabled={!user || !!tx.busy}
                onClick={() => callPlatform("Accruing Packages...", "accrueRange", [0n, 50n])}
                className="btn btn-secondary py-2.5 px-3 text-xs"
                title="Batch accrual for large package holders"
              >
                Accrue All
              </button>
            </div>
          </section>
        )}

        {/* 2. Daily Booster Income */}
        {(subTab === "all" || subTab === "booster") && (
          <section className="card flex flex-col justify-between gap-4 p-5 sm:p-6">
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
              <div className="grid grid-cols-2 gap-2">
                <div className="well p-3">
                  <div className="label">Pending Booster</div>
                  <div className="text-base font-semibold text-neon-soft">
                    {user ? usd(user.boosterIncomePending) : "—"}
                  </div>
                </div>
                <div className="well p-3">
                  <div className="label">Total Withdrawn</div>
                  <div className="text-base font-semibold text-text">
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

            <div className="pt-2 border-t border-white/[0.04]">
              <button
                type="button"
                disabled={!user || user.boosterIncomePending === 0n || !!tx.busy}
                onClick={() => callPlatform("Withdrawing Booster...", "withdrawBooster")}
                className="btn btn-primary w-full py-2.5 text-xs"
              >
                {tx.busy === "Withdrawing Booster..." ? <Spinner /> : "Withdraw Booster Income"}
              </button>
            </div>
          </section>
        )}

        {/* 3. Level Income & Team Harvest */}
        {(subTab === "all" || subTab === "level") && (
          <section className="card flex flex-col justify-between gap-4 p-5 sm:p-6">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={analysisImage}
                title="3. Downline Level Harvest"
                right={<Pill tone="cyan">Team Unilevel</Pill>}
              />
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

            <div className="pt-2 border-t border-white/[0.04]">
              <button
                type="button"
                disabled={!user || !!tx.busy}
                onClick={() => callPlatform("Harvesting Level Income...", "harvestLevelIncome")}
                className="btn btn-primary w-full py-2.5 text-xs"
              >
                {tx.busy === "Harvesting Level Income..." ? <Spinner /> : "Harvest Level Income"}
              </button>
            </div>
          </section>
        )}

        {/* 4. Working Income & Cap Headroom */}
        {(subTab === "all" || subTab === "working") && (
          <section className="card flex flex-col justify-between gap-4 p-5 sm:p-6">
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
                    {user ? (user.workingCapHeadroom >= 10n ** 30n ? "Unlimited (Top ID)" : usd(user.workingCapHeadroom)) : "—"}
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

            <div className="pt-2 border-t border-white/[0.04]">
              <button
                type="button"
                disabled={!user || user.workingIncomePending === 0n || !!tx.busy}
                onClick={() => {
                  const amt = user ? user.workingIncomePending : 0n;
                  callPlatform("Withdrawing Working Income...", "withdrawWorkingIncome", [amt, vestingOption]);
                }}
                className="btn btn-primary w-full py-2.5 text-xs"
              >
                {tx.busy === "Withdrawing Working Income..." ? (
                  <Spinner />
                ) : (
                  `Withdraw Working Balance (${user ? usd(user.workingIncomePending) : "$0"})`
                )}
              </button>
            </div>
          </section>
        )}

        {/* 5. Rank Salary & Leader Commissions */}
        {(subTab === "all" || subTab === "rank") && (
          <section className="card flex flex-col justify-between gap-4 p-5 sm:p-6">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={depositImage}
                title="5. Rank Salary & Leader Income"
                right={<Pill tone="gold">{user ? RANK_NAMES[user.currentRank] : "Rank 0"}</Pill>}
              />
              <div className="well p-3.5 flex flex-col gap-2">
                <Row
                  label="Current Rank"
                  value={user ? RANK_NAMES[user.currentRank] : "Member"}
                  accent
                />
                <Row
                  label="Pending Leader Income"
                  value={user ? usd(user.leaderIncomePending) : "$0"}
                />
                <Row
                  label="Withdrawn Leader Income"
                  value={user ? usd(user.leaderIncomeWithdrawn) : "$0"}
                />
                <Row
                  label="Unlocked Direct Bonus Slips"
                  value={user ? usd(user.pendingDirectBonusAvailable) : "$0"}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
              <button
                type="button"
                disabled={!user || user.leaderIncomePending === 0n || !!tx.busy}
                onClick={() => callPlatform("Withdrawing Leader Income...", "withdrawLeaderIncome")}
                className="btn btn-primary flex-1 py-2.5 text-xs"
              >
                {tx.busy === "Withdrawing Leader Income..." ? <Spinner /> : "Withdraw Leader"}
              </button>
              <button
                type="button"
                disabled={!user || !!tx.busy}
                onClick={() => callPlatform("Claiming Weekly Salary...", "claimWeeklySalaryBonus")}
                className="btn btn-secondary flex-1 py-2.5 text-xs"
              >
                {tx.busy === "Claiming Weekly Salary..." ? <Spinner /> : "Claim Weekly Salary"}
              </button>
            </div>
          </section>
        )}

        {/* 6. Daily Sponsor & Leader Contests */}
        {(subTab === "all" || subTab === "contests") && (
          <section className="card flex flex-col justify-between gap-4 p-5 sm:p-6">
            <div className="flex flex-col gap-3">
              <CardHeader
                image={leafImage}
                title="6. Daily Contests & Pool Sweeps"
                right={<Pill tone="green">Daily Pools</Pill>}
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="well p-3">
                  <div className="label">Price Contest Rewards</div>
                  <div className="text-base font-semibold text-neon-soft">
                    {user ? usd(user.pendingContestRewards) : "—"}
                  </div>
                </div>
                <div className="well p-3">
                  <div className="label">Leader Contest Rewards</div>
                  <div className="text-base font-semibold text-neon-soft">
                    {user ? usd(user.pendingLeaderContestRewards) : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
              <button
                type="button"
                disabled={!user || user.pendingContestRewards === 0n || !!tx.busy}
                onClick={() => callPlatform("Sweeping Contest Rewards...", "sweepContestRewards", [150n])}
                className="btn btn-primary flex-1 py-2.5 text-xs"
              >
                {tx.busy === "Sweeping Contest Rewards..." ? <Spinner /> : "Sweep Contest (150d)"}
              </button>
              <button
                type="button"
                disabled={!user || user.pendingLeaderContestRewards === 0n || !!tx.busy}
                onClick={() => callPlatform("Sweeping Leader Rewards...", "sweepLeaderContestRewards", [50n])}
                className="btn btn-secondary flex-1 py-2.5 text-xs"
              >
                {tx.busy === "Sweeping Leader Rewards..." ? <Spinner /> : "Sweep Leader (50d)"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
