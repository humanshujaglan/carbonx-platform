/**
 * Rank activation requirements, ported from `PlatformTeamEngine` (`_initRank`, `_checkRankUpgradeImpl`).
 * A rank needs `teamBusinessRequired` in total, and the power leg counts for at most 40% of it,
 * so at least 60% has to come from the weaker legs. The Top ID is exempt: it only needs the team business
 * (no 60:40 split, no self stake, no direct business).
 */
export const MAX_RANK = 15;
export const POWER_LEG_SHARE = 0.4;
export const WEAKER_LEGS_SHARE = 0.6;

/** Team business (USD) required for ranks 1..15. */
export const RANK_TEAM_BUSINESS_USD: readonly number[] = [
  3_000, 10_000, 20_000, 40_000, 80_000, 150_000, 300_000, 500_000, 750_000, 1_000_000, 2_500_000, 5_000_000,
  10_000_000, 50_000_000, 100_000_000,
];

/** Own active deposit (USD) required for ranks 1..15 (`selfStakeRequired`). Not applied to the Top ID. */
export const RANK_SELF_STAKE_USD: readonly number[] = [
  100, 200, 500, 500, 500, 2_000, 5_000, 10_000, 12_500, 15_000, 17_500, 20_000, 25_000, 25_000, 25_000,
];

/** Active direct business (USD) required for ranks 1..15 (`rankDirectBusinessRequired`). Not applied to the Top ID. */
export const RANK_DIRECT_BUSINESS_USD: readonly number[] = [
  300, 1_000, 2_000, 4_000, 8_000, 15_000, 30_000, 50_000, 37_500, 50_000, 125_000, 250_000, 500_000, 2_500_000,
  5_000_000,
];

/** The rank a user is working towards: the next one, or the top rank once reached. */
export function targetRank(currentRank: number): number {
  return Math.min(Math.max(Math.trunc(currentRank) || 0, 0) + 1, MAX_RANK);
}

export function rankTeamRequirementUsd(rank: number): number {
  return RANK_TEAM_BUSINESS_USD[Math.min(Math.max(rank, 1), MAX_RANK) - 1];
}

const clampRank = (rank: number) => Math.min(Math.max(rank, 1), MAX_RANK) - 1;

export function rankSelfStakeUsd(rank: number): number {
  return RANK_SELF_STAKE_USD[clampRank(rank)];
}

export function rankDirectBusinessUsd(rank: number): number {
  return RANK_DIRECT_BUSINESS_USD[clampRank(rank)];
}
