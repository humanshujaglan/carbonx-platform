"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft2,
  Copy,
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
import { ClaimIncomeCards } from "./claim-income-cards";
import { IncomesDashboard } from "./incomes-dashboard";
import { IncomeHero } from "./income-hero";
import { PartnerPoolPage, useIsPartner } from "./partner-pool-page";
import { WithdrawDashboard } from "./withdraw-dashboard";
import { InvestCard } from "./invest-card";
import { MarketRibbon } from "./market-ribbon";
import { PackagesList } from "./packages-list";
import { RegisterCard } from "./register-card";
import { BoosterTiersCard } from "./booster-tiers-card";
import { LeaderCodeCard } from "./leader-code-card";
import { LeaderPrizeContestCard } from "./leader-prize-contest-card";
import { LockMixCard } from "./lock-mix-card";
import { QuickActions } from "./quick-actions";
import { UnlockScheduleCard } from "./unlock-schedule-card";
import { RankBusinessCard } from "./rank-business-card";
import { RoiCycleChart } from "./roi-cycle-chart";
import { TeamPage } from "./team-page";
import { StructureView } from "./structure-view";
import { BottomNavbar } from "./bottom-navbar";
import { SocialLinks } from "./social-links";
import { CardHeader, Notice } from "./ui";
import { useWallet } from "./wallet";

export function PlatformDashboard({ initialTab = "dashboard" }: { initialTab?: NavTab } = {}) {
  const router = useRouter();
  const { account, connect, hasWallet, ready } = useWallet();
  const { addresses, market, user, error, refresh, loading } = usePlatform(account);
  const [activeTab, setActiveTab] = useState<NavTab>(initialTab);
  const isPartner = useIsPartner(account, addresses);

  // The partner page is for active Top ID partners only
  useEffect(() => {
    if (activeTab === "partner" && isPartner === false) setActiveTab("dashboard");
  }, [activeTab, isPartner]);
  // Pages opened from the home quick actions behave like in-app screens: no header or bottom bar, back arrow instead
  const [internalScreen, setInternalScreen] = useState(false);

  const openInternalScreen = (tab: NavTab) => {
    setActiveTab(tab);
    setInternalScreen(true);
  };

  const closeInternalScreen = () => {
    setInternalScreen(false);
    setActiveTab("dashboard");
  };

  const isUserRegistered = user?.isRegistered ?? false;
  const [hasEnteredDashboard, setHasEnteredDashboard] = useState<boolean>(false);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);
  const [copiedSponsor, setCopiedSponsor] = useState<boolean>(false);

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
    router.push("/login");
  };

  // The dashboard is only for signed-in members; everyone else goes to the login page
  useEffect(() => {
    if (!ready || loading) return;
    const entered =
      !!account && isUserRegistered && sessionStorage.getItem(`cx_entered_${account.toLowerCase()}`) === "true";
    if (!entered) router.replace("/login");
  }, [ready, loading, account, isUserRegistered, router]);

  // Once the leader code is unlocked it travels with the referral link, so new members register under it
  const leaderParam = user?.leaderCode && user.leaderCode > 0n ? `&leader=${user.leaderCode.toString()}` : "";
  const refUrl =
    typeof window !== "undefined" && account
      ? `${window.location.origin}/register?ref=${account}${leaderParam}`
      : account
      ? `https://carbonx.finance/register?ref=${account}${leaderParam}`
      : "";

  const copyReferralLink = () => {
    if (refUrl && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(refUrl).then(() => {
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2000);
      });
    }
  };

  const copySponsor = () => {
    if (user?.sponsor && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(user.sponsor).then(() => {
        setCopiedSponsor(true);
        setTimeout(() => setCopiedSponsor(false), 2000);
      });
    }
  };

  // Wallet still reconnecting or the member's data still loading: show a spinner, not a blank page
  if (!ready || (account && loading && !isUserRegistered)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-neon" role="status" aria-label="Loading dashboard">
        <span className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  // Nothing to show until the member is confirmed (the effect above redirects everyone else)
  if (!account || !isUserRegistered || !hasEnteredDashboard) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {internalScreen ? (
        <div className="px-3 pt-3 sm:px-6">
          <button
            type="button"
            onClick={closeInternalScreen}
            aria-label="Back"
            className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-panel text-white transition hover:border-white/20"
          >
            <ArrowLeft2 size={20} color="currentColor" />
          </button>
        </div>
      ) : (
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onExitDashboard={handleExitDashboard}
        />
      )}

      {error && <Notice tone="error">Error loading chain data: {error}</Notice>}

      {/* Tab 1: Dashboard Overview (Home Page) */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-6">
          <IncomeHero user={user ?? undefined} lhrTier={market?.lhrTier ?? 0} />

          <QuickActions onNavigateTab={openInternalScreen} />

          <ClaimIncomeCards user={user} addresses={addresses} market={market} onDone={refresh} />

          {/* Referral link */}
          <section className="card p-5 sm:p-6 flex flex-col gap-5" aria-label="Referral link">
            <h3 className="text-sm font-medium text-text">Referral link</h3>

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-3.5 pr-1.5">
              <span className="min-w-0 flex-1 truncate text-xs text-white select-all">
                {refUrl || "Connect wallet to generate referral link"}
              </span>
              <button
                type="button"
                disabled={!account}
                onClick={copyReferralLink}
                className="btn btn-primary !rounded-lg px-3.5 py-2 text-xs font-semibold shrink-0 whitespace-nowrap cursor-pointer"
              >
                {copiedRef ? (
                  <>
                    <TickCircle size={16} color="#050806" variant="Linear" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} color="#050806" variant="Linear" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted">Invited by</span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-white">{user?.sponsor ? shortAddr(user.sponsor) : "—"}</span>
                <button
                  type="button"
                  disabled={!user?.sponsor}
                  onClick={copySponsor}
                  aria-label="Copy sponsor address"
                  className="shrink-0 text-muted transition hover:text-neon disabled:opacity-40 cursor-pointer"
                >
                  {copiedSponsor ? (
                    <TickCircle size={16} color="currentColor" variant="Linear" />
                  ) : (
                    <Copy size={16} color="currentColor" variant="Linear" />
                  )}
                </button>
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/[0.06] pt-4 sm:grid-cols-4 sm:divide-x sm:divide-white/[0.06]">
              {(
                [
                  ["Active directs", `${user?.activeDirectCount ?? 0}`, "text-white"],
                  ["Direct business", user ? usd(user.totalDirectBusiness) : "$0.00", "text-neon-soft"],
                  ["Rewards ready", user ? usd(user.pendingDirectBonusAvailable) : "$0.00", "text-white"],
                  ["Team volume", user ? usd(user.totalTeamBusiness) : "$0.00", "text-neon-soft"],
                ] as const
              ).map(([label, value, tone]) => (
                <div key={label} className="sm:pl-4 sm:first:pl-0">
                  <dt className="text-xs text-[#d6ddd8]">{label}</dt>
                  <dd className={`mt-1 text-xs font-semibold ${tone}`}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <RoiCycleChart lhrTier={market?.lhrTier ?? 0} user={user ?? undefined} />

          <LockMixCard user={user ?? undefined} onNavigateTab={setActiveTab} />

          <UnlockScheduleCard user={user ?? undefined} onNavigateTab={setActiveTab} />

          <BoosterTiersCard user={user ?? undefined} lhrTier={market.lhrTier} />

          <RankBusinessCard user={user ?? undefined} onNavigateTab={setActiveTab} />

          {/* Home Page: All Income Streams with Live Streaming ROI, Booster & Level Yield */}
          <IncomesDashboard
            user={user}
            addresses={addresses}
            market={market}
            onDone={refresh}
            isHome={true}
            onNavigateTab={setActiveTab}
          />

          <LeaderPrizeContestCard market={market} addresses={addresses} />

          <LeaderCodeCard user={user ?? undefined} addresses={addresses} onDone={refresh} />

          {/* Protocol & Market Overview */}
          <MarketRibbon market={market} addresses={addresses} />
        </div>
      )}

      {/* Tab: Invest & Packages (Dedicated Investment Page) */}
      {activeTab === "invest" && (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
          <InvestCard addresses={addresses} user={user} lhrTier={market.lhrTier} onDone={refresh} />
          <PackagesList positions={user?.positions ?? []} user={user} lhrTier={market.lhrTier} />
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

      {/* Top ID partner pool (to be limited to approved partners) */}
      {activeTab === "partner" && isPartner && <PartnerPoolPage addresses={addresses} onDone={refresh} />}

      {/* Tab 4: Team & Network */}
      {activeTab === "team" && <TeamPage user={user} addresses={addresses} onDone={refresh} />}

      {!internalScreen && (
        <>
          {/* Community & AI support links, shown on every tab */}
          <div className="pt-2">
            <SocialLinks />
          </div>

          {/* Floating Designer Bottom Navbar */}
          <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} showPartner={isPartner === true} />
        </>
      )}
    </div>
  );
}
