"use client";

import { useEffect, useState } from "react";
import { type Address, createPublicClient, getAddress, http } from "viem";
import {
  platformAbi,
  tokenContractAbi,
  oracleAbi,
  pairAbi,
  erc20Abi,
  payoutPoolsAbi,
  teamEngineAbi,
  harvestPreviewAbi,
  earnEngineAbi,
  lhrEngineAbi,
  liquidityFarmingAbi,
} from "./abi";
import {
  chain,
  LockType,
  platformAddress,
  tokenAddress,
  usdtAddress,
  pairAddress,
  oracleAddress,
  dexRouterAddress,
  viewAddress,
  lhrAddress,
  farmingAddress,
  refreshInterval,
  rpcUrl,
} from "./config";

export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
  // Batches the many parallel reads into a few multicall3 requests (when the chain has multicall3)
  batch: { multicall: true },
});

export type PlatformAddresses = {
  platform: Address;
  usdt: Address;
  carb: Address;
  pair: Address;
  oracle: Address;
  topId: Address;
  view: Address;
  lhr: Address;
  farming: Address;
  dexRouter: Address;
  /** Payout engine holding the reward pool ledger. */
  rewardPool: Address;
};

export type EnhancedPosition = {
  id: bigint;
  user: Address;
  initialPrincipal: bigint;
  createdAt: number;
  lastUpdateTime: number;
  lockType: LockType;
  lockedAt: number;
  roiAccrued: bigint;
  roiWithdrawn: bigint;
  flexRoiAccrued: bigint;
  lockRoiAccrued: bigint;
  liveAccruedRoi: bigint;
  /** Contract checkpoint for the flexible schedule (completed 30-day cycles / bps already credited this cycle). */
  completedCycles: number;
  lastAccruedCycleBps: number;
  maxCap: bigint;
  isCapped: boolean;
  active: boolean;
  cappedOut: boolean;
};

export type PlatformUser = {
  isRegistered: boolean;
  /** Top ID: no working cap, linear ROI via accrueTopId instead of per-package ROI. */
  isTopId: boolean;
  topIdPrincipal: bigint;
  topIdLastCompoundedTime: number;
  sponsor: Address;
  registrationTime: number;
  firstDepositTime: number;
  totalPersonalDeposit: bigint;
  totalActiveDeposit: bigint;
  totalDirectBusiness: bigint;
  totalTeamBusiness: bigint;
  activeDirectCount: number;
  boosterTier: number;
  boosterFirstPackageAmount: bigint;
  boosterAccrued: bigint;
  boosterCapReached: boolean;
  boosterCompletedCycles: number;
  boosterLastAccruedCycleBps: number;
  currentRank: number;
  usedLeader: Address;
  roiCycleStartTime: number;
  workingIncomePending: bigint;
  workingIncomeWithdrawn: bigint;
  roiIncomePending: bigint;
  roiIncomeWithdrawn: bigint;
  boosterIncomePending: bigint;
  boosterIncomeWithdrawn: bigint;
  leaderIncomePending: bigint;
  leaderIncomeWithdrawn: bigint;
  workingCapConsumed: bigint;
  workingCapHeadroom: bigint;
  pendingLeaderContestRewards: bigint;
  pendingContestRewards: bigint;
  pendingDirectBonusAvailable: bigint;
  pendingDirectBonusLocked: bigint;
  /** Leader bonus slips already unlocked (realized on the next leader income withdrawal). */
  pendingLeaderBonusAvailable: bigint;
  /** Leader bonus slips still inside their lock period. */
  pendingLeaderBonusLocked: bigint;
  /** Rank salary already claimed and waiting to be withdrawn. */
  rankIncomePending: bigint;
  /** What `harvestLevelIncome` would credit to the working balance right now (previewed with eth_call). */
  levelIncomeHarvestable: bigint;
  /** Reward pool cycles this user won and has not claimed yet (poolType 1 Neon, 2 Hydra, 3 Genosis). */
  rewardPoolWins: { poolType: 1 | 2 | 3; cycleId: bigint; amount: bigint }[];
  /** Weekly rank salary streams (one per rank reached) and what can be claimed now. */
  rankSalary: {
    totalClaimable: bigint;
    streams: {
      rank: number;
      weeklyPayout: bigint;
      startTime: number;
      durationWeeks: number;
      weeksClaimed: number;
      claimableWeeks: number;
      remainingWeeks: number;
    }[];
  };
  powerLegBusiness: bigint;
  weakerLegBusiness: bigint;
  /** Own active deposit and active direct business: rank requirements for everyone except the Top ID. */
  activeDeposit: bigint;
  activeDirectBusiness: bigint;
  /** Clean (first-package, no leader code used) business in the power leg — leader code qualification. */
  cleanPowerLegBusiness: bigint;
  /** Clean business outside the power leg; leader code unlocks at 3,000 USDT. */
  cleanWeakerLegBusiness: bigint;
  /** Unlocked leader code, 0 when not yet unlocked. */
  leaderCode: bigint;
  positions: EnhancedPosition[];
  directDownlines: Address[];
  usdtBalance: bigint;
  carbBalance: bigint;
  usdtAllowance: bigint;
};

/** Market fields are `undefined` until loaded or when the on-chain read fails (shown as "—"). */
export type PlatformMarket = {
  spotPrice?: bigint;
  /** All-time high CARB price recorded by the contest logic. */
  athPrice?: bigint;
  /** Today's (UTC) high price tracked by the price contest, and whether the 5% drop already triggered it. */
  contestDayHigh?: bigint;
  contestTriggered?: boolean;
  twapPrice?: bigint;
  /** TWAP averaging window in seconds (oracle `twapWindow`). */
  twapWindowSec?: number;
  totalPlatformActiveDeposit?: bigint;
  lhrTier: number;
  usdtReserve?: bigint;
  carbReserve?: bigint;
  blockTimestamp: number;
  /** Undistributed balances of the three reward pools (Neon 70% / Hydra 20% / Genosis 10%). */
  rewardPools: { neon: bigint; hydra: bigint; genosis: bigint };
  rewardPoolBalance: bigint;
  /** Lifetime USDT routed into reward pools. */
  rewardPoolAccumulated: bigint;
  /** Pool USDT still owed (undistributed + distributed but unclaimed). */
  rewardPoolLiabilities: bigint;
  rewardPoolEngine?: Address;
  /** USDT the LHR engine holds for CARB buybacks. */
  buybackPoolUSDT: bigint;
  /** USDT principal the LP farming contract has added to the CARB/USDT pool. */
  farmingPrincipalUSDT: bigint;
  /** Current USD value (both sides) of the LP tokens held by the farming contract. */
  farmingLpValueUSDT: bigint;
  /** Farming contract's share of the LP supply, in bps. */
  farmingLpShareBps: number;
};

// Fallback preview data
function getEmptyMarket(): PlatformMarket {
  return {
    lhrTier: 0,
    blockTimestamp: 0,
    rewardPools: { neon: 0n, hydra: 0n, genosis: 0n },
    rewardPoolBalance: 0n,
    rewardPoolAccumulated: 0n,
    rewardPoolLiabilities: 0n,
    buybackPoolUSDT: 0n,
    farmingPrincipalUSDT: 0n,
    farmingLpValueUSDT: 0n,
    farmingLpShareBps: 0,
  };
}

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

/** Cheap membership check (one eth_call), used to decide between Login and Register before any heavy fetch. */
export async function fetchIsRegistered(account: Address): Promise<boolean> {
  const u = await publicClient.readContract({ address: platformAddress, abi: platformAbi, functionName: "getUser", args: [account] });
  return u.registrationTime > 0n;
}

export async function fetchPlatformData(account?: Address): Promise<{
  addresses: PlatformAddresses;
  market: PlatformMarket;
  user?: PlatformUser;
}> {
  const pAddr: Address = platformAddress;
  let usdtAddr = usdtAddress;
  let carbAddr = tokenAddress;
  let pairAddr = pairAddress;
  let oracleAddr = oracleAddress;
  let topIdAddr = ZERO;
  let poolEngine: Address | undefined;
  let totalActive: bigint | undefined;
  let lhrTier = 0;

  // Everything below depends on these platform reads, so they go first (one parallel round)
  try {
    const [uToken, cToken, tId, tActive, tier, pe] = await Promise.all([
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "usdtToken" }).catch(() => usdtAddr),
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "carbonToken" }).catch(() => carbAddr),
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "topId" }).catch(() => topIdAddr),
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "totalPlatformActiveDeposit" }).catch(() => undefined),
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "getActiveLhrTier" }).catch(() => 0),
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "payoutEngine" }).catch(() => undefined),
    ]);

    usdtAddr = uToken;
    carbAddr = cToken;
    topIdAddr = tId;
    totalActive = tActive;
    lhrTier = Number(tier);
    if (pe && pe !== ZERO) poolEngine = pe;
  } catch {}

  // User data and market data load side by side
  const userPromise = account ? loadUser(account) : Promise.resolve(undefined);

  async function loadUser(acct: Address): Promise<PlatformUser | undefined> {
    try {
      const isTopId = topIdAddr !== ZERO && acct.toLowerCase() === topIdAddr.toLowerCase();
      const [u, headroom, legBiz, pLeaderContest, pContest, pDirectBonus, pLeaderBonus, rankIncome, usdtBal, carbBal, usdtAllow, boosterCycles, boosterLastBps, topIdPrincipal, topIdLastCompounded, cleanLegBiz, leaderCode, activeDeposit, activeDirectBusiness] =
        await Promise.all([
          publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "getUser", args: [acct] }),
          publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "getUserWorkingCapHeadroom", args: [acct] }).catch(() => 0n),
          publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getLegBusiness", args: [acct] }).catch(() => [0n, 0n] as const),
          publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getPendingLeaderContestRewards", args: [acct] }).catch(() => 0n),
          publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getPendingContestRewards", args: [acct] }).catch(() => 0n),
          publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getPendingDirectBonus", args: [acct] }).catch(() => [0n, 0n] as const),
          publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getPendingLeaderBonus", args: [acct] }).catch(() => [0n, 0n] as const),
          publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "rankIncomePending", args: [acct] }).catch(() => 0n),
          publicClient.readContract({ address: usdtAddr, abi: erc20Abi, functionName: "balanceOf", args: [acct] }).catch(() => 0n),
          publicClient.readContract({ address: carbAddr, abi: erc20Abi, functionName: "balanceOf", args: [acct] }).catch(() => 0n),
          publicClient.readContract({ address: usdtAddr, abi: erc20Abi, functionName: "allowance", args: [acct, pAddr] }).catch(() => 0n),
          publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "userBoosterCompletedCycles", args: [acct] }).catch(() => 0n),
          publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "userBoosterLastAccruedCycleBps", args: [acct] }).catch(() => 0n),
          isTopId ? publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "topIdCurrentPrincipal" }).catch(() => 0n) : 0n,
          isTopId ? publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "topIdLastCompoundedTime" }).catch(() => 0n) : 0n,
          publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getFirstTopUpLegBusiness", args: [acct] }).catch(() => [0n, 0n] as const),
          publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "leaderCodeOf", args: [acct] }).catch(() => 0n),
          publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "getUserActiveDeposit", args: [acct] }).catch(() => 0n),
          publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getUserActiveDirectBusiness", args: [acct] }).catch(() => 0n),
        ]);

      const isRegistered = u.registrationTime > 0n;
      const currentRank = Number(u.currentRank);

      // Positions, downlines, pool wins, level income and rank salary only need `u`, so they run together
      const [positions, directs, rewardPoolWins, levelIncomeHarvestable, rankSalary] = await Promise.all([
        Promise.all(
          (u.positionIds ?? []).map(async (posId): Promise<EnhancedPosition> => {
            try {
              const [pos, live, cycles, lastBps] = await Promise.all([
                publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getPosition", args: [posId] }),
                publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getPositionLiveAccruedRoi", args: [posId] }),
                publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "positionCompletedCycles", args: [posId] }).catch(() => 0n),
                publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "positionLastAccruedCycleBps", args: [posId] }).catch(() => 0n),
              ]);
              return {
                id: pos.id,
                user: pos.user,
                initialPrincipal: pos.initialPrincipal,
                createdAt: Number(pos.createdAt),
                lastUpdateTime: Number(pos.lastUpdateTime),
                lockType: Number(pos.lockType) as LockType,
                lockedAt: Number(pos.lockedAt),
                roiAccrued: pos.roiAccrued,
                roiWithdrawn: pos.roiWithdrawn,
                flexRoiAccrued: pos.flexRoiAccrued,
                lockRoiAccrued: pos.lockRoiAccrued,
                liveAccruedRoi: live[0],
                completedCycles: Number(cycles),
                lastAccruedCycleBps: Number(lastBps),
                maxCap: live[1],
                isCapped: live[2],
                active: pos.active,
                cappedOut: pos.cappedOut,
              };
            } catch {
              return {
                id: posId,
                user: acct,
                initialPrincipal: 0n,
                createdAt: 0,
                lastUpdateTime: 0,
                lockType: LockType.FLEXIBLE,
                lockedAt: 0,
                roiAccrued: 0n,
                roiWithdrawn: 0n,
                flexRoiAccrued: 0n,
                lockRoiAccrued: 0n,
                liveAccruedRoi: 0n,
                completedCycles: 0,
                lastAccruedCycleBps: 0,
                maxCap: 0n,
                isCapped: false,
                active: false,
                cappedOut: false,
              };
            }
          })
        ),
        publicClient
          .readContract({ address: viewAddress, abi: platformAbi, functionName: "getDirectDownlines", args: [acct] })
          .then((d) => [...d])
          .catch(() => [] as Address[]),
        loadRewardPoolWins(acct),
        // Referral (level) income has no stored balance: preview what a harvest would credit
        publicClient
          .simulateContract({ account: acct, address: pAddr, abi: harvestPreviewAbi, functionName: "harvestLevelIncome" })
          .then(({ result }) => result[1])
          .catch(() => 0n),
        loadRankSalary(acct, currentRank),
      ]);

      return {
        isRegistered,
        isTopId,
        topIdPrincipal,
        topIdLastCompoundedTime: Number(topIdLastCompounded),
        sponsor: u.sponsor,
        registrationTime: Number(u.registrationTime),
        firstDepositTime: Number(u.firstDepositTime),
        totalPersonalDeposit: u.totalPersonalDeposit,
        totalActiveDeposit: u.totalActiveDeposit,
        totalDirectBusiness: u.totalDirectBusiness,
        totalTeamBusiness: u.totalTeamBusiness,
        activeDirectCount: Number(u.activeDirectCount),
        boosterTier: Number(u.boosterTier),
        boosterFirstPackageAmount: u.boosterFirstPackageAmount,
        boosterAccrued: u.boosterAccrued,
        boosterCapReached: u.boosterCapReached,
        boosterCompletedCycles: Number(boosterCycles),
        boosterLastAccruedCycleBps: Number(boosterLastBps),
        currentRank,
        usedLeader: u.usedLeader,
        roiCycleStartTime: Number(u.roiCycleStartTime),
        workingIncomePending: u.workingIncomePending,
        workingIncomeWithdrawn: u.workingIncomeWithdrawn,
        roiIncomePending: u.roiIncomePending,
        roiIncomeWithdrawn: u.roiIncomeWithdrawn,
        boosterIncomePending: u.boosterIncomePending,
        boosterIncomeWithdrawn: u.boosterIncomeWithdrawn,
        leaderIncomePending: u.leaderIncomePending,
        leaderIncomeWithdrawn: u.leaderIncomeWithdrawn,
        workingCapConsumed: u.workingCapConsumed,
        workingCapHeadroom: headroom,
        pendingLeaderContestRewards: pLeaderContest,
        pendingContestRewards: pContest,
        pendingDirectBonusAvailable: pDirectBonus[0],
        pendingDirectBonusLocked: pDirectBonus[1],
        pendingLeaderBonusAvailable: pLeaderBonus[0],
        pendingLeaderBonusLocked: pLeaderBonus[1],
        rankIncomePending: rankIncome,
        levelIncomeHarvestable,
        rewardPoolWins,
        rankSalary,
        powerLegBusiness: legBiz[0],
        weakerLegBusiness: legBiz[1],
        activeDeposit,
        activeDirectBusiness,
        cleanPowerLegBusiness: cleanLegBiz[0],
        cleanWeakerLegBusiness: cleanLegBiz[1],
        leaderCode,
        positions,
        directDownlines: directs,
        usdtBalance: usdtBal,
        carbBalance: carbBal,
        usdtAllowance: usdtAllow,
      };
    } catch {
      return undefined;
    }
  }

  // Reward pool cycles won by this user and not yet claimed (looks at the latest cycles of each pool)
  async function loadRewardPoolWins(acct: Address): Promise<PlatformUser["rewardPoolWins"]> {
    if (!poolEngine) return [];
    const engine = poolEngine;
    const cycleFns = { 1: "neonCycleId", 2: "hydraCycleId", 3: "genosisCycleId" } as const;
    const perPool = await Promise.all(
      ([1, 2, 3] as const).map(async (poolType) => {
        try {
          const latest = await publicClient.readContract({ address: engine, abi: payoutPoolsAbi, functionName: cycleFns[poolType] });
          const first = latest > 30n ? latest - 29n : 1n;
          const cycleIds: bigint[] = [];
          for (let id = first; id <= latest; id++) cycleIds.push(id);
          const wins = await Promise.all(
            cycleIds.map(async (cycleId) => {
              try {
                const winners = await publicClient.readContract({ address: engine, abi: payoutPoolsAbi, functionName: "getPoolWinners", args: [poolType, cycleId] });
                if (!winners.some((w) => w.toLowerCase() === acct.toLowerCase())) return undefined;
                const claimed = await publicClient.readContract({ address: engine, abi: payoutPoolsAbi, functionName: "poolClaimed", args: [poolType, cycleId, acct] });
                if (claimed) return undefined;
                let amount = await publicClient.readContract({ address: engine, abi: payoutPoolsAbi, functionName: "poolWinnerReward", args: [poolType, cycleId, acct] });
                if (amount === 0n) {
                  amount = await publicClient.readContract({ address: engine, abi: payoutPoolsAbi, functionName: "poolRewardPerWinner", args: [poolType, cycleId] });
                }
                return { poolType, cycleId, amount };
              } catch {
                return undefined;
              }
            })
          );
          return wins.filter((w): w is NonNullable<typeof w> => !!w);
        } catch {
          return [];
        }
      })
    );
    return perPool.flat();
  }

  // Rank salary: one weekly stream per rank reached
  async function loadRankSalary(acct: Address, currentRank: number): Promise<PlatformUser["rankSalary"]> {
    const rankSalary: PlatformUser["rankSalary"] = { totalClaimable: 0n, streams: [] };
    if (currentRank <= 0) return rankSalary;
    try {
      const teamEngine = await publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "teamEngine" });
      const [claimable, claimableWeeks] = await publicClient.readContract({
        address: teamEngine,
        abi: teamEngineAbi,
        functionName: "getClaimableWeeklySalaryBonus",
        args: [acct],
      });
      rankSalary.totalClaimable = claimable;
      const ranks = Array.from({ length: Math.min(currentRank, 15) }, (_, i) => i + 1);
      rankSalary.streams = await Promise.all(
        ranks.map(async (rank) => {
          const [weeklyPayout, startTime, durationWeeks, weeksClaimed, , remainingWeeks] = await publicClient.readContract({
            address: teamEngine,
            abi: teamEngineAbi,
            functionName: "getUserRankStream",
            args: [acct, BigInt(rank)],
          });
          return {
            rank,
            weeklyPayout,
            startTime: Number(startTime),
            durationWeeks: Number(durationWeeks),
            weeksClaimed: Number(weeksClaimed),
            claimableWeeks: Number(claimableWeeks[rank - 1]),
            remainingWeeks: Number(remainingWeeks),
          };
        })
      );
    } catch {}
    return rankSalary;
  }

  // Market reads that do not depend on each other run together
  const [tokenLinks, pools, athPrice, contest, blockTimestamp] = await Promise.all([
    Promise.all([
      publicClient.readContract({ address: carbAddr, abi: tokenContractAbi, functionName: "dexPair" }).catch(() => pairAddr),
      publicClient.readContract({ address: carbAddr, abi: tokenContractAbi, functionName: "twapOracle" }).catch(() => oracleAddr),
    ]),
    // Reward pools are a ledger inside the payout engine; the USDT itself sits in the platform contract.
    // (rewardPoolWallet() returns the admin/Top ID wallet, so its USDT balance is NOT the pool.)
    (async () => {
      const rewardPools = { neon: 0n, hydra: 0n, genosis: 0n };
      let accumulated = 0n;
      let liabilities = 0n;
      if (poolEngine) {
        const pe = poolEngine;
        const read = (functionName: "neonPoolBalance" | "hydraPoolBalance" | "genosisPoolBalance" | "accumulatedPoolBalance" | "totalRewardPoolLiabilities") =>
          publicClient.readContract({ address: pe, abi: payoutPoolsAbi, functionName }).catch(() => 0n);
        [rewardPools.neon, rewardPools.hydra, rewardPools.genosis, accumulated, liabilities] = await Promise.all([
          read("neonPoolBalance"),
          read("hydraPoolBalance"),
          read("genosisPoolBalance"),
          read("accumulatedPoolBalance"),
          read("totalRewardPoolLiabilities"),
        ]);
      }
      return { rewardPools, accumulated, liabilities };
    })(),
    (async () => {
      try {
        const earn = await publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "earnEngine" });
        return await publicClient.readContract({ address: earn, abi: earnEngineAbi, functionName: "globalATHPrice" });
      } catch {
        return undefined;
      }
    })(),
    (async () => {
      try {
        const day = BigInt(Math.floor(Date.now() / 1000 / 86400));
        const [triggered, dayHigh] = await publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getContestDay", args: [day] });
        return { contestDayHigh: dayHigh as bigint | undefined, contestTriggered: triggered as boolean | undefined };
      } catch {
        return { contestDayHigh: undefined, contestTriggered: undefined };
      }
    })(),
    publicClient.getBlock().then((b) => Number(b.timestamp)).catch(() => Math.floor(Date.now() / 1000)),
  ]);

  const [p, o] = tokenLinks;
  if (p && p !== ZERO) pairAddr = p;
  if (o && o !== ZERO) oracleAddr = o;
  const { rewardPools, accumulated: rewardPoolAccumulated, liabilities: rewardPoolLiabilities } = pools;
  const { contestDayHigh, contestTriggered } = contest;

  const addresses: PlatformAddresses = {
    platform: pAddr,
    usdt: usdtAddr,
    carb: carbAddr,
    pair: pairAddr,
    oracle: oracleAddr,
    topId: topIdAddr,
    view: viewAddress,
    lhr: lhrAddress,
    farming: farmingAddress,
    dexRouter: dexRouterAddress,
    rewardPool: poolEngine ?? pAddr,
  };

  // Pair and oracle addresses are known now: DEX reserves and TWAP load together
  let reserves: [bigint, bigint, number] | undefined;
  let token0Addr: Address = carbAddr;
  let twapPrice: bigint | undefined;
  let twapWindowSec: number | undefined;
  await Promise.all([
    (async () => {
      try {
        const [res, t0] = await Promise.all([
          publicClient.readContract({ address: pairAddr, abi: pairAbi, functionName: "getReserves" }),
          publicClient.readContract({ address: pairAddr, abi: pairAbi, functionName: "token0" }),
        ]);
        reserves = [BigInt(res[0]), BigInt(res[1]), Number(res[2])];
        token0Addr = t0;
      } catch {}
    })(),
    (async () => {
      try {
        const [twapRes, window] = await Promise.all([
          publicClient.readContract({ address: oracleAddr, abi: oracleAbi, functionName: "getLatestTwap" }),
          publicClient.readContract({ address: oracleAddr, abi: oracleAbi, functionName: "twapWindow" }).catch(() => undefined),
        ]);
        if (twapRes[0] > 0n) twapPrice = twapRes[0];
        if (window !== undefined) twapWindowSec = Number(window);
      } catch {}
    })(),
  ]);

  const isToken0Carb = token0Addr.toLowerCase() === carbAddr.toLowerCase();
  const reservePair = reserves as [bigint, bigint, number] | undefined;
  const carbReserve = reservePair ? (isToken0Carb ? reservePair[0] : reservePair[1]) : undefined;
  const usdtReserve = reservePair ? (isToken0Carb ? reservePair[1] : reservePair[0]) : undefined;

  let spotPrice: bigint | undefined;
  if (carbReserve && usdtReserve) {
    spotPrice = (usdtReserve * 10n ** 18n) / carbReserve;
  }

  let buybackPoolUSDT = 0n;
  let farmingPrincipalUSDT = 0n;
  let farmingLpValueUSDT = 0n;
  let farmingLpShareBps = 0;
  try {
    const [buyback, principal, lpBal, lpSupply] = await Promise.all([
      publicClient.readContract({ address: lhrAddress, abi: lhrEngineAbi, functionName: "buybackPoolUSDT" }).catch(() => 0n),
      publicClient.readContract({ address: farmingAddress, abi: liquidityFarmingAbi, functionName: "totalActiveFarmingPrincipal" }).catch(() => 0n),
      publicClient.readContract({ address: pairAddr, abi: erc20Abi, functionName: "balanceOf", args: [farmingAddress] }).catch(() => 0n),
      publicClient.readContract({ address: pairAddr, abi: pairAbi, functionName: "totalSupply" }).catch(() => 0n),
    ]);
    buybackPoolUSDT = buyback;
    farmingPrincipalUSDT = principal;
    if (lpSupply > 0n && usdtReserve !== undefined) {
      farmingLpValueUSDT = (lpBal * usdtReserve * 2n) / lpSupply;
      farmingLpShareBps = Number((lpBal * 10_000n) / lpSupply);
    }
  } catch {}

  const market: PlatformMarket = {
    spotPrice,
    athPrice,
    contestDayHigh,
    contestTriggered,
    twapPrice,
    twapWindowSec,
    totalPlatformActiveDeposit: totalActive,
    lhrTier,
    usdtReserve,
    carbReserve,
    blockTimestamp,
    rewardPools,
    rewardPoolBalance: rewardPools.neon + rewardPools.hydra + rewardPools.genosis,
    rewardPoolAccumulated,
    rewardPoolLiabilities,
    rewardPoolEngine: poolEngine,
    buybackPoolUSDT,
    farmingPrincipalUSDT,
    farmingLpValueUSDT,
    farmingLpShareBps,
  };

  const user = await userPromise;
  return user ? { addresses, market, user } : { addresses, market };
}

type PlatformData = {
  addresses?: PlatformAddresses;
  market: PlatformMarket;
  user?: PlatformUser;
};

// Last result per wallet, so moving from the login page to the dashboard shows data instantly
// while a fresh fetch runs in the background (ponytail: in-memory only, lost on full page reload)
const dataCache = new Map<string, PlatformData>();
const cacheKey = (account?: Address) => account?.toLowerCase() ?? "public";

const EMPTY_DATA: PlatformData = { market: getEmptyMarket() };

export function usePlatform(account?: Address) {
  const key = cacheKey(account);
  const [fetched, setFetched] = useState<{ key: string; data: PlatformData }>();
  const [doneKey, setDoneKey] = useState<string>();
  const [error, setError] = useState<string>();
  const [refreshCount, setRefreshCount] = useState(0);

  // Fresh result for this wallet, else the cached one, else empty
  const cached = dataCache.get(key);
  const data = fetched?.key === key ? fetched.data : cached ?? EMPTY_DATA;
  const loading = doneKey !== key && !cached;

  useEffect(() => {
    let unmounted = false;
    async function load() {
      try {
        const res = await fetchPlatformData(account);
        if (!unmounted) {
          if (!account || res.user) dataCache.set(key, res);
          setFetched({ key, data: res });
          setError(undefined);
        }
      } catch (err: unknown) {
        if (!unmounted) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!unmounted) setDoneKey(key);
      }
    }
    load();
    const timer = setInterval(load, refreshInterval);
    return () => {
      unmounted = true;
      clearInterval(timer);
    };
  }, [account, key, refreshCount]);

  return {
    ...data,
    loading,
    error,
    refresh: () => setRefreshCount((c) => c + 1),
  };
}

/** Registered state of a wallet from one cheap call; both values stay undefined while checking. */
export function useIsRegistered(account?: Address) {
  const [state, setState] = useState<{ account?: Address; registered?: boolean; failed?: boolean }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!account) return;
    let off = false;
    fetchIsRegistered(account)
      .then((registered) => !off && setState({ account, registered }))
      .catch(() => !off && setState({ account, failed: true }));
    return () => {
      off = true;
    };
  }, [account, attempt]);
  const current = state.account === account ? state : {};
  return { registered: current.registered, failed: current.failed, recheck: () => setAttempt((n) => n + 1) };
}

export function usePlatformNow(baseTimestamp?: number) {
  const [now, setNow] = useState(baseTimestamp ?? 1730000000);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/**
 * Leader code display offset.
 * Leader codes are displayed with +1110 on the activation page, downline tree, and referral links,
 * and subtracted by 1110 from the user input on the registration page before submitting to the smart contract.
 */
export const LEADER_CODE_OFFSET = 1110n;

/**
 * Formats an on-chain leader code for display (e.g. on activation page or referral links).
 * Adds 1110 to any unlocked leader code (> 0).
 */
export function formatLeaderCode(code: bigint | number | string | undefined | null): bigint {
  if (!code) return 0n;
  const c = BigInt(code);
  return c > 0n ? c + LEADER_CODE_OFFSET : 0n;
}

/**
 * Parses a user input or referral query parameter back to the on-chain leader code.
 * Subtracts 1110 from input when > 1110; returns 0n otherwise.
 */
export function parseLeaderCodeInput(input: string | number | bigint | undefined | null): bigint {
  if (!input) return 0n;
  const str = input.toString().trim();
  if (!str || !/^\d+$/.test(str)) return 0n;
  try {
    const num = BigInt(str);
    if (num <= LEADER_CODE_OFFSET) return 0n;
    return num - LEADER_CODE_OFFSET;
  } catch {
    return 0n;
  }
}

