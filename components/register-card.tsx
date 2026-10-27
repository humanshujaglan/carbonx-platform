"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { type Address, isAddress, parseUnits } from "viem";
import depositImage from "@/public/deposit.png";
import leafImage from "@/public/leave.png";
import { erc20Abi, platformAbi } from "@/lib/abi";
import { packageRates } from "@/lib/roi";
import { LOCK_DETAILS, LockType, MIN_DEPOSIT_USDT, MAX_DEPOSIT_USDT } from "@/lib/config";
import { usd } from "@/lib/format";
import type { PlatformAddresses, PlatformUser } from "@/lib/platform";
import { CardHeader, Notice, Pill, Spinner, useTx } from "./ui";
import { useWallet } from "./wallet";

const PRESET_AMOUNTS = [100, 500, 1000, 2500, 5000];

export function RegisterCard({
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

  const [sponsorInput, setSponsorInput] = useState<string>("");
  const [leaderCodeInput, setLeaderCodeInput] = useState<string>("0");
  const [amountStr, setAmountStr] = useState<string>("1000");
  const [selectedLock, setSelectedLock] = useState<LockType>(LockType.LOCKED_100);

  // Auto-detect referral sponsor from URL query param ?ref=0x...
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get("ref");
      if (ref && isAddress(ref)) {
        setSponsorInput(ref);
      }
    }
  }, []);

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

  const onChainTopId = addresses?.topId && addresses.topId !== "0x0000000000000000000000000000000000000000" ? addresses.topId : undefined;
  const resolvedSponsor: Address | undefined =
    sponsorInput && isAddress(sponsorInput) ? (sponsorInput as Address) : onChainTopId;

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
      (hash) => <span>USDT approved successfully. You can now register.</span>
    );
  }

  async function handleRegister() {
    if (!addresses || !account || !resolvedSponsor || isBelowMin || isAboveMax) return;
    const leaderCodeNum = BigInt(leaderCodeInput.trim() || "0");

    await tx.run(
      "Registering on platform...",
      async () => {
        return write({
          address: addresses.platform,
          abi: platformAbi,
          functionName: "register",
          args: [resolvedSponsor, leaderCodeNum, depositUsdt, selectedLock],
        });
      },
      (hash) => <span>Registration successful! Welcome to CarbonX Platform.</span>
    );
  }

  return (
    <section className="card flex flex-col gap-5 p-5 sm:p-6" aria-label="Register account">
      <CardHeader
        image={depositImage}
        title="Account Registration & First Deposit"
        right={<Pill tone="green">Max $5,000</Pill>}
      />

      {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}
      {isBelowMin && (
        <Notice tone="warn">Minimum registration deposit is 100 USDT.</Notice>
      )}
      {isAboveMax && (
        <Notice tone="error">Maximum registration deposit is 5,000 USDT.</Notice>
      )}

      {/* Sponsor Address */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="sponsor-input" className="label uppercase tracking-wider text-muted">
            Sponsor Address (Referrer)
          </label>
          <span className="text-2xs text-neon-soft">
            {sponsorInput && isAddress(sponsorInput) ? "Valid Sponsor" : "Defaults to Top ID"}
          </span>
        </div>
        <input
          id="sponsor-input"
          type="text"
          placeholder="0x... (leave empty for Top ID)"
          value={sponsorInput}
          onChange={(e) => setSponsorInput(e.target.value.trim())}
          className="well w-full px-4 py-3 text-xs text-text outline-none transition focus:border-neon/50"
        />
      </div>

      {/* Leader Code (Optional) */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="leader-input" className="label uppercase tracking-wider text-muted">
          Leader Code (Optional)
        </label>
        <input
          id="leader-input"
          type="number"
          min="0"
          placeholder="0"
          value={leaderCodeInput}
          onChange={(e) => setLeaderCodeInput(e.target.value)}
          className="well w-full px-4 py-3 text-xs text-text outline-none transition focus:border-neon/50"
        />
      </div>

      {/* Deposit Amount */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="amount-input" className="label uppercase tracking-wider text-muted">
            Initial Package Deposit (USDT)
          </label>
          {user && (
            <span className="text-2xs text-muted">
              Wallet balance: <strong className="font-medium text-text">{usd(user.usdtBalance)}</strong>
            </span>
          )}
        </div>

        <div className="relative">
          <input
            id="amount-input"
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
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {PRESET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setAmountStr(String(amt))}
              className={`rounded-xl py-1.5 text-xs font-medium transition cursor-pointer ${
                amountStr === String(amt)
                  ? "bg-neon/15 text-neon border border-neon/40 shadow-[0_0_8px_rgba(31,224,58,0.2)]"
                  : "well text-muted hover:text-text"
              }`}
            >
              ${amt.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Lock Type Selection */}
      <div className="flex flex-col gap-2">
        <label className="label uppercase tracking-wider text-muted">Choose Investment Strategy</label>
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

      {/* Yield & Payout Projections */}
      <div className="well p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Estimated Base Return:</span>
          <span className="font-semibold text-neon-soft">
            ~${estDailyUsd.toFixed(2)} / day avg (~{lockRates.monthlyPct.toFixed(2)}% / month)
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Maximum Total Payout Cap (2.5x):</span>
          <span className="font-semibold text-text">
            ${maxCapUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT (250% Cap)
          </span>
        </div>
        <div className="flex items-center justify-between text-xs border-t border-white/[0.04] pt-2">
          <span className="text-muted">Sponsor Target:</span>
          <span className="text-muted text-2xs">{resolvedSponsor ? `${resolvedSponsor.slice(0, 10)}…` : "—"}</span>
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
          {hasWallet ? "Connect Wallet to Register" : "Install Web3 Wallet"}
        </button>
      ) : needsApproval ? (
        <button
          type="button"
          disabled={Boolean(tx.busy) || isBelowMin || isAboveMax}
          onClick={handleApprove}
          className="btn btn-primary w-full py-3.5 text-sm"
        >
          {tx.busy === "Approving USDT..." ? <Spinner /> : "Step 1: Approve USDT"}
        </button>
      ) : (
        <button
          type="button"
          disabled={Boolean(tx.busy) || isBelowMin || isAboveMax}
          onClick={handleRegister}
          className="btn btn-primary w-full py-3.5 text-sm"
        >
          {tx.busy === "Registering on platform..." ? (
            <span className="flex items-center gap-2">
              <Spinner />
              Processing Registration...
            </span>
          ) : isAboveMax ? (
            "Exceeds 5,000 USDT Max Limit"
          ) : (
            `Register & Deposit $${Number(depositUsdt / 10n ** 18n).toLocaleString()} USDT`
          )}
        </button>
      )}
    </section>
  );
}
