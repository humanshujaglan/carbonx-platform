"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { Crown1 } from "iconsax-react";
import { partnerPoolAbi, platformAbi, teamEngineAbi } from "@/lib/abi";
import { usd } from "@/lib/format";
import { publicClient, type PlatformAddresses } from "@/lib/platform";
import { Notice, Row, Spinner, useTx } from "./ui";
import { useWallet } from "./wallet";

type MonthRow = {
  month: number;
  pool: bigint;
  myBiz: bigint;
  share: bigint;
  claimed: boolean;
};

type PartnerState = {
  currentMonth: number;
  active: boolean;
  request: number; // 0 none, 1 pending, 2 approved, 3 rejected
  activeCount: number;
  rows: MonthRow[];
  currentPool: bigint;
  currentBiz: bigint;
};

const MONTHS_SHOWN = 12;

/** True for an active Top ID partner, false otherwise, undefined while it loads. */
export function useIsPartner(account?: Address | null, addresses?: PlatformAddresses): boolean | undefined {
  const [isPartner, setIsPartner] = useState<boolean>();

  useEffect(() => {
    if (!account || !addresses) {
      setIsPartner(undefined);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const engine = (await publicClient.readContract({
          address: addresses.platform,
          abi: platformAbi,
          functionName: "payoutEngine",
        })) as Address;
        const partner = (await publicClient.readContract({
          address: engine,
          abi: partnerPoolAbi,
          functionName: "topIdPartners",
          args: [account],
        })) as readonly [Address, bigint, boolean];
        if (!cancelled) setIsPartner(partner[2]);
      } catch {
        if (!cancelled) setIsPartner(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account, addresses]);

  return isPartner;
}

/** Top ID partner pool: each ended month, a partner's share is their monthly business over all partners' business. */
export function PartnerPoolPage({ addresses, onDone }: { addresses?: PlatformAddresses; onDone: () => void }) {
  const { account, write } = useWallet();
  const tx = useTx(onDone);
  const [state, setState] = useState<PartnerState>();
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!account || !addresses) {
      setState(undefined);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const platform = addresses.platform;
        const [month, engine, team] = await Promise.all([
          publicClient.readContract({ address: platform, abi: platformAbi, functionName: "getCurrentMonth" }),
          publicClient.readContract({ address: platform, abi: platformAbi, functionName: "payoutEngine" }),
          publicClient.readContract({ address: platform, abi: platformAbi, functionName: "teamEngine" }),
        ]);
        const currentMonth = Number(month);
        const eng = engine as Address;
        const teamEng = team as Address;
        const read = <T,>(fn: string, args: readonly unknown[] = []) =>
          publicClient.readContract({ address: eng, abi: partnerPoolAbi, functionName: fn as any, args: args as any }) as Promise<T>;
        const biz = (m: number, who: Address) =>
          publicClient.readContract({ address: teamEng, abi: teamEngineAbi, functionName: "monthlyNewBusiness", args: [BigInt(m), who] }) as Promise<bigint>;

        const [partner, request, activeList] = await Promise.all([
          read<readonly [Address, bigint, boolean]>("topIdPartners", [account]),
          read<number>("partnerRequestStatus", [account]),
          read<Address[]>("getActiveTopIdPartners").catch(() => [] as Address[]),
        ]);

        const first = Math.max(0, currentMonth - MONTHS_SHOWN);
        const rows: MonthRow[] = [];
        for (let m = currentMonth - 1; m >= first; m--) {
          const [pool, initialPool, initialBiz, claimed, myBiz] = await Promise.all([
            read<bigint>("monthlyTopIdPartnerPool", [BigInt(m)]),
            read<bigint>("initialMonthlyTopIdPartnerPool", [BigInt(m)]),
            read<bigint>("initialTotalPartnersBiz", [BigInt(m)]),
            read<boolean>("monthlyPartnerClaimed", [BigInt(m), account]),
            biz(m, account),
          ]);
          let totalBiz = initialBiz;
          if (totalBiz === 0n) {
            const all = await Promise.all(activeList.map((a) => biz(m, a)));
            totalBiz = all.reduce((s, v) => s + v, 0n);
          }
          const basePool = initialPool > 0n ? initialPool : pool;
          let share = totalBiz > 0n ? (myBiz * basePool) / totalBiz : 0n;
          if (share > pool) share = pool;
          if (pool > 0n || claimed || myBiz > 0n) rows.push({ month: m, pool, myBiz, share, claimed });
        }

        const [currentPool, currentBiz] = await Promise.all([
          read<bigint>("monthlyTopIdPartnerPool", [BigInt(currentMonth)]),
          biz(currentMonth, account),
        ]);

        if (!cancelled)
          setState({
            currentMonth,
            active: partner[2],
            request: Number(request),
            activeCount: activeList.length,
            rows,
            currentPool,
            currentBiz,
          });
      } catch {
        if (!cancelled) setState(undefined);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account, addresses, version]);

  const reload = () => setVersion((v) => v + 1);
  const unclaimed = state ? state.rows.filter((r) => !r.claimed).reduce((s, r) => s + r.share, 0n) : 0n;

  async function claim(month: number) {
    if (!addresses || !account) return;
    const ok = await tx.run(
      `Claiming Month ${month}...`,
      async () => write({ address: addresses.platform, abi: platformAbi, functionName: "claimTopIdPartnerPool", args: [BigInt(month)] }),
      () => <span>Claimed. It is in your working balance. Withdraw it from the Withdraw tab.</span>
    );
    if (ok) reload();
  }


  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}

      <section className="card flex flex-col gap-5 p-5 sm:p-6" aria-label="Top ID partner pool">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-neon/10 text-neon">
              <Crown1 size={22} color="currentColor" variant="Bulk" />
            </span>
            <h3 className="text-sm font-medium text-text">Top ID partner pool</h3>
          </div>
          {loading && <Spinner />}
        </div>

        <div className="flex flex-col items-center gap-1.5 py-2 text-center">
          <div className="text-xs text-muted">Ready to claim</div>
          <div className="text-4xl font-medium text-white">{usd(unclaimed)}</div>
          <div className="text-xs text-muted">Goes to your working balance, then withdraw it</div>
        </div>

        <dl>
          <Row label="Your status" value="Active partner" accent />
          <Row label="Active partners" value={state ? `${state.activeCount}` : "—"} />
          <Row label="This month's pool so far" value={state ? usd(state.currentPool) : "—"} />
          <Row label="Your business this month" value={state ? usd(state.currentBiz) : "—"} />
        </dl>
      </section>

      <section className="card flex flex-col gap-4 p-5 sm:p-6" aria-label="Monthly shares">
        <h3 className="text-sm font-medium text-text">Monthly shares</h3>
        {!state || state.rows.length === 0 ? (
          <p className="text-xs text-muted">{loading ? "Loading…" : "No ended months with a pool yet."}</p>
        ) : (
          <div className="flex flex-col">
            {state.rows.map((r) => {
              const label = `Claiming Month ${r.month}...`;
              return (
                <div
                  key={r.month}
                  className="flex items-center justify-between gap-3 border-t border-white/[0.08] py-3 first:border-t-0 first:pt-0 last:pb-0"
                >
                  <div>
                    <div className="text-sm text-white">Month {r.month}</div>
                    <div className="text-xs text-muted">
                      Pool {usd(r.pool)} · Your business {usd(r.myBiz)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white">{usd(r.share)}</span>
                    <button
                      type="button"
                      disabled={r.claimed || r.share === 0n || !state.active || !!tx.busy}
                      onClick={() => claim(r.month)}
                      className="btn btn-primary !rounded-lg !px-3 !py-1.5 text-xs font-semibold"
                    >
                      {tx.busy === label ? <Spinner /> : r.claimed ? "Claimed" : "Claim"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
