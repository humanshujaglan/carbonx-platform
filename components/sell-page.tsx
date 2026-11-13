"use client";

import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { pancakeRouterAbi, tokenContractAbi } from "@/lib/abi";
import { pancakeRouterAddress } from "@/lib/config";
import { pct, tokens, usd } from "@/lib/format";
import { publicClient, type PlatformAddresses, type PlatformUser } from "@/lib/platform";
import { InfoSheet } from "./info-sheet";
import { Notice, Row, Spinner, useTx } from "./ui";
import { useWallet } from "./wallet";

const SELL_LABEL = "Selling CARB...";
const PERCENTS = [25, 50, 75, 100];
const SLIPPAGES_BPS = [50, 100, 300];
/** The swap reverts if it is not mined within this many seconds. */
const DEADLINE_SEC = 20 * 60;

const pill = (active: boolean) =>
  active
    ? "border-[#22c55e] bg-[radial-gradient(120%_100%_at_50%_30%,rgba(34,197,94,0.3),rgba(8,38,16,0.7))] text-white"
    : "border-white/10 bg-[#14171d] text-[#b9c2bc] hover:text-white";

function parseAmount(s: string): bigint {
  try {
    return s && Number(s) > 0 ? parseUnits(s, 18) : 0n;
  } catch {
    return 0n;
  }
}

/**
 * Sells CARB for USDT through the PancakeSwap V2 router.
 * The token burns its sell tax on the transfer into the pair, so the router is called with the
 * fee-on-transfer swap and the quote is taken on the amount left after tax.
 */
export function SellPage({
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

  const [amountStr, setAmountStr] = useState("");
  const [slippageBps, setSlippageBps] = useState(100);
  const [taxBps, setTaxBps] = useState<bigint>();
  const [allowance, setAllowance] = useState(0n);
  const [quote, setQuote] = useState<{ amountIn: bigint; out: bigint }>();
  const [quoteError, setQuoteError] = useState(false);

  const balance = user?.carbBalance ?? 0n;
  const amountIn = parseAmount(amountStr);
  const afterTax = taxBps === undefined ? 0n : (amountIn * (10000n - taxBps)) / 10000n;
  // Only trust a quote taken for the amount currently typed
  const out = quote && quote.amountIn === amountIn ? quote.out : undefined;
  const minOut = out === undefined ? undefined : (out * BigInt(10000 - slippageBps)) / 10000n;
  const needsApproval = allowance < amountIn;

  // Sell tax and router allowance, read again after every transaction
  useEffect(() => {
    if (!addresses || !account) return;
    let cancelled = false;
    Promise.all([
      publicClient.readContract({ address: addresses.carb, abi: tokenContractAbi, functionName: "getEffectiveSellTaxBps" }),
      publicClient.readContract({ address: addresses.carb, abi: tokenContractAbi, functionName: "allowance", args: [account, pancakeRouterAddress] }),
    ])
      .then(([tax, allowed]) => {
        if (cancelled) return;
        setTaxBps(tax);
        setAllowance(allowed);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [addresses, account, user]);

  // Quote what the pool pays for the CARB that reaches it after the sell tax
  useEffect(() => {
    if (!addresses || afterTax === 0n) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      publicClient
        .readContract({
          address: pancakeRouterAddress,
          abi: pancakeRouterAbi,
          functionName: "getAmountsOut",
          args: [afterTax, [addresses.carb, addresses.usdt]],
        })
        .then((amounts) => {
          if (cancelled) return;
          setQuote({ amountIn, out: amounts[amounts.length - 1] });
          setQuoteError(false);
        })
        .catch(() => {
          if (!cancelled) setQuoteError(true);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [addresses, amountIn, afterTax]);

  const hint = !user
    ? null
    : balance === 0n
    ? "No CARB in your wallet"
    : amountIn > balance
    ? "More than your balance"
    : quoteError && amountIn > 0n
    ? "Could not get a price from PancakeSwap"
    : null;
  const canSell = !!user && amountIn > 0n && !hint && minOut !== undefined && minOut > 0n;

  // One tap: approve the router for this amount when needed, then swap
  async function handleSell() {
    if (!addresses || !account || !canSell || minOut === undefined) return;
    const ok = await tx.run(
      SELL_LABEL,
      async () => {
        if (needsApproval) {
          await write({
            address: addresses.carb,
            abi: tokenContractAbi,
            functionName: "approve",
            args: [pancakeRouterAddress, amountIn],
          });
        }
        return write({
          address: pancakeRouterAddress,
          abi: pancakeRouterAbi,
          functionName: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
          args: [amountIn, minOut, [addresses.carb, addresses.usdt], account, BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SEC)],
        });
      },
      () => <span>Sold. USDT sent to your wallet.</span>
    );
    if (ok) setAmountStr("");
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}

      <section className="card flex flex-col gap-5 p-5 sm:p-6" aria-label="Sell CARB">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-text">Sell CARB</h3>
          <InfoSheet title="Selling CARB">
            <p>
              CARB is sold for USDT on PancakeSwap V2. The first sell of an amount asks for two signatures: one to let
              the router spend that CARB, then the swap itself.
            </p>
            <p>
              Every sell pays the token&apos;s sell tax, which is burned. The tax can rise when the price drops sharply,
              so check it before you sell.
            </p>
            <p>If the price moves more than your slippage before the swap is mined, it reverts and nothing is sold.</p>
          </InfoSheet>
        </div>

        <div className="well flex items-center justify-between gap-3 p-4">
          <div>
            <div className="text-xs text-muted">Wallet balance</div>
            <div className="mt-0.5 text-2xl font-medium text-white">{user ? tokens(balance, 2) : "—"} CARB</div>
          </div>
          <div className="text-right text-xs text-muted">
            USDT balance
            <div className="mt-0.5 text-sm text-neon-soft">{user ? usd(user.usdtBalance) : "—"}</div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-baseline justify-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              aria-label="CARB to sell"
              placeholder="0"
              style={{ fontSize: 36, width: `${Math.max(3, amountStr.length + 1)}ch` }}
              className="min-w-[2ch] max-w-full bg-transparent text-center font-medium text-white outline-none placeholder:text-muted/50"
            />
            <span className="text-lg font-medium text-muted">CARB</span>
          </div>
          <div className={`text-xs ${hint ? "text-danger" : "text-muted"}`}>{hint ?? "Paid in USDT to your wallet"}</div>

          <div className="grid w-full grid-cols-4 gap-2">
            {PERCENTS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={!user || balance === 0n}
                onClick={() => setAmountStr(formatUnits((balance * BigInt(p)) / 100n, 18))}
                className="cursor-pointer rounded-xl border border-white/10 bg-[#14171d] py-2 text-xs font-medium text-[#b9c2bc] transition hover:text-white disabled:opacity-40"
              >
                {p === 100 ? "Max" : `${p}%`}
              </button>
            ))}
          </div>

          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-xs text-muted">Slippage</span>
            <div className="grid grid-cols-3 gap-2">
              {SLIPPAGES_BPS.map((bps) => (
                <button
                  key={bps}
                  type="button"
                  onClick={() => setSlippageBps(bps)}
                  className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition ${pill(slippageBps === bps)}`}
                >
                  {pct(bps)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <dl>
          <Row label="Sell tax (burned)" value={taxBps === undefined ? "—" : pct(taxBps)} />
          <Row label="Reaches the pool" value={amountIn > 0n && taxBps !== undefined ? `${tokens(afterTax, 2)} CARB` : "—"} />
          <Row label="You get (estimated)" value={out === undefined || amountIn === 0n ? "—" : usd(out)} accent />
          <Row label="Minimum received" value={minOut === undefined || amountIn === 0n ? "—" : usd(minOut)} />
        </dl>

        <button
          type="button"
          disabled={!canSell || !!tx.busy}
          onClick={handleSell}
          className="btn btn-primary w-full py-3 text-sm font-semibold"
        >
          {tx.busy === SELL_LABEL ? <Spinner /> : needsApproval && amountIn > 0n ? "Approve & Sell" : "Sell"}
        </button>
      </section>
    </div>
  );
}
