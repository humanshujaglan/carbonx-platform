/**
 * Rank activation rules from `PlatformTeamEngine` (`_checkRankUpgradeImpl`).
 * The per-rank amounts (team business, self stake, direct business) are owner-configurable on-chain, so they are
 * read live from the team engine (`PlatformUser.rankRequirement`), never hardcoded here.
 * Only the fixed rules live here: a rank needs `teamBusinessRequired` in total, and the power leg counts for at
 * most 40% of it (`totalReq * 4000 / 10000` in the contract), so at least 60% has to come from the weaker legs.
 * The Top ID is exempt: it only needs the team business (no 60:40 split, no self stake, no direct business).
 */
export const MAX_RANK = 15;
export const POWER_LEG_SHARE = 0.4;
export const WEAKER_LEGS_SHARE = 0.6;

/** The rank a user is working towards: the next one, or the top rank once reached. */
export function targetRank(currentRank: number): number {
  return Math.min(Math.max(Math.trunc(currentRank) || 0, 0) + 1, MAX_RANK);
}
