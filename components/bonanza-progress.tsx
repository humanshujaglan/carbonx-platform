"use client";

import { useEffect, useState } from "react";
import { usd } from "@/lib/format";
import { useWallet } from "./wallet";

export type BonanzaProgress = { business: bigint; target: bigint; start: number };

/** The connected account's active direct business for the bonanza, once loaded. */
export function useBonanzaProgress(): BonanzaProgress | undefined {
  const { account, ready } = useWallet();
  const [progress, setProgress] = useState<BonanzaProgress>();

  useEffect(() => {
    if (!ready || !account) return;
    let cancelled = false;
    fetch(`/api/bonanza?address=${account}`)
      .then((r) => (r.ok ? r.json() : undefined))
      .then((d) => {
        if (!cancelled && d) setProgress({ business: BigInt(d.business), target: BigInt(d.target), start: d.start });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [account, ready]);

  return progress;
}

/** Active direct business bought since the bonanza started, against the target. */
export function BonanzaProgressBar({ business, target, start }: BonanzaProgress) {
  const pct = target > 0n ? Math.min(100, Number((business * 10000n) / target) / 100) : 0;
  const done = business >= target;
  const startDate = new Date(start * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">Your active direct business</span>
        <span className="font-semibold text-white">
          {usd(business)} <span className="font-normal text-muted">/ {usd(target)}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Bonanza progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.08]"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-neon-bright to-neon transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        {done
          ? "Target reached: you qualify for the reward."
          : `${usd(target - business)} more to qualify. Counts packages your directs buy from ${startDate}.`}
      </p>
    </div>
  );
}

/** Dashboard card with only the bonanza progress bar. Hidden until progress loads. */
export function BonanzaProgressCard() {
  const progress = useBonanzaProgress();
  if (!progress) return null;
  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-4" aria-label="Bonanza activation">
      <h3 className="text-sm font-medium text-text">Bonanza activation</h3>
      <BonanzaProgressBar {...progress} />
    </section>
  );
}
