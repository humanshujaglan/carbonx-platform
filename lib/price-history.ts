import type { Address } from "viem";
import { logsRpcUrl } from "./config";

/** keccak256("Sync(uint112,uint112)"): emitted by the pair on every swap and liquidity change. */
const SYNC_TOPIC = "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1";
const CHUNK_BLOCKS = 49_000; // the log RPC rejects ranges above 50,000 blocks
const MAX_CHUNKS = 16;
const PARALLEL = 4;
const MAX_POINTS = 1500;

export type PricePoint = [time: number, price: number];

type RpcLog = { blockNumber: string; data: string; blockTimestamp?: string };

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(logsRpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

/**
 * CARB price over time, rebuilt from the pair's Sync events (reserveUSDT / reserveCARB after each swap).
 * Returns ascending [unix seconds, price] points, or an empty list if the log RPC can't serve it.
 */
export async function fetchPriceHistory(pair: Address, carbIsToken0: boolean): Promise<PricePoint[]> {
  try {
    const headHex = await rpc<string>("eth_blockNumber", []);
    const head = parseInt(headHex, 16);

    // Block time from two reference blocks, for logs that don't carry their own timestamp
    const refBlock = Math.max(1, head - 100_000);
    const [headBlock, oldBlock] = await Promise.all([
      rpc<{ timestamp: string }>("eth_getBlockByNumber", [headHex, false]),
      rpc<{ timestamp: string }>("eth_getBlockByNumber", ["0x" + refBlock.toString(16), false]),
    ]);
    const headTs = parseInt(headBlock.timestamp, 16);
    const secPerBlock = (headTs - parseInt(oldBlock.timestamp, 16)) / (head - refBlock);

    const ranges: [number, number][] = [];
    for (let i = 0; i < MAX_CHUNKS; i++) {
      const to = head - i * CHUNK_BLOCKS;
      const from = Math.max(0, to - CHUNK_BLOCKS + 1);
      if (to <= 0) break;
      ranges.push([from, to]);
    }

    const logs: RpcLog[] = [];
    for (let i = 0; i < ranges.length; i += PARALLEL) {
      const batch = await Promise.all(
        ranges.slice(i, i + PARALLEL).map(([from, to]) =>
          rpc<RpcLog[]>("eth_getLogs", [
            { fromBlock: "0x" + from.toString(16), toBlock: "0x" + to.toString(16), address: pair, topics: [SYNC_TOPIC] },
          ]).catch(() => [] as RpcLog[])
        )
      );
      batch.forEach((b) => logs.push(...b));
    }

    const points: PricePoint[] = [];
    for (const log of logs) {
      const data = log.data.slice(2);
      const reserve0 = Number(BigInt("0x" + data.slice(0, 64)));
      const reserve1 = Number(BigInt("0x" + data.slice(64, 128)));
      if (!reserve0 || !reserve1) continue;
      const priceNow = carbIsToken0 ? reserve1 / reserve0 : reserve0 / reserve1;
      const block = parseInt(log.blockNumber, 16);
      const t = log.blockTimestamp ? parseInt(log.blockTimestamp, 16) : Math.round(headTs - (head - block) * secPerBlock);
      points.push([t, priceNow]);
    }

    points.sort((a, b) => a[0] - b[0]);
    if (points.length <= MAX_POINTS) return points;
    const step = points.length / MAX_POINTS;
    return Array.from({ length: MAX_POINTS }, (_, i) => points[Math.floor(i * step)]);
  } catch {
    return [];
  }
}
