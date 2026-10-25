"use client";

import { motion } from "framer-motion";
import {
  Award,
  CardReceive,
  Cup,
  Flash,
  Hierarchy,
  TrendUp,
  Wallet3,
} from "iconsax-react";

export type IncomeSubTabId =
  | "all"
  | "roi"
  | "booster"
  | "level"
  | "working"
  | "rank"
  | "contests";

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
  { id: "rank", label: "Rank Salary", icon: Award },
  { id: "contests", label: "Daily Pools", icon: Cup },
];

export function IncomeSubTabs({
  activeTab,
  onChange,
}: {
  activeTab: IncomeSubTabId;
  onChange: (id: IncomeSubTabId) => void;
}) {
  return (
    <div className="w-full flex items-center justify-center overflow-x-auto pb-1 select-none">
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
              className={`relative flex flex-row items-center justify-center gap-2 ${
                isActive
                  ? "px-4 sm:px-5 py-2.5 text-[#03140a] font-semibold"
                  : "px-3.5 sm:px-4 py-2.5 text-[#8a919c] hover:text-text hover:bg-white/[0.04] font-normal"
              } rounded-[26px] text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer select-none`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIncomeSubTabPill"
                  className="absolute inset-0 rounded-[26px]"
                  style={{
                    background:
                      "linear-gradient(180deg, #4cf05e 0%, #1fe03a 45%, #0a9a2a 100%)",
                    boxShadow:
                      "0 6px 20px -4px rgba(31, 224, 58, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
                  }}
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}

              <IconComponent
                size={20}
                color={isActive ? "#03140a" : "currentColor"}
                variant={isActive ? "Bold" : "Linear"}
                className="relative z-10 shrink-0"
              />
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  transition={{ duration: 0.18 }}
                  className="inline-block leading-none relative z-10 tracking-tight"
                >
                  {tab.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
