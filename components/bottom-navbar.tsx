"use client";

import {
  CardAdd,
  CardReceive,
  Hierarchy2,
  Home2,
  People,
} from "iconsax-react";
import type { NavTab } from "./header";

export function BottomNavbar({
  activeTab,
  onTabChange,
}: {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}) {
  const tabs = [
    { id: "dashboard" as const, name: "Home", icon: Home2 },
    { id: "invest" as const, name: "Invest", icon: CardAdd },
    { id: "withdraw" as const, name: "Withdraw", icon: CardReceive },
    { id: "team" as const, name: "Team", icon: People },
    { id: "structure" as const, name: "Structure", icon: Hierarchy2 },
  ];

  return (
    <div className="fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center pointer-events-auto transform-gpu will-change-transform isolate max-w-[96vw]">
      {/* Floating Dark Dock matching FluxChain theme with distinct gaps between page options */}
      <nav
        className="relative flex items-center gap-2 sm:gap-3.5 md:gap-4.5 p-1.5 sm:p-2.5 rounded-[36px] sm:rounded-[40px] bg-[#0c120e]/95 backdrop-blur-2xl border border-white/[0.09] shadow-[0_24px_60px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.12)]"
        aria-label="Bottom Navigation"
      >
        {tabs.map((tab) => {
          const isActive =
            activeTab === tab.id || (tab.id === "dashboard" && activeTab === "incomes");
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              id={`bottom-nav-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.name}
              className={`relative flex flex-col items-center justify-center min-w-[54px] sm:min-w-[72px] px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-[22px] transition-all duration-200 cursor-pointer select-none ${
                isActive
                  ? "bg-gradient-to-b from-[#14301c] to-[#0a1a0f] text-white border border-neon/50 shadow-[0_0_14px_rgba(31,224,58,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
                  : "bg-transparent text-[#7e8d83] hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <IconComponent
                size={21}
                color={isActive ? "#1fe03a" : "currentColor"}
                variant={isActive ? "Bold" : "Linear"}
                className={`transition-transform duration-150 ${isActive ? "scale-105" : ""}`}
              />
              <span
                className={`text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5 ${
                  isActive ? "text-white font-bold" : "text-[#7e8d83]"
                }`}
              >
                {tab.name}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
