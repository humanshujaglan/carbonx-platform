"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Copy,
  Share,
  TickCircle,
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
import { WithdrawDashboard } from "./withdraw-dashboard";
import { InvestCard } from "./invest-card";
import { MarketRibbon } from "./market-ribbon";
import { PackagesList } from "./packages-list";
import { RegisterCard } from "./register-card";
import { TeamTree } from "./team-tree";
import { StructureView } from "./structure-view";
import { BottomNavbar } from "./bottom-navbar";
import { SocialLinks } from "./social-links";
import { CardHeader, Notice, Pill } from "./ui";
import { useWallet } from "./wallet";
import { AuthPortal } from "./auth-portal";

export function PlatformDashboard({ initialTab = "dashboard" }: { initialTab?: NavTab } = {}) {
  const { account, connect, hasWallet } = useWallet();
  const { addresses, market, user, error, refresh, loading } = usePlatform(account);
  const [activeTab, setActiveTab] = useState<NavTab>(initialTab);

  const isUserRegistered = user?.isRegistered ?? false;
  const [hasEnteredDashboard, setHasEnteredDashboard] = useState<boolean>(false);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

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

  const refUrl =
    typeof window !== "undefined" && account
      ? `${window.location.origin}/?ref=${account}`
      : account
      ? `https://carbonx.finance/?ref=${account}`
      : "";

  const copyReferralLink = () => {
    if (refUrl && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(refUrl).then(() => {
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2000);
      });
    }
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

          {/* Referral Link & Network Invitation Hero */}
          <section className="card relative overflow-hidden p-5 sm:p-6 flex flex-col gap-4 border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.7)]" aria-label="Referral link">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1fe03a]/20 to-[#0a150c] border border-neon/40 text-neon shadow-[0_0_15px_rgba(31,224,58,0.2)]">
                  <Share size={20} color="#1fe03a" variant="Bold" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                    <span>My Referral Link</span>
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone="green">2% Direct + 2% Lock-In</Pill>
              </div>
            </div>

            {/* Referral URL Input & Copy Button Row */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-1">
              <div className="well flex-1 flex items-center gap-2 px-3.5 py-3 border border-neon/20 bg-[#0c120e]">
                <span className="size-2 rounded-full bg-neon shrink-0 shadow-[0_0_6px_#1fe03a]" />
                <input
                  type="text"
                  readOnly
                  value={refUrl || "Connect wallet to generate referral link"}
                  className="w-full bg-transparent font-mono text-xs text-neon-soft outline-none truncate select-all"
                />
              </div>
              <button
                type="button"
                disabled={!account}
                onClick={copyReferralLink}
                className="btn btn-primary px-5 py-3 text-xs font-semibold flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-[0_0_15px_rgba(31,224,58,0.25)]"
              >
                {copiedRef ? (
                  <>
                    <TickCircle size={16} color="#050806" variant="Bold" />
                    <span>Copied Link!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} color="#050806" variant="Bold" />
                    <span>Copy Referral Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Network Sponsor Telemetry */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/[0.04]">
              <div className="well p-3">
                <div className="text-2xs uppercase font-semibold text-muted tracking-wider">Active Directs</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {user?.activeDirectCount ?? 0} Partners
                </div>
              </div>
              <div className="well p-3">
                <div className="text-2xs uppercase font-semibold text-muted tracking-wider">Direct Business</div>
                <div className="mt-1 text-sm font-semibold text-neon-soft font-mono">
                  {user ? usd(user.totalDirectBusiness) : "$0.00"}
                </div>
              </div>
              <div className="well p-3">
                <div className="text-2xs uppercase font-semibold text-muted tracking-wider">Direct Rewards Ready</div>
                <div className="mt-1 text-sm font-semibold text-white font-mono">
                  {user ? usd(user.pendingDirectBonusAvailable) : "$0.00"}
                </div>
              </div>
              <div className="well p-3">
                <div className="text-2xs uppercase font-semibold text-muted tracking-wider">Team Unilevel Volume</div>
                <div className="mt-1 text-sm font-semibold text-neon-soft font-mono">
                  {user ? usd(user.totalTeamBusiness) : "$0.00"}
                </div>
              </div>
            </div>
          </section>

          {/* Home Page: All Income Streams with Live Streaming ROI, Booster & Level Yield */}
          <IncomesDashboard
            user={user}
            addresses={addresses}
            market={market}
            onDone={refresh}
            isHome={true}
            onNavigateTab={setActiveTab}
          />
        </div>
      )}

      {/* Tab: Invest & Packages (Dedicated Investment Page) */}
      {activeTab === "invest" && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <InvestCard addresses={addresses} user={user} lhrTier={market.lhrTier} onDone={refresh} />
          </div>
          <div className="flex flex-col gap-6">
            <PackagesList positions={user?.positions ?? []} user={user} lhrTier={market.lhrTier} />
          </div>
        </div>
      )}

      {/* Tab: Withdrawals & Yield Payout Portal (Dedicated Withdrawal Page) */}
      {activeTab === "withdraw" && (
        <WithdrawDashboard user={user} addresses={addresses} market={market} onDone={refresh} />
      )}

      {/* Tab: Detailed Incomes (Alias to IncomesDashboard) */}
      {activeTab === "incomes" && (
        <IncomesDashboard
          user={user}
          addresses={addresses}
          market={market}
          onDone={refresh}
        />
      )}

      {/* Tab 4: Team & Network */}
      {activeTab === "team" && (
        <TeamTree user={user} addresses={addresses} onDone={refresh} />
      )}

      {/* Tab 5: Complete Downline Structure */}
      {activeTab === "structure" && (
        <StructureView user={user} addresses={addresses} onDone={refresh} />
      )}

      {/* Community & AI support links, shown on every tab */}
      <div className="pt-2">
        <SocialLinks />
      </div>

      {/* Floating Designer Bottom Navbar */}
      <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
