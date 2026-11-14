"use client";

import { useEffect, useState } from "react";
import { platformAbi } from "@/lib/abi";
import { LOCK_DETAILS, LockType } from "@/lib/config";
import { dateTime, usd } from "@/lib/format";
import type { EnhancedPosition, PlatformAddresses, PlatformUser } from "@/lib/platform";
import { hybridHalves, packageLiveRoi } from "@/lib/roi";
import { BottomSheet, SheetBlock } from "./info-sheet";
import { Notice, Row, Spinner, useTx } from "./ui";
import { useWallet } from "./wallet";

const GREEN = "linear-gradient(90deg, #17a83a, #3bf857)";
const AMBER = "linear-gradient(90deg, #e8890c, #ffd166)";
const RED = "linear-gradient(90deg, #b42347, #ff7a93)";
// Mirrors PlatformEarnEngine.convertToFiftyFifty: a flexible package can turn 50/50 within 30 days of buying it
const CONVERT_WINDOW_SEC = 30 * 86400;
const CONVERT_LABEL = "Converting to 50/50...";

/**
 * Bold progress bar with the earned value inside it. The value is light on the dark track and dark on the
 * bright fill: the same text is drawn twice and the dark copy is clipped to the filled part.
 */
function EarnBar({ pct, text, fill }: { pct: number; text: string; fill: string }) {
  const shown = Math.max(pct * 100, pct > 0 ? 6 : 0);
  const clip = `inset(0 ${100 - shown}% 0 0 round 12px)`;
  return (
    <div className="relative h-9 overflow-hidden rounded-xl bg-white/[0.07]">
      <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-white">{text}</span>
      <div className="absolute inset-0 transition-[clip-path] duration-500" style={{ clipPath: clip }}>
        <div className="absolute inset-0" style={{ background: fill }} />
        {/* diagonal sheen */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, rgba(255,255,255,0.55) 0 6px, transparent 6px 14px)",
          }}
        />
        <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-[#031005]">{text}</span>
      </div>
    </div>
  );
}

export function PackagesList({
  positions,
  user,
  lhrTier = 0,
  addresses,
  onDone = () => {},
}: {
  positions: EnhancedPosition[];
  user?: PlatformUser;
  lhrTier?: number;
  addresses?: PlatformAddresses;
  onDone?: () => void;
}) {
  const { account, write } = useWallet();
  const tx = useTx(onDone);
  // Re-value packages every second so earned ROI ticks live
  const [now, setNow] = useState(() => Date.now() / 1000);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(timer);
  }, []);
  const owner = { roiCycleStartTime: user?.roiCycleStartTime ?? 0, isTopId: !!user?.isTopId };
  const money = (v: number, digits = 2) =>
    `$${v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

  if (positions.length === 0) {
    return (
      <section className="card flex flex-col gap-1 p-5 text-center sm:p-6" aria-label="No packages">
        <h3 className="text-sm font-medium text-text">My packages</h3>
        <p className="text-xs text-muted">Nothing here yet. Your first package will show up here.</p>
      </section>
    );
  }

  const open = positions.find((p) => p.id.toString() === openId);
  const openLive = open ? packageLiveRoi(open, owner, lhrTier, now) : null;
  const openHalves = open && open.lockType === LockType.LOCKED_50 ? hybridHalves(open, owner, lhrTier, now) : null;
  const openLock = open ? LOCK_DETAILS[open.lockType] ?? LOCK_DETAILS[LockType.FLEXIBLE] : null;
  // Seconds left to convert; null when the contract would reject it (the Top ID always earns linearly)
  const convertLeft =
    open && open.lockType === LockType.FLEXIBLE && open.active && !open.isCapped && open.createdAt > 0 && !user?.isTopId
      ? open.createdAt + CONVERT_WINDOW_SEC - now
      : null;
  const canConvert = convertLeft !== null && convertLeft > 0;

  async function handleConvert() {
    if (!addresses || !account || !open) return;
    await tx.run(
      CONVERT_LABEL,
      () =>
        write({
          address: addresses.platform,
          abi: platformAbi,
          functionName: "convertToFiftyFifty",
          args: [open.id],
        }),
      () => <span>Package converted to 50/50!</span>
    );
  }

  return (
    <section className="card flex flex-col gap-4 p-5 sm:p-6" aria-label="My packages">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-text">My packages</h3>
        <span className="text-xs text-muted">{positions.filter((p) => p.active && !p.isCapped).length} active</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {positions.map((pos, idx) => {
          const lock = LOCK_DETAILS[pos.lockType] ?? LOCK_DETAILS[LockType.FLEXIBLE];
          const live = packageLiveRoi(pos, owner, lhrTier, now);
          const capPct = live.capUsd ? Math.min(1, live.accruedUsd / live.capUsd) : 0;
          if (pos.lockType === LockType.LOCKED_50) {
            const h = hybridHalves(pos, owner, lhrTier, now);
            const halves = [
              { name: "Flexible", earned: h.flexAccruedUsd, gradient: GREEN },
              { name: "Lock-in", earned: h.lockAccruedUsd, gradient: AMBER },
            ];
            // Two packages in one: a flexible half and a locked half
            return (
              <button
                key={pos.id.toString()}
                type="button"
                onClick={() => setOpenId(pos.id.toString())}
                className="col-span-2 flex cursor-pointer flex-col gap-3 rounded-2xl border border-white/[0.08] bg-panel-2 p-3.5 text-left transition hover:border-white/20 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span>#{idx + 1} · 50/50</span>
                  <span className="text-base text-white">{usd(pos.initialPrincipal)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {halves.map((half) => {
                    const pct = h.halfCapUsd ? Math.min(1, half.earned / h.halfCapUsd) : 0;
                    return (
                      <div key={half.name} className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between gap-2 text-xs text-muted">
                          <span>{half.name}</span>
                          <span className="text-white">{money(Number(pos.initialPrincipal) / 2e18)}</span>
                        </div>
                        <EarnBar pct={pct} text={money(half.earned)} fill={pos.isCapped ? RED : half.gradient} />
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          }
          const accent = pos.lockType === LockType.FLEXIBLE ? GREEN : AMBER;
          return (
            <button
              key={pos.id.toString()}
              type="button"
              onClick={() => setOpenId(pos.id.toString())}
              className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-white/[0.08] bg-panel-2 p-3.5 text-left transition hover:border-white/20 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span>#{idx + 1}</span>
                <span className="truncate">{lock.name}</span>
              </div>
              <div className="text-base text-white">{usd(pos.initialPrincipal)}</div>
              <EarnBar
                pct={capPct}
                text={pos.isCapped ? "Capped out" : money(live.accruedUsd)}
                fill={pos.isCapped ? RED : accent}
              />
            </button>
          );
        })}
      </div>

      <BottomSheet
        open={!!open}
        onClose={() => {
          setOpenId(null);
          tx.clear();
        }} title={open ? `Package #${positions.indexOf(open) + 1}` : ""}>
        {open && openLive && openLock && (
          <>
            <SheetBlock>
              <dl>
                <Row label="Plan" value={openLock.name} />
                <Row label="Amount" value={usd(open.initialPrincipal)} accent />
                {open.lockType === LockType.LOCKED_50 && openHalves ? (
                  <>
                    <Row label="Flexible half earned" value={money(openHalves.flexAccruedUsd, 4)} />
                    <Row label="Lock-in half earned" value={money(openHalves.lockAccruedUsd, 4)} />
                  </>
                ) : (
                  <Row label="Earned so far" value={money(openLive.accruedUsd, 4)} />
                )}
                <Row label="Earning today" value={`${money(openLive.dailyUsd)} / day`} />
                <Row label="Max payout" value={openLive.capUsd === null ? "No cap" : money(openLive.capUsd)} />
                <Row label="Started" value={open.createdAt > 0 ? dateTime(open.createdAt) : "Recently"} />
              </dl>
            </SheetBlock>
            <p>{openLive.schedule}</p>
            {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}
            {canConvert && (
              <SheetBlock title="Convert to 50/50">
                <p>
                  Half of this package keeps earning flexible, the other half locks for {LOCK_DETAILS[LockType.LOCKED_50].lockDays}{" "}
                  days at 0.33% daily compounding. This can&apos;t be undone.
                </p>
                <dl>
                  <Row
                    label="Window closes in"
                    value={`${Math.floor(convertLeft / 86400)}d ${Math.floor((convertLeft % 86400) / 3600)}h`}
                  />
                </dl>
                <button
                  type="button"
                  disabled={Boolean(tx.busy) || !account || !addresses}
                  onClick={handleConvert}
                  className="btn btn-primary mt-3 w-full py-3 text-sm font-semibold"
                >
                  {tx.busy === CONVERT_LABEL ? <Spinner /> : "Convert to 50/50"}
                </button>
              </SheetBlock>
            )}
          </>
        )}
      </BottomSheet>
    </section>
  );
}
