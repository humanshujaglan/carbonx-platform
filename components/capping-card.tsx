"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import type { PlatformUser } from "@/lib/platform";
import { CAP_MULTIPLIER, packageLiveRoi } from "@/lib/roi";
import { money } from "@/lib/format";

const ROI_COLOR = "#3bf857";
const WORKING_COLOR = "#4dabf7";

/** One ring of the capping chart; `ratio` is 0..1. */
function Ring({ r, ratio, color }: { r: number; ratio: number; color: string }) {
  const c = 2 * Math.PI * r;
  return (
    <>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, ratio))}
        className="transition-[stroke-dashoffset] duration-500"
      />
    </>
  );
}

/**
 * Capping across all packages: ROI against the summed 2.5x package caps (outer ring) and the working income cap
 * (inner ring, 2.5x of total personal deposit).
 */
export function CappingCard({ user, lhrTier = 0 }: { user?: PlatformUser; lhrTier?: number }) {
  const [now, setNow] = useState(() => Date.now() / 1000);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(id);
  }, []);

  const packages = (user?.positions ?? []).filter((p) => p.initialPrincipal > 0n);
  if (!user || packages.length === 0) return null;

  const owner = { roiCycleStartTime: user.roiCycleStartTime, isTopId: user.isTopId };
  let roiEarned = 0;
  let roiCap: number | null = 0;
  for (const p of packages) {
    const live = packageLiveRoi(p, owner, lhrTier, now);
    // The Top ID's packages have no ROI cap
    if (live.capUsd === null) roiCap = null;
    else if (roiCap !== null) roiCap += live.capUsd;
    roiEarned += p.isCapped && live.capUsd !== null ? live.capUsd : live.accruedUsd;
  }

  // The Top ID has no working cap
  const workingCap = user.isTopId ? null : Number(formatUnits(user.totalPersonalDeposit, 18)) * CAP_MULTIPLIER;
  const workingUsed = Number(formatUnits(user.workingCapConsumed, 18));

  const pct = (v: number, of: number | null) => (of ? Math.min(100, (v / of) * 100) : 0);
  const rows = [
    { name: "ROI capping", note: "All packages", value: roiEarned, cap: roiCap, color: ROI_COLOR },
    { name: "Working capping", note: "All packages", value: workingUsed, cap: workingCap, color: WORKING_COLOR },
  ];

  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-5" aria-label="Capping">
      <h3 className="text-sm font-medium text-text">Capping</h3>

      <div className="flex items-center gap-5">
        <svg
          viewBox="0 0 120 120"
          className="size-32 shrink-0 -rotate-90"
          role="img"
          aria-label={rows.map((r) => `${r.name} ${r.cap ? `${Math.floor(pct(r.value, r.cap))}%` : "no cap"}`).join(", ")}
        >
          <Ring r={52} ratio={pct(rows[0].value, rows[0].cap) / 100} color={ROI_COLOR} />
          <Ring r={36} ratio={pct(rows[1].value, rows[1].cap) / 100} color={WORKING_COLOR} />
        </svg>

        <dl className="flex min-w-0 flex-1 flex-col">
          {rows.map((row) => (
            <div key={row.name} className="flex flex-col gap-1 border-t border-white/[0.08] py-3 first:border-t-0 first:pt-0">
              <dt className="flex items-center gap-2 text-sm text-white">
                <span className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />
                <span className="truncate">
                  {row.name} <span className="text-muted">2.5x</span>
                </span>
              </dt>
              <dd className="text-xs text-muted">
                {row.cap === null ? (
                  "No cap"
                ) : (
                  <>
                    <span className="font-semibold text-white">{money(row.value)}</span> / {money(row.cap)} ·{" "}
                    {Math.floor(pct(row.value, row.cap))}%
                  </>
                )}
              </dd>
              <dd className="text-2xs text-muted">{row.note}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
