"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { Timer } from "iconsax-react";
import { platformAbi } from "@/lib/abi";
import { usd } from "@/lib/format";
import { viewAddress } from "@/lib/config";
import { publicClient } from "@/lib/platform";
import { Spinner } from "./ui";

type Stream = {
  id: bigint;
  netAmount: bigint;
  claimedAmount: bigint;
  startTime: number;
  duration: number;
  completed: boolean;
};

const DAY = 86400;
const durationLabel = (s: number) =>
  s >= DAY ? `${Math.round(s / DAY)} day${s >= 2 * DAY ? "s" : ""}` : `${Math.round(s / 3600)} hours`;

/** Vesting streams created by working-income withdrawals, newest first, each with its own claim button. */
export function VestingStreams({
  account,
  refreshKey,
  busy,
  onClaim,
}: {
  account?: Address;
  /** Any value that changes after a transaction, so the list reloads. */
  refreshKey: unknown;
  busy?: string;
  onClaim: (id: bigint) => void;
}) {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!account) {
      setStreams([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const ids = (await publicClient.readContract({
          address: viewAddress,
          abi: platformAbi,
          functionName: "getUserVestingIds",
          args: [account],
        })) as bigint[];
        const list = await Promise.all(
          ids.map(async (id) => {
            const v = (await publicClient.readContract({
              address: viewAddress,
              abi: platformAbi,
              functionName: "getVestingSchedule",
              args: [id],
            })) as any;
            return {
              id,
              netAmount: v.netAmount as bigint,
              claimedAmount: v.claimedAmount as bigint,
              startTime: Number(v.startTime),
              duration: Number(v.duration),
              completed: v.completed as boolean,
            } satisfies Stream;
          })
        );
        if (!cancelled) setStreams(list.sort((a, b) => Number(b.id - a.id)));
      } catch {
        if (!cancelled) setStreams([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account, refreshKey]);

  return (
    <section className="card flex flex-col gap-4 p-5 sm:p-6" aria-label="Vesting streams">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-text">Vesting streams</h3>
        {loading && <Spinner />}
      </div>

      {streams.length === 0 ? (
        <p className="text-xs text-muted">
          {loading ? "Loading…" : "No streams yet. Each working balance withdrawal creates one here."}
        </p>
      ) : (
        <div className="flex flex-col">
          {streams.map((s) => {
            const elapsed = Math.max(0, Math.min(now - s.startTime, s.duration));
            const vested = s.duration > 0 ? (s.netAmount * BigInt(elapsed)) / BigInt(s.duration) : s.netAmount;
            const claimable = vested > s.claimedAmount ? vested - s.claimedAmount : 0n;
            const pct = s.duration > 0 ? Math.min(100, (elapsed / s.duration) * 100) : 100;
            const label = `Claiming Stream #${s.id}...`;
            return (
              <div key={s.id.toString()} className="flex flex-col gap-3 border-t border-white/[0.08] py-4 first:border-t-0 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-neon/10 text-neon">
                      <Timer size={16} color="currentColor" variant="Bulk" />
                    </span>
                    <div>
                      <div className="text-sm text-white">{usd(s.netAmount)}</div>
                      <div className="text-xs text-muted">
                        Over {durationLabel(s.duration)}
                        {s.completed ? " · Completed" : ""}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={claimable === 0n || !!busy}
                    onClick={() => onClaim(s.id)}
                    className="btn btn-primary !rounded-lg !px-3 !py-1.5 text-xs font-semibold"
                  >
                    {busy === label ? <Spinner /> : `Claim ${usd(claimable)}`}
                  </button>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full rounded-full bg-neon" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>Claimed {usd(s.claimedAmount)}</span>
                  <span>{Math.floor(pct)}% vested</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
