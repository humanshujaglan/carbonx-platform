"use client";

import { motion } from "framer-motion";
import { Award, CardAdd, Hierarchy2, Home2, People, Setting2, TrendUp, Wallet3 } from "iconsax-react";
import type { NavTab } from "./header";

export function BottomNavbar({
  activeTab,
  onTabChange,
}: {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}) {
  const tabs = [
    { id: "dashboard" as const, name: "Dashboard", icon: Home2 },
    { id: "invest" as const, name: "Invest", icon: CardAdd },
    { id: "trade" as const, name: "Balances & Sell", icon: Wallet3 },
    { id: "incomes" as const, name: "Incomes", icon: TrendUp },
    { id: "team" as const, name: "Team", icon: People },
    { id: "structure" as const, name: "Structure", icon: Hierarchy2 },
    { id: "operations" as const, name: "Operations", icon: Setting2 },
  ];

  return (
    <div className="fixed bottom-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center max-w-[95vw] pointer-events-auto transform-gpu will-change-transform isolate">
      {/* Floating Pill Nav Container modeled after infinitesix.io */}
      <nav
        className="relative flex flex-row items-center p-1.5 rounded-[32px] bg-[#101114]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all"
        aria-label="Bottom Navigation"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              id={`bottom-nav-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.name}
              className={`relative flex flex-row items-center justify-center gap-2 ${
                isActive
                  ? "px-4 sm:px-5 py-2.5 sm:py-3 text-[#03140a] font-semibold"
                  : "px-3.5 sm:px-4 py-2.5 sm:py-3 text-[#8a919c] hover:text-text hover:bg-white/[0.04] font-normal"
              } rounded-[26px] text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer select-none`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeBottomNavPill"
                  className="absolute inset-0 rounded-[26px]"
                  style={{
                    background: "linear-gradient(180deg, #4cf05e 0%, #1fe03a 45%, #0a9a2a 100%)",
                    boxShadow: "0 6px 20px -4px rgba(31, 224, 58, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
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
                  {tab.name}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
