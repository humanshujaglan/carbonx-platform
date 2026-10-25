"use client";

import timerImage from "@/public/timer.png";
import { platformAbi } from "@/lib/abi";
import { LOCK_DETAILS, LockType } from "@/lib/config";
import { dateTime, usd } from "@/lib/format";
import type { EnhancedPosition, PlatformAddresses } from "@/lib/platform";
import { CardHeader, Notice, Pill, Progress, Spinner, useTx } from "./ui";
import { useWallet } from "./wallet";

export function PackagesList({
  positions,
  addresses,
  onDone,
}: {
  positions: EnhancedPosition[];
  addresses?: PlatformAddresses;
  onDone: () => void;
}) {
  const { account, write } = useWallet();
  const tx = useTx(onDone);

  async function handleConvert(posId: bigint) {
    if (!addresses || !account) return;
    await tx.run(
      `Converting Package #${posId}...`,
      async () => {
        return write({
          address: addresses.platform,
          abi: platformAbi,
          functionName: "convertToFiftyFifty",
          args: [posId],
        });
      },
      (hash) => <span>Package #{posId.toString()} converted to 50/50 hybrid!</span>
    );
  }

  if (positions.length === 0) {
    return (
      <section className="card flex flex-col items-center justify-center gap-3 p-8 text-center" aria-label="No packages">
        <div className="size-12 rounded-full bg-panel-2 flex items-center justify-center text-muted">
          ✦
        </div>
        <div className="text-sm font-medium text-text">No Investment Packages Found</div>
        <p className="max-w-xs text-xs text-muted">
          Activate your first package to start earning daily ROI and unlock ecosystem commissions.
        </p>
      </section>
    );
  }

  return (
    <section className="card flex flex-col gap-4 p-5 sm:p-6" aria-label="My packages">
      <CardHeader
        image={timerImage}
        title="Active Investment Packages"
        right={<Pill tone="green">{positions.filter((p) => p.active && !p.isCapped).length} Active</Pill>}
      />

      {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}

      <div className="flex flex-col gap-3">
        {positions.map((pos) => {
          const lock = LOCK_DETAILS[pos.lockType] ?? LOCK_DETAILS[LockType.FLEXIBLE];
          const capPct = pos.maxCap > 0n ? Number(pos.liveAccruedRoi) / Number(pos.maxCap) : 0;
          const canConvert = pos.lockType === LockType.LOCKED_100 && pos.active && !pos.isCapped;

          return (
            <div key={pos.id.toString()} className="well flex flex-col gap-3 p-4 transition hover:border-white/15">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text">#{pos.id.toString()}</span>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-neon-soft">
                    {lock.name}
                  </span>
                  {pos.isCapped ? (
                    <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-medium text-danger">
                      Capped Out
                    </span>
                  ) : (
                    <span className="rounded-full bg-neon/15 px-2 py-0.5 text-[10px] font-medium text-neon">
                      Earning
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted">
                  Created {pos.createdAt > 0 ? dateTime(pos.createdAt) : "Recently"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 border-y border-white/[0.04] py-2.5">
                <div>
                  <div className="label">Principal Deposit</div>
                  <div className="text-sm font-semibold text-text">{usd(pos.initialPrincipal)}</div>
                </div>
                <div>
                  <div className="label">Live Accrued ROI</div>
                  <div className="text-sm font-semibold text-neon-soft">{usd(pos.liveAccruedRoi)}</div>
                </div>
                <div>
                  <div className="label">Withdrawn ROI</div>
                  <div className="text-sm font-semibold text-muted">{usd(pos.roiWithdrawn)}</div>
                </div>
                <div>
                  <div className="label">Maximum Payout Cap</div>
                  <div className="text-sm font-semibold text-text">{usd(pos.maxCap)}</div>
                </div>
              </div>

              {/* Cap Progress */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted">Progress to {(lock.capMultiplier * 100).toFixed(0)}% Max Cap:</span>
                  <span className="font-medium text-neon-soft">{(capPct * 100).toFixed(1)}%</span>
                </div>
                <Progress value={capPct} label={`Package #${pos.id.toString()} Cap Progress`} />
              </div>

              {canConvert && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={!!tx.busy}
                    onClick={() => handleConvert(pos.id)}
                    className="btn btn-secondary !py-1 !px-3 text-xs"
                  >
                    {tx.busy === `Converting Package #${pos.id}...` ? <Spinner /> : "Convert to 50/50"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
