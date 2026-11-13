"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowSwapHorizontal,
  CardReceive,
  Crown1,
  Home2,
  People,
  TrendUp,
} from "iconsax-react";
import type { NavTab } from "./header";

const TABS = [
  { id: "dashboard" as const, name: "Home", icon: Home2 },
  { id: "invest" as const, name: "Invest", icon: TrendUp },
  { id: "withdraw" as const, name: "Withdraw", icon: CardReceive },
  { id: "sell" as const, name: "Sell", icon: ArrowSwapHorizontal },
  { id: "team" as const, name: "Team", icon: People },
  { id: "partner" as const, name: "Partner", icon: Crown1 },
];

export function BottomNavbar({
  activeTab,
  onTabChange,
  showPartner = false,
}: {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  /** Only active Top ID partners get the Partner tab. */
  showPartner?: boolean;
}) {
  const tabs = TABS.filter((t) => t.id !== "partner" || showPartner);
  const navRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  const activeId = activeTab === "incomes" ? "dashboard" : activeTab;

  // The pill's position is measured from the buttons themselves and animated with plain left/width values.
  // It never depends on where the page is scrolled, so switching tabs at the bottom of a page can't move the dock.
  useEffect(() => {
    const measure = () => {
      const el = buttonRefs.current[activeId];
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    if (navRef.current) observer.observe(navRef.current);
    Object.values(buttonRefs.current).forEach((b) => b && observer.observe(b));
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [activeId]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] sm:bottom-6 z-[100] flex justify-center px-2 isolate">
      {/* Floating dock: the green pill slides to the tab you pick */}
      <nav
        ref={navRef}
        className="pointer-events-auto relative flex max-w-full items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-[40px] bg-[#0c120e]/95 backdrop-blur-2xl border border-white/[0.09] shadow-[0_24px_60px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.12)]"
        aria-label="Bottom Navigation"
      >
        {pill && (
          <motion.span
            aria-hidden="true"
            initial={false}
            animate={{ left: pill.left, width: pill.width }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="absolute inset-y-1.5 sm:inset-y-2 rounded-full border border-neon/50 bg-gradient-to-b from-[#14301c] to-[#0a1a0f] shadow-[0_0_14px_rgba(31,224,58,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
          />
        )}
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                buttonRefs.current[tab.id] = el;
              }}
              type="button"
              id={`bottom-nav-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.name}
              aria-label={tab.name}
              className={`relative z-10 flex h-11 sm:h-12 cursor-pointer select-none flex-row items-center justify-center gap-2 rounded-full px-3 sm:px-4 ${
                isActive ? "text-white" : "text-[#b9c2bc] hover:text-white"
              }`}
            >
              <IconComponent
                size={21}
                color={isActive ? "#1fe03a" : "currentColor"}
                variant={isActive ? "Bold" : "Linear"}
              />
              {isActive && <span className="whitespace-nowrap text-xs font-semibold text-white">{tab.name}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
