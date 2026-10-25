"use client";

import { ExportSquare } from "iconsax-react";
import analysisImage from "@/public/analysis.png";
import { chain } from "@/lib/config";
import type { PlatformAddresses, PlatformMarket } from "@/lib/platform";
import { price, usd } from "@/lib/format";
import { CardHeader, Pill } from "./ui";

export function MarketRibbon({
  market,
  addresses,
}: {
  market: PlatformMarket;
  addresses?: PlatformAddresses;
}) {
  const tierLabels: Record<number, { label: string; tone: "green" | "warn" | "neutral" }> = {
    0: { label: "Tier 0 · Prime", tone: "green" },
    1: { label: "Tier 1 · Balanced", tone: "green" },
    2: { label: "Tier 2 · Caution", tone: "warn" },
    3: { label: "Tier 3 · Floor Defense", tone: "warn" },
  };

  const activeTier = tierLabels[market.lhrTier] ?? { label: "Tier 1", tone: "green" };

  const cells = [
    { label: "CARB spot price", value: price(market.spotPrice), accent: true },
    { label: "TWAP oracle", value: price(market.twapPrice), note: "Live 12h" },
    { label: "Total active deposits", value: usd(market.totalPlatformActiveDeposit) },
    { label: "Liquidity in pool", value: usd(market.usdtReserve * 2n) },
  ];

  return (
    <section className="card flex flex-col gap-4 p-5 sm:p-6" aria-label="Market statistics">
      <CardHeader
        image={analysisImage}
        title="Protocol & Market Overview"
        right={
          <div className="flex items-center gap-2">
            <Pill tone={activeTier.tone}>{activeTier.label}</Pill>
            {addresses && (
              <a
                href={`https://pancakeswap.finance/info/v2/pairs/${addresses.pair}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-neon"
              >
                <span>PancakeSwap</span>
                <ExportSquare size={14} color="currentColor" />
              </a>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="well min-w-0 px-4 py-3">
            <div className="label flex flex-wrap items-center gap-x-1.5">
              {c.label}
              {c.note && <span className="text-neon-soft">· {c.note}</span>}
            </div>
            <div className={`mt-1 truncate text-lg font-semibold sm:text-xl ${c.accent ? "text-gradient text-neon-soft" : "text-text"}`}>
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
