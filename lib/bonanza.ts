import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { type Address, createPublicClient, getAddress, http } from "viem";
import { platformAbi } from "./abi";
import { chain, platformAddress, rpcUrl } from "./config";

/** A direct's package of at least this much (USDT, 18 decimals) makes the sponsor a bonanza winner. */
export const BONANZA_MIN_PACKAGE = 1000n * 10n ** 18n;
/** Qualification period (unix seconds): packages bought in [start, end) count. Defaults to 27 Nov – 15 Dec 2026, IST. */
export const BONANZA_START = Number(process.env.BONANZA_START ?? 1795717800);
export const BONANZA_END = Number(process.env.BONANZA_END ?? 1797359400);
/** JSON file that keeps the winning sponsors. Must be on a writable, persistent disk. */
const FILE = process.env.BONANZA_FILE || path.join(process.cwd(), "data", "bonanza-winners.json");

export type BonanzaWinner = {
  sponsor: Address;
  /** The direct whose package qualified the sponsor */
  direct: Address;
  positionId: string;
  /** Package amount in USDT wei, as a string so it survives JSON */
  amount: string;
  /** When the package was bought (unix seconds) */
  packageTime: number;
  /** When the sponsor was saved (ISO) */
  savedAt: string;
};

// Separate from lib/platform.ts, which is a client module
const client = createPublicClient({ chain, transport: http(rpcUrl), batch: { multicall: true } });

/** First package of 1k+ bought by one of the sponsor's directs during the qualification period, if any. */
async function findQualifyingPackage(sponsor: Address) {
  const directs = await client.readContract({ address: platformAddress, abi: platformAbi, functionName: "getDirectDownlines", args: [sponsor] });
  const idsPerDirect = await Promise.all(
    directs.map((d) => client.readContract({ address: platformAddress, abi: platformAbi, functionName: "getUserPositions", args: [d] }))
  );
  const ids = idsPerDirect.flat();
  const positions = await Promise.all(
    ids.map((id) => client.readContract({ address: platformAddress, abi: platformAbi, functionName: "getPosition", args: [id] }))
  );
  return positions.find(
    (p) =>
      p.initialPrincipal >= BONANZA_MIN_PACKAGE && Number(p.createdAt) >= BONANZA_START && Number(p.createdAt) < BONANZA_END
  );
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

/** The saved winner for this sponsor. Checks the chain when not saved yet and saves the sponsor once they qualify. */
export async function checkSponsor(address: string): Promise<BonanzaWinner | undefined> {
  const sponsor = getAddress(address);
  const saved = (await readWinners()).find((w) => same(w.sponsor, sponsor));
  if (saved) return saved;

  const p = await findQualifyingPackage(sponsor);
  if (!p) return undefined;
  const winner: BonanzaWinner = {
    sponsor,
    direct: p.user,
    positionId: p.id.toString(),
    amount: p.initialPrincipal.toString(),
    packageTime: Number(p.createdAt),
    savedAt: new Date().toISOString(),
  };
  return updateWinners((winners) => {
    const existing = winners.find((w) => same(w.sponsor, sponsor));
    return existing ? { winners, result: existing } : { winners: [...winners, winner], result: winner };
  });
}

/** Removes a sponsor from the file. True when one was removed. */
export async function removeWinner(address: string): Promise<boolean> {
  const sponsor = getAddress(address);
  return updateWinners((winners) => {
    const kept = winners.filter((w) => !same(w.sponsor, sponsor));
    return { winners: kept, result: kept.length !== winners.length };
  });
}
