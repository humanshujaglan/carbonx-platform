import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, formatUnits } from "viem";

const usdFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const numFmt = (digits: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: digits });

/** 18-decimal USD amount -> "$1,234.56" */
export const usd = (v: bigint) => {
  if (v >= 10n ** 30n) return "Unlimited";
  return usdFmt.format(Number(formatUnits(v, 18)));
};
/** 18-decimal token amount -> "1,234.5678" */
export const tokens = (v: bigint, digits = 4) => numFmt(digits).format(Number(formatUnits(v, 18)));
/** 18-decimal price -> "$1.0234" */
const priceFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
export const price = (v: bigint) => `$${priceFmt.format(Number(formatUnits(v, 18)))}`;
export const pct = (bps: bigint | number) => `${numFmt(2).format(Number(bps) / 100)}%`;
export const shortAddr = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export const dateTime = (unix: number) =>
  new Date(unix * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Seconds -> "12d 04h 33m 10s" (drops leading zero units). */
export function countdown(seconds: number): string {
  if (seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

/** Readable message from a wallet / contract error (revert reason when there is one). */
export function errorMessage(err: unknown): string {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) return "Transaction rejected in wallet.";
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) return revert.reason ?? revert.shortMessage;
    return err.shortMessage;
  }
  if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 4001) {
    return "Transaction rejected in wallet.";
  }
  return err instanceof Error ? err.message : String(err);
}
