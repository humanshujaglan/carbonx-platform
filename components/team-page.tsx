"use client";

import { useState } from "react";
import { Copy } from "iconsax-react";
import { shortAddr, usd } from "@/lib/format";
import type { PlatformAddresses, PlatformUser } from "@/lib/platform";
import { LeaderCodeCard } from "./leader-code-card";
import { RankBusinessCard } from "./rank-business-card";
import { StructureView, type TeamView } from "./structure-view";
import { useToast } from "./ui";

/** Team: your numbers, leader code, rank progress, direct members and the downline tree. */
export function TeamPage({
  user,
  addresses,
  onDone,
}: {
  user?: PlatformUser;
  addresses?: PlatformAddresses;
  onDone: () => void;
}) {
  const toast = useToast();
  const [view, setView] = useState<TeamView>("tree");
  const directs = user?.directDownlines ?? [];

  const figures: [string, string][] = [
    ["Active directs", `${user?.activeDirectCount ?? 0}`],
    ["Direct business", user ? usd(user.totalDirectBusiness) : "$0.00"],
    ["Team business", user ? usd(user.totalTeamBusiness) : "$0.00"],
  ];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      {/* Tree view / List view */}
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Downline view">
        {(
          [
            ["tree", "Tree view"],
            ["list", "List view"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={`cursor-pointer rounded-2xl py-3 text-sm font-semibold transition ${
              view === key ? "btn btn-primary !rounded-2xl !py-3" : "bg-[#1b1f26] text-[#b9c2bc] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <StructureView user={user} addresses={addresses} onDone={onDone} view={view} />

      {/* My team */}
      <section className="card p-5 sm:p-6 flex flex-col gap-5" aria-label="My team">
        <h3 className="text-sm font-medium text-text">My team</h3>
        <dl className="grid grid-cols-3 gap-3 sm:divide-x sm:divide-white/[0.08]">
          {figures.map(([label, value]) => (
            <div key={label} className="sm:pl-4 sm:first:pl-0">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 text-base text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <LeaderCodeCard user={user} addresses={addresses} onDone={onDone} />
      <RankBusinessCard user={user} />

      {/* Direct members */}
      <section className="card p-5 sm:p-6 flex flex-col gap-4" aria-label="Direct members">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-text">Direct members</h3>
          <span className="text-xs text-muted">{directs.length}</span>
        </div>
        {directs.length > 0 ? (
          <div className="flex flex-col">
            {directs.map((downline, idx) => (
              <div
                key={downline}
                className="flex items-center gap-3 border-t border-white/[0.08] py-3 text-sm first:border-t-0 first:pt-0"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs text-muted">
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-white">{shortAddr(downline)}</span>
                <button
                  type="button"
                  aria-label="Copy address"
                  onClick={() => {
                    navigator.clipboard?.writeText(downline);
                    toast.show("Address copied");
                  }}
                  className="shrink-0 cursor-pointer text-muted transition hover:text-neon"
                >
                  <Copy size={16} color="currentColor" variant="Linear" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted">No direct members yet. Share your referral link to start your team.</p>
        )}
      </section>
    </div>
  );
}
