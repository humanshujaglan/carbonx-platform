"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { ArrowDown2, ArrowRight } from "iconsax-react";
import { LockType } from "@/lib/config";
import type { PlatformUser } from "@/lib/platform";
import { CAP_MULTIPLIER, DAY_SECONDS, LOCKED_CAP_DAY } from "@/lib/roi";
import { CountdownTimer } from "./countdown-timer";
import type { NavTab } from "./header";

const usdFull = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/** Locked packages: when each one unlocks and how much it pays at the 2.5x cap (day 381). */
export function UnlockScheduleCard({
  user,
  onNavigateTab,
}: {
  user?: PlatformUser;
  onNavigateTab?: (tab: NavTab) => void;
}) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const lockSeconds = LOCKED_CAP_DAY * DAY_SECONDS;

  // Package numbers count this user's own packages (1, 2, 3...), not the global position id.
  const items = (user?.positions ?? [])
    .map((p, i) => ({ p, no: i + 1 }))
    .filter(({ p }) => p.active && !p.isCapped && p.lockType !== LockType.FLEXIBLE && p.lockedAt > 0)
    .map(({ p, no }) => {
      const principal = Number(formatUnits(p.initialPrincipal, 18));
      const lockedPrincipal = p.lockType === LockType.LOCKED_50 ? principal / 2 : principal;
      const unlockAt = p.lockedAt + lockSeconds;
      return {
        id: p.id.toString(),
        no,
        unlockAt,
        payout: lockedPrincipal * CAP_MULTIPLIER,
      };
    })
    .sort((a, b) => a.unlockAt - b.unlockAt);

  if (items.length === 0) return null;

  const selected = items.find((i) => i.id === selectedId) ?? items[0];

  const fmtDate = (unix: number) =>
    new Date(unix * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-5" aria-label="Lock-in unlock schedule">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-text">Lock-in unlock</h3>
        <button
          type="button"
          onClick={() => onNavigateTab?.("invest")}
          aria-label="Open packages"
          className="flex size-9 items-center justify-center rounded-full border border-white/15 text-muted transition hover:border-neon/50 hover:text-neon cursor-pointer"
        >
          <ArrowRight size={16} color="currentColor" className="-rotate-45" />
        </button>
      </div>

      <div className="relative">
        <select
          value={selected.id}
          onChange={(e) => setSelectedId(e.target.value)}
          aria-label="Choose package"
          className="w-full cursor-pointer appearance-none rounded-xl border border-white/[0.08] bg-[#171a1f] py-2.5 pl-3.5 pr-10 text-xs font-medium text-white outline-none transition focus:border-white/20"
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              Package #{item.no}
            </option>
          ))}
        </select>
        <ArrowDown2
          size={16}
          color="currentColor"
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>

      <CountdownTimer secondsRemaining={selected.unlockAt - now} />

      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted">Unlocks on {fmtDate(selected.unlockAt)}</span>
        <span className="text-white">
          {usdFull(selected.payout)} <span className="text-muted">you will get</span>
        </span>
      </div>
    </section>
  );
}
