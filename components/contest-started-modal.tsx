"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CloseCircle, Cup, Flash, Profile2User, Wallet3 } from "iconsax-react";
import { shortAddr, usd } from "@/lib/format";
import { fetchContestToday, PRICE_CONTEST_SHARES_BPS, type ContestToday } from "@/lib/platform";
import { BottomSheet, SheetBlock } from "./info-sheet";
import { useWallet } from "./wallet";

// Illustrative price line (not live data): climbs to the day high, then falls 5% through the target
const POINTS: [number, number][] = [
  [0, 100], [20, 92], [40, 96], [60, 80], [80, 84], [100, 66], [120, 70], [140, 52], [160, 56], [175, 40],
  [190, 52], [205, 48], [220, 70], [235, 66], [250, 92], [265, 88], [280, 112], [300, 124],
];
const PATH = POINTS.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
const AREA = `${PATH} L300 140 L0 140 Z`;
const HIGH_Y = 40;
const TARGET_Y = 110;
const PEAK_X = 175;
const END = POINTS[POINTS.length - 1];
const DRAW_S = 2.4;

const TILES = [
  { icon: Cup, title: "Prize Pool", sub: "2% of today's business" },
  { icon: Profile2User, title: "Winners", sub: "Top 10 leaders" },
  { icon: Wallet3, title: "Paid To", sub: "Working balance" },
];

const COLORS = ["#1fe03a", "#3bf857", "#6df585", "#ffffff", "#facc15", "#eab308", "#2dd4bf"];
// Deterministic pseudo-random so render stays pure
const rand = (i: number, s: number) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const shape = (i: number) => (rand(i, 6) > 0.6 ? "size-2 rounded-full" : "h-3 w-1.5 rounded-sm");

// Party poppers: one burst from both bottom corners of the card when the line crosses the target
const BURST = Array.from({ length: 48 }, (_, i) => {
  const side = i % 2 ? 1 : -1; // odd from the right popper, even from the left
  return {
    side,
    dx: -side * (40 + rand(i, 1) * 220),
    rise: 160 + rand(i, 2) * 200,
    fall: 60 + rand(i, 3) * 120,
    rotate: (rand(i, 4) - 0.5) * 720,
    delay: rand(i, 5) * 0.15,
  };
});

// Confetti that keeps falling over the whole screen while the modal is open
const RAIN = Array.from({ length: 36 }, (_, i) => ({
  left: rand(i, 7) * 100,
  sway: (rand(i, 8) - 0.5) * 80,
  spin: 360 + rand(i, 9) * 540,
  duration: 5 + rand(i, 10) * 5,
  delay: rand(i, 11) * 5,
}));

/** Celebration shown when the CARB price falls 5% below the day high and the Leader Prize Contest starts. */
export function ContestStartedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduced = useReducedMotion();
  const [crossed, setCrossed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const closeDetails = useCallback(() => setDetailsOpen(false), []);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const done = crossed || !!reduced;
  const party = crossed && !reduced;

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

  const viewContest = () => {
    onClose();
    setDetailsOpen(true);
  };

  if (!mounted) return null;

  return (
    <>
      <ContestDetailsSheet open={detailsOpen} onClose={closeDetails} />
      {createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {party && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              {RAIN.map((p, i) => (
                <motion.span
                  key={i}
                  className={`absolute -top-4 ${shape(i)}`}
                  style={{ left: `${p.left}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  initial={{ y: 0, x: 0, rotate: 0, opacity: 0 }}
                  animate={{ y: "110vh", x: [0, p.sway, 0], rotate: p.spin, opacity: [0, 1, 1, 0.8] }}
                  transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
                />
              ))}
            </div>
          )}

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contest-started-title"
            className="relative flex max-h-[92vh] w-full max-w-md flex-col items-center overflow-y-auto rounded-[2rem] border border-white/10 bg-[radial-gradient(120%_70%_at_50%_0%,rgba(31,224,58,0.14),transparent_60%),linear-gradient(180deg,#0f1712,#0a0f0c)] px-5 pb-5 pt-6 text-center text-text shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] sm:px-7"
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-5 top-5 z-10 text-muted transition hover:text-white cursor-pointer"
            >
              <CloseCircle size={26} color="currentColor" variant="Linear" />
            </button>

            <div className="rounded-full border border-neon/40 bg-neon/10 px-4 py-1.5 text-xs font-semibold text-neon-soft">
              🏆 Price Drop Alert
            </div>

            {/* Hero: the price line climbs to the day high, then falls through the -5% target */}
            <div className="relative mt-5 w-full overflow-hidden rounded-3xl border border-dashed border-neon/30 bg-[radial-gradient(70%_80%_at_50%_100%,rgba(240,82,82,0.16),transparent_70%),radial-gradient(60%_70%_at_40%_20%,rgba(31,224,58,0.14),transparent_70%)] px-4 pb-3 pt-7">
              <svg viewBox="0 0 300 140" className="w-full overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id="contest-line" x1="0" x2="300" y1="0" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset={PEAK_X / 300} stopColor="var(--color-neon)" />
                    <stop offset={PEAK_X / 300} stopColor="var(--color-danger)" />
                  </linearGradient>
                  <linearGradient id="contest-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="var(--color-danger)" stopOpacity="0.25" />
                    <stop offset="1" stopColor="var(--color-danger)" stopOpacity="0" />
                  </linearGradient>
                  <filter id="contest-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <line x1="0" x2="300" y1={HIGH_Y} y2={HIGH_Y} stroke="rgba(255,255,255,0.25)" strokeDasharray="2 4" />
                <text x="0" y={HIGH_Y - 6} fill="var(--color-faint)" fontSize="9">Day high</text>
                <line x1="0" x2="300" y1={TARGET_Y} y2={TARGET_Y} stroke="var(--color-danger)" strokeOpacity="0.7" strokeDasharray="5 4" />
                <text x="0" y={TARGET_Y - 6} fill="var(--color-danger)" fontSize="9">−5% target</text>
                <motion.path
                  d={AREA}
                  fill="url(#contest-fill)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: done ? 1 : 0 }}
                  transition={{ duration: 0.6 }}
                />
                <motion.path
                  d={PATH}
                  fill="none"
                  stroke="url(#contest-line)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#contest-glow)"
                  initial={{ pathLength: reduced ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduced ? 0 : DRAW_S, ease: "easeInOut", delay: 0.4 }}
                  onAnimationComplete={() => setCrossed(true)}
                />
                {done && (
                  <motion.circle
                    cx={END[0]}
                    cy={END[1]}
                    r="5"
                    fill="var(--color-danger)"
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.7, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
              </svg>

              <motion.div
                className="absolute right-3 top-3 rounded-full bg-danger px-3 py-1 text-sm font-bold text-white shadow-[0_0_24px_rgba(240,82,82,0.6)]"
                initial={{ scale: reduced ? 1 : 0, rotate: reduced ? 0 : -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 10, stiffness: 260, delay: 0.2 }}
              >
                −5%
              </motion.div>
            </div>

            <h3 id="contest-started-title" className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">
              <span className="bg-gradient-to-r from-white to-neon-soft bg-clip-text text-transparent">Leader Prize </span>
              <span className="bg-gradient-to-r from-neon-bright to-neon bg-clip-text text-transparent">Contest</span>
            </h3>
            <p className="mt-1 text-sm font-semibold text-neon">has started!</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              CARB fell 5% below today&apos;s high. Today the prize goes to the leaders who bring in the most business
              with their leader code.
            </p>
            <div className="mt-4 w-full rounded-2xl border border-neon/20 bg-neon/[0.06] px-4 py-3 text-left text-xs leading-relaxed text-muted">
              <span className="font-semibold text-neon-soft">How to enter: </span>
              bring new members into your downline with their first package using your leader code today. The top 10
              leaders by that business share today&apos;s prize pool.
            </div>

            <div className="mt-6 grid w-full grid-cols-3 gap-2.5">
              {TILES.map(({ icon: Icon, title, sub }) => (
                <div key={title} className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2 py-3.5">
                  <Icon size={22} color="var(--color-neon)" variant="Linear" />
                  <div className="text-xs font-semibold text-white">{title}</div>
                  <div className="text-2xs leading-snug text-faint">{sub}</div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={viewContest}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-neon-bright to-neon py-4 text-base font-bold text-ink shadow-[0_8px_32px_-6px_rgba(31,224,58,0.7)] transition hover:brightness-110 cursor-pointer"
            >
              <Flash size={20} color="currentColor" variant="Bold" />
              View Leader Prize Contest
              <ArrowRight size={20} color="currentColor" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 text-sm font-medium text-muted transition hover:text-white cursor-pointer"
            >
              Continue to Dashboard
            </button>

            {party && (
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                {BURST.map((p, i) => (
                  <motion.span
                    key={i}
                    className={`absolute bottom-24 ${p.side < 0 ? "left-4" : "right-4"} ${shape(i)}`}
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
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
      )}
    </>
  );
}

/** Today's pool, how it is split across the 10 ranks, who holds each rank right now, and where you stand. */
function ContestDetailsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { account } = useWallet();
  const [data, setData] = useState<ContestToday>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchContestToday()
      .then((d) => !cancelled && (setData(d), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const isMe = (a: string) => !!account && a.toLowerCase() === account.toLowerCase();
  const myRank = data?.leaders.findIndex((l) => isMe(l.address)) ?? -1;
  const prize = (rank: number) => ((data?.pool ?? 0n) * PRICE_CONTEST_SHARES_BPS[rank]) / 10000n;

  return (
    <BottomSheet open={open} onClose={onClose} title="Leader Prize Contest">
      {!data ? (
        <div className="flex h-40 items-center justify-center text-neon" role="status" aria-label="Loading contest">
          {failed ? (
            <span className="text-xs text-muted">Couldn&apos;t load today&apos;s contest. Try again shortly.</span>
          ) : (
            <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
        </div>
      ) : (
        <>
          <div className="well !rounded-xl p-4 text-center">
            <div className="text-2xs text-muted">Today&apos;s prize pool</div>
            <div className="mt-1 text-2xl font-semibold text-neon">{usd(data.pool)}</div>
            <div className="mt-1 text-2xs text-faint">
              10 winners · 2% of today&apos;s first-package business · grows until 00:00 UTC
            </div>
          </div>

          <div className={`rounded-xl border px-4 py-3 ${myRank >= 0 ? "border-neon/30 bg-neon/[0.06]" : "border-white/[0.08] bg-white/[0.02]"}`}>
            {myRank >= 0 ? (
              <p>
                <span className="font-semibold text-white">You&apos;re #{myRank + 1} right now</span> with{" "}
                {usd(data.leaders[myRank].volume)} of business. Estimated prize{" "}
                <span className="font-semibold text-neon">{usd(prize(myRank))}</span>.
              </p>
            ) : (
              <p>
                <span className="font-semibold text-white">You&apos;re not in the top 10 yet.</span> Bring first-package
                business into your downline with your leader code today to get a chance to win.
              </p>
            )}
          </div>

          <SheetBlock title="Who wins what">
            <div className="mt-2 flex flex-col">
              {PRICE_CONTEST_SHARES_BPS.map((bps, i) => {
                const leader = data.leaders[i];
                const me = !!leader && isMe(leader.address);
                return (
                  <div
                    key={i}
                    className={`grid grid-cols-[2rem_1fr_auto] items-center gap-2 border-b border-white/[0.04] py-2 last:border-0 ${me ? "text-neon" : ""}`}
                  >
                    <span className={`flex size-7 items-center justify-center rounded-full text-2xs font-bold ${i < 3 ? "bg-neon/15 text-neon" : "bg-white/[0.06] text-muted"}`}>
                      #{i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className={`truncate text-xs font-medium ${me ? "text-neon" : leader ? "text-white" : "text-faint"}`}>
                        {leader ? (me ? "You" : shortAddr(leader.address)) : "Open spot"}
                      </div>
                      <div className="text-2xs text-faint">
                        {Number(bps) / 100}% of pool{leader ? ` · ${usd(leader.volume)} business` : ""}
                      </div>
                    </div>
                    <span className="text-right text-xs font-semibold text-white">{usd(prize(i))}</span>
                  </div>
                );
              })}
            </div>
          </SheetBlock>

          <SheetBlock title="How to enter">
            <p>
              Today&apos;s winners are ranked by the first-package business brought in with their leader code. Bring new
              members into your downline with your leader code before 00:00 UTC to get a chance to win. Prizes are
              estimates until the day closes, then credited to your working balance once you claim.
            </p>
          </SheetBlock>
        </>
      )}
    </BottomSheet>
  );
}
