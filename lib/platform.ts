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
  powerLegBusiness: bigint;
  weakerLegBusiness: bigint;
  positions: EnhancedPosition[];
  directDownlines: Address[];
  usdtBalance: bigint;
  carbBalance: bigint;
  usdtAllowance: bigint;
};

/** Market fields are `undefined` until loaded or when the on-chain read fails (shown as "—"). */
export type PlatformMarket = {
  spotPrice?: bigint;
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
  let topIdAddr = "0x0000000000000000000000000000000000000000" as Address;
  let totalActive: bigint | undefined;
  let lhrTier = 0;

  try {
    const [uToken, cToken, tId, tActive, tier] = await Promise.all([
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "usdtToken" }).catch(() => usdtAddr),
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "carbonToken" }).catch(() => carbAddr),
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "topId" }).catch(() => topIdAddr),
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "totalPlatformActiveDeposit" }).catch(() => undefined),
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "getActiveLhrTier" }).catch(() => 0),
    ]);

    usdtAddr = uToken;
    carbAddr = cToken;
    topIdAddr = tId;
    totalActive = tActive;
    lhrTier = Number(tier);
  } catch {}

  try {
    const [p, o] = await Promise.all([
      publicClient.readContract({ address: carbAddr, abi: tokenContractAbi, functionName: "dexPair" }).catch(() => pairAddr),
      publicClient.readContract({ address: carbAddr, abi: tokenContractAbi, functionName: "twapOracle" }).catch(() => oracleAddr),
    ]);
    if (p && p !== "0x0000000000000000000000000000000000000000") pairAddr = p;
    if (o && o !== "0x0000000000000000000000000000000000000000") oracleAddr = o;
  } catch {}

  // Reward pools are a ledger inside the payout engine; the USDT itself sits in the platform contract.
  // (rewardPoolWallet() returns the admin/Top ID wallet, so its USDT balance is NOT the pool.)
  let poolEngine: Address | undefined;
  const rewardPools = { neon: 0n, hydra: 0n, genosis: 0n };
  let rewardPoolAccumulated = 0n;
  let rewardPoolLiabilities = 0n;
  try {
    const pe = await publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "payoutEngine" });
    if (pe && pe !== "0x0000000000000000000000000000000000000000") {
      poolEngine = pe;
      const read = (functionName: "neonPoolBalance" | "hydraPoolBalance" | "genosisPoolBalance" | "accumulatedPoolBalance" | "totalRewardPoolLiabilities") =>
        publicClient.readContract({ address: pe, abi: payoutPoolsAbi, functionName }).catch(() => 0n);
      [rewardPools.neon, rewardPools.hydra, rewardPools.genosis, rewardPoolAccumulated, rewardPoolLiabilities] = await Promise.all([
        read("neonPoolBalance"),
        read("hydraPoolBalance"),
        read("genosisPoolBalance"),
        read("accumulatedPoolBalance"),
        read("totalRewardPoolLiabilities"),
      ]);
    }
  } catch {}

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

  // Read DEX pool reserves
  let reserves: [bigint, bigint, number] | undefined;
  let token0Addr: Address = carbAddr;
  try {
    const [res, t0] = await Promise.all([
      publicClient.readContract({ address: pairAddr, abi: pairAbi, functionName: "getReserves" }),
      publicClient.readContract({ address: pairAddr, abi: pairAbi, functionName: "token0" }),
    ]);
    reserves = [BigInt(res[0]), BigInt(res[1]), Number(res[2])];
    token0Addr = t0;
  } catch {}

  const isToken0Carb = token0Addr.toLowerCase() === carbAddr.toLowerCase();
  const carbReserve = reserves ? (isToken0Carb ? reserves[0] : reserves[1]) : undefined;
  const usdtReserve = reserves ? (isToken0Carb ? reserves[1] : reserves[0]) : undefined;

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

  let twapPrice: bigint | undefined;
  let twapWindowSec: number | undefined;
  try {
    const [twapRes, window] = await Promise.all([
      publicClient.readContract({ address: oracleAddr, abi: oracleAbi, functionName: "getLatestTwap" }),
      publicClient.readContract({ address: oracleAddr, abi: oracleAbi, functionName: "twapWindow" }).catch(() => undefined),
    ]);
    if (twapRes[0] > 0n) twapPrice = twapRes[0];
    if (window !== undefined) twapWindowSec = Number(window);
  } catch {}

  let blockTimestamp = Math.floor(Date.now() / 1000);
  try {
    const block = await publicClient.getBlock();
    blockTimestamp = Number(block.timestamp);
  } catch {}

  const market: PlatformMarket = {
    spotPrice,
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

  if (!account) {
    return { addresses, market };
  }

  // Read User Data
  try {
    const isTopId = topIdAddr !== "0x0000000000000000000000000000000000000000" && account.toLowerCase() === topIdAddr.toLowerCase();
    const [u, headroom, legBiz, pLeaderContest, pContest, pDirectBonus, usdtBal, carbBal, usdtAllow, boosterCycles, boosterLastBps, topIdPrincipal, topIdLastCompounded] =
      await Promise.all([
        publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "getUser", args: [account] }),
        publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "getUserWorkingCapHeadroom", args: [account] }).catch(() => 0n),
        publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getLegBusiness", args: [account] }).catch(() => [0n, 0n] as const),
        publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getPendingLeaderContestRewards", args: [account] }).catch(() => 0n),
        publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getPendingContestRewards", args: [account] }).catch(() => 0n),
        publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getPendingDirectBonus", args: [account] }).catch(() => [0n, 0n] as const),
        publicClient.readContract({ address: usdtAddr, abi: erc20Abi, functionName: "balanceOf", args: [account] }).catch(() => 0n),
        publicClient.readContract({ address: carbAddr, abi: erc20Abi, functionName: "balanceOf", args: [account] }).catch(() => 0n),
        publicClient.readContract({ address: usdtAddr, abi: erc20Abi, functionName: "allowance", args: [account, pAddr] }).catch(() => 0n),
        publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "userBoosterCompletedCycles", args: [account] }).catch(() => 0n),
        publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "userBoosterLastAccruedCycleBps", args: [account] }).catch(() => 0n),
        isTopId ? publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "topIdCurrentPrincipal" }).catch(() => 0n) : 0n,
        isTopId ? publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "topIdLastCompoundedTime" }).catch(() => 0n) : 0n,
      ]);

    const isRegistered = u.registrationTime > 0n;

    // Fetch user positions
    const posIds = u.positionIds ?? [];
    const positions: EnhancedPosition[] = await Promise.all(
      posIds.map(async (posId) => {
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
            user: account,
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
    );

    let directs: Address[] = [];
    try {
      const d = await publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getDirectDownlines", args: [account] });
      directs = [...d];
    } catch {}

    const user: PlatformUser = {
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
      currentRank: Number(u.currentRank),
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
      powerLegBusiness: legBiz[0],
      weakerLegBusiness: legBiz[1],
      positions,
      directDownlines: directs,
      usdtBalance: usdtBal,
      carbBalance: carbBal,
      usdtAllowance: usdtAllow,
    };

    return { addresses, market, user };
  } catch {
    return { addresses, market };
  }
}

export function usePlatform(account?: Address) {
  const [data, setData] = useState<{
    addresses?: PlatformAddresses;
    market: PlatformMarket;
    user?: PlatformUser;
  }>({
    market: getEmptyMarket(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let unmounted = false;
    async function load() {
      try {
        const res = await fetchPlatformData(account);
        if (!unmounted) {
          setData(res);
          setError(undefined);
        }
      } catch (err: unknown) {
        if (!unmounted) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!unmounted) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, refreshInterval);
    return () => {
      unmounted = true;
      clearInterval(timer);
    };
  }, [account, refreshCount]);

  return {
    ...data,
    loading,
    error,
    refresh: () => setRefreshCount((c) => c + 1),
  };
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
