"use client";

import { useEffect, useState } from "react";
import timerImage from "@/public/timer.png";
import { LOCK_DETAILS, LockType } from "@/lib/config";
import { dateTime, usd } from "@/lib/format";
import type { EnhancedPosition, PlatformUser } from "@/lib/platform";
import { packageLiveRoi } from "@/lib/roi";
import { CardHeader, Pill, Progress } from "./ui";

export function PackagesList({
  positions,
  user,
  lhrTier = 0,
}: {
  positions: EnhancedPosition[];
  user?: PlatformUser;
  lhrTier?: number;
}) {
  // Re-value packages every second so accrued ROI ticks live
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(timer);
  }, []);
  const owner = { roiCycleStartTime: user?.roiCycleStartTime ?? 0, isTopId: !!user?.isTopId };
  const money = (v: number, digits = 2) =>
    `$${v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

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

      <div className="flex flex-col gap-3">
        {positions.map((pos) => {
          const lock = LOCK_DETAILS[pos.lockType] ?? LOCK_DETAILS[LockType.FLEXIBLE];
          const live = packageLiveRoi(pos, owner, lhrTier, now);
          const capPct = live.capUsd ? Math.min(1, live.accruedUsd / live.capUsd) : 0;

          return (
            <div key={pos.id.toString()} className="well flex flex-col gap-3 p-4 transition hover:border-white/15">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text">#{pos.id.toString()}</span>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-2xs font-medium text-neon-soft">
                    {lock.name}
                  </span>
                  {pos.isCapped ? (
                    <span className="rounded-full bg-danger/15 px-2 py-0.5 text-2xs font-medium text-danger">
                      Capped Out
                    </span>
                  ) : (
                    <span className="rounded-full bg-neon/15 px-2 py-0.5 text-2xs font-medium text-neon">
                      Earning
                    </span>
                  )}
                </div>
                <div className="text-2xs text-muted">
                  Created {pos.createdAt > 0 ? dateTime(pos.createdAt) : "Recently"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 border-y border-white/[0.04] py-2.5">
                <div>
                  <div className="label">Principal Deposit</div>
                  <div className="text-sm font-semibold text-text">{usd(pos.initialPrincipal)}</div>
                </div>
                <div>
                  <div className="label">Accrued ROI</div>
                  <div className="text-sm font-semibold text-neon-soft font-mono tabular-nums">{money(live.accruedUsd, 4)}</div>
                </div>
                <div>
                  <div className="label">Earning Today</div>
                  <div className="text-sm font-semibold text-text font-mono tabular-nums">
                    {money(live.dailyUsd)}/day
                  </div>
                  <div className="text-2xs text-muted">{live.dailyPct.toFixed(3)}% of principal</div>
                </div>
                <div>
                  <div className="label">Maximum Payout Cap</div>
                  <div className="text-sm font-semibold text-text">
                    {live.capUsd === null ? "No cap (Top ID)" : money(live.capUsd)}
                  </div>
                </div>
              </div>

              <div className="text-2xs text-muted">{live.schedule}</div>

              {/* Cap Progress */}
              {live.capUsd !== null && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-muted">Progress to {(lock.capMultiplier * 100).toFixed(0)}% Max Cap:</span>
                    <span className="font-medium text-neon-soft">{(capPct * 100).toFixed(2)}%</span>
                  </div>
                  <Progress value={capPct} label={`Package #${pos.id.toString()} Cap Progress`} />
                </div>
              )}

            </div>
          );
        })}
      </div>
    </section>
  );
}
