"use client";

import { useState } from "react";
import Image from "next/image";
import { formatUnits, parseUnits } from "viem";
import leafImage from "@/public/leave.png";
import analysisImage from "@/public/analysis.png";
import timerImage from "@/public/timer.png";
import walletImage from "@/public/wallet.png";
import depositImage from "@/public/deposit.png";
import { platformAbi } from "@/lib/abi";
import { formatWorkingCapHeadroom, usd } from "@/lib/format";
import type { PlatformAddresses, PlatformUser } from "@/lib/platform";
import { CardHeader, Notice, Pill, Row, Spinner, useTx } from "./ui";
import { useWallet } from "./wallet";
import {
  ArrowDown2,
  CardReceive,
  Flash,
  Hierarchy,
  SecuritySafe,
  TickCircle,
  Timer,
  TrendUp,
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

export function WithdrawDashboard({
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

  const [workingAmountStr, setWorkingAmountStr] = useState<string>("");
  const [vestingOption, setVestingOption] = useState<number>(0);

  // Quick total calculations
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
      () => <span>Withdrawal submitted and confirmed on-chain!</span>
    );
  }

  // Handle Working Income input amount
  const workingBalanceMax = user ? user.workingIncomePending : 0n;
  const workingBalanceNum = Number(formatUnits(workingBalanceMax, 18));

  const setWorkingPercent = (pct: number) => {
    if (!user) return;
    if (pct === 100) {
      setWorkingAmountStr(formatUnits(workingBalanceMax, 18));
    } else {
      const fraction = (workingBalanceNum * pct) / 100;
      setWorkingAmountStr(fraction.toFixed(2));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Transaction Result Notice */}
      {tx.result && (
        <Notice tone={tx.result.tone}>{tx.result.text}</Notice>
      )}

      {/* Hero Overview Card */}
      <section className="card p-6 sm:p-7 border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-neon/15 text-neon">
                <CardReceive size={16} color="#1fe03a" variant="Bold" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Withdrawal & Payout Portal
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {user ? usd(totalPending) : "$0.00"}
              </h1>
              <span className="text-xs font-semibold text-muted">Total Available</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              Live accrued yield across Daily ROI, Booster, Level Harvest, Working Balance, and Contests.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 text-xs">
            <div className="well px-3.5 py-2 flex items-center gap-2">
              <span className="text-muted">Lifetime Withdrawn:</span>
              <span className="font-bold text-white">{user ? usd(totalWithdrawn) : "$0.00"}</span>
            </div>
            <div className="well px-3.5 py-2 flex items-center gap-2">
              <span className="text-muted">Cap Headroom:</span>
              <span className="font-bold text-neon-soft">
                {formatWorkingCapHeadroom(user)}
              </span>
            </div>
          </div>
        </div>

        {/* Stat Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/[0.06]">
          <div className="well p-3.5">
            <div className="text-[11px] text-muted">Available Daily ROI</div>
            <div className="mt-1 text-lg font-bold text-neon-soft">
              {user ? usd(user.roiIncomePending) : "$0.00"}
            </div>
          </div>
          <div className="well p-3.5">
            <div className="text-[11px] text-muted">Working Balance</div>
            <div className="mt-1 text-lg font-bold text-neon-soft">
              {user ? usd(user.workingIncomePending) : "$0.00"}
            </div>
          </div>
          <div className="well p-3.5">
            <div className="text-[11px] text-muted">Booster Yield</div>
            <div className="mt-1 text-lg font-bold text-neon-soft">
              {user ? usd(user.boosterIncomePending) : "$0.00"}
            </div>
          </div>
          <div className="well p-3.5">
            <div className="text-[11px] text-muted">Contests & Pools</div>
            <div className="mt-1 text-lg font-bold text-neon-soft">
              {user ? usd(user.pendingContestRewards + user.pendingLeaderContestRewards) : "$0.00"}
            </div>
          </div>
        </div>
      </section>

      {/* Main Withdrawal Streams Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. Daily ROI Yield Withdrawal */}
        <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08]">
          <div className="flex flex-col gap-4">
            <CardHeader
              image={timerImage}
              title="Daily Package ROI Yield"
              right={<Pill tone="green">Daily 1.0% - 1.5%</Pill>}
            />
            <p className="text-xs text-muted leading-relaxed">
              Real-time daily yield accrued from your active deposits. Can be withdrawn at any time directly into your connected wallet.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="well p-3.5">
                <div className="text-[11px] text-muted">Claimable ROI</div>
                <div className="text-lg font-bold text-neon-soft">
                  {user ? usd(user.roiIncomePending) : "$0.00"}
                </div>
              </div>
              <div className="well p-3.5">
                <div className="text-[11px] text-muted">Total ROI Withdrawn</div>
                <div className="text-lg font-bold text-white">
                  {user ? usd(user.roiIncomeWithdrawn) : "$0.00"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              disabled={!user || user.roiIncomePending === 0n || !!tx.busy}
              onClick={() => callPlatform("Claiming ROI Income...", "withdrawROI")}
              className="btn btn-primary flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2"
            >
              {tx.busy === "Claiming ROI Income..." ? <Spinner /> : (
                <>
                  <ArrowDown2 size={16} />
                  <span>Claim ROI Income ({user ? usd(user.roiIncomePending) : "$0.00"})</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={!user || !!tx.busy}
              onClick={() => callPlatform("Claiming / Accruing ROI...", "accrueRange", [0n, 50n])}
              className="btn btn-secondary py-3 px-3.5 text-xs font-semibold"
              title="Batch accrual for large package holders"
            >
              Claim / Accrue All
            </button>
          </div>
        </section>

        {/* 2. Working Income Payout & Custom Amount */}
        <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08]">
          <div className="flex flex-col gap-4">
            <CardHeader
              image={walletImage}
              title="Working Balance Withdrawal"
              right={<Pill tone="gold">Working Cap</Pill>}
            />
            <p className="text-xs text-muted leading-relaxed">
              Commissions from downline unilevel harvest, direct bonuses, and network volume. Choose instant payout or linear vesting.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="well p-3.5">
                <div className="text-[11px] text-muted">Working Balance</div>
                <div className="text-lg font-bold text-neon-soft">
                  {user ? usd(user.workingIncomePending) : "$0.00"}
                </div>
              </div>
              <div className="well p-3.5">
                <div className="text-[11px] text-muted">Headroom Remaining</div>
                <div className="text-lg font-bold text-white">
                  {formatWorkingCapHeadroom(user)}
                </div>
              </div>
            </div>

            {/* Custom Amount Input & Quick Pct Buttons */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Withdrawal Amount (USDT)</span>
                <span className="text-muted">Max: {user ? usd(user.workingIncomePending) : "$0.00"}</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="number"
                  placeholder={user ? formatUnits(user.workingIncomePending, 18) : "0.00"}
                  value={workingAmountStr}
                  onChange={(e) => setWorkingAmountStr(e.target.value)}
                  className="w-full rounded-2xl bg-[#0c120e] px-4 py-3 text-sm font-semibold text-white placeholder-zinc-600 border border-white/[0.08] focus:border-neon/40 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setWorkingPercent(100)}
                  className="absolute right-2 rounded-xl bg-neon/15 px-3 py-1.5 text-xs font-bold text-neon hover:bg-neon/25 transition cursor-pointer"
                >
                  MAX
                </button>
              </div>

              {/* Quick Select Buttons */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setWorkingPercent(p)}
                    className="rounded-xl well py-1.5 text-center text-xs font-medium text-muted hover:text-white hover:border-neon/30 transition cursor-pointer"
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            {/* Vesting Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setVestingOption(0)}
                className={`rounded-2xl p-3 text-center text-xs font-medium transition cursor-pointer ${
                  vestingOption === 0
                    ? "bg-neon/15 text-neon border border-neon/40 font-semibold shadow-[0_0_12px_rgba(31,224,58,0.15)]"
                    : "well text-muted hover:text-white"
                }`}
              >
                Instant Payout (100%)
              </button>
              <button
                type="button"
                onClick={() => setVestingOption(1)}
                className={`rounded-2xl p-3 text-center text-xs font-medium transition cursor-pointer ${
                  vestingOption === 1
                    ? "bg-neon/15 text-neon border border-neon/40 font-semibold shadow-[0_0_12px_rgba(31,224,58,0.15)]"
                    : "well text-muted hover:text-white"
                }`}
              >
                Linear Vesting
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              disabled={!user || user.workingIncomePending === 0n || !!tx.busy}
              onClick={() => {
                if (!user) return;
                const amt = workingAmountStr && Number(workingAmountStr) > 0
                  ? parseUnits(workingAmountStr, 18)
                  : user.workingIncomePending;
                callPlatform("Claiming Working Income...", "withdrawWorkingIncome", [amt, vestingOption]);
              }}
              className="btn btn-primary w-full py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2"
            >
              {tx.busy === "Claiming Working Income..." ? (
                <Spinner />
              ) : (
                <>
                  <ArrowDown2 size={16} />
                  <span>Claim Working Income</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* 3. Daily Booster Yield Withdrawal */}
        <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08]">
          <div className="flex flex-col gap-4">
            <CardHeader
              image={leafImage}
              title="Daily Booster Income"
              right={
                <Pill tone={user && user.boosterTier > 0 ? "gold" : "neutral"}>
                  Tier {user?.boosterTier ?? 0} (+{(user?.boosterTier ?? 0) * 0.1}%)
                </Pill>
              }
            />
            <p className="text-xs text-muted leading-relaxed">
              Accelerated daily yield unlocked through direct sponsor volume. Tier progression up to +0.5% daily boost.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="well p-3.5">
                <div className="text-[11px] text-muted">Claimable Booster</div>
                <div className="text-lg font-bold text-neon-soft">
                  {user ? usd(user.boosterIncomePending) : "$0.00"}
                </div>
              </div>
              <div className="well p-3.5">
                <div className="text-[11px] text-muted">Total Booster Withdrawn</div>
                <div className="text-lg font-bold text-white">
                  {user ? usd(user.boosterIncomeWithdrawn) : "$0.00"}
                </div>
              </div>
            </div>

            <div className="well p-3.5 flex items-center justify-between text-xs">
              <span className="text-muted">Total Direct Volume:</span>
              <span className="font-semibold text-white">{user ? usd(user.totalDirectBusiness) : "$0.00"}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              disabled={!user || user.boosterIncomePending === 0n || !!tx.busy}
              onClick={() => callPlatform("Claiming Booster Income...", "withdrawBooster")}
              className="btn btn-primary w-full py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2"
            >
              {tx.busy === "Claiming Booster Income..." ? <Spinner /> : (
                <>
                  <ArrowDown2 size={16} />
                  <span>Claim Booster Income ({user ? usd(user.boosterIncomePending) : "$0.00"})</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* 4. Leader Income (BDF) & Rank Salary */}
        <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08]">
          <div className="flex flex-col gap-4">
            <CardHeader
              image={depositImage}
              title="Leader Income (Business Dev Fund) & Rank Salary"
              right={<Pill tone="gold">BDF & Rank</Pill>}
            />
            <p className="text-xs text-muted leading-relaxed">
              Business Development Fund (BDF) for qualifying team leaders, plus weekly career rank milestone salaries.
            </p>

            <div className="well p-3.5 flex flex-col gap-2">
              <Row
                label="Current Rank"
                value={user ? RANK_NAMES[user.currentRank] : "Member"}
                accent
              />
              <Row
                label="Pending Leader / BDF Income"
                value={user ? usd(user.leaderIncomePending) : "$0.00"}
              />
              <Row
                label="Total Leader / BDF Withdrawn"
                value={user ? usd(user.leaderIncomeWithdrawn) : "$0.00"}
              />
              <Row
                label="Unlocked Direct Referral Slips"
                value={user ? usd(user.pendingDirectBonusAvailable) : "$0.00"}
              />
              <Row
                label="Direct Lock-In (Locked Slips)"
                value={user ? usd(user.pendingDirectBonusLocked) : "$0.00"}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              disabled={!user || user.leaderIncomePending === 0n || !!tx.busy}
              onClick={() => callPlatform("Claiming Leader Income...", "withdrawLeaderIncome")}
              className="btn btn-primary flex-1 py-3 text-xs font-bold"
            >
              {tx.busy === "Claiming Leader Income..." ? (
                <Spinner />
              ) : (
                `Claim Leader Income (${user ? usd(user.leaderIncomePending) : "$0.00"})`
              )}
            </button>
            <button
              type="button"
              disabled={!user || !!tx.busy}
              onClick={() => callPlatform("Claiming Rank Salary Income...", "claimWeeklySalaryBonus")}
              className="btn btn-secondary flex-1 py-3 text-xs font-semibold"
            >
              {tx.busy === "Claiming Rank Salary Income..." ? <Spinner /> : "Claim Rank Salary Income"}
            </button>
          </div>
        </section>

        {/* 5. Downline Level Harvest */}
        <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08]">
          <div className="flex flex-col gap-4">
            <CardHeader
              image={analysisImage}
              title="Team Level Harvest"
              right={<Pill tone="cyan">Unilevel Tree</Pill>}
            />
            <p className="text-xs text-muted leading-relaxed">
              Trigger on-chain distribution of all pending unilevel downline earnings directly into your working balance.
            </p>

            <div className="well p-3.5 flex flex-col gap-2">
              <Row
                label="Direct Downlines Active"
                value={`${user?.activeDirectCount ?? 0} sponsors`}
              />
              <Row
                label="Total Team Volume"
                value={user ? usd(user.totalTeamBusiness) : "$0.00"}
                accent
              />
              <Row
                label="Power Leg Business"
                value={user ? usd(user.powerLegBusiness) : "$0.00"}
              />
              <Row
                label="Weaker Legs Business"
                value={user ? usd(user.weakerLegBusiness) : "$0.00"}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              disabled={!user || !!tx.busy}
              onClick={() => callPlatform("Claiming Level Income...", "harvestLevelIncome")}
              className="btn btn-primary w-full py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2"
            >
              {tx.busy === "Claiming Level Income..." ? <Spinner /> : (
                <>
                  <Hierarchy size={16} />
                  <span>Claim Level Income</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* 6. Daily Contests & Pool Sweeps */}
        <section className="card flex flex-col justify-between gap-5 p-5 sm:p-6 border border-white/[0.08]">
          <div className="flex flex-col gap-4">
            <CardHeader
              image={leafImage}
              title="Daily Contests & Sweep Pools"
              right={<Pill tone="green">Daily Pools</Pill>}
            />
            <p className="text-xs text-muted leading-relaxed">
              Sweep accumulated daily community prize pools and leader rewards over historical cycle windows.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="well p-3.5">
                <div className="text-[11px] text-muted">Price Contest Rewards</div>
                <div className="text-lg font-bold text-neon-soft">
                  {user ? usd(user.pendingContestRewards) : "$0.00"}
                </div>
              </div>
              <div className="well p-3.5">
                <div className="text-[11px] text-muted">Leader Contest Rewards</div>
                <div className="text-lg font-bold text-neon-soft">
                  {user ? usd(user.pendingLeaderContestRewards) : "$0.00"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              disabled={!user || user.pendingContestRewards === 0n || !!tx.busy}
              onClick={() => callPlatform("Claiming Contest Income...", "sweepContestRewards", [150n])}
              className="btn btn-primary flex-1 py-3 text-xs font-bold"
            >
              {tx.busy === "Claiming Contest Income..." ? <Spinner /> : "Claim Contest Income"}
            </button>
            <button
              type="button"
              disabled={!user || user.pendingLeaderContestRewards === 0n || !!tx.busy}
              onClick={() => callPlatform("Claiming Leader Contest Income...", "sweepLeaderContestRewards", [50n])}
              className="btn btn-secondary flex-1 py-3 text-xs font-semibold"
            >
              {tx.busy === "Claiming Leader Contest Income..." ? <Spinner /> : "Claim Leader Contest Income"}
            </button>
          </div>
        </section>
      </div>

      {/* Protocol Safety & Fee Policy Footer */}
      <section className="card p-5 sm:p-6 border border-white/[0.08] flex items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-neon/15 text-neon mt-0.5">
          <SecuritySafe size={18} color="#1fe03a" variant="Bold" />
        </span>
        <div className="flex flex-col gap-1 text-xs text-muted leading-relaxed">
          <span className="font-semibold text-white">Smart Contract Withdrawal Safety</span>
          <p>
            Withdrawals on CarbonX are executed peer-to-peer on Binance Smart Chain Testnet. Yield is settled in USDT and CARB tokens directly to your connected wallet address. Protocol fee deductions (5% admin, 5% liquidity pool) are handled automatically by the audited contract engine.
          </p>
        </div>
      </section>
    </div>
  );
}
