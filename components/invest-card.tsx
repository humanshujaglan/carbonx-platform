"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { erc20Abi, platformAbi } from "@/lib/abi";
import { packageRates } from "@/lib/roi";
import { LOCK_DETAILS, LockType, MIN_DEPOSIT_USDT, MAX_DEPOSIT_USDT } from "@/lib/config";
import { usd } from "@/lib/format";
import type { PlatformAddresses, PlatformUser } from "@/lib/platform";
import { Notice, Row, Spinner, useTx } from "./ui";
import { InfoSheet, SheetBlock } from "./info-sheet";
import { useWallet } from "./wallet";

const PRESET_AMOUNTS = [10, 100, 500, 1000, 5000];
const PLANS = [LockType.FLEXIBLE, LockType.LOCKED_100, LockType.LOCKED_50] as const;
const PLAN_LABEL: Record<LockType, string> = {
  [LockType.FLEXIBLE]: "Flexible",
  [LockType.LOCKED_100]: "Locked",
  [LockType.LOCKED_50]: "50/50",
};
const INVEST_LABEL = "Investing...";

export function InvestCard({
  addresses,
  user,
  lhrTier = 0,
  onDone,
}: {
  addresses?: PlatformAddresses;
  user?: PlatformUser;
  lhrTier?: number;
  onDone: () => void;
}) {
  const { account, hasWallet, connect, write } = useWallet();
  const tx = useTx(onDone);

  const [amountStr, setAmountStr] = useState<string>("1000");
  const [selectedLock, setSelectedLock] = useState<LockType>(LockType.LOCKED_100);

  const depositUsdt = (() => {
    try {
      const parsed = parseFloat(amountStr || "0");
      if (isNaN(parsed) || parsed <= 0) return 0n;
      return parseUnits(amountStr, 18);
    } catch {
      return 0n;
    }
  })();

  const isBelowMin = depositUsdt < MIN_DEPOSIT_USDT;
  const isAboveMax = depositUsdt > MAX_DEPOSIT_USDT;
  const lockInfo = LOCK_DETAILS[selectedLock];
  const lockRates = packageRates(selectedLock, lhrTier);
  const amountUsd = Number(depositUsdt) / 1e18;
  const estDailyUsd = (amountUsd * lockRates.avgDailyPct) / 100;
  const maxCapUsd = amountUsd * lockInfo.capMultiplier;
  const notEnough = !!user && depositUsdt > user.usdtBalance;

  const needsApproval = !!addresses && !!user && user.usdtAllowance < depositUsdt && depositUsdt > 0n;
  const invalid = isBelowMin || isAboveMax || notEnough;
  const hint = isBelowMin
    ? "Minimum is $10"
    : isAboveMax
    ? "Maximum is $5,000"
    : notEnough
    ? "Not enough USDT in your wallet"
    : null;

  // One tap: approve first when needed, then invest
  async function handleInvest() {
    if (!addresses || !account || invalid) return;
    await tx.run(
      INVEST_LABEL,
      async () => {
        if (needsApproval) {
          await write({
            address: addresses.usdt,
            abi: erc20Abi,
            functionName: "approve",
            args: [addresses.platform, 2n ** 256n - 1n],
          });
        }
        return write({
          address: addresses.platform,
          abi: platformAbi,
          functionName: "invest",
          args: [depositUsdt, selectedLock],
        });
      },
      () => <span>Package activated!</span>
    );
  }

  return (
    <section className="card flex flex-col gap-5 p-5 sm:p-6" aria-label="Create new package">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-text">Invest</h3>
        <div className="flex items-center gap-3">
          {user && <span className="text-xs text-muted">Balance {usd(user.usdtBalance)}</span>}
          <InfoSheet title="Investment plans">
            <p>Pick how your package earns. Every plan can earn up to 2.5x of your amount.</p>
            {PLANS.map((type) => (
              <SheetBlock key={type} title={LOCK_DETAILS[type].name}>
                <p>{LOCK_DETAILS[type].description}</p>
              </SheetBlock>
            ))}
            <SheetBlock title="After you invest">
              <dl>
                <Row label="Active deposit" value={user ? usd(user.totalActiveDeposit + depositUsdt) : "—"} accent />
                {user && user.boosterTier > 0 && (
                  <Row label="Booster" value={`Tier ${user.boosterTier} on your first package`} />
                )}
              </dl>
            </SheetBlock>
          </InfoSheet>
        </div>
      </div>

      {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}

      {/* Amount */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-medium text-muted">$</span>
          <input
            id="invest-amount-input"
            type="number"
            inputMode="decimal"
            min="10"
            step="10"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            aria-label="Amount in USDT"
            placeholder="0"
            style={{ fontSize: 36, width: `${Math.max(2, amountStr.length + 1)}ch` }}
            className="min-w-[2ch] max-w-full bg-transparent text-center font-medium text-white outline-none placeholder:text-muted/50"
          />
        </div>
        <div className={`text-xs ${hint ? "text-danger" : "text-muted"}`}>{hint ?? "USDT"}</div>

        <div className="grid w-full grid-cols-5 gap-2">
          {PRESET_AMOUNTS.map((amt) => {
            const active = amountStr === String(amt);
            return (
              <button
                key={amt}
                type="button"
                onClick={() => setAmountStr(String(amt))}
                className={`cursor-pointer rounded-xl border py-2 text-xs font-medium transition ${
                  active
                    ? "border-[#22c55e] bg-[#0a1b0f] text-white"
                    : "border-white/10 bg-[#14171d] text-[#b9c2bc] hover:text-white"
                }`}
              >
                {amt >= 1000 ? `${amt / 1000}K` : amt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Plan */}
      <div className="grid grid-cols-3 gap-2">
        {PLANS.map((type) => {
          const active = selectedLock === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedLock(type)}
              className={`cursor-pointer rounded-2xl border py-3 text-sm font-medium transition ${
                active
                  ? "border-[#22c55e] bg-[radial-gradient(120%_100%_at_50%_30%,rgba(34,197,94,0.3),rgba(8,38,16,0.7))] text-white"
                  : "border-white/10 bg-[#14171d] text-[#b9c2bc] hover:text-white"
              }`}
            >
              {PLAN_LABEL[type]}
            </button>
          );
        })}
      </div>

      {/* What you get */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted">Earns about</div>
          <div className="mt-0.5 text-base text-white">
            ${estDailyUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} / day
          </div>
        </div>
        <div>
          <div className="text-xs text-muted">Up to</div>
          <div className="mt-0.5 text-base text-white">
            ${maxCapUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* One button */}
      {!account ? (
        <button
          type="button"
          disabled={!hasWallet}
          onClick={() => connect().catch(() => {})}
          className="btn btn-primary w-full py-3 text-sm font-semibold"
        >
          {hasWallet ? "Connect wallet" : "Install a wallet"}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={Boolean(tx.busy) || invalid}
            onClick={handleInvest}
            className="btn btn-primary w-full py-3 text-sm font-semibold"
          >
            {tx.busy === INVEST_LABEL ? <Spinner /> : `Invest $${amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          </button>
          {needsApproval && !invalid && (
            <span className="text-2xs text-muted">First time: you confirm an approval, then the investment.</span>
          )}
        </div>
      )}
    </section>
  );
}
