"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowDown2,
  ArrowSwapHorizontal,
  CardAdd,
  Copy,
  DirectSend,
  Eye,
  EyeSlash,
  TickCircle,
  TrendUp,
  Wallet3,
} from "iconsax-react";
import leafImage from "@/public/leave.png";
import walletImage from "@/public/wallet.png";
import timerImage from "@/public/timer.png";
import depositImage from "@/public/deposit.png";
import { platformAddress } from "@/lib/config";
import { shortAddr, usd } from "@/lib/format";
import { usePlatform } from "@/lib/platform";
import { Header, type NavTab } from "./header";
import { IncomesDashboard } from "./incomes-dashboard";
import { InvestCard } from "./invest-card";
import { MarketRibbon } from "./market-ribbon";
import { PackagesList } from "./packages-list";
import { RegisterCard } from "./register-card";
import { TeamTree } from "./team-tree";
import { StructureView } from "./structure-view";
import { OperationsDashboard } from "./operations-dashboard";
import { SwapCard } from "./swap-card";
import { BottomNavbar } from "./bottom-navbar";
import { CardHeader, Notice, Pill } from "./ui";
import { useWallet } from "./wallet";
import { AuthPortal } from "./auth-portal";

export function PlatformDashboard({ initialTab = "dashboard" }: { initialTab?: NavTab } = {}) {
  const { account, connect, hasWallet } = useWallet();
  const { addresses, market, user, error, refresh, loading } = usePlatform(account);
  const [activeTab, setActiveTab] = useState<NavTab>(initialTab);

  const [hideBalance, setHideBalance] = useState<boolean>(false);
  const [copiedAddr, setCopiedAddr] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>("Top");

  const isUserRegistered = user?.isRegistered ?? false;
  const [hasEnteredDashboard, setHasEnteredDashboard] = useState<boolean>(false);

  // Sync entered state with sessionStorage per account
  useEffect(() => {
    if (typeof window !== "undefined" && account && isUserRegistered) {
      const entered = sessionStorage.getItem(`cx_entered_${account.toLowerCase()}`) === "true";
      setHasEnteredDashboard(entered);
    } else {
      setHasEnteredDashboard(false);
    }
  }, [account, isUserRegistered]);

  const handleEnterDashboard = () => {
    if (account) {
      sessionStorage.setItem(`cx_entered_${account.toLowerCase()}`, "true");
    }
    setHasEnteredDashboard(true);
  };

  const handleExitDashboard = () => {
    if (account) {
      sessionStorage.removeItem(`cx_entered_${account.toLowerCase()}`);
    }
    setHasEnteredDashboard(false);
  };

  // STRICT GATING: Without registration or login (or prior to clicking "Enter Dashboard"), show AuthPortal
  if (!account || !isUserRegistered || !hasEnteredDashboard) {
    return (
      <AuthPortal
        addresses={addresses}
        user={user}
        market={market}
        loadingUser={loading}
        onEnterDashboard={handleEnterDashboard}
        onRefresh={refresh}
      />
    );
  }

  // Calculate total portfolio balance
  const totalBalanceRaw = user
    ? user.totalActiveDeposit +
      user.workingIncomePending +
      user.roiIncomePending +
      user.boosterIncomePending
    : 0n;

  const copyAddress = () => {
    if (account && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(account).then(() => {
        setCopiedAddr(true);
        setTimeout(() => setCopiedAddr(false), 2000);
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExitDashboard={handleExitDashboard}
      />

      {error && <Notice tone="error">Error loading chain data: {error}</Notice>}

      {/* Tab 1: Dashboard Overview (Home Page) */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-6">
          {/* Protocol & Market Overview */}
          <MarketRibbon market={market} addresses={addresses} />

          {/* FluxChain-inspired Total Balance & Quick Action Hero Section */}
          <section className="card relative overflow-hidden p-6 sm:p-7 flex flex-col gap-5 border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium text-muted">Total Balance</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    {hideBalance ? "••••••••" : usd(totalBalanceRaw)}
                  </h2>
                  <span className="text-xs font-semibold text-muted">USD</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs font-semibold text-neon-soft">
                    +{user ? usd(user.roiIncomePending) : "$0.00"}
                  </span>
                  <span className="rounded-full bg-neon/15 px-2 py-0.5 text-[10px] font-bold text-neon border border-neon/30">
                    16.16%
                  </span>
                </div>
              </div>

              {/* Eye Toggle button in rounded dark pill */}
              <button
                type="button"
                onClick={() => setHideBalance((v) => !v)}
                className="flex size-10 items-center justify-center rounded-2xl bg-[#121914] text-muted hover:text-white hover:border-neon/40 transition border border-white/[0.06] cursor-pointer"
                title={hideBalance ? "Show Balance" : "Hide Balance"}
              >
                {hideBalance ? (
                  <EyeSlash size={18} color="currentColor" />
                ) : (
                  <Eye size={18} color="currentColor" />
                )}
              </button>
            </div>

            {/* Wallet Selection Pills Carousel matching left screen */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <div className="rounded-full bg-[#121914] px-3.5 py-1.5 text-xs font-semibold text-muted border border-white/[0.06]">
                Wallet 1
              </div>
              <button
                type="button"
                onClick={copyAddress}
                className="flex items-center gap-2 rounded-full bg-[#152319] px-3.5 py-1.5 text-xs font-mono font-semibold text-neon border border-neon/30 shadow-[0_0_10px_rgba(31,224,58,0.15)] cursor-pointer"
              >
                <span>{account ? shortAddr(account) : "0x000...000"}</span>
                {copiedAddr ? (
                  <TickCircle size={14} color="#1fe03a" variant="Bold" />
                ) : (
                  <Copy size={14} color="#1fe03a" variant="Linear" />
                )}
              </button>
              <div className="rounded-full bg-[#121914] px-3.5 py-1.5 text-xs font-semibold text-muted border border-white/[0.06]">
                BSC Network
              </div>
            </div>

            {/* Action Buttons: Request (Dark) & Transfer/Invest (Vibrant Green) */}
            <div className="grid grid-cols-[1fr_1.2fr_auto] gap-2.5 pt-1">
              {/* Request / Withdraw */}
              <button
                type="button"
                onClick={() => setActiveTab("incomes")}
                className="btn btn-secondary !rounded-2xl py-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2"
              >
                <ArrowDown2 size={16} className="-rotate-45" />
                <span>Withdraw</span>
              </button>

              {/* Transfer / Invest (Electric Green) */}
              <button
                type="button"
                onClick={() => setActiveTab("invest")}
                className="btn btn-primary !rounded-2xl py-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2"
              >
                <DirectSend size={16} color="#03140a" variant="Bold" />
                <span>Invest USDT</span>
              </button>

              {/* More / Swap action */}
              <button
                type="button"
                onClick={() => setActiveTab("trade")}
                className="btn btn-secondary !rounded-2xl !px-3.5 flex items-center justify-center"
                title="Exchange / Swap"
              >
                <ArrowSwapHorizontal size={18} />
              </button>
            </div>

            {/* Filter Tabs matching reference image: Favorites, Top, New, Gainers, Hot */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-white/[0.06]">
              {["Favorites", "Top", "New", "Gainers", "Hot"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`pill-tab ${
                    activeCategory === cat ? "pill-tab-active" : "pill-tab-inactive"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* My Funds / Token Balances List matching left screen */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-white">My Funds</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("trade")}
                  className="text-muted hover:text-neon transition cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* CARB Token Card */}
                <div className="rounded-2xl bg-[#121914] p-3.5 border border-white/[0.06] flex items-center justify-between hover:border-neon/30 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-neon/15 text-neon font-black text-sm border border-neon/30 shadow-[0_0_12px_rgba(31,224,58,0.2)]">
                      CX
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">CARB</div>
                      <div className="text-[11px] text-muted">CarbonX Token</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">
                      {user ? (Number(user.carbBalance) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0.00"}
                    </div>
                    <div className="text-[10px] font-semibold text-neon-soft">
                      {market ? usd(market.spotPrice) : "$1.00"} · ↑ 2.64%
                    </div>
                  </div>
                </div>

                {/* USDT Token Card */}
                <div className="rounded-2xl bg-[#121914] p-3.5 border border-white/[0.06] flex items-center justify-between hover:border-neon/30 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 font-black text-sm border border-emerald-500/30">
                      ₮
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">USDT</div>
                      <div className="text-[11px] text-muted">Tether USD</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">
                      {user ? usd(user.usdtBalance) : "$0.00"}
                    </div>
                    <div className="text-[10px] font-semibold text-muted">
                      $1.00 · Stable
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Action Grid: InvestCard & PackagesList */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <InvestCard addresses={addresses} user={user} onDone={refresh} />
            <div className="flex flex-col gap-6">
              <PackagesList positions={user?.positions ?? []} addresses={addresses} onDone={refresh} />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Invest & Packages */}
      {activeTab === "invest" && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <InvestCard addresses={addresses} user={user} onDone={refresh} />
          </div>
          <div className="flex flex-col gap-6">
            <PackagesList positions={user?.positions ?? []} addresses={addresses} onDone={refresh} />
          </div>
        </div>
      )}

      {/* Tab 3: Detailed Incomes & Withdrawals */}
      {activeTab === "incomes" && (
        <IncomesDashboard user={user} addresses={addresses} onDone={refresh} />
      )}

      {/* Tab 4: Team & Network */}
      {activeTab === "team" && (
        <TeamTree user={user} addresses={addresses} onDone={refresh} />
      )}

      {/* Tab 5: Complete Downline Structure */}
      {activeTab === "structure" && (
        <StructureView user={user} addresses={addresses} onDone={refresh} />
      )}

      {/* Tab 6: Protocol Operations & Telemetry */}
      {activeTab === "operations" && <OperationsDashboard />}

      {/* Tab 7: Balances & Token Exchange (Trade/Sell) */}
      {activeTab === "trade" && (
        <SwapCard addresses={addresses} onDone={refresh} />
      )}

      {/* Floating Designer Bottom Navbar */}
      <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
