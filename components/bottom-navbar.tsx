"use client";

import { LayoutGroup, motion } from "framer-motion";
import {
  CardReceive,
  Hierarchy3,
  Home2,
  People,
  TrendUp,
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
    { id: "invest" as const, name: "Invest", icon: TrendUp },
    { id: "withdraw" as const, name: "Withdraw", icon: CardReceive },
    { id: "team" as const, name: "Team", icon: People },
    { id: "structure" as const, name: "Structure", icon: Hierarchy3 },
  ];

  return (
    <motion.div layoutRoot className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] sm:bottom-6 z-[100] flex justify-center px-2 isolate">
      {/* Floating dock: the green pill slides to the tab you pick, and the dock resizes with it */}
      <LayoutGroup>
      <motion.nav
        layout="size"
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        style={{ borderRadius: 40 }}
        className="pointer-events-auto relative flex max-w-full items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-[#0c120e]/95 backdrop-blur-2xl border border-white/[0.09] shadow-[0_24px_60px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.12)]"
        aria-label="Bottom Navigation"
      >
        {tabs.map((tab) => {
          const isActive =
            activeTab === tab.id || (tab.id === "dashboard" && activeTab === "incomes");
          const IconComponent = tab.icon;

          return (
            <motion.button
              key={tab.id}
              layout
              type="button"
              id={`bottom-nav-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.name}
              aria-label={tab.name}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className={`relative flex flex-row items-center justify-center gap-2 h-11 sm:h-12 px-3 sm:px-4 rounded-full cursor-pointer select-none ${
                isActive ? "text-white" : "text-[#b9c2bc] hover:text-white"
              }`}
            >
              {/* The green pill slides from the old tab to the new one */}
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-pill"
                  className="absolute inset-0 rounded-full border border-neon/50 bg-gradient-to-b from-[#14301c] to-[#0a1a0f] shadow-[0_0_14px_rgba(31,224,58,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <motion.span layout="position" className="relative z-10 flex">
                <IconComponent
                  size={21}
                  color={isActive ? "#1fe03a" : "currentColor"}
                  variant={isActive ? "Bold" : "Linear"}
                />
              </motion.span>
              {isActive && (
                <motion.span
                  layout="position"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.08 }}
                  className="relative z-10 text-xs font-semibold text-white whitespace-nowrap"
                >
                  {tab.name}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </motion.nav>
      </LayoutGroup>
    </motion.div>
  );
}
