import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { type Address, createPublicClient, getAddress, http } from "viem";
import { platformAbi } from "./abi";
import { chain, platformAddress, rpcUrl } from "./config";

/** Active direct business of at least this much (USDT, 18 decimals) makes the sponsor a bonanza winner. Any number of sponsors can win. */
export const BONANZA_TARGET = 1000n * 10n ** 18n;
/** Qualification period (unix seconds): packages bought in [start, end) count. Defaults to 27 Nov – 15 Dec 2026, IST. */
export const BONANZA_START = Number(process.env.BONANZA_START ?? 1795717800);
export const BONANZA_END = Number(process.env.BONANZA_END ?? 1797359400);
/** JSON file that keeps the winning sponsors. Must be on a writable, persistent disk. */
const FILE = process.env.BONANZA_FILE || path.join(process.cwd(), "data", "bonanza-winners.json");

export type BonanzaWinner = {
  sponsor: Address;
  /** Active direct business when the sponsor qualified, in USDT wei, as a string so it survives JSON */
  amount: string;
  /** When the sponsor was saved (ISO) */
  savedAt: string;
};

// Separate from lib/platform.ts, which is a client module
const client = createPublicClient({ chain, transport: http(rpcUrl), batch: { multicall: true } });

/**
 * Sum of the sponsor's directs' active packages bought during the qualification period.
 * Every `invest` (first package or retopup) opens its own position, so both count.
 */
async function activeDirectBusiness(sponsor: Address): Promise<bigint> {
  const directs = await client.readContract({ address: platformAddress, abi: platformAbi, functionName: "getDirectDownlines", args: [sponsor] });
  const idsPerDirect = await Promise.all(
    directs.map((d) => client.readContract({ address: platformAddress, abi: platformAbi, functionName: "getUserPositions", args: [d] }))
  );
  const ids = idsPerDirect.flat();
  const positions = await Promise.all(
    ids.map((id) => client.readContract({ address: platformAddress, abi: platformAbi, functionName: "getPosition", args: [id] }))
  );
  return positions
    .filter((p) => p.active && Number(p.createdAt) >= BONANZA_START && Number(p.createdAt) < BONANZA_END)
    .reduce((sum, p) => sum + p.initialPrincipal, 0n);
}

async function readWinners(): Promise<BonanzaWinner[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

// Writes run one at a time so two requests can't drop each other's sponsor
let queue: Promise<unknown> = Promise.resolve();
function updateWinners<T>(change: (winners: BonanzaWinner[]) => { winners: BonanzaWinner[]; result: T }): Promise<T> {
  const run = queue.then(async () => {
    const { winners, result } = change(await readWinners());
    await mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(winners, null, 2));
    await rename(tmp, FILE);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export async function listWinners(): Promise<BonanzaWinner[]> {
  return readWinners();
}

/**
 * The sponsor's current active direct business for the bonanza, plus their saved winner entry.
 * Saves the sponsor once the business reaches the target; a saved sponsor stays a winner.
 */
export async function checkSponsor(address: string): Promise<{ business: bigint; winner?: BonanzaWinner }> {
  const sponsor = getAddress(address);
  const business = await activeDirectBusiness(sponsor);
  const saved = (await readWinners()).find((w) => same(w.sponsor, sponsor));
  if (saved || business < BONANZA_TARGET) return { business, winner: saved };

  const winner: BonanzaWinner = { sponsor, amount: business.toString(), savedAt: new Date().toISOString() };
  const result = await updateWinners((winners) => {
    const existing = winners.find((w) => same(w.sponsor, sponsor));
    return existing ? { winners, result: existing } : { winners: [...winners, winner], result: winner };
  });
  return { business, winner: result };
}

/** Removes a sponsor from the file. True when one was removed. */
export async function removeWinner(address: string): Promise<boolean> {
  const sponsor = getAddress(address);
  return updateWinners((winners) => {
    const kept = winners.filter((w) => !same(w.sponsor, sponsor));
    return { winners: kept, result: kept.length !== winners.length };
  });
}
