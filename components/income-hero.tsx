"use client";

import { useState } from "react";
import Image from "next/image";
import { formatUnits } from "viem";
import { Copy, Eye, EyeSlash, TickCircle } from "iconsax-react";
import type { PlatformUser } from "@/lib/platform";
import { useLiveIncomeStreams } from "./incomes-dashboard";
import avatarImage from "@/public/new-icons/user.jpg";

const fmt = (v: number) =>
  v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Card-less hero: total claimable income, centred. */
export function IncomeHero({ user, lhrTier }: { user?: PlatformUser; lhrTier: number }) {
  const { settledRoi, settledBooster } = useLiveIncomeStreams(user, lhrTier);
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);

  // ROI / booster settle inside withdrawROI / withdrawBooster, so they count as claimable too
  const totalClaimable = user
    ? Number(
        formatUnits(
          user.workingIncomePending +
            user.leaderIncomePending +
            user.pendingDirectBonusAvailable +
            user.pendingLeaderContestRewards +
            user.pendingContestRewards,
          18
        )
      ) +
      settledRoi +
      settledBooster
    : 0;

  const amount = `$${fmt(totalClaimable)}`;

  const copyAmount = () => {
    if (user && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(amount).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <section className="flex items-center gap-3.5 py-3" aria-label="Total available to withdraw">
      <div className="size-12 shrink-0 overflow-hidden rounded-2xl bg-white">
        <Image src={avatarImage} alt="Profile Avatar" width={96} height={96} className="size-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-2xs text-muted">Total available to withdraw</div>
        <div className="truncate text-2xl sm:text-3xl font-semibold text-white">
          {user ? (hidden ? "***" : amount) : "—"}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3.5">
        <button
          type="button"
          disabled={!user || hidden}
          onClick={copyAmount}
          aria-label="Copy amount"
          className="text-muted transition hover:text-neon disabled:opacity-40 cursor-pointer"
        >
          {copied ? (
            <TickCircle size={20} color="currentColor" variant="Linear" />
          ) : (
            <Copy size={20} color="currentColor" variant="Linear" />
          )}
        </button>
        <button
          type="button"
          disabled={!user}
          onClick={() => setHidden((h) => !h)}
          aria-label={hidden ? "Show amount" : "Hide amount"}
          className="text-muted transition hover:text-neon disabled:opacity-40 cursor-pointer"
        >
          {hidden ? (
            <EyeSlash size={20} color="currentColor" variant="Linear" />
          ) : (
            <Eye size={20} color="currentColor" variant="Linear" />
          )}
        </button>
      </div>
    </section>
  );
}
