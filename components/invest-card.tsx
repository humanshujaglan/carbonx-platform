"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import walletImage from "@/public/wallet.png";
import { erc20Abi, platformAbi } from "@/lib/abi";
import { packageRates } from "@/lib/roi";
import { LOCK_DETAILS, LockType, MIN_DEPOSIT_USDT, MAX_DEPOSIT_USDT } from "@/lib/config";
import { usd } from "@/lib/format";
import type { PlatformAddresses, PlatformUser } from "@/lib/platform";
import { CardHeader, Notice, Pill, Spinner, useTx } from "./ui";
import { useWallet } from "./wallet";

const PRESET_AMOUNTS = [100, 500, 1000, 2500, 5000];

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
  const estDailyUsd = ((Number(depositUsdt) / 1e18) * lockRates.avgDailyPct) / 100;
  const maxCapUsd = (Number(depositUsdt) / 1e18) * lockInfo.capMultiplier;

  const needsApproval =
    !!addresses && !!user && user.usdtAllowance < depositUsdt && depositUsdt > 0n;

  async function handleApprove() {
    if (!addresses || !account) return;
    await tx.run(
      "Approving USDT...",
      async () => {
        return write({
          address: addresses.usdt,
          abi: erc20Abi,
          functionName: "approve",
          args: [addresses.platform, 2n ** 256n - 1n],
        });
      },
      (hash) => <span>USDT approved. You can now activate your package.</span>
    );
  }

  async function handleInvest() {
    if (!addresses || !account || isBelowMin || isAboveMax) return;

    await tx.run(
      "Creating investment package...",
      async () => {
        return write({
          address: addresses.platform,
          abi: platformAbi,
          functionName: "invest",
          args: [depositUsdt, selectedLock],
        });
      },
      (hash) => <span>New package activated successfully!</span>
    );
  }

  return (
    <section className="card flex flex-col gap-5 p-5 sm:p-6" aria-label="Create new package">
      <CardHeader
        image={walletImage}
        title="Activate Additional Package"
        right={<Pill tone="gold">Max $5,000</Pill>}
      />

      {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}
      {isBelowMin && (
        <Notice tone="warn">Minimum investment package is 100 USDT.</Notice>
      )}
      {isAboveMax && (
        <Notice tone="error">Maximum investment package is 5,000 USDT.</Notice>
      )}

      {/* Package Amount */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="invest-amount-input" className="label uppercase tracking-wider text-muted">
            Deposit Amount (USDT)
          </label>
          {user && (
            <span className="text-2xs text-muted">
              Available: <strong className="font-medium text-text">{usd(user.usdtBalance)}</strong>
            </span>
          )}
        </div>

        <div className="relative">
          <input
            id="invest-amount-input"
            type="number"
            min="50"
            step="10"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="well w-full py-3.5 pl-4 pr-20 text-xl font-semibold text-text outline-none transition focus:border-neon/50"
            placeholder="50"
          />
          <div className="absolute inset-y-0 right-3 flex items-center gap-1.5 pointer-events-none">
            <span className="rounded-md bg-white/[0.08] px-2 py-1 text-xs font-semibold text-text">USDT</span>
          </div>
        </div>

        {/* Preset Chips */}
        <div className="grid grid-cols-5 gap-1.5">
          {PRESET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setAmountStr(String(amt))}
              className={`rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
                amountStr === String(amt)
                  ? "bg-neon text-[#03140a] shadow-[0_0_12px_rgba(31,224,58,0.4)]"
                  : "well text-muted hover:text-white"
              }`}
            >
              ${amt.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Lock Strategy */}
      <div className="flex flex-col gap-2">
        <label className="label uppercase tracking-wider text-muted">Investment Plan</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              LockType.FLEXIBLE,
              LockType.LOCKED_100,
              LockType.LOCKED_50,
            ] as const
          ).map((type) => {
            const item = LOCK_DETAILS[type];
            const isSelected = selectedLock === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedLock(type)}
                className={`relative flex flex-col gap-1.5 rounded-2xl p-3.5 text-left transition cursor-pointer ${
                  isSelected
                    ? "bg-panel-2 border border-neon/50 shadow-[0_0_14px_rgba(31,224,58,0.2)]"
                    : "well hover:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${isSelected ? "text-neon-soft" : "text-text"}`}>
                    {item.name}
                  </span>
                  {isSelected && <span className="size-2 rounded-full bg-neon animate-pulse" />}
                </div>
                <div className="text-2xs font-medium text-neon-soft">{item.tagline}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Projected Summary */}
      <div className="well p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Estimated Base Return:</span>
          <span className="font-semibold text-neon-soft">
            ~${estDailyUsd.toFixed(2)} / day avg (~{lockRates.monthlyPct.toFixed(2)}% / month)
          </span>
        </div>
        {user && user.boosterTier > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Personal Booster Bonus:</span>
            <span className="font-semibold text-gold">
              Tier {user.boosterTier}: {user.boosterTier >= 3 ? "full" : `${user.boosterTier}/3 of`} flexible schedule on first package
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Maximum Earnings Ceiling (2.5x):</span>
          <span className="font-semibold text-text">
            ${maxCapUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT (250% Cap)
          </span>
        </div>
        <div className="flex items-center justify-between text-xs border-t border-white/[0.04] pt-2">
          <span className="text-muted">Personal Active Deposit After:</span>
          <span className="font-medium text-neon-soft">
            {user ? usd(user.totalActiveDeposit + depositUsdt) : "—"}
          </span>
        </div>
      </div>

      {/* Actions */}
      {!account ? (
        <button
          type="button"
          disabled={!hasWallet}
          onClick={() => connect().catch(() => {})}
          className="btn btn-primary w-full py-3.5 text-sm"
        >
          {hasWallet ? "Connect Wallet to Invest" : "Install Web3 Wallet"}
        </button>
      ) : needsApproval ? (
        <button
          type="button"
          disabled={Boolean(tx.busy) || isBelowMin || isAboveMax}
          onClick={handleApprove}
          className="btn btn-primary w-full py-3.5 text-sm"
        >
          {tx.busy === "Approving USDT..." ? <Spinner /> : "Approve USDT"}
        </button>
      ) : (
        <button
          type="button"
          disabled={Boolean(tx.busy) || isBelowMin || isAboveMax}
          onClick={handleInvest}
          className="btn btn-primary w-full py-3.5 text-sm"
        >
          {tx.busy === "Creating investment package..." ? (
            <span className="flex items-center gap-2">
              <Spinner />
              Confirming Deposit...
            </span>
          ) : isAboveMax ? (
            "Exceeds 5,000 USDT Max Limit"
          ) : (
            `Invest $${Number(depositUsdt / 10n ** 18n).toLocaleString()} USDT`
          )}
        </button>
      )}
    </section>
  );
}
