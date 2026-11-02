/**
 * Rank activation requirements, ported from `PlatformTeamEngine` (`_initRank`, `_checkRankUpgradeImpl`).
 * A rank needs `teamBusinessRequired` in total, and the power leg counts for at most 40% of it,
 * so at least 60% has to come from the weaker legs.
 */
export const MAX_RANK = 15;
export const POWER_LEG_SHARE = 0.4;
export const WEAKER_LEGS_SHARE = 0.6;

/** Team business (USD) required for ranks 1..15. */
export const RANK_TEAM_BUSINESS_USD: readonly number[] = [
  3_000, 10_000, 20_000, 40_000, 80_000, 150_000, 300_000, 500_000, 750_000, 1_000_000, 2_500_000, 5_000_000,
  10_000_000, 50_000_000, 100_000_000,
];

/** The rank a user is working towards: the next one, or the top rank once reached. */
export function targetRank(currentRank: number): number {
  return Math.min(Math.max(Math.trunc(currentRank) || 0, 0) + 1, MAX_RANK);
}

export function rankTeamRequirementUsd(rank: number): number {
  return RANK_TEAM_BUSINESS_USD[Math.min(Math.max(rank, 1), MAX_RANK) - 1];
}
