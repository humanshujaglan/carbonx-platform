"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CloseCircle } from "iconsax-react";

// Illustrative price line (not live data): climbs to the day high, then falls 5% through the target
const POINTS: [number, number][] = [
  [0, 100], [20, 92], [40, 96], [60, 80], [80, 84], [100, 66], [120, 70], [140, 52], [160, 56], [175, 40],
  [190, 52], [205, 48], [220, 70], [235, 66], [250, 92], [265, 88], [280, 112], [300, 124],
];
const PATH = POINTS.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
const HIGH_Y = 40;
const TARGET_Y = 110;
const PEAK_X = 175;
const END = POINTS[POINTS.length - 1];
const DRAW_S = 2.4;

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
export function ContestStartedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduced = useReducedMotion();
  const [crossed, setCrossed] = useState(false);
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

            <svg viewBox="0 0 300 140" className="w-full overflow-visible" aria-hidden="true">
              <defs>
                <linearGradient id="contest-line" x1="0" x2="300" y1="0" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset={PEAK_X / 300} stopColor="var(--color-neon)" />
                  <stop offset={PEAK_X / 300} stopColor="var(--color-danger)" />
                </linearGradient>
              </defs>
              <line x1="0" x2="300" y1={HIGH_Y} y2={HIGH_Y} stroke="var(--color-line)" strokeDasharray="2 4" />
              <text x="0" y={HIGH_Y - 6} fill="var(--color-faint)" fontSize="9">Day high</text>
              <line x1="0" x2="300" y1={TARGET_Y} y2={TARGET_Y} stroke="var(--color-danger)" strokeOpacity="0.6" strokeDasharray="5 4" />
              <text x="0" y={TARGET_Y - 6} fill="var(--color-danger)" fontSize="9">−5% target</text>
              <motion.path
                d={PATH}
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
                    cx={END[0]}
                    cy={END[1]}
                    r="4"
                    fill="var(--color-danger)"
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.6, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  <text x="300" y={END[1] + 16} textAnchor="end" fill="var(--color-danger)" fontSize="10" fontWeight="600">
                    −5%
                  </text>
                </>
              )}
            </svg>

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
