"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { BOOSTER_TIERS, BOOSTER_WINDOW_DAYS, DAY_SECONDS } from "@/lib/roi";
import type { PlatformUser } from "@/lib/platform";

const BAR_HEIGHT = 224;
const MIN_SEGMENT_PX = 28;
// Top-to-bottom gradient per tier [top, bottom]
const TIER_GRADIENTS: Record<number, readonly [string, string]> = {
  1: ["#ffd166", "#e8590c"],
  2: ["#3bf857", "#0a7a24"],
  3: ["#7dd3fc", "#4338ca"],
};
const usd0 = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function BoosterTiersCard({ user }: { user?: PlatformUser }) {
  const [now] = useState(() => Math.floor(Date.now() / 1000));
  const [tip, setTip] = useState<number | null>(null);

  const directUsd = user ? Number(formatUnits(user.totalDirectBusiness, 18)) : 0;
  const tier = user?.boosterTier ?? 0;
  const daysUsed = user
    ? Math.min(BOOSTER_WINDOW_DAYS, Math.max(0, Math.floor((now - user.registrationTime) / DAY_SECONDS)))
    : 0;

  // Dashed lines: top (tier 3), then tiers 2 and 1 evenly spaced below it; none at the bottom
  // One block per tier, top = highest. A block's size follows the extra direct business that tier needs
  // ($1,000 / $4,000 / $5,000), and it fills with progress; reached tiers are full.
  const segments = BOOSTER_TIERS.map((t, i) => {
    const floor = i === 0 ? 0 : BOOSTER_TIERS[i - 1].thresholdUsd;
    const span = t.thresholdUsd - floor;
    const progress = t.tier <= tier ? 1 : Math.min(1, Math.max(0, (directUsd - floor) / span));
    return { ...t, span, progress };
  }).reverse();

  const rows: [string, string][] = [
    ["Tier", tier > 0 ? `Tier ${tier}` : "No tier"],
    ["Direct business", usd0(directUsd)],
    ["Qualify window", `${daysUsed} out of ${BOOSTER_WINDOW_DAYS} days`],
  ];

  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-5" aria-label="Booster activation">
      <h3 className="text-sm font-medium text-text">Booster activation</h3>

      <div className="flex gap-5 sm:gap-8">
        {/* Vertical tier bar: one separated block per tier, sized by its requirement */}
        <div className="flex w-28 shrink-0 flex-col gap-2 sm:w-36" style={{ height: BAR_HEIGHT }}>
          {segments.map((seg) => (
            <button
              key={seg.tier}
              type="button"
              onClick={() => setTip((cur) => (cur === seg.tier ? null : seg.tier))}
              onBlur={() => setTip(null)}
              aria-label={`Tier ${seg.tier}`}
              className="relative cursor-pointer rounded-xl bg-white/[0.06]"
              style={{ flexGrow: seg.span, flexBasis: 0, minHeight: MIN_SEGMENT_PX }}
            >
              <span className="absolute inset-0 overflow-hidden rounded-xl">
                {/* Gradient spans the whole block; the unfilled top part is clipped away */}
                <span
                  className="absolute inset-0 transition-all duration-500"
                  style={{
                    background: `linear-gradient(to bottom, ${TIER_GRADIENTS[seg.tier][0]}, ${TIER_GRADIENTS[seg.tier][1]})`,
                    clipPath: `inset(${(1 - seg.progress) * 100}% 0 0 0)`,
                  }}
                />
              </span>
              {tip === seg.tier && (
                <span className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/[0.08] bg-[#171a1f] px-3 py-1.5 text-sm font-medium text-white shadow-lg">
                  Tier {seg.tier}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Activated tier details */}
        <dl className="flex min-w-0 flex-1 flex-col justify-center gap-4">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className={`mt-0.5 font-semibold text-white ${label === "Tier" ? "text-3xl" : "text-lg"}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
