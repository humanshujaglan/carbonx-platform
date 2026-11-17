/** A direct bonus slip as `getPendingDirectBonusItem` returns it. */
export type Slip = { amount: bigint; unlockTime: number };
/** A direct downline's first package: when it was bought and whether any part of it is locked. */
export type FirstPackage = { createdAt: number; locked: boolean };

/** `PlatformTeamEngine.BONUS_UNLOCK_DELAY`: a slip unlocks 24 hours after the package that earned it. */
export const BONUS_UNLOCK_DELAY = 86_400;

/**
 * Splits lifetime direct bonus slips into direct (2%) and lock-in (2% of the locked part) income.
 * Slips carry no type, but `_handleFirstPackageBonuses` pushes them in a fixed order for each first package:
 * the direct slip, then the lock slip when the package is locked, all unlocking at packageTime + 24h.
 * So slips are matched to the directs' first packages by that time.
 * ponytail: two directs buying in the same block with different lock types can swap between the two totals;
 * the sum stays right. Exact split needs the DirectIncomeCredited / DirectLockIncomeCredited events (indexer).
 */
export function splitDirectSlips(slips: Slip[], packages: FirstPackage[]): { direct: bigint; lock: bigint } {
  const lockedByUnlockTime = new Map<number, boolean[]>();
  for (const p of packages) {
    const t = p.createdAt + BONUS_UNLOCK_DELAY;
    lockedByUnlockTime.set(t, [...(lockedByUnlockTime.get(t) ?? []), p.locked]);
  }

  let direct = 0n;
  let lock = 0n;
  for (let i = 0; i < slips.length; ) {
    const t = slips[i].unlockTime;
    const inGroup = (j: number) => j < slips.length && slips[j].unlockTime === t;
    let j = i;
    for (const locked of lockedByUnlockTime.get(t) ?? []) {
      if (inGroup(j)) direct += slips[j++].amount;
      if (locked && inGroup(j)) lock += slips[j++].amount;
    }
    // Slips no package explains count as direct
    while (inGroup(j)) direct += slips[j++].amount;
    i = j;
  }
  return { direct, lock };
}
