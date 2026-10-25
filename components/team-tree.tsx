"use client";

import { useState } from "react";
import analysisImage from "@/public/analysis.png";
import walletImage from "@/public/wallet.png";
import { platformAbi } from "@/lib/abi";
import { shortAddr, usd } from "@/lib/format";
import type { PlatformAddresses, PlatformUser } from "@/lib/platform";
import { CardHeader, Notice, Pill, Row, Spinner, useToast, useTx } from "./ui";
import { useWallet } from "./wallet";

export function TeamTree({
  user,
  addresses,
  onDone,
}: {
  user?: PlatformUser;
  addresses?: PlatformAddresses;
  onDone: () => void;
}) {
  const { account, write } = useWallet();
  const tx = useTx(onDone);
  const toast = useToast();

  const refUrl = typeof window !== "undefined" && account
    ? `${window.location.origin}/?ref=${account}`
    : account
    ? `https://carbonx.network/?ref=${account}`
    : "";

  async function handleCheckLeaderCode() {
    if (!addresses || !account) return;
    await tx.run(
      "Checking Leader Code Qualification...",
      async () => {
        return write({
          address: addresses.platform,
          abi: platformAbi,
          functionName: "checkLeaderCode",
        });
      },
      (hash) => <span>Leader Code check complete!</span>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Referral Link & Leader Code Hero */}
      <section className="card flex flex-col gap-4 p-5 sm:p-6" aria-label="Referral link">
        <CardHeader
          image={walletImage}
          title="My Referral & Team Network"
          right={<Pill tone="green">Active Sponsor</Pill>}
        />

        {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}

        <div className="flex flex-col gap-2">
          <label className="label uppercase tracking-wider text-muted">Your Unique Referral Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={refUrl || "Connect wallet to generate your referral link"}
              className="well flex-1 px-4 py-3 text-xs sm:text-sm text-neon-soft outline-none"
            />
            <button
              type="button"
              disabled={!account}
              onClick={() => {
                if (refUrl) {
                  navigator.clipboard?.writeText(refUrl);
                  toast.show("Referral link copied!");
                }
              }}
              className="btn btn-primary px-5 py-3 text-xs font-medium cursor-pointer"
            >
              Copy Link
            </button>
          </div>
        </div>

        {/* Leader code check banner */}
        <div className="well p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs font-semibold text-text">Leader Code Self-Check</div>
          <button
            type="button"
            disabled={!user || !!tx.busy}
            onClick={handleCheckLeaderCode}
            className="btn btn-secondary text-xs !py-1.5 !px-3.5 whitespace-nowrap"
          >
            {tx.busy === "Checking Leader Code Qualification..." ? <Spinner /> : "Check Leader Code"}
          </button>
        </div>
      </section>

      {/* Network Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="label">Total Direct Business</div>
          <div className="mt-1 text-2xl font-bold text-text">
            {user ? usd(user.totalDirectBusiness) : "—"}
          </div>
          <div className="text-xs text-neon-soft mt-1">
            {user?.activeDirectCount ?? 0} Active Direct Sponsors
          </div>
        </div>

        <div className="card p-5">
          <div className="label">Total Team Volume</div>
          <div className="mt-1 text-2xl font-bold text-text">
            {user ? usd(user.totalTeamBusiness) : "—"}
          </div>
        </div>

        <div className="card p-5">
          <div className="label">Power vs Weaker Leg</div>
          <div className="mt-1 text-lg font-semibold text-text">
            {user ? usd(user.powerLegBusiness) : "—"}
          </div>
          <div className="text-xs text-muted mt-1">
            Weaker: <span className="text-text font-medium">{user ? usd(user.weakerLegBusiness) : "—"}</span>
          </div>
        </div>
      </div>

      {/* Direct Downlines Table */}
      <section className="card flex flex-col gap-4 p-5 sm:p-6" aria-label="Direct downlines">
        <CardHeader
          image={analysisImage}
          title="Direct Team Members"
          right={<Pill tone="neutral">{user?.directDownlines?.length ?? 0} Partners</Pill>}
        />

        {user && user.directDownlines && user.directDownlines.length > 0 ? (
          <div className="flex flex-col divide-y divide-white/[0.04] overflow-hidden rounded-xl border border-white/[0.04]">
            {user.directDownlines.map((downline, idx) => (
              <div key={downline} className="flex items-center justify-between px-4 py-3 bg-panel-2/50 hover:bg-panel-2 transition">
                <div className="flex items-center gap-3">
                  <span className="size-6 rounded-full bg-panel-3 text-[10px] font-semibold flex items-center justify-center text-muted">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-text">{shortAddr(downline)}</div>
                    <div className="text-[10px] text-muted">Direct Referral</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-neon/15 px-2 py-0.5 text-[10px] font-medium text-neon">
                    Active
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(downline);
                      toast.show("Address copied");
                    }}
                    className="text-xs text-muted hover:text-text cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="well p-8 text-center text-xs text-muted">
            No direct downlines yet. Share your referral link above to start building your team!
          </div>
        )}
      </section>
    </div>
  );
}
