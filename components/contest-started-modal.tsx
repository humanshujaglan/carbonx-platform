"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CloseCircle } from "iconsax-react";
import { price } from "@/lib/format";
import type { PlatformAddresses, PlatformMarket } from "@/lib/platform";
import { fetchPriceHistory, type PricePoint } from "@/lib/price-history";

const W = 300;
const H = 140;
const PAD_Y = 18;
const DRAW_S = 2.4;
const MAX_PATH_POINTS = 120;
const DROP_TARGET = 0.95;

type Chart = { path: string; peakX: number; highY: number; targetY: number; end: [number, number]; high: number; target: number; now: number };

/** Today's (UTC) prices plus the current spot, scaled into the SVG box. */
function buildChart(history: PricePoint[], spot: number, chainHigh: number): Chart | undefined {
  const nowS = Math.floor(Date.now() / 1000);
  const todayStart = Math.floor(nowS / 86400) * 86400;
  let pts: PricePoint[] = history.filter(([t]) => t >= todayStart);
  if (spot > 0) pts.push([nowS, spot]);
  // Same day high as the contest card: on-chain high, today's swaps and the spot price
  const high = Math.max(chainHigh, ...pts.map(([, p]) => p));
  // Open the day at the price carried over from the last swap before midnight
  const carried = history.findLast(([t]) => t < todayStart);
  if (carried) pts.unshift([todayStart, carried[1]]);
  // Logs RPC gave nothing for today: draw straight from the on-chain day high to the spot price
  if (pts.length < 2) pts = high > 0 && spot > 0 ? [[todayStart, high], [nowS, spot]] : [];
  if (pts.length < 2) return undefined;
  if (pts.length > MAX_PATH_POINTS) {
    const step = (pts.length - 1) / (MAX_PATH_POINTS - 1);
    pts = Array.from({ length: MAX_PATH_POINTS }, (_, i) => pts[Math.round(i * step)]);
  }

  const target = high * DROP_TARGET;
  const lo = Math.min(target, ...pts.map(([, p]) => p));
  const top = Math.max(high, ...pts.map(([, p]) => p)); // the carried opening price can sit above the day high
  const t0 = pts[0][0];
  const span = Math.max(1, pts[pts.length - 1][0] - t0);
  const range = top - lo || top * 0.05;
  const x = (t: number) => ((t - t0) / span) * W;
  const y = (p: number) => PAD_Y + ((top - p) / range) * (H - 2 * PAD_Y);

  const peak = pts.reduce((m, pt) => (pt[1] > m[1] ? pt : m), pts[0]);
  const last = pts[pts.length - 1];
  return {
    path: pts.map(([t, p], i) => `${i ? "L" : "M"}${x(t).toFixed(1)} ${y(p).toFixed(1)}`).join(" "),
    peakX: x(peak[0]),
    highY: y(high),
    targetY: y(target),
    end: [x(last[0]), y(last[1])],
    high,
    target,
    now: last[1],
  };
}

const fmt = (v: number) => price(BigInt(Math.round(v * 1e18)));

const COLORS = ["#1fe03a", "#3bf857", "#6df585", "#ffffff", "#facc15", "#f472b6", "#38bdf8"];
// Deterministic pseudo-random so render stays pure
const rand = (i: number, s: number) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const PARTICLES = Array.from({ length: 48 }, (_, i) => {
  const side = i % 2 ? 1 : -1; // odd from the right popper, even from the left
  return {
    side,
    dx: -side * (40 + rand(i, 1) * 220),
    rise: 160 + rand(i, 2) * 200,
    fall: 60 + rand(i, 3) * 120,
    rotate: (rand(i, 4) - 0.5) * 720,
    delay: rand(i, 5) * 0.15,
    color: COLORS[i % COLORS.length],
    round: rand(i, 6) > 0.6,
  };
});

/** Celebration shown when the CARB price falls 5% below the day high and the Leader Prize Contest starts. */
export function ContestStartedModal({
  open,
  onClose,
  market,
  addresses,
}: {
  open: boolean;
  onClose: () => void;
  market?: PlatformMarket;
  addresses?: PlatformAddresses;
}) {
  const reduced = useReducedMotion();
  const [crossed, setCrossed] = useState(false);
  const [chart, setChart] = useState<Chart>();

  // Read the market through a ref so the 5s refreshes don't restart the drawing
  const marketRef = useRef(market);
  useEffect(() => {
    marketRef.current = market;
  }, [market]);

  const pair = addresses?.pair;
  const carbIsToken0 = addresses ? addresses.carb.toLowerCase() < addresses.usdt.toLowerCase() : true;
  const hasSpot = !!market?.spotPrice;
  useEffect(() => {
    if (!open || !pair || !hasSpot || chart) return;
    let cancelled = false;
    fetchPriceHistory(pair, carbIsToken0).then((history) => {
      const m = marketRef.current;
      const spot = m?.spotPrice ? Number(m.spotPrice) / 1e18 : 0;
      const chainHigh = m?.contestDayHigh ? Number(m.contestDayHigh) / 1e18 : 0;
      if (!cancelled) setChart(buildChart(history, spot, chainHigh));
    });
    return () => {
      cancelled = true;
    };
  }, [open, pair, carbIsToken0, hasSpot, chart]);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const done = crossed || !!reduced;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contest-started-title"
            className="relative w-full max-w-sm rounded-3xl border border-line-neon bg-panel p-5 text-text shadow-2xl sm:p-6"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 text-muted transition hover:text-white cursor-pointer"
            >
              <CloseCircle size={22} color="currentColor" variant="Linear" />
            </button>

            <div className="mb-3 text-2xs font-semibold uppercase tracking-wider text-neon">CARB price alert</div>

            {chart ? (
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={`CARB price today: high ${fmt(chart.high)}, now ${fmt(chart.now)}`}>
                <defs>
                  <linearGradient id="contest-line" x1="0" x2={W} y1="0" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset={chart.peakX / W} stopColor="var(--color-neon)" />
                    <stop offset={chart.peakX / W} stopColor="var(--color-danger)" />
                  </linearGradient>
                </defs>
                <line x1="0" x2={W} y1={chart.highY} y2={chart.highY} stroke="var(--color-line)" strokeDasharray="2 4" />
                <text x="0" y={chart.highY - 6} fill="var(--color-faint)" fontSize="9">Day high {fmt(chart.high)}</text>
                <line x1="0" x2={W} y1={chart.targetY} y2={chart.targetY} stroke="var(--color-danger)" strokeOpacity="0.6" strokeDasharray="5 4" />
                <text x="0" y={chart.targetY - 6} fill="var(--color-danger)" fontSize="9">−5% target {fmt(chart.target)}</text>
                <motion.path
                  d={chart.path}
                  fill="none"
                  stroke="url(#contest-line)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: reduced ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduced ? 0 : DRAW_S, ease: "easeInOut", delay: 0.3 }}
                  onAnimationComplete={() => setCrossed(true)}
                />
                {done && (
                  <>
                    <motion.circle
                      cx={chart.end[0]}
                      cy={chart.end[1]}
                      r="4"
                      fill="var(--color-danger)"
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.6, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                    <text x={W} y={Math.min(H + 12, chart.end[1] + 16)} textAnchor="end" fill="var(--color-danger)" fontSize="10" fontWeight="600">
                      Now {fmt(chart.now)} (−{((1 - chart.now / chart.high) * 100).toFixed(1)}%)
                    </text>
                  </>
                )}
              </svg>
            ) : (
              <div className="flex h-[140px] items-center justify-center text-neon" role="status" aria-label="Loading price">
                <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
              </div>
            )}

            <AnimatePresence>
              {done && (
                <motion.div
                  className="mt-4 flex flex-col gap-2 text-center"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 id="contest-started-title" className="text-lg font-semibold text-white">
                    🎉 Leader Prize Contest has started!
                  </h3>
                  <p className="text-xs leading-relaxed text-muted">
                    CARB fell 5% below today&apos;s high. The top 10 leaders by first-package business brought in with
                    their leader code today share 2% of that business.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 rounded-full bg-neon py-2.5 text-sm font-semibold text-ink transition hover:bg-neon-bright cursor-pointer"
                  >
                    Let&apos;s go
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Party poppers: confetti from both bottom corners once the line crosses the target */}
            {crossed && !reduced && (
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                {PARTICLES.map((p, i) => (
                  <motion.span
                    key={i}
                    className={`absolute bottom-6 ${p.side < 0 ? "left-4" : "right-4"} ${p.round ? "size-2 rounded-full" : "h-3 w-1.5 rounded-sm"}`}
                    style={{ backgroundColor: p.color }}
                    initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                    animate={{ x: p.dx, y: [0, -p.rise, -p.rise + p.fall], opacity: [1, 1, 0], rotate: p.rotate }}
                    transition={{ duration: 1.8, delay: p.delay, ease: "easeOut", times: [0, 0.45, 1] }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
