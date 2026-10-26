"use client";

import { useEffect, useState } from "react";
import { type Address, createPublicClient, getAddress, http } from "viem";
import {
  platformAbi,
  tokenContractAbi,
  oracleAbi,
  pairAbi,
  erc20Abi,
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
  maxCap: bigint;
  isCapped: boolean;
  active: boolean;
  cappedOut: boolean;
};

export type PlatformUser = {
  isRegistered: boolean;
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

export type PlatformMarket = {
  spotPrice: bigint;
  twapPrice: bigint;
  totalPlatformActiveDeposit: bigint;
  lhrTier: number;
  usdtReserve: bigint;
  carbReserve: bigint;
  blockTimestamp: number;
  rewardPoolBalance: bigint;
  rewardPoolWallet: Address;
};

// Fallback preview data
function getDemoMarket(): PlatformMarket {
  return {
    spotPrice: 1000000000000000000n, // $1.00
    twapPrice: 1000000000000000000n,
    totalPlatformActiveDeposit: 50_000n * 10n ** 18n,
    lhrTier: 0,
    usdtReserve: 10_000n * 10n ** 18n,
    carbReserve: 10_000n * 10n ** 18n,
    blockTimestamp: 0,
    rewardPoolBalance: 99_989_100n * 10n ** 18n,
    rewardPoolWallet: "0x9C886a403c88D95F45753c4312d10F3D9343590c",
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
  let topIdAddr = account ?? ("0x9C886a403c88D95F45753c4312d10F3D9343590c" as Address);
  let totalActive = 50_000n * 10n ** 18n;
  let lhrTier = 0;

  try {
    const [uToken, cToken, tId, tActive, tier] = await Promise.all([
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "usdtToken" }).catch(() => usdtAddr),
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "carbonToken" }).catch(() => carbAddr),
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "topId" }).catch(() => topIdAddr),
      publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "totalPlatformActiveDeposit" }).catch(() => totalActive),
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

  let rwWallet: Address = topIdAddr;
  let rwBalance = 0n;
  try {
    const rw = await publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "rewardPoolWallet" }).catch(() => undefined);
    if (rw && rw !== "0x0000000000000000000000000000000000000000") {
      rwWallet = rw;
      rwBalance = await publicClient.readContract({ address: usdtAddr, abi: erc20Abi, functionName: "balanceOf", args: [rw] }).catch(() => 0n);
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
    rewardPool: rwWallet,
  };

  // Read DEX pool reserves
  let reserves: [bigint, bigint, number] = [10_000n * 10n ** 18n, 10_000n * 10n ** 18n, 0];
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
  const carbReserve = isToken0Carb ? reserves[0] : reserves[1];
  const usdtReserve = isToken0Carb ? reserves[1] : reserves[0];

  let spotPrice = 1000000000000000000n; // $1.00
  if (carbReserve > 0n && usdtReserve > 0n) {
    spotPrice = (usdtReserve * 10n ** 18n) / carbReserve;
  }

  let twapPrice = spotPrice;
  try {
    const twapRes = await publicClient.readContract({ address: oracleAddr, abi: oracleAbi, functionName: "getLatestTwap" });
    if (twapRes[0] > 0n) twapPrice = twapRes[0];
  } catch {}

  let blockTimestamp = Math.floor(Date.now() / 1000);
  try {
    const block = await publicClient.getBlock();
    blockTimestamp = Number(block.timestamp);
  } catch {}

  const market: PlatformMarket = {
    spotPrice,
    twapPrice,
    totalPlatformActiveDeposit: totalActive,
    lhrTier,
    usdtReserve,
    carbReserve,
    blockTimestamp,
    rewardPoolBalance: rwBalance,
    rewardPoolWallet: rwWallet,
  };

  if (!account) {
    return { addresses, market };
  }

  // Read User Data
  try {
    const [u, headroom, legBiz, pLeaderContest, pContest, pDirectBonus, usdtBal, carbBal, usdtAllow] =
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
      ]);

    const isRegistered = u.registrationTime > 0n;

    // Fetch user positions
    const posIds = u.positionIds ?? [];
    const positions: EnhancedPosition[] = await Promise.all(
      posIds.map(async (posId) => {
        try {
          const [pos, live] = await Promise.all([
            publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getPosition", args: [posId] }),
            publicClient.readContract({ address: viewAddress, abi: platformAbi, functionName: "getPositionLiveAccruedRoi", args: [posId] }),
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
    market: getDemoMarket(),
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
