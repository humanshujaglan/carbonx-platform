"use client";

import Image, { type StaticImageData } from "next/image";
import { Wallet3 } from "iconsax-react";
import incomesImage from "@/public/new-icons/incomes.png";
import investImage from "@/public/new-icons/invest.png";
import teamImage from "@/public/new-icons/team.png";
import walletImage from "@/public/new-icons/wallet.png";
import type { NavTab } from "./header";

const ACTIONS: { id: NavTab; title: string; icon?: typeof Wallet3; image?: StaticImageData; imageScale?: number }[] = [
  { id: "invest", title: "Invest", image: investImage, imageScale: 1.55 },
  { id: "withdraw", title: "Withdraw", image: walletImage, imageScale: 1.7 },
  { id: "team", title: "Team", image: teamImage, imageScale: 1.45 },
  { id: "incomes", title: "Incomes", image: incomesImage, imageScale: 1.6 },
];

/** Four shortcut cards that jump to a tab. */
export function QuickActions({ onNavigateTab }: { onNavigateTab?: (tab: NavTab) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5" aria-label="Quick actions">
      {ACTIONS.map(({ id, title, icon: Icon, image, imageScale = 1.7 }) => (
        <button
          key={id}
          type="button"
          onClick={() => onNavigateTab?.(id)}
          className="group flex h-[92px] w-full cursor-pointer select-none flex-col items-center justify-center gap-2.5 card border border-white/[0.08] p-2 transition duration-200 hover:border-white/20 active:scale-[0.98] sm:h-[100px]"
        >
          {image ? (
            // The artwork has a black backdrop; screen blending drops it so only the wallet shows on the card
            <span className="flex size-10 items-center justify-center overflow-hidden sm:size-11">
              <Image src={image} alt="" width={96} height={64} className="size-full object-contain mix-blend-screen" style={{ transform: `scale(${imageScale})` }} />
            </span>
          ) : (
            Icon && (
              <span className="flex size-10 items-center justify-center rounded-2xl bg-neon/10 text-neon sm:size-11">
                <Icon size={24} color="currentColor" variant="Bulk" />
              </span>
            )
          )}
          <span className="text-xs font-medium text-white sm:text-sm">{title}</span>
        </button>
      ))}
    </div>
  );
}
