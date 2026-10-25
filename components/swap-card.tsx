"use client";

import { useEffect, useState } from "react";
import walletImage from "@/public/wallet.png";
import { formatUnits, parseUnits, type Address, maxUint256 } from "viem";
import {
  chain,
  explorerUrl,
  pancakeRouterAddress,
  tokenAddress,
  usdtAddress,
  pairAddress,
  dexRouterAddress,
} from "@/lib/config";
import { erc20Abi, pairAbi, pancakeRouterAbi, tokenContractAbi, platformDexRouterAbi } from "@/lib/abi";
import { shortAddr } from "@/lib/format";
import { publicClient, type PlatformAddresses } from "@/lib/platform";
import { CardHeader, Notice, Pill, Spinner, useTx } from "./ui";
import { useWallet } from "./wallet";

export function SwapCard({
  addresses,
  onDone,
}: {
  addresses?: PlatformAddresses;
  onDone?: () => void;
}) {
  const { account, hasWallet, connect, write } = useWallet();
  const tx = useTx(onDone || (() => {}));

  // Balances state
  const [usdtBal, setUsdtBal] = useState<bigint>(0n);
  const [carbBal, setCarbBal] = useState<bigint>(0n);
  const [lpBal, setLpBal] = useState<bigint>(0n);
  const [bnbBal, setBnbBal] = useState<bigint>(0n);
  const [carbAllowance, setCarbAllowance] = useState<bigint>(0n);

  // Market & Tax state
  const [reserves, setReserves] = useState<{ carb: bigint; usdt: bigint }>({ carb: 10000n * 10n ** 18n, usdt: 10000n * 10n ** 18n });
  const [spotPrice, setSpotPrice] = useState<bigint>(1000000000000000000n);
  const [effectiveTaxBps, setEffectiveTaxBps] = useState<number>(100);
  const [panicActive, setPanicActive] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loadingBalances, setLoadingBalances] = useState<boolean>(false);

  // Selling form state
  const [sellAmountStr, setSellAmountStr] = useState<string>("100");
  const [slippageBps, setSlippageBps] = useState<number>(250); // 2.5% default for fee-on-transfer tokens

  // Copy helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Add token to wallet via EIP-747
  const addTokenToWallet = async (addr: Address, symbol: string, decimals = 18) => {
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        await (window as any).ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: addr,
              symbol,
              decimals,
            },
          },
        });
      }
    } catch {
      // Ignored if user cancels or unsupported
    }
  };

  // Fetch balances & on-chain market data
  const fetchMarketAndBalances = async () => {
    setLoadingBalances(true);
    try {
      // 1. Reserves & Spot Price
      try {
        const [res, t0] = await Promise.all([
          publicClient.readContract({ address: pairAddress, abi: pairAbi, functionName: "getReserves" }),
          publicClient.readContract({ address: pairAddress, abi: pairAbi, functionName: "token0" }),
        ]);
        const isT0Carb = t0.toLowerCase() === tokenAddress.toLowerCase();
        const cRes = isT0Carb ? BigInt(res[0]) : BigInt(res[1]);
        const uRes = isT0Carb ? BigInt(res[1]) : BigInt(res[0]);
        setReserves({ carb: cRes, usdt: uRes });
        if (cRes > 0n && uRes > 0n) {
          setSpotPrice((uRes * 10n ** 18n) / cRes);
        }
      } catch {}

      // 2. Dynamic Sell Tax
      try {
        const taxBps = await publicClient.readContract({
          address: tokenAddress,
          abi: tokenContractAbi,
          functionName: "getEffectiveSellTaxBps",
        });
        setEffectiveTaxBps(Number(taxBps));
      } catch {
        setEffectiveTaxBps(100);
      }

      // 3. Panic state
      try {
        const pState = await publicClient.readContract({
          address: dexRouterAddress,
          abi: platformDexRouterAbi,
          functionName: "panicState",
        });
        setPanicActive(pState.isTriggered);
      } catch {}

      // 4. User Balances
      if (account) {
        const [uBal, cBal, lBal, bBal, cAllow] = await Promise.all([
          publicClient.readContract({ address: usdtAddress, abi: erc20Abi, functionName: "balanceOf", args: [account] }).catch(() => 0n),
          publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "balanceOf", args: [account] }).catch(() => 0n),
          publicClient.readContract({ address: pairAddress, abi: erc20Abi, functionName: "balanceOf", args: [account] }).catch(() => 0n),
          publicClient.getBalance({ address: account }).catch(() => 0n),
          publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "allowance", args: [account, pancakeRouterAddress] }).catch(() => 0n),
        ]);
        setUsdtBal(uBal);
        setCarbBal(cBal);
        setLpBal(lBal);
        setBnbBal(bBal);
        setCarbAllowance(cAllow);
      }
    } finally {
      setLoadingBalances(false);
    }
  };

  useEffect(() => {
    fetchMarketAndBalances();
    const interval = setInterval(fetchMarketAndBalances, 8000);
    return () => clearInterval(interval);
  }, [account]);

  // Calculations for Selling CARB
  const sellCarbParsed = (() => {
    try {
      const p = parseFloat(sellAmountStr || "0");
      if (isNaN(p) || p <= 0) return 0n;
      return parseUnits(sellAmountStr, 18);
    } catch {
      return 0n;
    }
  })();

  const sellTaxAmount = (sellCarbParsed * BigInt(effectiveTaxBps)) / 10000n;
  const netCarbToSwap = sellCarbParsed > sellTaxAmount ? sellCarbParsed - sellTaxAmount : 0n;

  // Expected USDT from PancakeSwap AMM: dx * 9975 * y / (x * 10000 + dx * 9975)
  const expectedUsdtOut = (() => {
    if (netCarbToSwap <= 0n || reserves.carb <= 0n || reserves.usdt <= 0n) return 0n;
    const amountInWithFee = netCarbToSwap * 9975n;
    const numerator = amountInWithFee * reserves.usdt;
    const denominator = reserves.carb * 10000n + amountInWithFee;
    return numerator / denominator;
  })();

  const minUsdtOut = (expectedUsdtOut * BigInt(10000 - slippageBps)) / 10000n;

  // --- Actions ---

  // Mint Testnet USDT Faucet
  async function handleMintFaucet() {
    if (!account) return;
    const mintAmt = parseUnits("1000", 18);
    await tx.run(
      "Minting 1,000 Testnet USDT...",
      async () => {
        return write({
          address: usdtAddress,
          abi: erc20Abi,
          functionName: "mint",
          args: [account, mintAmt],
        });
      },
      () => {
        fetchMarketAndBalances();
        return <span>1,000 Testnet USDT successfully minted to your wallet!</span>;
      }
    );
  }

  // Approve CARB to PancakeSwap Router
  async function handleApproveCarb() {
    if (!account) return;
    await tx.run(
      "Approving CARB for PancakeSwap Router...",
      async () => {
        return write({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [pancakeRouterAddress, maxUint256],
        });
      },
      () => {
        fetchMarketAndBalances();
        return <span>CARB approved for PancakeSwap. You can now sell!</span>;
      }
    );
  }

  // Sell CARB for USDT
  async function handleSellCarb() {
    if (!account || sellCarbParsed <= 0n) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 mins

    await tx.run(
      `Selling ${formatUnits(sellCarbParsed, 18)} CARB for USDT...`,
      async () => {
        return write({
          address: pancakeRouterAddress,
          abi: pancakeRouterAbi,
          functionName: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
          args: [sellCarbParsed, minUsdtOut, [tokenAddress, usdtAddress], account, deadline],
        });
      },
      () => {
        fetchMarketAndBalances();
        if (onDone) onDone();
        return (
          <span>
            Successfully sold {formatUnits(sellCarbParsed, 18)} CARB for USDT!
          </span>
        );
      }
    );
  }

  const carbPriceUsd = Number(formatUnits(spotPrice, 18));
  const carbBalNum = Number(formatUnits(carbBal, 18));
  const carbValueUsd = carbBalNum * carbPriceUsd;

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header Banner */}
      <section className="card p-5 sm:p-6" aria-label="Wallet Balances & Sell">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardHeader
            image={walletImage}
            title="Wallet Balances & Decentralized Token Selling"
            sub="Inspect your real-time on-chain balances of USDT and CARB token, mint testnet USDT, and sell CARB on PancakeSwap with dynamic panic-tax burn."
            right={
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-neon/10 px-3 py-1 text-[11px] font-medium text-neon border border-neon/25">
                  <span className="size-1.5 rounded-full bg-neon animate-pulse shadow-[0_0_8px_#1fe03a]" />
                  BSC Testnet (Chain ID 97)
                </span>
                <button
                  type="button"
                  onClick={fetchMarketAndBalances}
                  disabled={loadingBalances}
                  className="btn btn-secondary text-xs !py-1.5 !px-3 cursor-pointer"
                  title="Refresh wallet balances and DEX reserves"
                >
                  <span className={`inline-block ${loadingBalances ? "animate-spin" : ""}`}>↻</span> Refresh
                </button>
              </div>
            }
          />
        </div>

        {/* Guest Warning */}
        {!account && (
          <div className="mt-4">
            <Notice tone="info">
              Please connect your Web3 wallet to inspect your personal token balances, mint testnet USDT, or sell CARB tokens.
            </Notice>
          </div>
        )}
      </section>

      {/* 4 Asset Balance Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: USDT Balance */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between border-t-2 border-t-emerald-400">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted font-medium">Tether USD (USDT)</span>
              <Pill tone="green">Stablecoin</Pill>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
                {account ? Number(formatUnits(usdtBal, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "0.00"}
              </div>
              <div className="text-[11px] font-light text-muted mt-0.5">
                Value: <span className="text-emerald-400 font-medium">≈ ${account ? Number(formatUnits(usdtBal, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}</span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => copyToClipboard(usdtAddress, "usdt")}
              className="text-muted hover:text-text cursor-pointer"
            >
              {copiedKey === "usdt" ? "Copied!" : "Copy Addr"}
            </button>
            <button
              type="button"
              onClick={() => addTokenToWallet(usdtAddress, "USDT", 18)}
              className="text-neon hover:underline cursor-pointer"
              title="Add USDT to MetaMask"
            >
              + To Wallet
            </button>
            <button
              type="button"
              disabled={!account || Boolean(tx.busy)}
              onClick={handleMintFaucet}
              className="text-emerald-400 hover:underline font-semibold cursor-pointer"
              title="Mint 1,000 MockUSDT on BSC Testnet"
            >
              + Mint 1K
            </button>
          </div>
        </div>

        {/* Card 2: CARB Token Balance */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between border-t-2 border-t-neon">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted font-medium">CarbonX (CARB)</span>
              <Pill tone="green">Native Token</Pill>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-neon">
                {account ? carbBalNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "0.00"}
              </div>
              <div className="text-[11px] font-light text-muted mt-0.5">
                Value: <span className="text-text font-medium">≈ ${carbValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> · Spot: ${carbPriceUsd.toFixed(4)}
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => copyToClipboard(tokenAddress, "carb")}
              className="text-muted hover:text-text cursor-pointer"
            >
              {copiedKey === "carb" ? "Copied!" : "Copy Addr"}
            </button>
            <button
              type="button"
              onClick={() => addTokenToWallet(tokenAddress, "CARB", 18)}
              className="text-neon hover:underline cursor-pointer"
              title="Add CARB to MetaMask"
            >
              + To Wallet
            </button>
            <a
              href={`${explorerUrl}/token/${tokenAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-muted hover:text-text"
            >
              BscScan ↗
            </a>
          </div>
        </div>

        {/* Card 3: PancakeSwap LP Balance */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between border-t-2 border-t-cyan-400">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted font-medium">CARB/USDT Cake-LP</span>
              <Pill tone="cyan">Pancake V2</Pill>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
                {account ? Number(formatUnits(lpBal, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "0.00"}
              </div>
              <div className="text-[11px] font-light text-muted mt-0.5">
                Reserves: {Number(formatUnits(reserves.carb, 18)).toLocaleString()} CARB / {Number(formatUnits(reserves.usdt, 18)).toLocaleString()} USDT
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => copyToClipboard(pairAddress, "pair")}
              className="text-muted hover:text-text cursor-pointer"
            >
              {copiedKey === "pair" ? "Copied!" : "Copy Addr"}
            </button>
            <a
              href={`${explorerUrl}/address/${pairAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-muted hover:text-text"
            >
              Pair Contract ↗
            </a>
          </div>
        </div>

        {/* Card 4: BNB Gas Balance */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between border-t-2 border-t-amber-400">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted font-medium">BNB (Gas Token)</span>
              <Pill tone="gold">Native Gas</Pill>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
                {account ? Number(formatUnits(bnbBal, 18)).toFixed(4) : "0.0000"} BNB
              </div>
              <div className="text-[11px] font-light text-muted mt-0.5">
                Status: <span className={bnbBal > parseUnits("0.005", 18) ? "text-neon font-medium" : "text-amber-400 font-medium"}>
                  {bnbBal > parseUnits("0.005", 18) ? "Gas Healthy" : "Low BNB for Gas"}
                </span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between gap-1 text-[11px]">
            <a
              href="https://www.bnbchain.org/en/testnet-faucet"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline font-semibold"
            >
              Get Testnet BNB Faucet ↗
            </a>
          </div>
        </div>
      </div>

      {/* Main Selling Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] gap-6 items-start">
        {/* Left Column: Sell Card */}
        <section className="card p-5 sm:p-6" aria-label="Sell CARB for USDT">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-semibold text-text flex items-center gap-2">
                <span className="size-2 rounded-full bg-danger shadow-[0_0_6px_#ff3344]" />
                Sell CARB Tokens for USDT
              </h3>
              <p className="text-xs text-muted font-light mt-0.5">
                Swap CARB token directly for USDT via PancakeSwap V2 Router with dynamic panic-tax burn telemetry.
              </p>
            </div>
            <Pill tone="warn">100% Tax Burn</Pill>
          </div>

          {/* Buying Disabled Notice */}
          <div className="mb-4">
            <div className="well p-3 text-xs text-muted flex items-center justify-between gap-2 border-l-2 border-l-amber-400">
              <span className="text-[11px]">
                ℹ️ <strong>Buying Disabled:</strong> Public pool direct buys are disabled on-chain to protect mathematical protocol backing. Only token selling is active.
              </span>
            </div>
          </div>

          {/* SELL FORM: CARB -> USDT */}
          <div className="space-y-4">
            {/* Input: Sell CARB */}
            <div className="well p-4">
              <div className="flex items-center justify-between text-xs text-muted mb-2">
                <span className="font-medium text-text">You Pay (Sell CARB)</span>
                <span>
                  Balance: <strong className="text-neon">{carbBalNum.toFixed(2)} CARB</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.0"
                    value={sellAmountStr}
                    onChange={(e) => setSellAmountStr(e.target.value)}
                    className="w-full bg-panel-2 border border-white/[0.1] rounded-xl px-4 py-3 text-lg font-bold text-text focus:outline-none focus:border-neon transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2 bg-panel-2 px-3 py-2.5 rounded-xl border border-white/[0.08] shrink-0">
                  <span className="size-2 rounded-full bg-neon" />
                  <span className="font-bold text-sm text-text">CARB</span>
                </div>
              </div>

              {/* Percentage Quick Selectors */}
              <div className="flex items-center gap-1.5 mt-2.5">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      const amt = (carbBalNum * pct) / 100;
                      setSellAmountStr(amt.toFixed(2));
                    }}
                    className="text-[11px] px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-muted hover:text-text transition-colors cursor-pointer"
                  >
                    {pct === 100 ? "MAX" : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Panic Sell Tax Telemetry Box */}
            <div className={`p-4 rounded-xl border transition-all ${
              panicActive
                ? "bg-danger/10 border-danger/40 shadow-[0_0_15px_rgba(255,51,68,0.15)]"
                : "bg-panel-2 border-white/[0.08]"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${panicActive ? "bg-danger animate-ping" : "bg-emerald-400"}`} />
                  Dynamic DEX Sell Tax
                </span>
                <Pill tone={panicActive ? "warn" : "green"}>
                  {(effectiveTaxBps / 100).toFixed(2)}% Tax
                </Pill>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-muted">Gross CARB Sold:</span>
                  <span className="font-medium text-text">{Number(formatUnits(sellCarbParsed, 18)).toFixed(2)} CARB</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-muted">Tax Burned (100% to Dead):</span>
                  <span className="font-semibold text-danger">
                    -{Number(formatUnits(sellTaxAmount, 18)).toFixed(4)} CARB ({(effectiveTaxBps / 100).toFixed(2)}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted">Net CARB Reaching DEX:</span>
                  <span className="font-medium text-neon">{Number(formatUnits(netCarbToSwap, 18)).toFixed(2)} CARB</span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-white/[0.06] text-[10px] text-muted flex items-center justify-between">
                <span>Burn Target: <code>0x000...dead</code></span>
                <span>Zero Admin / Dev Retention</span>
              </div>
            </div>

            {/* Output: Receive USDT */}
            <div className="well p-4">
              <div className="flex items-center justify-between text-xs text-muted mb-2">
                <span className="font-medium text-text">You Receive (Estimated)</span>
                <span>
                  Balance: <strong className="text-emerald-400">{Number(formatUnits(usdtBal, 18)).toFixed(2)} USDT</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <div className="w-full bg-panel-2 border border-white/[0.1] rounded-xl px-4 py-3 text-lg font-bold text-emerald-400">
                    ≈ {Number(formatUnits(expectedUsdtOut, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-panel-2 px-3 py-2.5 rounded-xl border border-white/[0.08] shrink-0">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-sm text-text">USDT</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted mt-2">
                <span>Min. Received (with {slippageBps / 100}% slippage):</span>
                <span className="text-text font-medium">
                  {Number(formatUnits(minUsdtOut, 18)).toFixed(2)} USDT
                </span>
              </div>
            </div>

            {/* Slippage Selector */}
            <div className="flex items-center justify-between text-xs well px-4 py-2.5">
              <span className="text-muted">Slippage Tolerance</span>
              <div className="flex items-center gap-1.5">
                {[50, 100, 250, 500].map((bps) => (
                  <button
                    key={bps}
                    type="button"
                    onClick={() => setSlippageBps(bps)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                      slippageBps === bps
                        ? "bg-neon/20 text-neon font-semibold border border-neon/40"
                        : "bg-white/[0.05] text-muted hover:text-text"
                    }`}
                  >
                    {(bps / 100).toFixed(1)}%
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              {!hasWallet ? (
                <button type="button" onClick={() => connect()} className="btn btn-primary w-full text-sm">
                  Connect Wallet
                </button>
              ) : !account ? (
                <button type="button" onClick={() => connect()} className="btn btn-primary w-full text-sm">
                  Connect Wallet
                </button>
              ) : sellCarbParsed <= 0n ? (
                <button type="button" disabled className="btn btn-secondary w-full text-sm opacity-50 cursor-not-allowed">
                  Enter Amount to Sell
                </button>
              ) : sellCarbParsed > carbBal ? (
                <button type="button" disabled className="btn btn-secondary w-full text-sm opacity-50 cursor-not-allowed">
                  Insufficient CARB Balance
                </button>
              ) : carbAllowance < sellCarbParsed ? (
                <button
                  type="button"
                  disabled={Boolean(tx.busy)}
                  onClick={handleApproveCarb}
                  className="btn btn-primary w-full text-sm flex items-center justify-center gap-2"
                >
                  {tx.busy ? <Spinner /> : null}
                  Step 1: Approve CARB for PancakeSwap
                </button>
              ) : (
                <button
                  type="button"
                  disabled={Boolean(tx.busy)}
                  onClick={handleSellCarb}
                  className="btn bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold w-full text-sm py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(255,51,68,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {tx.busy ? <Spinner /> : null}
                  Sell {Number(formatUnits(sellCarbParsed, 18)).toFixed(2)} CARB for USDT
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Right Column: PancakeSwap Pool & Contract Telemetry */}
        <div className="space-y-4 text-xs">
          {/* Pool Metrics Card */}
          <div className="card p-5">
            <h4 className="font-semibold text-text mb-3 flex items-center gap-2 text-sm">
              <span className="size-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
              PancakeSwap V2 Pool Telemetry
            </h4>

            <div className="space-y-2.5">
              <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                <span className="text-muted">CARB Spot Price:</span>
                <span className="font-bold text-neon">${carbPriceUsd.toFixed(4)} USDT</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                <span className="text-muted">Pool CARB Reserves:</span>
                <span className="font-medium text-text">{Number(formatUnits(reserves.carb, 18)).toLocaleString()} CARB</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                <span className="text-muted">Pool USDT Reserves:</span>
                <span className="font-medium text-text">{Number(formatUnits(reserves.usdt, 18)).toLocaleString()} USDT</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                <span className="text-muted">Router Contract:</span>
                <span className="font-mono text-neon-soft text-[10px]">{shortAddr(pancakeRouterAddress)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted">Pair Contract:</span>
                <span className="font-mono text-neon-soft text-[10px]">{shortAddr(pairAddress)}</span>
              </div>
            </div>
          </div>

          {/* Testnet USDT Faucet Card */}
          <div className="card p-5 border-l-2 border-l-emerald-400">
            <h4 className="font-semibold text-text mb-2 flex items-center gap-2 text-sm">
              <span className="size-2 rounded-full bg-emerald-400" />
              Instant Testnet USDT Faucet
            </h4>
            <p className="text-[11px] text-muted font-light mb-3">
              Need USDT to test packages or trading on BSC Testnet? The deployed MockUSDT contract features an open faucet.
            </p>

            <button
              type="button"
              disabled={!account || Boolean(tx.busy)}
              onClick={handleMintFaucet}
              className="btn btn-secondary w-full text-xs !py-2 flex items-center justify-center gap-2 font-semibold text-emerald-400 border-emerald-400/30 hover:border-emerald-400"
            >
              {tx.busy ? <Spinner /> : null}
              Mint 1,000 Free Testnet USDT
            </button>
          </div>

          {/* Sell Tax Transparency Notice */}
          <div className="card p-5 border-l-2 border-l-danger">
            <h4 className="font-semibold text-text mb-2 flex items-center gap-2 text-sm">
              <span className="size-2 rounded-full bg-danger shadow-[0_0_6px_#ff3344]" />
              100% Tax Burn Guarantee
            </h4>
            <p className="text-[11px] text-muted font-light leading-relaxed">
              When selling CARB tokens, the protocol applies a dynamic fee-on-transfer tax (floor 1.00%, scaling up to 80.00% under panic conditions).
              <strong className="text-text block mt-1">
                Every single cent of this tax is routed directly to <code>0x000...dead</code> and permanently destroyed.
              </strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
