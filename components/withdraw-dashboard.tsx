"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { CardReceive, Cup, Flash, Profile2User, SecuritySafe, Share, Timer, TrendUp, Wallet3 } from "iconsax-react";
import { platformAbi } from "@/lib/abi";
import { formatWorkingCapHeadroom, usd } from "@/lib/format";
import type { PlatformAddresses, PlatformMarket, PlatformUser } from "@/lib/platform";
import { MIN_WITHDRAWAL_USD, VESTING_OPTIONS } from "@/lib/roi";
import { useLiveIncomeStreams } from "./incomes-dashboard";
import { InfoSheet, SheetBlock } from "./info-sheet";
import { Notice, Row, Spinner, useTx } from "./ui";
import { VestingStreams } from "./vesting-streams";
import { useWallet } from "./wallet";

type Mode = "claim" | "withdraw";

type Item = {
  id: string;
  icon: typeof Wallet3;
  name: string;
  /** Shown on the pill and as the big figure; undefined when the amount can't be read ahead of time. */
  amount?: number;
  /** One line under the amount: where the money goes. */
  note: string;
  min?: number;
  label: string;
  call: { fn: string; args?: readonly unknown[] };
};

const PERCENTS = [25, 50, 75, 100];
const pill = (active: boolean) =>
  active
    ? "border-[#22c55e] bg-[radial-gradient(120%_100%_at_50%_30%,rgba(34,197,94,0.3),rgba(8,38,16,0.7))] text-white"
    : "border-white/10 bg-[#14171d] text-[#b9c2bc] hover:text-white";
const money = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function WithdrawDashboard({
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

  // ROI and booster settle inside their withdraw calls, so show what the contract would pay right now
  const { settledRoi, settledBooster } = useLiveIncomeStreams(user, market?.lhrTier ?? 0);

  const [mode, setMode] = useState<Mode>("claim");
  const [amountStr, setAmountStr] = useState("");
  const [vestingOption, setVestingOption] = useState(0);

  const toUsd = (v: bigint) => Number(formatUnits(v, 18));
  const workingBalance = user ? toUsd(user.workingIncomePending) : 0;
  const poolWins = user?.rewardPoolWins ?? [];

  // Incomes that are claimed first: they land in your working balance (or rank balance), then get withdrawn
  const claimItems: Item[] = [
    { id: "direct", icon: Profile2User, name: "Direct Income", amount: user ? toUsd(user.pendingDirectBonusAvailable) : 0, note: "Goes to your working balance", label: "Claiming Direct Income...", call: { fn: "accrueUserROI", args: account ? [account] : [] } },
    { id: "referral", icon: Share, name: "Referral Income", amount: user ? toUsd(user.levelIncomeHarvestable) : 0, note: "Goes to your working balance", label: "Claiming Level Income...", call: { fn: "harvestLevelIncome" } },
    { id: "prize", icon: Cup, name: "Leader Prize Contest", amount: user ? toUsd(user.pendingContestRewards) : 0, note: "Goes to your working balance", label: "Claiming Contest Income...", call: { fn: "sweepContestRewards", args: [150n] } },
    { id: "daily", icon: Timer, name: "Daily Contest", amount: user ? toUsd(user.pendingLeaderContestRewards) : 0, note: "Goes to your working balance", label: "Claiming Leader Contest Income...", call: { fn: "sweepLeaderContestRewards", args: [50n] } },
    { id: "pool", icon: SecuritySafe, name: "Reward Pool", amount: toUsd(poolWins.reduce((s, w) => s + w.amount, 0n)), note: "Goes to your working balance", label: "Claiming Reward Pool...", call: { fn: "claimRewardPool" } },
  ];

  // Incomes paid straight out in CARB when you claim them
  const payoutItems: Item[] = [
    { id: "roi", icon: TrendUp, name: "Daily ROI", amount: settledRoi, note: "Paid in CARB, 5% fee", min: MIN_WITHDRAWAL_USD, label: "Claiming ROI Income...", call: { fn: "withdrawROI" } },
    { id: "booster", icon: Flash, name: "Booster Income", amount: settledBooster, note: "Paid in CARB, 5% fee", min: MIN_WITHDRAWAL_USD, label: "Claiming Booster Income...", call: { fn: "withdrawBooster" } },
    { id: "leader", icon: Profile2User, name: "Leader Income", amount: user ? toUsd(user.leaderIncomePending + user.pendingLeaderBonusAvailable) : 0, note: "Paid in CARB, 5% fee", label: "Claiming Leader Income...", call: { fn: "withdrawLeaderIncome" } },
    { id: "rankpay", icon: CardReceive, name: "Rank Income", amount: user ? toUsd(user.rankIncomePending + user.rankSalary.totalClaimable) : 0, note: "Weekly salary, unlocked then paid in CARB, 5% fee", min: MIN_WITHDRAWAL_USD, label: "Claiming Rank Income...", call: { fn: "withdrawRankIncome" } },
  ];

  // Only the working balance is withdrawn; every other income is a card on the Claim tab
  const item: Item = { id: "working", icon: Wallet3, name: "Working Balance", amount: workingBalance, note: "Paid in CARB over the time you pick", min: MIN_WITHDRAWAL_USD, label: "Claiming Working Income...", call: { fn: "withdrawWorkingIncome" } };
  // "Claim" pays an income straight out; "Collect" moves it into the working balance, withdrawn below.
  const isPaidOut = (id: string) => payoutItems.some((i) => i.id === id);

  const total = item.amount ?? 0;
  const option = VESTING_OPTIONS.find((o) => o.id === vestingOption) ?? VESTING_OPTIONS[0];
  const typed = amountStr ? Number(amountStr) : total;
  const net = (typed * (100 - option.deductionPct)) / 100;

  const below = item.min !== undefined && typed < item.min;
  const above = typed > total + 1e-9;
  const nothing = item.amount !== undefined && total === 0;
  const hint = !user
    ? null
    : below
    ? `Minimum is $${item.min}`
    : above
    ? "More than your balance"
    : nothing
    ? "Nothing to withdraw yet"
    : null;

  function cardHint(i: Item) {
    if (!user) return null;
    if (i.amount !== undefined && i.amount === 0) return "Nothing to claim yet";
    if (i.min !== undefined && (i.amount ?? 0) < i.min) return `Minimum is $${i.min}`;
    return null;
  }

  async function send(label: string, fn: string, args: readonly unknown[] = [], done = "Claimed. Find it under Withdraw.") {
    if (!addresses || !account) return;
    await tx.run(
      label,
      async () => write({ address: addresses.platform, abi: platformAbi, functionName: fn, args }),
      () => <span>{done}</span>
    );
  }

  async function submit() {
    if (!user || !addresses || !account || !!hint) return;
    const amt = amountStr && Number(amountStr) > 0 ? parseUnits(amountStr, 18) : user.workingIncomePending;
    await send(item.label, "withdrawWorkingIncome", [amt, vestingOption], "Withdrawal confirmed on-chain.");
    setAmountStr("");
  }

  async function claimStream(id: bigint) {
    if (!addresses || !account) return;
    await tx.run(
      `Claiming Stream #${id}...`,
      async () => write({ address: addresses.platform, abi: platformAbi, functionName: "claimVesting", args: [id] }),
      () => <span>Stream claimed. CARB sent to your wallet.</span>
    );
  }

  async function claim(i: Item) {
    if (!user || !addresses || !account || cardHint(i)) return;
    if (i.id === "rankpay") {
      // Two signatures: unlock the weekly salary into the rank balance, then pay the rank balance out
      const unlock = user.rankSalary.totalClaimable > 0n;
      await tx.run(
        i.label,
        async () => {
          let hash: Awaited<ReturnType<typeof write>> | undefined;
          if (unlock) {
            hash = await write({ address: addresses.platform, abi: platformAbi, functionName: "claimWeeklySalaryBonus", args: [] });
          }
          hash = await write({ address: addresses.platform, abi: platformAbi, functionName: "withdrawRankIncome", args: [] });
          return hash;
        },
        () => <span>Paid out on-chain.</span>
      );
      return;
    }
    if (i.id === "pool") {
      // One claimRewardPool call per cycle won; they run back to back
      await tx.run(
        i.label,
        async () => {
          let hash: Awaited<ReturnType<typeof write>> | undefined;
          for (const win of poolWins) {
            hash = await write({ address: addresses.platform, abi: platformAbi, functionName: "claimRewardPool", args: [win.poolType, win.cycleId] });
          }
          return hash as Awaited<ReturnType<typeof write>>;
        },
        () => <span>Claimed. Find it under Withdraw.</span>
      );
      return;
    }
    await send(i.label, i.call.fn, i.call.args ?? [], isPaidOut(i.id) ? "Paid out on-chain." : "Claimed. Find it under Withdraw.");
  }

  const infoSheet = (
    <InfoSheet title="Claim and withdraw">
            <p>
              Some incomes are paid straight out when you withdraw them: Daily ROI, Booster and Leader Income. Others
              are claimed first and land in your working balance or rank balance, and you withdraw them after that.
            </p>
            <SheetBlock title="Claim first">
              <p>Direct Income, Referral Income, Leader Prize Contest, Daily Contest and Reward Pool. Rank Income on the Claim tab unlocks your weekly rank salary and pays it out in one go, so you sign two transactions.</p>
            </SheetBlock>
            <SheetBlock title="Withdraw">
              <dl>
                <Row label="Working balance" value={user ? usd(user.workingIncomePending) : "$0.00"} accent />
                <Row label="Headroom left" value={formatWorkingCapHeadroom(user)} />
                <Row label="Minimum" value={`$${MIN_WITHDRAWAL_USD}`} />
              </dl>
            </SheetBlock>
            <p>Every withdrawal is paid in CARB at the current price, with a 5% deduction (2.5% burned, 2.5% to the reward pools).</p>
    </InfoSheet>
  );


  const renderCard = (i: Item) => {
      const Icon = i.icon;
      const ready = i.amount === undefined || i.amount > 0;
      const blocked = !!cardHint(i);
      return (
        <div key={i.id} className="card torch flex flex-col gap-4 border border-white/[0.08] p-4">
          <div className="flex items-center justify-between">
            <span
              className={`flex size-10 items-center justify-center rounded-2xl ${
                ready ? "bg-neon/10 text-neon" : "bg-white/[0.06] text-muted"
              }`}
            >
              <Icon size={22} color="currentColor" variant="Bulk" />
            </span>
            {ready && <span className="size-2 rounded-full bg-neon shadow-[0_0_8px_#1fe03a]" aria-label="Ready" />}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">{i.name}</span>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-lg ${ready ? "text-white" : "text-muted"}`}>
                {i.amount === undefined ? "—" : money(i.amount)}
              </span>
              <button
                type="button"
                disabled={!user || blocked || !!tx.busy}
                onClick={() => claim(i)}
                className="btn btn-primary !rounded-lg !px-2.5 !py-1 text-2xs font-semibold"
              >
                {tx.busy === i.label ? <Spinner /> : isPaidOut(i.id) ? "Claim" : "Collect"}
              </button>
            </div>
          </div>
        </div>
      );
    };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}

      {/* Claim first, then withdraw */}
      <div className="grid grid-cols-2 gap-2">
        {(["claim", "withdraw"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setAmountStr("");
            }}
            className={`cursor-pointer rounded-2xl py-3 text-sm font-semibold transition ${
              mode === m ? "btn btn-primary !rounded-2xl !py-3" : "bg-[#1b1f26] text-[#b9c2bc] hover:text-white"
            }`}
          >
            {m === "claim" ? "Claim" : "Withdraw"}
          </button>
        ))}
      </div>

      {mode === "claim" && (
        <section className="flex flex-col gap-3" aria-label="Claim incomes">
          <div className="flex items-center justify-between gap-3 px-1">
            <h3 className="text-sm font-medium text-text">Claim your incomes</h3>
            {infoSheet}
          </div>
          <div className="grid grid-cols-2 gap-3">{payoutItems.map(renderCard)}</div>
        </section>
      )}

      {mode === "withdraw" && (
        <section className="flex flex-col gap-3" aria-label="Collect incomes">
          <h3 className="px-1 text-sm font-medium text-text">Collect into working balance</h3>
          <div className="grid grid-cols-2 gap-3">{claimItems.map(renderCard)}</div>
        </section>
      )}

      {mode === "withdraw" && (
      <section className="card flex flex-col gap-5 p-5 sm:p-6" aria-label="Withdraw">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-text">{item.name}</h3>
          {infoSheet}
        </div>

        {/* Most you can withdraw: everything collected so far */}
        <div className="well flex items-center justify-between gap-3 p-4">
          <div>
            <div className="text-xs text-muted">Working balance</div>
            <div className="mt-0.5 text-2xl font-medium text-white">{money(total)}</div>
          </div>
          <div className="text-right text-xs text-muted">
            Max you can withdraw
            <div className="mt-0.5 text-sm text-neon-soft">{money(total)}</div>
          </div>
        </div>

        {/* 2. The amount */}
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-medium text-muted">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                aria-label="Amount to withdraw"
                placeholder={total ? total.toFixed(2) : "0"}
                style={{ fontSize: 36, width: `${Math.max(3, (amountStr || total.toFixed(2)).length + 1)}ch` }}
                className="min-w-[2ch] max-w-full bg-transparent text-center font-medium text-white outline-none placeholder:text-muted/50"
              />
            </div>
            <div className={`text-xs ${hint ? "text-danger" : "text-muted"}`}>{hint ?? item.note}</div>
            <div className="grid w-full grid-cols-4 gap-2">
              {PERCENTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={!user}
                  onClick={() => setAmountStr(p === 100 ? formatUnits(user!.workingIncomePending, 18) : ((total * p) / 100).toFixed(2))}
                  className="cursor-pointer rounded-xl border border-white/10 bg-[#14171d] py-2 text-xs font-medium text-[#b9c2bc] transition hover:text-white disabled:opacity-40"
                >
                  {p === 100 ? "Max" : `${p}%`}
                </button>
              ))}
            </div>

            <div className="grid w-full grid-cols-5 gap-2">
              {VESTING_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setVestingOption(o.id)}
                  className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-2xl border py-2.5 text-xs font-medium transition ${pill(vestingOption === o.id)}`}
                >
                  <span>{o.duration.replace(" hours", "h").replace(" days", "d").replace(" day", "d")}</span>
                  <span className="text-2xs opacity-80">−{o.deductionPct}%</span>
                </button>
              ))}
            </div>

            <div className="grid w-full grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted">You get</div>
                <div className="mt-0.5 text-base text-white">{money(Math.max(0, net))}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Paid over</div>
                <div className="mt-0.5 text-base text-white">{option.duration}</div>
              </div>
            </div>
          </div>

        {/* 3. One button */}
        <button
          type="button"
          disabled={!user || !!hint || !!tx.busy}
          onClick={submit}
          className="btn btn-primary w-full py-3 text-sm font-semibold"
        >
          {tx.busy === item.label ? <Spinner /> : `Withdraw ${money(Math.max(0, typed))}`}
        </button>
      </section>
      )}

      {mode === "withdraw" && (
        <VestingStreams account={account ?? undefined} refreshKey={user} busy={tx.busy} onClaim={claimStream} />
      )}
    </div>
  );
}
