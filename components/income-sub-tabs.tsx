"use client";

import {
  Cup,
  Hierarchy,
  SecuritySafe,
  Share,
  Wallet3,
} from "iconsax-react";

export type IncomeSubTabId =
  | "all"
  | "level"
  | "direct"
  | "contests"
  | "rewardPool";

export interface IncomeSubTabItem {
  id: IncomeSubTabId;
  label: string;
  icon: typeof Wallet3;
}

const SUB_TABS: IncomeSubTabItem[] = [
  { id: "all", label: "All Streams", icon: Wallet3 },
  { id: "level", label: "Referral Income", icon: Hierarchy },
  { id: "direct", label: "Direct + Lock Income", icon: Share },
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
    <nav
      className="flex w-full min-w-0 flex-row items-center gap-1.5 overflow-x-auto no-scrollbar select-none"
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
              onClick={(e) => {
                onChange(tab.id);
                e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
              }}
              title={tab.label}
              className={`relative shrink-0 flex flex-row items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-[20px] text-xs font-medium whitespace-nowrap transition-colors duration-200 cursor-pointer select-none ${
                isActive ? "text-white" : "text-[#b9c2bc] hover:text-white"
              }`}
            >
              {/* Same pill for every tab; only the colours change when active */}
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-[20px] border transition-colors duration-200"
                style={
                  isActive
                    ? {
                        borderColor: "#22c55e",
                        background:
                          "radial-gradient(120% 100% at 50% 30%, rgba(34, 197, 94, 0.35) 0%, rgba(16, 75, 32, 0.5) 60%, rgba(8, 38, 16, 0.75) 100%), #0a1b0f",
                        boxShadow:
                          "inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 0 14px 1px rgba(34, 197, 94, 0.3)",
                      }
                    : {
                        borderColor: "rgba(255, 255, 255, 0.1)",
                        background: "#14171d",
                        boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.06)",
                      }
                }
              />

              <IconComponent
                size={17}
                color={isActive ? "#22c55e" : "currentColor"}
                variant="Bold"
                className="relative z-10 shrink-0"
              />
              <span className="relative z-10 text-xs font-medium leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
    </nav>
  );
}
