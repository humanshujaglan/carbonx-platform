"use client";

import { ExportSquare } from "iconsax-react";
import analysisImage from "@/public/analysis.png";
import { chain } from "@/lib/config";
import type { PlatformAddresses, PlatformMarket } from "@/lib/platform";
import { price, usd } from "@/lib/format";
import { CardHeader } from "./ui";

export function MarketRibbon({
  market,
  addresses,
}: {
  market: PlatformMarket;
  addresses?: PlatformAddresses;
}) {
  // "—" until the value is read from chain (or when the read fails)
  const show = (v: bigint | undefined, fmt: (x: bigint) => string) => (v === undefined ? "—" : fmt(v));
  const twapNote =
    market.twapWindowSec !== undefined
      ? market.twapWindowSec >= 3600
        ? `${market.twapWindowSec / 3600}h window`
        : `${Math.round(market.twapWindowSec / 60)}m window`
      : undefined;

  const cells = [
    { label: "CARB spot price", value: show(market.spotPrice, price), accent: true },
    { label: "TWAP oracle", value: show(market.twapPrice, price), note: twapNote },
    { label: "Total active deposits", value: show(market.totalPlatformActiveDeposit, usd) },
    { label: "Liquidity in pool", value: show(market.usdtReserve, (r) => usd(r * 2n)) },
    { label: "Buyback pool", value: usd(market.buybackPoolUSDT), note: "USDT" },
    {
      label: "LP farming liquidity",
      value: usd(market.farmingPrincipalUSDT),
      sub: `LP value ${usd(market.farmingLpValueUSDT)}`,
    },
  ];

  return (
    <section className="card flex flex-col gap-4 p-5 sm:p-6" aria-label="Market statistics">
      <CardHeader
        image={analysisImage}
        title="Protocol & Market Overview"
        right={
          <div className="flex items-center gap-2">
            {addresses && (
              <a
                href={`https://pancakeswap.finance/info/v2/pairs/${addresses.pair}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-2xs text-muted transition-colors hover:text-neon"
              >
                <span>PancakeSwap</span>
                <ExportSquare size={14} color="currentColor" />
              </a>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {cells.map((c) => (
          <div key={c.label} className="well min-w-0 px-4 py-3">
            <div className="label flex flex-wrap items-center gap-x-1.5">
              {c.label}
              {c.note && <span className="text-neon-soft">· {c.note}</span>}
            </div>
            <div className={`mt-1 truncate text-xl font-semibold ${c.accent ? "text-gradient text-neon-soft" : "text-text"}`}>
              {c.value}
            </div>
            {"sub" in c && c.sub && <div className="mt-0.5 truncate text-2xs text-muted">{c.sub}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
