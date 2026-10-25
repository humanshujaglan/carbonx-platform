"use client";

import { motion } from "framer-motion";
import {
  ArrowSwapHorizontal,
  CardAdd,
  Home2,
  People,
  TrendUp,
  Wallet3,
} from "iconsax-react";
import type { NavTab } from "./header";

export function BottomNavbar({
  activeTab,
  onTabChange,
}: {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}) {
  const leftTabs = [
    { id: "dashboard" as const, name: "Home", icon: Home2 },
    { id: "invest" as const, name: "Invest", icon: CardAdd },
  ];

  const rightTabs = [
    { id: "incomes" as const, name: "Incomes", icon: TrendUp },
    { id: "team" as const, name: "Team", icon: People },
  ];

  const isCenterActive = activeTab === "trade";

  return (
    <div className="fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center pointer-events-auto transform-gpu will-change-transform isolate">
      {/* Floating Dark Dock matching FluxChain theme */}
      <nav
        className="relative flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-[36px] bg-[#0c120e]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)]"
        aria-label="Bottom Navigation"
      >
        {/* Left Tabs */}
        {leftTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              id={`bottom-nav-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.name}
              className={`relative flex flex-col items-center justify-center p-2.5 sm:px-4 sm:py-2 rounded-2xl transition-all duration-200 cursor-pointer select-none ${
                isActive ? "text-neon" : "text-[#78847b] hover:text-white"
              }`}
            >
              <IconComponent
                size={22}
                color={isActive ? "#1fe03a" : "currentColor"}
                variant={isActive ? "Bold" : "Linear"}
                className="transition-transform duration-150"
              />
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 ${
                  isActive ? "text-neon font-semibold" : "text-[#78847b]"
                }`}
              >
                {tab.name}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 size-1 rounded-full bg-neon shadow-[0_0_8px_#1fe03a]" />
              )}
            </button>
          );
        })}

        {/* Elevated Center Swap / Exchange Action Button */}
        <div className="relative px-1 -my-3">
          <button
            type="button"
            id="bottom-nav-trade"
            onClick={() => onTabChange("trade")}
            title="Exchange / Swap"
            className="group relative flex size-13 sm:size-14 items-center justify-center rounded-2xl sm:rounded-full transition-all duration-200 cursor-pointer transform hover:scale-105 active:scale-95 shadow-[0_0_24px_rgba(31,224,58,0.7),inset_0_1px_0_rgba(255,255,255,0.6)]"
            style={{
              background: "linear-gradient(180deg, #3bf857 0%, #1fe03a 50%, #16be2f 100%)",
            }}
          >
            <ArrowSwapHorizontal
              size={24}
              color="#03140a"
              variant="Bold"
              className={`transition-transform duration-300 ${
                isCenterActive ? "rotate-180 scale-110" : "group-hover:rotate-45"
              }`}
            />
          </button>
        </div>

        {/* Right Tabs */}
        {rightTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              id={`bottom-nav-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.name}
              className={`relative flex flex-col items-center justify-center p-2.5 sm:px-4 sm:py-2 rounded-2xl transition-all duration-200 cursor-pointer select-none ${
                isActive ? "text-neon" : "text-[#78847b] hover:text-white"
              }`}
            >
              <IconComponent
                size={22}
                color={isActive ? "#1fe03a" : "currentColor"}
                variant={isActive ? "Bold" : "Linear"}
                className="transition-transform duration-150"
              />
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 ${
                  isActive ? "text-neon font-semibold" : "text-[#78847b]"
                }`}
              >
                {tab.name}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 size-1 rounded-full bg-neon shadow-[0_0_8px_#1fe03a]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
