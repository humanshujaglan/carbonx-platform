"use client";

import { useEffect, useState } from "react";
import {
  CYCLE_SECONDS,
  FLEX_SLOT_BPS,
  SLOT_DAYS,
  cyclePosition,
} from "@/lib/roi";
import { LockType } from "@/lib/config";
import type { PlatformUser } from "@/lib/platform";

const MAX_BAR_PX = 120;
// Zero-rate slots still get a visible bar.
const MIN_BAR_PX = 36;
// Tallest daily rate across every LHR tier, so bar height shifts when the tier changes.
const MAX_BPS = Math.max(...FLEX_SLOT_BPS.flat());
// Bars fade out towards the bottom.
const FADE_MASK = "linear-gradient(to bottom, #000 35%, transparent 100%)";

const SLOT_GRADIENTS = [
  ["#34e65a", "#0a7a24"],
  ["#4ee8a0", "#0c6a48"],
  ["#4fe3c8", "#0d6a6a"],
  ["#4fc3f0", "#0f5a8f"],
  ["#5aa5f5", "#1b4a9a"],
  ["#7b9cff", "#2a3f9a"],
] as const;

export function RoiCycleChart({ lhrTier, user }: { lhrTier: number; user?: PlatformUser }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 60_000);
    return () => clearInterval(id);
  }, []);

  const tier = Math.min(Math.max(Math.trunc(lhrTier) || 0, 0), FLEX_SLOT_BPS.length - 1);
  const rates = FLEX_SLOT_BPS[tier];
  const cycleStartTime = user?.roiCycleStartTime || user?.registrationTime || 0;
  const elapsed = cycleStartTime ? Math.max(0, now - cycleStartTime) : 0;
  const { day: earnedDays, slot: currentSlot } = cyclePosition(elapsed % CYCLE_SECONDS);
  const filledDays = cycleStartTime ? earnedDays : 0;

  const dailyPct = rates[currentSlot] / 100;

  // The flexible schedule only applies to flexible packages (the flexible half of a 50/50 hybrid counts)
  const hasFlexible = !!user?.positions.some(
    (p) => p.active && !p.isCapped && (p.lockType === LockType.FLEXIBLE || p.lockType === LockType.LOCKED_50)
  );
  if (!hasFlexible) return null;

  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-4 border border-white/[0.08]" aria-label="ROI this month">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-text">ROI This Month</h3>
        <span className="text-xs font-medium text-white">{dailyPct.toFixed(2)}%/day</span>
      </div>

      <div className="mx-auto w-full max-w-[520px] pt-2">
        <div className="grid grid-cols-6 items-end gap-[3px]">
          {rates.map((bps, slot) => {
            const height = Math.round(MIN_BAR_PX + (bps / MAX_BPS) * (MAX_BAR_PX - MIN_BAR_PX));
            const [from, to] = SLOT_GRADIENTS[slot];
            const firstDay = slot * SLOT_DAYS;
            return (
              <div key={slot} className="flex flex-col justify-end gap-2.5 min-w-0">
                <div className="text-center text-[10px] sm:text-xs font-medium text-muted whitespace-nowrap">
                  Days {firstDay + 1}–{firstDay + SLOT_DAYS}
                </div>
                <div className="grid grid-cols-5 items-end gap-[3px]" style={{ height }}>
                  {Array.from({ length: SLOT_DAYS }, (_, i) => {
                    const filled = firstDay + i < filledDays;
                    return (
                      <div
                        key={i}
                        className="h-full rounded-[3px] transition-all duration-500"
                        style={{
                          background: filled
                            ? `linear-gradient(to bottom, ${from}, ${to})`
                            : "rgb(255 255 255 / 0.06)",
                          border: filled ? "none" : "1px solid rgb(255 255 255 / 0.1)",
                          boxShadow: filled ? `0 0 10px ${from}33` : "none",
                          WebkitMaskImage: FADE_MASK,
                          maskImage: FADE_MASK,
                        }}
                      />
                    );
                  })}
                </div>
                <div
                  className="text-center text-xs font-medium"
                  style={{ color: filledDays > firstDay ? from : "#ffffff" }}
                >
                  {((bps * SLOT_DAYS) / 100).toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
