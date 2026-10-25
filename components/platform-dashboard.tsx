"use client";

import { useState } from "react";
import Image from "next/image";
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

export function PlatformDashboard({ initialTab = "dashboard" }: { initialTab?: NavTab } = {}) {
  const { account, connect, hasWallet } = useWallet();
  const { addresses, market, user, error, refresh } = usePlatform(account);
  const [activeTab, setActiveTab] = useState<NavTab>(initialTab);

  const isUserRegistered = user?.isRegistered ?? false;

  return (
    <div className="flex flex-col gap-6">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Top Hero Section (Commented out per request)
      <section className="pb-2 pt-4 text-center sm:pb-6 sm:pt-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[11px] font-light text-neon-soft backdrop-blur border border-white/[0.05]">
          <span className="size-1.5 rounded-full bg-neon shadow-[0_0_8px_#1fe03a]" aria-hidden />
          Tokenizing nature · Powering a carbon-negative future
        </span>
        <h1 className="-mx-4 mt-4 flex items-center justify-center gap-0.5 text-[2rem] sm:mx-0 font-semibold leading-[1.05] tracking-tight text-text sm:gap-4 sm:text-6xl">
          <span className="inline-flex shrink-0 animate-drift">
            <Image src={leafImage} alt="" width={168} height={112} className="h-10 w-14 -scale-x-100 object-contain sm:h-20 sm:w-28" />
          </span>
          <span className="whitespace-nowrap">
            CarbonX <span className="text-gradient">Platform</span>
          </span>
          <span className="inline-flex shrink-0 animate-drift">
            <Image src={leafImage} alt="" width={168} height={112} className="h-10 w-14 object-contain sm:h-20 sm:w-28" />
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-light text-muted sm:text-base">
          Register, invest USDT across high-yield packages, and track all 6 decentralized income streams.
        </p>
      </section>
      */}

      {error && <Notice tone="error">Error loading chain data: {error}</Notice>}

      {/* Tab 1: Dashboard Overview (Home Page) */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-6">
          {/* Protocol & Market Overview - Only on Home Page */}
          <MarketRibbon market={market} addresses={addresses} />
          {/* Quick Account Snapshot */}
          <section className="card p-5 sm:p-6" aria-label="Account status">
            <CardHeader
              image={walletImage}
              title="My Account Summary"
              right={account ? <Pill tone="green">{shortAddr(account)}</Pill> : <Pill tone="neutral">Guest</Pill>}
            />

            {!account ? (
              <div className="mt-4 well p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="text-xs text-muted">
                  Connect your Web3 wallet to register, activate packages, and withdraw your income.
                </div>
                <button
                  type="button"
                  disabled={!hasWallet}
                  onClick={() => connect().catch(() => {})}
                  className="btn btn-primary text-xs !py-2 !px-4"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="well p-3.5">
                  <div className="label">Active Deposits</div>
                  <div className="text-lg font-semibold text-text">{user ? usd(user.totalActiveDeposit) : "—"}</div>
                </div>
                <div className="well p-3.5">
                  <div className="label">Unclaimed Income</div>
                  <div className="text-lg font-semibold text-neon-soft">
                    {user
                      ? usd(
                          user.roiIncomePending +
                            user.boosterIncomePending +
                            user.workingIncomePending +
                            user.leaderIncomePending +
                            user.pendingLeaderContestRewards +
                            user.pendingContestRewards
                        )
                      : "—"}
                  </div>
                </div>
                <div className="well p-3.5">
                  <div className="label">Total Withdrawn</div>
                  <div className="text-lg font-semibold text-text">
                    {user
                      ? usd(
                          user.roiIncomeWithdrawn +
                            user.boosterIncomeWithdrawn +
                            user.workingIncomeWithdrawn +
                            user.leaderIncomeWithdrawn
                        )
                      : "—"}
                  </div>
                </div>
                <div className="well p-3.5">
                  <div className="label">Direct Sponsors</div>
                  <div className="text-lg font-semibold text-text">{user?.activeDirectCount ?? 0} active</div>
                </div>
              </div>
            )}
          </section>

          {/* Quick Action Grid */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            {!isUserRegistered ? (
              <RegisterCard addresses={addresses} user={user} onDone={refresh} />
            ) : (
              <InvestCard addresses={addresses} user={user} onDone={refresh} />
            )}

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
            {!isUserRegistered ? (
              <RegisterCard addresses={addresses} user={user} onDone={refresh} />
            ) : (
              <InvestCard addresses={addresses} user={user} onDone={refresh} />
            )}
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
      {activeTab === "operations" && (
        <OperationsDashboard />
      )}

      {/* Tab 7: Balances & Token Exchange (Trade/Sell) */}
      {activeTab === "trade" && (
        <SwapCard addresses={addresses} onDone={refresh} />
      )}

      {/* Floating Designer Bottom Navbar */}
      <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
