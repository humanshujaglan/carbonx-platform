import { type Address, type Chain, getAddress } from "viem";
import { anvil, bsc, bscTestnet } from "viem/chains";

const chains: Record<number, Chain> = {
  [bsc.id]: bsc,
  [bscTestnet.id]: bscTestnet,
  [anvil.id]: anvil,
};

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? bscTestnet.id);

export const chain: Chain = chains[chainId] ?? bscTestnet;
export const rpcUrl: string = process.env.NEXT_PUBLIC_RPC_URL || "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
export const wsUrl: string | undefined = process.env.NEXT_PUBLIC_WS_URL || undefined;

// Deployed BSC Testnet Contract Addresses
const DEFAULT_PLATFORM = "0xa1ca0d5d995e68a072f65177dcc3f6cc67121253";
const DEFAULT_FARMING = "0xa463ff10de24046176419a999c0b16628c145119";
const DEFAULT_TOKEN = "0x1cbbccec4c9f7d23df71ed76683e9165d04c7795";
const DEFAULT_USDT = "0x79adb123aec718e0f148562e3007b4581ef43b4b";
const DEFAULT_PAIR = "0xc6a7dee4b16e85da68588dc427cda203e4b4fbed";
const DEFAULT_ORACLE = "0x54e380fd2ae0027e40f9cf8b1875ee91c146c9b6";
const DEFAULT_DEX_ROUTER = "0x324c643ee5be28eb00b826becaa2e435207e4bbf";
const DEFAULT_VIEW = "0x50501a71b55d92fe87c53f8ed5559f6438950a00";
const DEFAULT_LHR = "0x6e9a5b470a30dca2d14f74f67a1ddbbcccdb04a9";

const platform = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS || DEFAULT_PLATFORM;
export const platformAddress: Address = getAddress(platform);

const DEFAULT_PANCAKE_ROUTER = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";

export const farmingAddress: Address = getAddress(process.env.NEXT_PUBLIC_FARMING_ADDRESS || DEFAULT_FARMING);
export const tokenAddress: Address = getAddress(process.env.NEXT_PUBLIC_TOKEN_ADDRESS || DEFAULT_TOKEN);
export const usdtAddress: Address = getAddress(process.env.NEXT_PUBLIC_USDT_ADDRESS || DEFAULT_USDT);
export const pairAddress: Address = getAddress(process.env.NEXT_PUBLIC_PAIR_ADDRESS || DEFAULT_PAIR);
export const oracleAddress: Address = getAddress(process.env.NEXT_PUBLIC_ORACLE_ADDRESS || DEFAULT_ORACLE);
export const dexRouterAddress: Address = getAddress(process.env.NEXT_PUBLIC_DEX_ROUTER_ADDRESS || DEFAULT_DEX_ROUTER);
export const viewAddress: Address = getAddress(process.env.NEXT_PUBLIC_VIEW_ADDRESS || DEFAULT_VIEW);
export const lhrAddress: Address = getAddress(process.env.NEXT_PUBLIC_LHR_ADDRESS || DEFAULT_LHR);
export const pancakeRouterAddress: Address = getAddress(process.env.NEXT_PUBLIC_PANCAKE_ROUTER_ADDRESS || DEFAULT_PANCAKE_ROUTER);

export const explorerUrl = chain.blockExplorers?.default.url ?? "https://testnet.bscscan.com";
export const pollingInterval = chain.id === anvil.id ? 1_000 : 3_000;
export const refreshInterval = chain.id === anvil.id ? 1_000 : 5_000;

/** Lock Types according to IPlatformContract */
export enum LockType {
  FLEXIBLE = 0,
  LOCKED_100 = 1,
  LOCKED_50 = 2,
}

export const LOCK_DETAILS = {
  [LockType.FLEXIBLE]: {
    name: "Flexible",
    tagline: "10% / 30 days · 250% Cap",
    dailyRate: 0.003333,
    monthlyRatePercent: 10.0,
    capMultiplier: 2.5,
    lockDays: 0,
    description: "Daily flexible liquidity with ~10% monthly yield (0.15% to 0.60% daily backloaded). Claim or convert anytime up to 250% cap.",
  },
  [LockType.LOCKED_100]: {
    name: "100% Locked",
    tagline: "0.33% daily compound · 250% Cap",
    dailyRate: 0.0033,
    monthlyRatePercent: 10.4,
    capMultiplier: 2.5,
    lockDays: 381,
    description: "0.33% daily compounding (1.0033^381 reaches 2.5x cap on Day 381). Maximized compounding return.",
  },
  [LockType.LOCKED_50]: {
    name: "50/50 Hybrid",
    tagline: "50% Flexible + 50% Compound · 250% Cap",
    dailyRate: 0.003316,
    monthlyRatePercent: 10.2,
    capMultiplier: 2.5,
    lockDays: 180,
    description: "Balanced package: 50% flexible liquidity (10%/cycle) and 50% high-yield 0.33% daily compounding, up to 250% cap.",
  },
} as const;

export const MIN_DEPOSIT_USDT = 100n * 10n ** 18n; // 100 USDT
export const MAX_DEPOSIT_USDT = 5000n * 10n ** 18n; // 5,000 USDT max
