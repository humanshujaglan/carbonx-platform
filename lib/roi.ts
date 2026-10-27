/**
 * Client-side port of the ROI / booster math in the CarbonX contracts
 * (`DaddyFormulae.sol`, `PlatformEarnEngine.sol`, `PlatformView.getPositionLiveAccruedRoi`).
 *
 * Flexible ROI is NOT a flat 0.33%/day. Each 30-day cycle is split into six 5-day slots
 * whose daily bps depend on the active LHR tier and are backloaded. The cycle restarts
 * from slot 1 whenever ROI is withdrawn (`roiCycleStartTime` reset).
 * Locked ROI compounds at 0.33%/day on the growing balance until the 2.5x cap (day 381).
 * Booster pays 1/3, 2/3 or 3/3 of the flexible schedule on the first package amount.
 */
import { LockType } from "./config";

export const DAY_SECONDS = 86_400;
export const CYCLE_SECONDS = 30 * DAY_SECONDS;
export const SLOT_DAYS = 5;
export const LOCKED_DAILY_RATE = 0.0033;
export const LOCKED_CAP_DAY = 381;
export const CAP_MULTIPLIER = 2.5;
/** Contract minimum for ROI / booster / leader withdrawals (MIN_WITHDRAWAL). */
export const MIN_WITHDRAWAL_USD = 10;
/** Top ID ROI (`accrueTopId`): linear 0.5%/day on topIdCurrentPrincipal, 25% to the partner pool. */
export const TOP_ID_DAILY_RATE = 0.005;
export const TOP_ID_KEEP_SHARE = 0.75;

/** Working income withdrawal options (`DaddyFormulae.getVestingParams`); deduction includes the 5% fee. */
export const VESTING_OPTIONS = [
  { id: 0, deductionPct: 25, duration: "12 hours" },
  { id: 1, deductionPct: 20, duration: "1 day" },
  { id: 2, deductionPct: 15, duration: "10 days" },
  { id: 3, deductionPct: 10, duration: "20 days" },
  { id: 4, deductionPct: 5, duration: "30 days" },
] as const;

/** Daily bps for each 5-day slot, per LHR tier index (0 = Healthy … 4 = Rescue). */
export const FLEX_SLOT_BPS: readonly (readonly number[])[] = [
  [15, 15, 30, 30, 50, 60],
  [10, 10, 25, 25, 60, 70],
  [5, 5, 20, 20, 70, 80],
  [2, 4, 10, 14, 75, 95],
  [0, 1, 3, 6, 40, 50],
];

export const LHR_TIER_NAMES = ["Healthy", "Normal", "Caution", "Stressed", "Rescue"] as const;

export function lhrTierLabel(tier: number): string {
  const idx = clampTier(tier);
  return `Tier ${idx + 1} · ${LHR_TIER_NAMES[idx]}`;
}

function clampTier(tier: number): number {
  return Math.min(Math.max(Math.trunc(tier) || 0, 0), FLEX_SLOT_BPS.length - 1);
}

/** Full-cycle bps: 1,000 (10%) for tiers 1-4, 500 (5%) for Rescue. */
export function cycleMaxBps(tier: number): number {
  return clampTier(tier) >= 4 ? 500 : 1000;
}

/** Day index inside the current cycle (0-29) and the slot it belongs to (0-5). */
export function cyclePosition(elapsedSec: number) {
  const partial = Math.max(0, elapsedSec) % CYCLE_SECONDS;
  const day = Math.floor(partial / DAY_SECONDS);
  return { day, slot: Math.floor(day / SLOT_DAYS), dayFraction: (partial % DAY_SECONDS) / DAY_SECONDS };
}

/** bps being earned per day right now for a flexible principal. */
export function flexDailyBps(tier: number, elapsedSec: number): number {
  return FLEX_SLOT_BPS[clampTier(tier)][cyclePosition(elapsedSec).slot];
}

function partialCycleBps(tier: number, day: number): number {
  const rates = FLEX_SLOT_BPS[clampTier(tier)];
  let bps = 0;
  for (let d = 0; d < day; d++) bps += rates[Math.floor(d / SLOT_DAYS)];
  return bps;
}

/**
 * Cumulative flexible bps after `elapsedSec`. `smooth=false` matches the contract
 * (credited per completed day); `smooth=true` also adds the in-progress fraction of today.
 */
export function flexCumulativeBps(tier: number, elapsedSec: number, smooth = false): number {
  if (elapsedSec <= 0) return 0;
  const fullCycles = Math.floor(elapsedSec / CYCLE_SECONDS);
  const { day, slot, dayFraction } = cyclePosition(elapsedSec);
  let bps = fullCycles * cycleMaxBps(tier) + partialCycleBps(tier, day);
  if (smooth) bps += dayFraction * FLEX_SLOT_BPS[clampTier(tier)][slot];
  return bps;
}

/** Booster share of the flexible schedule per booster tier. */
export function boosterShare(boosterTier: number): number {
  if (boosterTier >= 3) return 1;
  if (boosterTier === 2) return 2 / 3;
  if (boosterTier === 1) return 1 / 3;
  return 0;
}

/**
 * Not-yet-accrued bps since the contract checkpoint (`completedCycles`, `lastBps`),
 * mirroring `_flexBasisUpTo` / `_boosterDeltaBpsUpTo`. `share` scales the schedule (booster).
 */
export function deltaBpsSinceCheckpoint(
  tier: number,
  elapsedSec: number,
  completedCycles: number,
  lastBps: number,
  share = 1,
  smooth = true
): number {
  if (elapsedSec <= 0) return 0;
  const full = Math.floor(elapsedSec / CYCLE_SECONDS);
  const cur = flexCumulativeBps(tier, elapsedSec % CYCLE_SECONDS, smooth) * share;
  const cycleMax = cycleMaxBps(tier) * share;
  if (full > completedCycles) {
    return Math.max(0, cycleMax - lastBps) + (full - completedCycles - 1) * cycleMax + cur;
  }
  if (full === completedCycles && cur > lastBps) return cur - lastBps;
  return 0;
}

/** Compounded locked gain on `principal` after `elapsedSec` (capped at day 381). */
export function lockedGain(principal: number, elapsedSec: number, smooth = true): number {
  if (principal <= 0 || elapsedSec <= 0) return 0;
  const exactDays = elapsedSec / DAY_SECONDS;
  const days = Math.min(Math.floor(exactDays), LOCKED_CAP_DAY);
  let value = principal * Math.pow(1 + LOCKED_DAILY_RATE, days);
  if (smooth && days < LOCKED_CAP_DAY) value *= 1 + LOCKED_DAILY_RATE * (exactDays - days);
  return Math.min(value - principal, principal * CAP_MULTIPLIER);
}

/** Today's locked earning in USD (0.33% of the compounded balance, 0 once capped). */
export function lockedDailyUsd(principal: number, elapsedSec: number): number {
  const days = Math.floor(Math.max(0, elapsedSec) / DAY_SECONDS);
  if (principal <= 0 || days >= LOCKED_CAP_DAY) return 0;
  return principal * Math.pow(1 + LOCKED_DAILY_RATE, days) * LOCKED_DAILY_RATE;
}

/**
 * Package rate summary for deposit previews at the current LHR tier.
 * Flexible numbers describe a fresh cycle (slot 1 → slot 6); locked compounds from day 1.
 */
export function packageRates(lockType: LockType, lhrTier: number) {
  const rates = FLEX_SLOT_BPS[clampTier(lhrTier)];
  const flexMonthlyPct = cycleMaxBps(lhrTier) / 100;
  const lockedMonthlyPct = (Math.pow(1 + LOCKED_DAILY_RATE, 30) - 1) * 100;
  const flexFirst = rates[0] / 100;
  const flexLast = rates[rates.length - 1] / 100;
  const locked = LOCKED_DAILY_RATE * 100;

  if (lockType === LockType.LOCKED_100) {
    return { monthlyPct: lockedMonthlyPct, firstDailyPct: locked, lastDailyPct: locked, avgDailyPct: lockedMonthlyPct / 30 };
  }
  if (lockType === LockType.LOCKED_50) {
    const monthlyPct = (flexMonthlyPct + lockedMonthlyPct) / 2;
    return {
      monthlyPct,
      firstDailyPct: (flexFirst + locked) / 2,
      lastDailyPct: (flexLast + locked) / 2,
      avgDailyPct: monthlyPct / 30,
    };
  }
  return { monthlyPct: flexMonthlyPct, firstDailyPct: flexFirst, lastDailyPct: flexLast, avgDailyPct: flexMonthlyPct / 30 };
}

export function pct(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}

/** Fields of a package / user needed to value one package (subset of EnhancedPosition / PlatformUser). */
type PackageInput = {
  initialPrincipal: bigint;
  createdAt: number;
  lockType: LockType;
  lockedAt: number;
  roiAccrued: bigint;
  flexRoiAccrued: bigint;
  completedCycles: number;
  lastAccruedCycleBps: number;
  active: boolean;
  isCapped: boolean;
};
type PackageOwner = { roiCycleStartTime: number; isTopId: boolean };

export type PackageLiveRoi = {
  /** Total ROI earned by the package so far (credited + not yet settled). */
  accruedUsd: number;
  dailyUsd: number;
  dailyPct: number;
  /** null for the Top ID, whose packages are not capped. */
  capUsd: number | null;
  schedule: string;
};

const toUsd18 = (v: bigint) => Number(v) / 1e18;

/**
 * Live value of one package at unix time `t`, using the same rules as the contracts.
 * The Top ID is paid linearly on its whole principal (accrueTopId), so its packages are
 * valued pro-rata from their creation time instead of from the per-package checkpoints.
 */
export function packageLiveRoi(pos: PackageInput, owner: PackageOwner, lhrTier: number, t: number): PackageLiveRoi {
  const principal = toUsd18(pos.initialPrincipal);
  const done = !pos.active || pos.isCapped;

  if (owner.isTopId) {
    const dailyUsd = done ? 0 : principal * TOP_ID_DAILY_RATE * TOP_ID_KEEP_SHARE;
    const days = Math.max(0, t - pos.createdAt) / DAY_SECONDS;
    return {
      accruedUsd: dailyUsd * days,
      dailyUsd,
      dailyPct: TOP_ID_DAILY_RATE * TOP_ID_KEEP_SHARE * 100,
      capUsd: null,
      schedule: `Top ID · ${(TOP_ID_DAILY_RATE * 100).toFixed(2)}%/day linear · ${TOP_ID_KEEP_SHARE * 100}% kept`,
    };
  }

  const capUsd = principal * CAP_MULTIPLIER;
  if (done) {
    return { accruedUsd: toUsd18(pos.roiAccrued), dailyUsd: 0, dailyPct: 0, capUsd, schedule: "Capped out" };
  }

  const isHybrid = pos.lockType === LockType.LOCKED_50;
  let accruedUsd = 0;
  let dailyUsd = 0;
  const parts: string[] = [];

  if (pos.lockType === LockType.FLEXIBLE || isHybrid) {
    const flexPrincipal = isHybrid ? principal / 2 : principal;
    const credited = toUsd18(isHybrid ? pos.flexRoiAccrued : pos.roiAccrued);
    const room = Math.max(0, flexPrincipal * CAP_MULTIPLIER - credited);
    const elapsed = Math.max(0, t - (owner.roiCycleStartTime || pos.createdAt));
    const delta = (flexPrincipal * deltaBpsSinceCheckpoint(lhrTier, elapsed, pos.completedCycles, pos.lastAccruedCycleBps)) / 10_000;
    accruedUsd += credited + Math.min(delta, room);
    const bps = delta < room ? flexDailyBps(lhrTier, elapsed) : 0;
    dailyUsd += (flexPrincipal * bps) / 10_000;
    const { day, slot } = cyclePosition(elapsed);
    parts.push(`${isHybrid ? "Flex half: " : ""}Day ${day + 1}/30 · Slot ${slot + 1}/6 · ${(bps / 100).toFixed(2)}%/day`);
  }

  if ((pos.lockType === LockType.LOCKED_100 || isHybrid) && pos.lockedAt > 0) {
    const lockPrincipal = isHybrid ? principal / 2 : principal;
    const elapsed = Math.max(0, t - pos.lockedAt);
    accruedUsd += lockedGain(lockPrincipal, elapsed);
    dailyUsd += lockedDailyUsd(lockPrincipal, elapsed);
    const day = Math.min(Math.floor(elapsed / DAY_SECONDS) + 1, LOCKED_CAP_DAY);
    parts.push(`${isHybrid ? "Locked half: " : ""}Day ${day}/${LOCKED_CAP_DAY} · 0.33% compounding`);
  }

  return {
    accruedUsd: Math.min(accruedUsd, capUsd),
    dailyUsd,
    dailyPct: principal > 0 ? (dailyUsd / principal) * 100 : 0,
    capUsd,
    schedule: parts.join(" · "),
  };
}
