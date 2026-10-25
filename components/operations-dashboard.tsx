"use client";

import { useState } from "react";
import Image from "next/image";
import analysisImage from "@/public/analysis.png";
import timerImage from "@/public/timer.png";
import depositImage from "@/public/deposit.png";
import walletImage from "@/public/wallet.png";
import { explorerUrl } from "@/lib/config";
import { formatUnits } from "viem";
import { usd, shortAddr } from "@/lib/format";
import { useOperations, type OperationsData } from "@/lib/platform";
import { CardHeader, Pill, Notice } from "./ui";

export function OperationsDashboard() {
  const { data, loading, error, refresh } = useOperations();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [simAmount, setSimAmount] = useState<number>(1000);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const d = data;

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header Banner */}
      <section className="card p-5 sm:p-6" aria-label="Operations Overview">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardHeader
            image={analysisImage}
            title="Protocol Operations & Actuarial Health"
            sub="Real-time on-chain parameters, LHR coefficient, capital routing allocations, and dynamic panic tax telemetry."
            right={
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-neon/10 px-3 py-1 text-[11px] font-medium text-neon border border-neon/25">
                  <span className="size-1.5 rounded-full bg-neon animate-pulse shadow-[0_0_8px_#1fe03a]" />
                  BSC Testnet (Chain ID 97)
                </span>
                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading}
                  className="btn btn-secondary text-xs !py-1.5 !px-3 cursor-pointer"
                  title="Refresh live on-chain parameters"
                >
                  <span className={`inline-block ${loading ? "animate-spin" : ""}`}>↻</span> Refresh
                </button>
              </div>
            }
          />
        </div>

        {error && (
          <div className="mt-4">
            <Notice tone="error">Failed to sync live operational data: {error}</Notice>
          </div>
        )}
      </section>

      {/* 4 Hero Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: LHR Coefficient */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between border-t-2 border-t-neon">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-medium">LHR Health Ratio</span>
            <Pill tone={d?.lhrTierIndex === 0 ? "green" : d?.lhrTierIndex === 1 ? "cyan" : "warn"}>
              {d?.lhrTierName ?? "Tier 1 (Healthy)"}
            </Pill>
          </div>
          <div className="my-3">
            <div className="text-3xl font-bold tracking-tight text-text">
              {d ? `${d.lhrCoefficient.toFixed(2)}x` : "1.20x"}
            </div>
            <div className="text-[11px] font-light text-muted mt-0.5">
              Ratio: <span className="text-neon font-medium">{d ? d.lhrRatioBps : 12000} bps</span> (Floor: 0.70x · Target: 1.20x)
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.05] text-[10px] text-muted flex justify-between">
            <span>Reset Floor: 7,000 bps</span>
            <span>Buyback: 12,000 bps</span>
          </div>
        </div>

        {/* Metric 2: DEX Sell Tax */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between border-t-2 border-t-emerald-400">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-medium">Current DEX Sell Tax</span>
            <Pill tone={d?.panicTriggered ? "warn" : "green"}>
              {d?.panicTriggered ? "Panic Triggered" : "Normal 1% Floor"}
            </Pill>
          </div>
          <div className="my-3">
            <div className="text-3xl font-bold tracking-tight text-text">
              {d ? `${d.effectiveSellTaxPercent.toFixed(2)}%` : "1.00%"}
            </div>
            <div className="text-[11px] font-light text-muted mt-0.5">
              Tax Destination: <span className="text-danger font-medium">100% Permanently Burned</span>
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.05] text-[10px] text-muted flex justify-between">
            <span>Base Floor: 1.00%</span>
            <span>Max Ceiling: 80.00%</span>
          </div>
        </div>

        {/* Metric 3: Capital Routing Allocation */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between border-t-2 border-t-neon-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-medium">Capital Routing</span>
            <Pill tone="gold">
              {d ? `Zone ${d.currentZone}` : "Zone 1"}
            </Pill>
          </div>
          <div className="my-3">
            <div className="text-3xl font-bold tracking-tight text-text">
              {d ? `${d.buyingPercent}% / ${d.lpAddPercent}%` : "0% Buy / 100% LP"}
            </div>
            <div className="text-[11px] font-light text-muted mt-0.5">
              Treasury: <span className="text-text font-medium">{d ? `${d.treasuryFeePercent}%` : "10%"}</span> · Net: <span className="text-neon font-medium">{d ? `${d.netInflowPercent}%` : "90%"}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.05] text-[10px] text-muted flex justify-between">
            <span>Buy & Burn: {d?.burningPercent ?? 0}%</span>
            <span>LP Add: {d?.lpAddPercent ?? 100}%</span>
          </div>
        </div>

        {/* Metric 4: Spot vs TWAP Deviation */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between border-t-2 border-t-blue-400">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-medium">Price & TWAP Oracle</span>
            <Pill tone={d?.isTwapStale ? "warn" : "green"}>
              {d?.isTwapStale ? "Twap Stale" : "Oracle Healthy"}
            </Pill>
          </div>
          <div className="my-3">
            <div className="text-3xl font-bold tracking-tight text-text">
              {d ? usd(d.spotPrice) : "$1.00"}
            </div>
            <div className="text-[11px] font-light text-muted mt-0.5">
              TWAP: <span className="text-text font-medium">{d ? usd(d.twapPrice) : "$1.00"}</span> · Deviation: <span className="text-neon font-medium">{d ? (d.priceDeviationBps / 100).toFixed(2) : "0.00"}%</span>
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.05] text-[10px] text-muted flex justify-between">
            <span>Ceiling: 2.0% – 20.0%</span>
            <span>Pool: {d ? Number(formatUnits(d.usdtReserve, 18)).toLocaleString() : "10,000"} USDT</span>
          </div>
        </div>
      </div>

      {/* Section 1: Detailed Capital Routing Breakdown Flowchart */}
      <section className="card p-5 sm:p-6" aria-label="Capital Routing Breakdown">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text flex items-center gap-2">
              <span className="size-2 rounded-full bg-neon shadow-[0_0_6px_#1fe03a]" />
              Deposit Capital Routing & Distribution Engine
            </h3>
            <p className="text-xs text-muted font-light mt-0.5">
              How every dollar deposited by users into registration or packages is autonomously divided, routed, or burned on-chain.
            </p>
          </div>
          <Pill tone="gold">{d?.zoneName ?? "Zone 1: Target Met"}</Pill>
        </div>

        {/* Inflow Visual Splitter */}
        <div className="well p-4 mb-5">
          <div className="text-xs font-medium text-text mb-2 flex items-center justify-between">
            <span>Gross Investment Inflow (100% USDT)</span>
            <span className="text-muted text-[11px]">Min $100 · Max $5,000</span>
          </div>
          <div className="h-4 w-full bg-panel-2 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${d?.treasuryFeePercent ?? 10}%` }}
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full flex items-center justify-center text-[9px] font-bold text-black"
              title={`Treasury: ${d?.treasuryFeePercent ?? 10}%`}
            >
              {d?.treasuryFeePercent ?? 10}% Treasury
            </div>
            <div
              style={{ width: `${d?.netInflowPercent ?? 90}%` }}
              className="bg-gradient-to-r from-neon-soft to-neon h-full flex items-center justify-center text-[9px] font-bold text-black"
              title={`LHR Capital Routing: ${d?.netInflowPercent ?? 90}%`}
            >
              {d?.netInflowPercent ?? 90}% Net LHR Engine Inflow
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted mt-2">
            <span>
              Dynamic Treasury Cut: <strong className="text-text">{d?.treasuryFeePercent ?? 10.0}%</strong> (transferred to protocol treasury)
            </span>
            <span>
              Net Capital into LHR: <strong className="text-neon">{d?.netInflowPercent ?? 90.0}%</strong> (routed through AMM State Machine)
            </span>
          </div>
        </div>

        {/* 3 Zones Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Zone 1 Card */}
          <div
            className={`rounded-xl p-4 border transition-all ${
              d?.currentZone === 1
                ? "bg-neon/10 border-neon/50 shadow-[0_0_20px_rgba(31,224,58,0.15)] ring-1 ring-neon/40"
                : "bg-panel-2/60 border-white/[0.05] opacity-75"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-text">Zone 1: Target Met</span>
              {d?.currentZone === 1 && <Pill tone="green">Active Zone</Pill>}
            </div>
            <div className="text-[11px] text-muted mb-3 font-light">
              Triggered when: <strong className="text-text">Spot Price ≥ Current Target Price</strong>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-muted">Buying %:</span>
                <span className="font-medium text-text">0.00%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-muted">Burning %:</span>
                <span className="font-medium text-text">0.00%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-muted">LP Addition %:</span>
                <span className="font-medium text-neon font-semibold">100.00%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Buyback War Chest:</span>
                <span className="font-medium text-text">{d && d.lhrRatioBps >= d.buybackLhrThresholdBps ? "Funded to Cap" : "Bypassed"}</span>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-muted italic bg-black/20 p-2 rounded">
              50% USDT swaps to CARB, 50% USDT pairs into PancakeSwap LP to deepen pool liquidity.
            </div>
          </div>

          {/* Zone 2 Card */}
          <div
            className={`rounded-xl p-4 border transition-all ${
              d?.currentZone === 2
                ? "bg-neon/10 border-neon/50 shadow-[0_0_20px_rgba(31,224,58,0.15)] ring-1 ring-neon/40"
                : "bg-panel-2/60 border-white/[0.05] opacity-75"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-text">Zone 2: Chasing Target</span>
              {d?.currentZone === 2 && <Pill tone="gold">Active Zone</Pill>}
            </div>
            <div className="text-[11px] text-muted mb-3 font-light">
              Triggered when: <strong className="text-text">Base Price ≤ Spot Price &lt; Target Price</strong>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-muted">Buying %:</span>
                <span className="font-medium text-neon font-semibold">100.00%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-muted">Burning %:</span>
                <span className="font-medium text-danger font-semibold">100.00% Burned</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-muted">LP Addition %:</span>
                <span className="font-medium text-text">0.00%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Target Action:</span>
                <span className="font-medium text-text">Climbs to Daily Target</span>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-muted italic bg-black/20 p-2 rounded">
              100% of net deposit executes instant AMM market buy and permanently burns all received CARB.
            </div>
          </div>

          {/* Zone 3 Card */}
          <div
            className={`rounded-xl p-4 border transition-all ${
              d?.currentZone === 3
                ? "bg-neon/10 border-neon/50 shadow-[0_0_20px_rgba(31,224,58,0.15)] ring-1 ring-neon/40"
                : "bg-panel-2/60 border-white/[0.05] opacity-75"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-text">Zone 3: Non-Algo Recovery</span>
              {d?.currentZone === 3 && <Pill tone="warn">Active Zone</Pill>}
            </div>
            <div className="text-[11px] text-muted mb-3 font-light">
              Triggered when: <strong className="text-text">Spot Price &lt; Base Price (or in Non-Algo)</strong>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-muted">Buying %:</span>
                <span className="font-medium text-neon font-semibold">100.00%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-muted">Burning %:</span>
                <span className="font-medium text-danger font-semibold">100.00% Burned</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-muted">LP Addition %:</span>
                <span className="font-medium text-text">0.00%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Recovery Step:</span>
                <span className="font-medium text-text">+2.0% Daily Target</span>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-muted italic bg-black/20 p-2 rounded">
              Enters 15-day Non-Algo recovery mode. 100% buy and burn with Day 15 phased TWAP safety fallback.
            </div>
          </div>
        </div>

        {/* Section 1B: Interactive Investment Routing Simulator */}
        <div className="mt-6 pt-5 border-t border-white/[0.08]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-semibold text-text flex items-center gap-2">
                <span className="size-2 rounded-full bg-neon shadow-[0_0_6px_#1fe03a]" />
                Interactive Investment Routing Simulator
              </h4>
              <p className="text-[11px] text-muted font-light mt-0.5">
                Simulate any deposit amount to trace exact on-chain allocations across Treasury, AMM, Liquidity Staking, and Burn.
              </p>
            </div>
            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted mr-1">Presets:</span>
              {[100, 500, 1000, 2500, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setSimAmount(amt)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    simAmount === amt
                      ? "bg-neon/20 border-neon/60 text-neon font-semibold shadow-[0_0_10px_rgba(31,224,58,0.2)]"
                      : "bg-panel-2 border-white/[0.06] text-muted hover:text-text hover:border-white/[0.15]"
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input Box */}
          <div className="well p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wider text-muted font-medium block mb-1">
                Simulated Deposit Amount (USDT)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">$</span>
                <input
                  type="number"
                  min="100"
                  max="100000"
                  step="50"
                  value={simAmount}
                  onChange={(e) => setSimAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-panel-2 border border-white/[0.1] rounded-xl pl-7 pr-16 py-2.5 text-base font-bold text-text focus:outline-none focus:border-neon transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neon">USDT</span>
              </div>
            </div>
            <div className="sm:text-right shrink-0">
              <span className="text-[11px] uppercase tracking-wider text-muted font-medium block mb-1">Active Regime</span>
              <Pill tone={d?.currentZone === 1 ? "green" : d?.currentZone === 2 ? "gold" : "warn"}>
                {d?.currentZone === 1 ? "Zone 1: 50/50 LP Staking" : d?.currentZone === 2 ? "Zone 2: 100% Buy & Burn" : "Zone 3: Non-Algo Recovery"}
              </Pill>
            </div>
          </div>

          {/* Routing Math Calculations */}
          {(() => {
            const tFeePct = d?.treasuryFeePercent ?? 10;
            const netPct = d?.netInflowPercent ?? 90;
            const treasuryAmt = (simAmount * tFeePct) / 100;
            const netAmt = simAmount - treasuryAmt;
            const zone1LpSwap = netAmt * 0.5;
            const zone1LpPair = netAmt * 0.5;
            const activeZone = d?.currentZone ?? 1;

            return (
              <div className="space-y-4">
                {/* 3-Column Breakdown Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Card 1: Treasury Allocation */}
                  <div className="well p-3.5 border-l-2 border-l-amber-400">
                    <div className="flex items-center justify-between text-muted mb-1">
                      <span className="font-medium">1. Protocol Treasury Cut</span>
                      <span className="text-amber-400 font-semibold">{tFeePct.toFixed(1)}%</span>
                    </div>
                    <div className="text-xl font-bold text-amber-300">
                      ${treasuryAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                    </div>
                    <div className="text-[10px] text-muted font-light mt-1">
                      Transferred directly to protocol Treasury for operations, legal compliance & admin reserves.
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/[0.04] text-[10px] font-mono text-muted">
                      Target: {shortAddr(d?.treasuryWallet ?? "0x9C886a403c88D95F45753c4312d10F3D9343590c")}
                    </div>
                  </div>

                  {/* Card 2: LHR Engine Net Inflow */}
                  <div className="well p-3.5 border-l-2 border-l-neon">
                    <div className="flex items-center justify-between text-muted mb-1">
                      <span className="font-medium">2. Net LHR Capital Inflow</span>
                      <span className="text-neon font-semibold">{netPct.toFixed(1)}%</span>
                    </div>
                    <div className="text-xl font-bold text-neon">
                      ${netAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                    </div>
                    <div className="text-[10px] text-muted font-light mt-1">
                      Passed to <code className="text-text font-mono text-[9px]">LHRRoutingEngine.routeDeposit()</code> to execute dynamic AMM action.
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/[0.04] text-[10px] font-mono text-neon-soft">
                      Engine: {shortAddr("0x6e9a5b470a30dca2d14f74f67a1ddbbcccdb04a9")}
                    </div>
                  </div>

                  {/* Card 3: Autonomous AMM Action */}
                  <div className="well p-3.5 border-l-2 border-l-cyan-400">
                    <div className="flex items-center justify-between text-muted mb-1">
                      <span className="font-medium">3. Autonomous AMM Action</span>
                      <span className="text-cyan-400 font-semibold">Zone {activeZone}</span>
                    </div>
                    {activeZone === 1 ? (
                      <div>
                        <div className="text-xl font-bold text-cyan-300">
                          ${zone1LpSwap.toFixed(2)} Swap + ${zone1LpPair.toFixed(2)} LP
                        </div>
                        <div className="text-[10px] text-muted font-light mt-1">
                          50% converts to CARB, 50% pairs into PancakeSwap LP; 100% LP auto-staked into farming vault.
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/[0.04] text-[10px] font-mono text-cyan-400">
                          Lock: 365 Days in LiquidityFarming
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xl font-bold text-danger">
                          ${netAmt.toFixed(2)} Buy & Burn
                        </div>
                        <div className="text-[10px] text-muted font-light mt-1">
                          100% of net deposit executes instant PancakeSwap market buy and burns all CARB to dead address.
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/[0.04] text-[10px] font-mono text-danger">
                          Destination: 0x000...dead
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step-by-Step On-Chain Execution Trace */}
                <div className="well p-4">
                  <span className="text-xs font-semibold text-text mb-3 block flex items-center justify-between">
                    <span>On-Chain Execution Call Trace Diagram</span>
                    <span className="text-[10px] font-mono text-muted">EVM Transaction Stack</span>
                  </span>

                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 text-xs">
                    {/* Node 1: User */}
                    <div className="flex-1 bg-panel-2 p-3 rounded-xl border border-white/[0.06] text-center">
                      <div className="text-[10px] uppercase text-muted font-medium">Step 1: User EOA</div>
                      <div className="font-semibold text-text mt-0.5">${simAmount} USDT Deposit</div>
                      <div className="text-[9px] text-muted font-mono mt-1">msg.sender == tx.origin</div>
                    </div>

                    <div className="text-center text-muted md:rotate-0 rotate-90 self-center text-xs">➔</div>

                    {/* Node 2: Platform Contract */}
                    <div className="flex-1 bg-panel-2 p-3 rounded-xl border border-neon/30 text-center">
                      <div className="text-[10px] uppercase text-neon font-medium">Step 2: PlatformContract</div>
                      <div className="font-semibold text-text mt-0.5">Splits 10% / 90%</div>
                      <div className="text-[9px] text-muted font-mono mt-1">0xa1ca...21253</div>
                    </div>

                    <div className="text-center text-muted md:rotate-0 rotate-90 self-center text-xs">➔</div>

                    {/* Node 3: LHR Routing Engine */}
                    <div className="flex-1 bg-panel-2 p-3 rounded-xl border border-cyan-400/30 text-center">
                      <div className="text-[10px] uppercase text-cyan-400 font-medium">Step 3: LHR Engine</div>
                      <div className="font-semibold text-text mt-0.5">routeDeposit()</div>
                      <div className="text-[9px] text-muted font-mono mt-1">0x6e9a...04a9</div>
                    </div>

                    <div className="text-center text-muted md:rotate-0 rotate-90 self-center text-xs">➔</div>

                    {/* Node 4: DEX Router */}
                    <div className="flex-1 bg-panel-2 p-3 rounded-xl border border-emerald-400/30 text-center">
                      <div className="text-[10px] uppercase text-emerald-400 font-medium">Step 4: PancakeSwap</div>
                      <div className="font-semibold text-text mt-0.5">
                        {activeZone === 1 ? "swap + addLiquidity" : "swapExactTokens"}
                      </div>
                      <div className="text-[9px] text-muted font-mono mt-1">Router 0xD99D...50D1</div>
                    </div>

                    <div className="text-center text-muted md:rotate-0 rotate-90 self-center text-xs">➔</div>

                    {/* Node 5: Final Vault */}
                    <div className="flex-1 bg-panel-2 p-3 rounded-xl border border-purple-400/30 text-center">
                      <div className="text-[10px] uppercase text-purple-400 font-medium">Step 5: Staking / Burn</div>
                      <div className="font-semibold text-text mt-0.5">
                        {activeZone === 1 ? "LiquidityFarming (365d)" : "0x000...dead"}
                      </div>
                      <div className="text-[9px] text-muted font-mono mt-1">
                        {activeZone === 1 ? "0xa463...5119" : "Zero Admin Access"}
                      </div>
                    </div>
                  </div>

                  {/* Operational Telemetry Summary */}
                  <div className="mt-3 pt-3 border-t border-white/[0.04] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted">
                    <div>
                      Slippage Ceiling: <strong className="text-text">{d ? ((10000 - d.routingSlippageFactorBps) / 100).toFixed(2) : "2.50"}%</strong>
                    </div>
                    <div>
                      Safety Discount: <strong className="text-text">{d ? (d.safetyDiscountBps / 100).toFixed(1) : "90.0"}%</strong>
                    </div>
                    <div>
                      LP Staking Duration: <strong className="text-neon">365 Days Locked</strong>
                    </div>
                    <div>
                      War Chest Surplus: <strong className="text-text">{d && d.lhrRatioBps >= d.buybackLhrThresholdBps ? "Active" : "Pending 1.20x"}</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Section 2: DEX Sell Tax & Panic Mechanism */}
      <section className="card p-5 sm:p-6" aria-label="Sell Tax Engine">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text flex items-center gap-2">
              <span className="size-2 rounded-full bg-danger shadow-[0_0_6px_#ff3344]" />
              DEX Dynamic Panic Sell-Tax Matrix & Burning Engine
            </h3>
            <p className="text-xs text-muted font-light mt-0.5">
              Manipulation-resistant 3-hour TWAP panic diary protecting against flash dumps and downward runs.
            </p>
          </div>
          <Pill tone={d?.panicTriggered ? "warn" : "green"}>
            Effective Tax: {d ? `${d.effectiveSellTaxPercent}%` : "1.00%"}
          </Pill>
        </div>

        {/* Sell Tax Status Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
          <div className="well p-3.5">
            <div className="label">Current Sell Tax</div>
            <div className="text-xl font-bold text-neon">{d ? `${d.effectiveSellTaxPercent.toFixed(2)}%` : "1.00%"}</div>
            <div className="text-[10px] text-muted">Base Floor: 1.00%</div>
          </div>
          <div className="well p-3.5">
            <div className="label">Tax Destination</div>
            <div className="text-xl font-bold text-danger">100% Burned</div>
            <div className="text-[10px] text-muted">Zero Admin Minting</div>
          </div>
          <div className="well p-3.5">
            <div className="label">3h Benchmark Price</div>
            <div className="text-xl font-bold text-text">
              {d && d.panicBenchmarkPrice > 0n ? usd(d.panicBenchmarkPrice) : usd(d?.spotPrice ?? 1000000000000000000n)}
            </div>
            <div className="text-[10px] text-muted">72-slot ring buffer</div>
          </div>
          <div className="well p-3.5">
            <div className="label">3h Price Downfall</div>
            <div className={`text-xl font-bold ${d && d.priceDrawdownBps > 500 ? "text-danger" : "text-neon-soft"}`}>
              {d ? `${(d.priceDrawdownBps / 100).toFixed(2)}%` : "0.00%"}
            </div>
            <div className="text-[10px] text-muted">Panic threshold: 5.00%</div>
          </div>
        </div>

        {/* Panic Tier Table */}
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-left text-xs text-text border-collapse">
            <thead className="bg-panel-2 text-[11px] uppercase tracking-wider text-muted font-medium border-b border-white/[0.08]">
              <tr>
                <th className="py-2.5 px-4">Price Downfall (In 3-Hour Window)</th>
                <th className="py-2.5 px-4">Dynamic DEX Sell Tax</th>
                <th className="py-2.5 px-4">Burn Percentage</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {[
                { range: "1.00% – 5.00%", tax: "1.00%", burn: "100%", isCurrent: !d?.panicTriggered || (d?.panicActiveTaxBps ?? 100) <= 100 },
                { range: "6.00% – 10.00%", tax: "5.00%", burn: "100%", isCurrent: d?.panicTriggered && d?.panicActiveTaxBps === 500 },
                { range: "11.00% – 15.00%", tax: "10.00%", burn: "100%", isCurrent: d?.panicTriggered && d?.panicActiveTaxBps === 1000 },
                { range: "16.00% – 20.00%", tax: "15.00%", burn: "100%", isCurrent: d?.panicTriggered && d?.panicActiveTaxBps === 1500 },
                { range: "21.00% – 40.00%", tax: "25.00%", burn: "100%", isCurrent: d?.panicTriggered && d?.panicActiveTaxBps === 2500 },
                { range: "41.00% – 60.00%", tax: "30.00%", burn: "100%", isCurrent: d?.panicTriggered && d?.panicActiveTaxBps === 3000 },
                { range: "61.00% – 94.00%", tax: "50.00%", burn: "100%", isCurrent: d?.panicTriggered && d?.panicActiveTaxBps === 5000 },
                { range: "95.00% or above", tax: "80.00%", burn: "100%", isCurrent: d?.panicTriggered && d?.panicActiveTaxBps === 8000 },
              ].map((tier, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    tier.isCurrent ? "bg-neon/10 font-semibold text-neon" : "hover:bg-panel-2/50"
                  }`}
                >
                  <td className="py-2 px-4">{tier.range}</td>
                  <td className="py-2 px-4">
                    <span className={tier.isCurrent ? "text-neon font-bold" : "text-text"}>{tier.tax}</span>
                  </td>
                  <td className="py-2 px-4 text-danger font-medium">{tier.burn}</td>
                  <td className="py-2 px-4">
                    {tier.isCurrent ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-neon uppercase tracking-wider">
                        <span className="size-1.5 rounded-full bg-neon animate-pulse" /> Active Tier
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted gap-2">
          <span>
            Recovery Mechanism: Restores to 1% base tax when price recovers 50% toward benchmark, or automatically after 12 hours.
          </span>
          <span className="text-[10px]">
            Admin Override: {d?.isTaxManualOverride ? `ACTIVE (${d.manualSellTaxBps / 100}%)` : "DISABLED (Using Dynamic AMM Oracle)"}
          </span>
        </div>
      </section>

      {/* Section 3: Actuarial Liabilities & Reserves Telemetry */}
      <section className="card p-5 sm:p-6" aria-label="Actuarial Telemetry">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text flex items-center gap-2">
              <span className="size-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
              LHR Actuarial Reserves & Liabilities Telemetry
            </h3>
            <p className="text-xs text-muted font-light mt-0.5">
              O(1) time-horizon debt matching to ensure solvency under full protocol run conditions.
            </p>
          </div>
          <Pill tone="cyan">Horizon: {d?.liabilityHorizonMonths ?? 3} Months</Pill>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          <div className="well p-3.5">
            <div className="label">Snapshot Reserve USDT</div>
            <div className="text-lg font-bold text-text">
              {d ? usd(d.snapshotReserveUSDT) : "$10,000"}
            </div>
            <div className="text-[10px] text-muted">1-hour interval snapshot</div>
          </div>

          <div className="well p-3.5">
            <div className="label">Realizable Reserve USDT</div>
            <div className="text-lg font-bold text-neon-soft">
              {d ? usd(d.realizableReserveUSDT) : "$9,000"}
            </div>
            <div className="text-[10px] text-muted">After 90% safety haircut</div>
          </div>

          <div className="well p-3.5">
            <div className="label">Actuarial Liabilities</div>
            <div className="text-lg font-bold text-text">
              {d ? usd(d.totalActuarialLiabilitiesUSDT) : "$0"}
            </div>
            <div className="text-[10px] text-muted">All active commitments</div>
          </div>

          <div className="well p-3.5">
            <div className="label">Buyback War Chest</div>
            <div className="text-lg font-bold text-text">
              {d ? usd(d.buybackPoolUSDT) : "$0"}
            </div>
            <div className="text-[10px] text-muted">Cap: {d ? usd(d.buybackCapUSDT) : "Dynamic 10%"}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="well p-3">
            <span className="text-muted block text-[10px] uppercase">Safety Discount Factor</span>
            <span className="font-semibold text-text">{d ? `${d.safetyDiscountBps / 100}%` : "90.00%"}</span>
          </div>
          <div className="well p-3">
            <span className="text-muted block text-[10px] uppercase">Routing Slippage Ceiling</span>
            <span className="font-semibold text-text">{d ? `${(10000 - d.routingSlippageFactorBps) / 100}%` : "2.50%"}</span>
          </div>
          <div className="well p-3">
            <span className="text-muted block text-[10px] uppercase">Day 15 Phased Intervention</span>
            <span className="font-semibold text-text">{d?.day15Active ? `Active (Tranche ${d.day15NextTranche}/100)` : "Standby"}</span>
          </div>
        </div>
      </section>

      {/* Section 4: Deployed Smart Contracts Directory with 1-Click Copy */}
      <section className="card p-5 sm:p-6" aria-label="Contracts Directory">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text flex items-center gap-2">
              <span className="size-2 rounded-full bg-neon shadow-[0_0_6px_#1fe03a]" />
              Live Deployed Smart Contracts Directory (BSC Testnet)
            </h3>
            <p className="text-xs text-muted font-light mt-0.5">
              Verified addresses deployed on Binance Smart Chain Testnet (Chain ID 97).
            </p>
          </div>
          <Pill tone="green">All Contracts Verified</Pill>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            { name: "PlatformContract (Hub)", addr: "0xa1ca0d5d995e68a072f65177dcc3f6cc67121253", role: "Main core MLM and staking hub" },
            { name: "TokenContract (CARB)", addr: "0x1cbbccec4c9f7d23df71ed76683e9165d04c7795", role: "BEP-20 token with dynamic burn" },
            { name: "LiquidityFarming", addr: "0xa463ff10de24046176419a999c0b16628c145119", role: "Time-locked LP farming engine" },
            { name: "LHRRoutingEngine (Proxy)", addr: "0x6e9a5b470a30dca2d14f74f67a1ddbbcccdb04a9", role: "UUPS proxy for dynamic capital routing" },
            { name: "PlatformDexRouter", addr: "0x324c643ee5be28eb00b826becaa2e435207e4bbf", role: "Panic sell tax & 3h TWAP diary" },
            { name: "TwapOracle", addr: "0x54e380fd2ae0027e40f9cf8b1875ee91c146c9b6", role: "PancakeSwap cumulative TWAP oracle" },
            { name: "PlatformView", addr: "0x50501a71b55d92fe87c53f8ed5559f6438950a00", role: "Lens aggregator for rich views" },
            { name: "PancakeSwap Pair (CARB/USDT)", addr: "0xc6a7dee4b16e85da68588dc427cda203e4b4fbed", role: "V2 Liquidity Pair with seeded reserves" },
            { name: "MockUSDT (Testnet Tether)", addr: "0x79adb123aec718e0f148562e3007b4581ef43b4b", role: "18-decimal test USDT token with open mint" },
          ].map((c) => (
            <div key={c.name} className="well p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(c.addr, c.name)}
                    className="text-[10px] text-neon hover:underline cursor-pointer"
                  >
                    {copiedKey === c.name ? "Copied!" : "Copy Address"}
                  </button>
                </div>
                <div className="text-[11px] text-muted font-light mt-0.5">{c.role}</div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center justify-between">
                <code className="text-[10px] font-mono text-neon-soft truncate max-w-[200px] sm:max-w-[240px]">
                  {c.addr}
                </code>
                <a
                  href={`https://testnet.bscscan.com/address/${c.addr}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-muted hover:text-text"
                >
                  BscScan ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Protocol Governance Wallets & System Bounds */}
      <section className="card p-5 sm:p-6" aria-label="Governance and Constraints">
        <h3 className="text-base font-semibold text-text flex items-center gap-2 mb-3">
          <span className="size-2 rounded-full bg-neon-soft shadow-[0_0_6px_#4cf05e]" />
          Protocol Governance, Anti-MEV & Safety Constraints
        </h3>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4 text-xs">
          <div className="well p-3">
            <span className="text-muted block text-[10px] uppercase">Min Package Deposit</span>
            <span className="font-semibold text-text">$100 USDT</span>
          </div>
          <div className="well p-3">
            <span className="text-muted block text-[10px] uppercase">Max Package Deposit</span>
            <span className="font-semibold text-text">$5,000 USDT</span>
          </div>
          <div className="well p-3">
            <span className="text-muted block text-[10px] uppercase">User Global Cap</span>
            <span className="font-semibold text-text">$1,000,000 USDT</span>
          </div>
          <div className="well p-3">
            <span className="text-muted block text-[10px] uppercase">Hourly Withdrawal Limit</span>
            <span className="font-semibold text-text">$5,000 / Hour</span>
          </div>
        </div>

        <div className="well p-3.5 text-xs text-muted flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-neon" />
            <span>Anti-MEV / Flash Loan Defense: Strict EOA & Same-Block Transaction Limiter Active</span>
          </div>
          <div className="text-[11px] font-mono text-text">
            Genesis Top ID: {shortAddr(d?.topIdWallet ?? "0x9C886a403c88D95F45753c4312d10F3D9343590c")}
          </div>
        </div>
      </section>
    </div>
  );
}
