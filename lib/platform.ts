"use client";

import { useEffect, useState } from "react";
import { type Address, createPublicClient, getAddress, http } from "viem";
import {
  platformAbi,
  tokenContractAbi,
  lhrRoutingEngineAbi,
  platformDexRouterAbi,
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
};

export type OperationsData = {
  // LHR Core
  lhrTierIndex: number;
  lhrTierName: string;
  lhrRatioBps: number;
  lhrCoefficient: number; // e.g. 1.20
  snapshotReserveUSDT: bigint;
  realizableReserveUSDT: bigint;
  totalActuarialLiabilitiesUSDT: bigint;
  liabilityHorizonMonths: number;
  lastSnapshotTime: number;
  snapshotInterval: number;
  lhrResetThresholdBps: number;
  buybackLhrThresholdBps: number;
  buybackPoolUSDT: bigint;
  buybackCapUSDT: bigint;
  isNonAlgoMode: boolean;
  currentTargetPrice: bigint;
  basePrice: bigint;
  initialPrice: bigint;
  nonAlgoCurrentTarget: bigint;
  day15Active: boolean;
  day15NextTranche: number;
  safetyDiscountBps: number;
  routingSlippageFactorBps: number;

  // Capital Routing Breakdowns
  treasuryFeeBps: number;
  treasuryFeePercent: number; // 10.00%
  netInflowPercent: number; // 90.00%
  currentZone: number; // 1, 2, or 3
  zoneName: string;
  buyingPercent: number; // % of net capital used to buy CARB
  burningPercent: number; // % of bought CARB burned
  lpAddPercent: number; // % of net capital added to LP pool
  buybackFundingPercent: number;

  // DEX Sell Tax & Panic Mechanism
  effectiveSellTaxBps: number;
  effectiveSellTaxPercent: number; // e.g. 1.00%
  baseSellTaxBps: number;
  baseSellTaxPercent: number;
  isTaxManualOverride: boolean;
  manualSellTaxBps: number;
  taxBurnPercent: number; // 100%
  publicPoolBuyEnabled: boolean;

  // Panic State
  panicTriggered: boolean;
  panicActiveTaxBps: number;
  panicBenchmarkPrice: bigint;
  panicTriggerPrice: bigint;
  panicRecoveryPrice: bigint;
  panicEndPrice: bigint;
  panicTriggerTimestamp: number;
  panicEndTime: number;
  priceDrawdownBps: number;
  isBenchmarkHealthy: boolean;

  // TWAP & Pool
  spotPrice: bigint;
  twapPrice: bigint;
  priceDeviationBps: number;
  maxPriceDeviationBps: number;
  isTwapStale: boolean;
  usdtReserve: bigint;
  carbReserve: bigint;
  lpTotalSupply: bigint;

  // Governance & Wallets
  adminWallet: Address;
  treasuryWallet: Address;
  rewardPoolWallet: Address;
  topIdWallet: Address;
  totalPlatformActiveDeposit: bigint;
  minDepositUSDT: bigint;
  maxPackageDepositUSDT: bigint;
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

/** Comprehensive fetch of all operational and protocol parameters from on-chain contracts */
export async function fetchOperationsData(): Promise<OperationsData> {
  const pAddr = platformAddress;
  const lhrAddr = lhrAddress;
  const tAddr = tokenAddress;
  const rAddr = dexRouterAddress;
  const oAddr = oracleAddress;
  const pair = pairAddress;

  // 1. Query LHRRoutingEngine
  const [tierData, metrics, dynamicTreasuryBps, resetFloorBps, buybackFloorBps, bbPool, bbCap, nonAlgo, baseP, curTargetP, initP, nonAlgoTarget, day15, safetyDisc, slippageFact] =
    await Promise.all([
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "getActiveTier" }).catch(() => [0, "Tier 1 (Healthy)", 12000n] as const),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "getMetrics" }).catch(() => ({
        snapshotReserveUSDT: 10000n * 10n ** 18n,
        realizableReserveUSDT: 9000n * 10n ** 18n,
        totalActuarialLiabilitiesUSDT: 0n,
        lhrRatioBps: 12000n,
        activeTier: 0,
        lastSnapshotTime: 0n,
      })),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "getDynamicTreasuryFeeBps" }).catch(() => 1000n),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "lhrResetThresholdBps" }).catch(() => 7000n),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "buybackLhrThresholdBps" }).catch(() => 12000n),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "buybackPoolUSDT" }).catch(() => 0n),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "getBuybackCap" }).catch(() => 0n),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "isNonAlgoMode" }).catch(() => false),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "basePrice" }).catch(() => 1000000000000000000n),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "currentTargetPrice" }).catch(() => 1000000000000000000n),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "initialPrice" }).catch(() => 1000000000000000000n),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "nonAlgoCurrentTarget" }).catch(() => 0n),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "day15Intervention" }).catch(() => ({
        active: false,
        startTime: 0n,
        totalUsdtBudget: 0n,
        usdtPerTranche: 0n,
        nextTrancheIndex: 0,
        lastTrancheTime: 0n,
      })),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "safetyDiscountBps" }).catch(() => 9000n),
      publicClient.readContract({ address: lhrAddr, abi: lhrRoutingEngineAbi, functionName: "routingSlippageFactorBps" }).catch(() => 9750n),
    ]);

  // 2. Query TokenContract (sell tax)
  const [effectiveTaxBps, baseTaxBps, manualOverride, manualTaxBps, publicPoolBuy, carbTotalSupply] =
    await Promise.all([
      publicClient.readContract({ address: tAddr, abi: tokenContractAbi, functionName: "getEffectiveSellTaxBps" }).catch(() => 100n),
      publicClient.readContract({ address: tAddr, abi: tokenContractAbi, functionName: "sellTaxBps" }).catch(() => 100n),
      publicClient.readContract({ address: tAddr, abi: tokenContractAbi, functionName: "isTaxManualOverride" }).catch(() => false),
      publicClient.readContract({ address: tAddr, abi: tokenContractAbi, functionName: "manualSellTaxBps" }).catch(() => 100n),
      publicClient.readContract({ address: tAddr, abi: tokenContractAbi, functionName: "publicPoolBuyEnabled" }).catch(() => false),
      publicClient.readContract({ address: tAddr, abi: tokenContractAbi, functionName: "totalSupply" }).catch(() => 10000n * 10n ** 18n),
    ]);

  // 3. Query PlatformDexRouter (panic state)
  const [pState, isBenchHealthy, obsStatus] = await Promise.all([
    publicClient.readContract({ address: rAddr, abi: platformDexRouterAbi, functionName: "panicState" }).catch(() => ({
      isTriggered: false,
      triggerTimestamp: 0,
      benchmarkPrice: 0n,
      triggerPrice: 0n,
      activeTaxBps: 100,
      recoveryPrice: 0n,
      endPrice: 0n,
      endTime: 0,
    })),
    publicClient.readContract({ address: rAddr, abi: platformDexRouterAbi, functionName: "isBenchmarkHealthy" }).catch(() => false),
    publicClient.readContract({ address: rAddr, abi: platformDexRouterAbi, functionName: "getObservationStatus" }).catch(() => [0, 0, 0, 0, false] as const),
  ]);

  // 4. Query DEX Pair & TWAP Oracle
  let reserves: [bigint, bigint, number] = [10000n * 10n ** 18n, 10000n * 10n ** 18n, 0];
  let token0Addr: Address = tAddr;
  let lpSupply = 10000n * 10n ** 18n;
  try {
    const [res, t0, lp] = await Promise.all([
      publicClient.readContract({ address: pair, abi: pairAbi, functionName: "getReserves" }),
      publicClient.readContract({ address: pair, abi: pairAbi, functionName: "token0" }),
      publicClient.readContract({ address: pair, abi: pairAbi, functionName: "totalSupply" }).catch(() => 10000n * 10n ** 18n),
    ]);
    reserves = [BigInt(res[0]), BigInt(res[1]), Number(res[2])];
    token0Addr = t0;
    lpSupply = lp;
  } catch {}

  const isToken0Carb = token0Addr.toLowerCase() === tAddr.toLowerCase();
  const carbReserve = isToken0Carb ? reserves[0] : reserves[1];
  const usdtReserve = isToken0Carb ? reserves[1] : reserves[0];

  let spotPrice = 1000000000000000000n;
  if (carbReserve > 0n && usdtReserve > 0n) {
    spotPrice = (usdtReserve * 10n ** 18n) / carbReserve;
  }

  let twapPrice = spotPrice;
  let maxDeviationBps = 200n;
  let twapStale = false;
  try {
    const [twapRes, devRes, staleRes] = await Promise.all([
      publicClient.readContract({ address: oAddr, abi: oracleAbi, functionName: "getLatestTwap" }),
      publicClient.readContract({ address: oAddr, abi: oracleAbi, functionName: "getEffectiveMaxPriceDeviationBps" }).catch(() => 200n),
      publicClient.readContract({ address: oAddr, abi: oracleAbi, functionName: "isTwapStale" }).catch(() => false),
    ]);
    if (twapRes[0] > 0n) twapPrice = twapRes[0];
    maxDeviationBps = devRes;
    twapStale = staleRes;
  } catch {}

  // 5. Query Platform Governance
  const [adminW, treasuryW, rewardPoolW, topIdW, totalPlatformActiveDeposit] = await Promise.all([
    publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "adminWallet" }).catch(() => "0x9C886a403c88D95F45753c4312d10F3D9343590c" as Address),
    publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "treasuryWallet" }).catch(() => "0x9C886a403c88D95F45753c4312d10F3D9343590c" as Address),
    publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "rewardPoolWallet" }).catch(() => "0x9C886a403c88D95F45753c4312d10F3D9343590c" as Address),
    publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "topId" }).catch(() => "0x9C886a403c88D95F45753c4312d10F3D9343590c" as Address),
    publicClient.readContract({ address: pAddr, abi: platformAbi, functionName: "totalPlatformActiveDeposit" }).catch(() => 50000n * 10n ** 18n),
  ]);

  // Derived Calculations
  const lhrRatio = Number(metrics.lhrRatioBps);
  const lhrCoefficient = Number((lhrRatio / 10000).toFixed(4));
  const tFeeBps = Number(dynamicTreasuryBps);
  const treasuryFeePercent = Number((tFeeBps / 100).toFixed(2));
  const netInflowPercent = Number((100 - treasuryFeePercent).toFixed(2));

  // Determine Current Capital Routing Zone
  let currentZone = 1;
  let zoneName = "Zone 1: Target Met (LP Add & Buyback)";
  let buyingPercent = 0;
  let burningPercent = 0;
  let lpAddPercent = 100;
  let buybackFundingPercent = 0;

  if (nonAlgo) {
    currentZone = 3;
    zoneName = "Zone 3: Non-Algo Recovery (Buy & Burn)";
    buyingPercent = 100;
    burningPercent = 100;
    lpAddPercent = 0;
  } else if (curTargetP > 0n && spotPrice >= curTargetP) {
    currentZone = 1;
    zoneName = "Zone 1: Target Met (LP Add & Buyback)";
    lpAddPercent = 100;
    buyingPercent = 0;
    burningPercent = 0;
    if (lhrRatio >= Number(buybackFloorBps)) {
      buybackFundingPercent = 100;
    }
  } else if (baseP > 0n && spotPrice >= baseP) {
    currentZone = 2;
    zoneName = "Zone 2: Chasing Target (Buy & Burn)";
    buyingPercent = 100;
    burningPercent = 100;
    lpAddPercent = 0;
  } else {
    currentZone = 3;
    zoneName = "Zone 3: Below Baseline (Buy & Burn)";
    buyingPercent = 100;
    burningPercent = 100;
    lpAddPercent = 0;
  }

  // Price deviation bps
  let priceDevBps = 0;
  if (twapPrice > 0n) {
    const diff = spotPrice > twapPrice ? spotPrice - twapPrice : twapPrice - spotPrice;
    priceDevBps = Number((diff * 10000n) / twapPrice);
  }

  // Drawdown from benchmark
  let priceDrawdownBps = 0;
  const bench = pState.benchmarkPrice;
  if (bench > 0n && spotPrice < bench) {
    priceDrawdownBps = Number(((bench - spotPrice) * 10000n) / bench);
  }

  return {
    lhrTierIndex: Number(tierData[0]),
    lhrTierName: tierData[1] || "Tier 1 (Healthy)",
    lhrRatioBps: lhrRatio,
    lhrCoefficient,
    snapshotReserveUSDT: metrics.snapshotReserveUSDT,
    realizableReserveUSDT: metrics.realizableReserveUSDT,
    totalActuarialLiabilitiesUSDT: metrics.totalActuarialLiabilitiesUSDT,
    liabilityHorizonMonths: 3,
    lastSnapshotTime: Number(metrics.lastSnapshotTime),
    snapshotInterval: 3600,
    lhrResetThresholdBps: Number(resetFloorBps),
    buybackLhrThresholdBps: Number(buybackFloorBps),
    buybackPoolUSDT: bbPool,
    buybackCapUSDT: bbCap,
    isNonAlgoMode: nonAlgo,
    currentTargetPrice: curTargetP,
    basePrice: baseP,
    initialPrice: initP,
    nonAlgoCurrentTarget: nonAlgoTarget,
    day15Active: day15.active,
    day15NextTranche: Number(day15.nextTrancheIndex),
    safetyDiscountBps: Number(safetyDisc),
    routingSlippageFactorBps: Number(slippageFact),

    treasuryFeeBps: tFeeBps,
    treasuryFeePercent,
    netInflowPercent,
    currentZone,
    zoneName,
    buyingPercent,
    burningPercent,
    lpAddPercent,
    buybackFundingPercent,

    effectiveSellTaxBps: Number(effectiveTaxBps),
    effectiveSellTaxPercent: Number((Number(effectiveTaxBps) / 100).toFixed(2)),
    baseSellTaxBps: Number(baseTaxBps),
    baseSellTaxPercent: Number((Number(baseTaxBps) / 100).toFixed(2)),
    isTaxManualOverride: manualOverride,
    manualSellTaxBps: Number(manualTaxBps),
    taxBurnPercent: 100,
    publicPoolBuyEnabled: publicPoolBuy,

    panicTriggered: pState.isTriggered,
    panicActiveTaxBps: Number(pState.activeTaxBps),
    panicBenchmarkPrice: pState.benchmarkPrice,
    panicTriggerPrice: pState.triggerPrice,
    panicRecoveryPrice: pState.recoveryPrice,
    panicEndPrice: pState.endPrice,
    panicTriggerTimestamp: Number(pState.triggerTimestamp),
    panicEndTime: Number(pState.endTime),
    priceDrawdownBps,
    isBenchmarkHealthy: isBenchHealthy,

    spotPrice,
    twapPrice,
    priceDeviationBps: priceDevBps,
    maxPriceDeviationBps: Number(maxDeviationBps),
    isTwapStale: twapStale,
    usdtReserve,
    carbReserve,
    lpTotalSupply: lpSupply,

    adminWallet: adminW,
    treasuryWallet: treasuryW,
    rewardPoolWallet: rewardPoolW,
    topIdWallet: topIdW,
    totalPlatformActiveDeposit,
    minDepositUSDT: 100n * 10n ** 18n,
    maxPackageDepositUSDT: 5000n * 10n ** 18n,
  };
}

export function useOperations() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let unmounted = false;
    async function load() {
      try {
        const res = await fetchOperationsData();
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
  }, [refreshCount]);

  return {
    data,
    loading,
    error,
    refresh: () => setRefreshCount((c) => c + 1),
  };
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
