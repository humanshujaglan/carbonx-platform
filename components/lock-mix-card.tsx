"use client";

import { formatUnits } from "viem";
import { ArrowRight } from "iconsax-react";
import { LockType } from "@/lib/config";
import type { PlatformUser } from "@/lib/platform";
import type { NavTab } from "./header";

const usdFull = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const usdShort = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export function LockMixCard({
  user,
  onNavigateTab,
}: {
  user?: PlatformUser;
  onNavigateTab?: (tab: NavTab) => void;
}) {
  const active = (user?.positions ?? []).filter((p) => p.active && !p.isCapped);

  let flexible = 0;
  let locked = 0;
  for (const pos of active) {
    const principal = Number(formatUnits(pos.initialPrincipal, 18));
    if (pos.lockType === LockType.FLEXIBLE) flexible += principal;
    else if (pos.lockType === LockType.LOCKED_100) locked += principal;
    else {
      // Hybrid package: half runs flexible, half locked
      flexible += principal / 2;
      locked += principal / 2;
    }
  }
  const total = flexible + locked;

  // Only worth showing when the portfolio mixes flexible and locked amounts
  if (flexible <= 0 || locked <= 0) return null;

  const segments = [
    { name: "Flexible", value: flexible, color: "linear-gradient(to bottom, #3bf857, #0a7a24)" },
    { name: "Lock-in", value: locked, color: "linear-gradient(to bottom, #ffd166, #e8590c)" },
  ];
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-5" aria-label="Lock-in and flexible amounts">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-text">Lock-in vs flexible</h3>
        <button
          type="button"
          onClick={() => onNavigateTab?.("invest")}
          aria-label="Open packages"
          className="flex size-9 items-center justify-center rounded-full border border-white/15 text-muted transition hover:border-neon/50 hover:text-neon cursor-pointer"
        >
          <ArrowRight size={16} color="currentColor" className="-rotate-45" />
        </button>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-semibold text-white">{user ? usdFull(total) : "—"}</span>
        <span className="text-xs text-muted">
          across {active.length} {active.length === 1 ? "package" : "packages"}
        </span>
      </div>

      {/* Bar widths follow the amounts */}
      <div className="flex h-12 gap-2">
        {segments.map((seg) => (
          <div
            key={seg.name}
            className="rounded-xl transition-all duration-500"
            style={{
              flexGrow: Math.max(seg.value, total * 0.04),
              flexBasis: 0,
              background: seg.color,
            }}
          />
        ))}
      </div>

      <dl className="flex flex-col">
        {segments.map((seg) => (
          <div
            key={seg.name}
            className="flex items-center gap-3 border-t border-white/[0.08] py-3 text-sm first:border-t-0"
          >
            <span className="size-3 shrink-0 rounded-full" style={{ background: seg.color }} />
            <dt className="min-w-0 flex-1 truncate text-white">{seg.name}</dt>
            <dd className="shrink-0 font-semibold text-white">{user ? usdShort(seg.value) : "—"}</dd>
            <dd className="w-10 shrink-0 text-right text-muted">{pct(seg.value)}%</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
