"use client";

import { motion } from "framer-motion";
import {
  Award,
  CardReceive,
  Cup,
  Flash,
  Hierarchy,
  Profile2User,
  SecuritySafe,
  Share,
  TrendUp,
  Wallet3,
} from "iconsax-react";

export type IncomeSubTabId =
  | "all"
  | "roi"
  | "booster"
  | "level"
  | "working"
  | "direct"
  | "leader"
  | "rank"
  | "contests"
  | "rewardPool";

export interface IncomeSubTabItem {
  id: IncomeSubTabId;
  label: string;
  icon: typeof Wallet3;
}

const SUB_TABS: IncomeSubTabItem[] = [
  { id: "all", label: "All Streams", icon: Wallet3 },
  { id: "roi", label: "Daily ROI", icon: TrendUp },
  { id: "booster", label: "Booster", icon: Flash },
  { id: "level", label: "Level Harvest", icon: Hierarchy },
  { id: "working", label: "Working Balance", icon: CardReceive },
  { id: "direct", label: "Direct & Lock-In", icon: Share },
  { id: "leader", label: "Leader (BDF)", icon: Profile2User },
  { id: "rank", label: "Rank Salary", icon: Award },
  { id: "contests", label: "Prize Contests", icon: Cup },
  { id: "rewardPool", label: "Reward Pool", icon: SecuritySafe },
];

export function IncomeSubTabs({
  activeTab,
  onChange,
}: {
  activeTab: IncomeSubTabId;
  onChange: (id: IncomeSubTabId) => void;
}) {
  return (
    <div className="w-full flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar pb-1 select-none">
      {/* Pill Nav Container identical to bottom navbar format */}
      <nav
        className="relative flex flex-row items-center p-1.5 rounded-[32px] bg-[#101114]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all min-w-max"
        aria-label="Income Streams Navigation"
      >
        {SUB_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              id={`income-subtab-${tab.id}`}
              onClick={() => onChange(tab.id)}
              title={tab.label}
              className={`relative flex flex-row items-center justify-center gap-1.5 sm:gap-2 ${
                isActive
                  ? "px-3.5 sm:px-5 py-2 sm:py-2.5 text-white font-medium"
                  : "px-3 sm:px-4 py-2 sm:py-2.5 text-[#94a0a9] hover:text-white hover:bg-white/[0.04] font-normal"
              } rounded-[20px] text-xs whitespace-nowrap transition-all duration-200 cursor-pointer select-none`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIncomeSubTabPill"
                  className="absolute inset-0 rounded-[20px] border border-[#22c55e]"
                  style={{
                    background:
                      "radial-gradient(120% 100% at 50% 30%, rgba(34, 197, 94, 0.35) 0%, rgba(16, 75, 32, 0.5) 60%, rgba(8, 38, 16, 0.75) 100%), #0a1b0f",
                    boxShadow:
                      "0 0 20px 2px rgba(34, 197, 94, 0.4), 0 0 35px 4px rgba(34, 197, 94, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 0 14px 1px rgba(34, 197, 94, 0.3)",
                  }}
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}

              <IconComponent
                size={17}
                color={isActive ? "#22c55e" : "currentColor"}
                variant={isActive ? "Bold" : "Linear"}
                className="relative z-10 shrink-0"
              />
              <span className="relative z-10 text-xs font-medium leading-none tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
